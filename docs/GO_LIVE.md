# Bascule en production — pas a pas

> Ce que Claude ne peut pas faire a ta place : tout passe par les dashboards
> Stripe, Vercel et Supabase.
>
> **L'ordre compte, deux fois.**
>
> Les CGV (etape 3) doivent etre en ligne **avant** la bascule des cles live
> (etape 4). Encaisser sans conditions a jour t'expose, et deux points du modele
> Connect ont un effet juridique direct — voir
> [CGV_MODELE_ECONOMIQUE.md](./CGV_MODELE_ECONOMIQUE.md).
>
> L'onboarding des consultantes (etape 7) vient **apres** la bascule, pas avant.
> Les comptes Connect sont cloisonnes par environnement : un compte cree en mode
> test n'existe pas en live. C'est aussi pourquoi l'etape 6 purge les
> identifiants de test restes en base.

---

## 1. Migration du limiteur de debit

```bash
pnpm db:push        # applique 00050_rate_limits.sql
pnpm test:rate-limit
```

Attendu : `4/4 scenarios passes.`

Le dernier scenario est celui qui compte : 20 appels simultanes contre une
limite de 5 doivent en laisser passer **exactement 5**. S'il en passe plus, le
compteur n'est pas atomique et la limite ne protege de rien.

> Tant que la migration n'est pas appliquee, le limiteur laisse tout passer en
> journalisant l'erreur. Degrade, mais ni bloquant ni silencieux.

---

## 2. Profil de la plateforme Stripe

Dans le dashboard Stripe, **en mode live** :

- **Settings → Branding** : `display_name`, logo et icone. C'est ce que voit la
  consultante pendant l'onboarding Express — vide, ca fait suspect.
- **Settings → Public details** : `statement_descriptor`. Il vaut aujourd'hui
  `ENVIRONNEMENT DE TEST`, ce qui apparaitrait tel quel sur les releves
  bancaires des clientes.

---

## 3. CGV et mentions legales

Voir [CGV_MODELE_ECONOMIQUE.md](./CGV_MODELE_ECONOMIQUE.md) — texte pret a
relire, avec les points qui engagent juridiquement.

**A faire avant l'etape 4.**

---

## 4. Cles live sur Vercel

Dans **Vercel → Project → Settings → Environment Variables**, environnement
**Production** uniquement :

| Variable | Valeur |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_live_…` (Stripe → Developers → API keys, **mode live**) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` de l'endpoint prod — **etape 6** |

⚠️ **Ne touche pas aux environnements Preview et Development.** Ils doivent
rester en cles test, sinon une PR de preview encaisse pour de vrai.

⚠️ La cle live du compte **parent** (`acct_1TH8Bi…`, « caroleherve.fr ») n'est
pas la bonne. Il faut celle du compte qui porte la plateforme.

---

## 5. Endpoint webhook de production

Stripe → **Developers → Webhooks → Add endpoint**, en **mode live** :

- URL : `https://<ton-domaine>/api/webhooks/stripe`
- Evenements a selectionner :

```
checkout.session.completed
payment_intent.succeeded
charge.refunded
account.updated
account.application.deauthorized
```

Ces cinq-la et pas d'autres : ce sont exactement ceux que
[`route.ts`](../src/app/api/webhooks/stripe/route.ts) traite. En ajouter
d'autres remplit les logs d'evenements ignores.

Copie ensuite le **Signing secret** (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET`
sur Vercel, puis **redeploie** — les variables ne sont lues qu'au build.

---

## 6. Purger les comptes Connect de test

> **A faire imperativement apres la bascule des cles, avant tout onboarding.**

Les comptes Connect sont **cloisonnes par environnement** : un `acct_…` cree en
mode test n'existe pas en mode live. Or la colonne `consultants.stripe_account_id`
ne distingue pas les deux — elle contient aujourd'hui `acct_1TO0AEDjYyOKzuau`,
un compte **de test** dont l'onboarding n'a meme pas ete termine.

Laisse tel quel, l'application enverrait cet identifiant a Stripe en live, qui
ne le connait pas : les paiements echouent sur un « No such destination
account » sans rapport apparent avec la cause.

```sql
-- A executer une fois les cles live en place.
update consultants
set stripe_account_id = null,
    stripe_account_status = 'pending',
    onboarding_completed = false;
```

Verifier ensuite :

```bash
pnpm check:connect
```

Le script interroge Stripe pour chaque identifiant enregistre et signale ceux
qui n'existent pas dans le mode courant — exactement le piege decrit ci-dessus.
Il verifie aussi que le statut en base correspond a ce que Stripe repond, ce qui
revele un webhook `account.updated` mal branche.

Aujourd'hui, en mode test, il repond :

```
· a0eebc99  pas de compte (consultante inactive)
✗ 31b9a2da  acct_1TO0AEDjYyOKzuau existe mais n'encaisse pas
```

---

## 7. Onboarding Stripe des consultantes

**Maintenant seulement**, et pas avant : un onboarding fait en mode test est du
travail jete, puisque le compte n'existera pas en live.

Chaque consultante se connecte et va dans **Espace consultante → Parametres →
Connecter mon compte Stripe**. Elle aura besoin de ses vraies coordonnees
bancaires et d'une piece d'identite — c'est un onboarding reel, avec verification
par Stripe, qui peut prendre quelques jours.

Le statut se met a jour tout seul par le webhook `account.updated` (4-5) :

```sql
select id, stripe_account_id, stripe_account_status, onboarding_completed
from consultants;
```

Attendu : `active` **et** `onboarding_completed = true`. Tant que ce n'est pas le
cas, `charges_enabled` est faux cote Stripe et **aucune reservation payante ne
peut aboutir** pour cette consultante.

> **Pour exercer le parcours sans attendre** : l'onboarding fonctionne aussi en
> mode test, avec des donnees fictives — la fixture E2E
> (`acct_1TvClsDt4jjyHCRs`) est un compte Express complet, `charges_enabled` et
> `payouts_enabled` a vrai. Utile pour verifier l'ecran et le webhook, mais le
> compte obtenu est a jeter.

---

## 8. Verification apres bascule

Dans cet ordre :

0. `pnpm check:connect` doit repondre **« Tous les comptes sont coherents »**.
   Tant que ce n'est pas le cas, inutile d'aller plus loin : les paiements
   echoueront.
1. **Un achat reel de bout en bout**, avec une vraie carte et un petit montant.
   C'est le trou de couverture assume de 3-6 : aucun test automatise ne verifie
   qu'un vrai paiement carte declenche le webhook.
2. Stripe → Webhooks → l'endpoint prod : les livraisons doivent etre en `200`.
3. En base : `bookings` cree et `confirmed`, ligne `payments` en `succeeded`.
4. **Rembourse ce paiement depuis le dashboard Stripe**, puis verifie que la
   reservation passe `cancelled` (4-4) et que le transfert est renverse (4-2).

Le point 4 est le plus important : c'est le chemin ou l'argent pouvait partir
sans revenir.

---

## Ce qui reste ouvert apres la bascule

| Sujet | Ou |
| --- | --- |
| TVA sur la commission plateforme | 1-6 |
| Validation MIME des uploads | 5-3 |
| Seeds `consultant_locations` | 5-4 |
| CSP sans `'unsafe-inline'` (nonces) | 5-2, palier suivant |
| Paiement carte reel de bout en bout automatise | 3-6, bloque |
