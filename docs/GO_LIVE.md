# Bascule en production — pas a pas

> Ce que Claude ne peut pas faire a ta place : tout passe par les dashboards
> Stripe, Vercel et Supabase.
>
> **Ordre imperatif.** Les CGV (etape 4) doivent etre en ligne **avant** la
> bascule des cles live (etape 5). Encaisser sans conditions a jour t'expose,
> et deux points du modele Connect ont un effet juridique direct — voir
> [CGV_MODELE_ECONOMIQUE.md](./CGV_MODELE_ECONOMIQUE.md).

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

## 2. Comptes Stripe des consultantes

**A verifier en premier : aujourd'hui, personne ne peut etre paye.**

| Consultante | `stripe_account_id` | Statut |
| --- | --- | --- |
| `a0eebc99-…380a11` | `null` | `pending` |
| `31b9a2da-…0bbd22a` | `acct_1TO0AEDjYyOKzuau` | `pending` |

Aucun compte n'est `active`, donc `charges_enabled` est faux : Stripe refusera
toute charge destination. Chaque consultante doit terminer son onboarding
Express depuis **Espace consultante → Parametres → Connecter mon compte
Stripe**.

Le statut se met a jour tout seul par le webhook `account.updated` (4-5). Pour
verifier :

```sql
select id, stripe_account_id, stripe_account_status, onboarding_completed
from consultants;
```

Attendu apres onboarding : `active` **et** `onboarding_completed = true`.

---

## 3. Profil de la plateforme Stripe

Dans le dashboard Stripe, **en mode live** :

- **Settings → Branding** : `display_name`, logo et icone. C'est ce que voit la
  consultante pendant l'onboarding Express — vide, ca fait suspect.
- **Settings → Public details** : `statement_descriptor`. Il vaut aujourd'hui
  `ENVIRONNEMENT DE TEST`, ce qui apparaitrait tel quel sur les releves
  bancaires des clientes.

---

## 4. CGV et mentions legales

Voir [CGV_MODELE_ECONOMIQUE.md](./CGV_MODELE_ECONOMIQUE.md) — texte pret a
relire, avec les points qui engagent juridiquement.

**A faire avant l'etape 5.**

---

## 5. Cles live sur Vercel

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

## 6. Endpoint webhook de production

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

## 7. Verification apres bascule

Dans cet ordre :

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
