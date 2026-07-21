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

## Quel compte Stripe ?

La cle de test actuelle appartient a `acct_1TH8C3DSQDjxnDDN`, nomme
« **Environnement de test** caroleherve.fr (Théo) ». C'est le **sandbox** du
compte `caroleherve.fr`.

Un sandbox Stripe n'a pas de mode live : le pendant production de tout ce qui a
ete construit en test, ce sont les **cles live de `caroleherve.fr`**
(`acct_1TH8Bi…`, cles en `pk_live_51TH8Bi…` / `sk_live_…`).

> Une version precedente de ce document disait le contraire — « la cle live du
> compte parent n'est pas la bonne ». C'etait faux : cette remarque valait pour
> les cles **test**, ou sandbox et compte principal ont bien des cles
> distinctes.

**Tranche le 2026-07-21 : l'entite de Carole est la plateforme.** Elle est a la
fois editrice — qui percoit la commission et supporte les chargebacks
(constat 1-4) — et consultante qui verse cette commission. Les consultantes
qu'elle accueille ensuite sont des tiers onboardes en Connect Express.

Deux consequences a repercuter :

- les CGV doivent nommer **son entite** comme editrice
  ([CGV_MODELE_ECONOMIQUE.md](./CGV_MODELE_ECONOMIQUE.md), point 1) ;
- la commission qu'elle se verse a elle-meme n'a pas de sens economique, mais
  elle a un sens **comptable** : elle transite par Stripe et apparait dans les
  reversements. A cadrer avec le point TVA (1-6).

---

## 1. Migration du limiteur de debit ✅

```bash
pnpm db:push        # applique 00050_rate_limits.sql
pnpm test:rate-limit
```

**Fait le 2026-07-21** : `4/4 scenarios passes.`

Le scenario qui compte est le troisieme : 20 appels simultanes contre une limite
de 5 n'en laissent passer que 5. Le compteur est bien atomique.

---

## 2. Profil de la plateforme Stripe

Dans le dashboard Stripe, **en mode live** :

- **Connect** doit etre active en live. Il l'est en sandbox, ce qui ne prejuge
  de rien : Stripe demande un questionnaire de profil plateforme avant de
  l'ouvrir en production. A faire en premier, c'est ce qui peut prendre du
  temps.
- **Settings → Branding** : `display_name`, logo et icone. C'est ce que voit la
  consultante pendant l'onboarding Express — vide, ca fait suspect.
- **Settings → Public details** : `statement_descriptor`. Il vaut
  `ENVIRONNEMENT DE TEST` en sandbox ; verifie ce qu'il vaut en live, c'est ce
  qui apparait sur les releves bancaires des clientes.

---

## 3. CGV et mentions legales

Voir [CGV_MODELE_ECONOMIQUE.md](./CGV_MODELE_ECONOMIQUE.md) — texte pret a
relire, avec les points qui engagent juridiquement.

**A faire avant l'etape 4.**

---

## 4. Variables d'environnement sur Vercel

### Ce que l'application lit reellement

| Variable | Production | Preview / Development |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | **`sk_live_…`** (a ecraser) | `sk_test_…` du sandbox — **ne pas toucher** |
| `STRIPE_WEBHOOK_SECRET` | **`whsec_…` de l'endpoint live** (etape 5) | `whsec_…` de test — **ne pas toucher** |
| `NEXT_PUBLIC_SUPABASE_URL` | inchange | inchange |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | inchange | inchange |
| `SUPABASE_SERVICE_ROLE_KEY` | inchange | inchange |
| `AUTH_SECRET` | inchange | inchange |
| `AUTH_URL` | doit valoir le domaine de production | l'URL de preview |
| `NEXT_PUBLIC_APP_URL` | domaine de production | — |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` | inchange | inchange |
| `BREVO_API_KEY` | inchange | inchange |
| `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI` | inchange | inchange |
| `CRON_SECRET` | inchange | inchange |

### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` : inutile

Cette variable est presente dans `.env.local` mais **l'application ne la lit
jamais**. Le paiement passe par le Checkout heberge de Stripe — une simple
redirection — et non par Stripe.js ou Elements, qui sont les seuls a en avoir
besoin. Il n'y a aucune dependance a `@stripe/stripe-js` dans le projet.

Tu peux la supprimer de Vercel, ou la laisser : elle ne sert a rien dans les
deux cas. Ne perds pas de temps a chercher la bonne valeur.

> Cela rend l'item 0-4 de la Phase 0 sans objet : la « vraie `pk_test_` du
> sandbox » ne servait a rien non plus.

### Variables qui ne doivent **pas** exister sur Vercel

`E2E_CLIENT_PASSWORD`, `E2E_CONNECT_ACCOUNT` et tous les `E2E_*` sont propres au
poste de developpement et a la CI GitHub. Ils n'ont rien a faire dans les
variables du projet Vercel.

### Points d'attention

⚠️ **Ne touche pas aux environnements Preview et Development.** Ils doivent
rester en cles test, sinon une PR de preview encaisse pour de vrai.

⚠️ La cle `rk_live_…` visible dans le dashboard (« CLI key for jaj-mac… »,
expire dans 89 jours) vient de `stripe login`. Elle sert au CLI en local, pas a
l'application. Ne la mets nulle part ; tu peux la revoquer si tu n'utilises plus
le CLI.

⚠️ **Redeploie apres modification.** Les variables ne sont lues qu'au build.

---

## 5. Endpoint webhook de production

> **Le `whsec_` ne se trouve pas, il se cree.** Il n'existe aucune page « secret
> du webhook » dans Stripe : chaque endpoint enregistre a le sien, genere au
> moment de sa creation. Tant que l'endpoint live n'existe pas, le secret non
> plus. C'est pour ca qu'on ne le trouve nulle part dans le dashboard.

### 🚨 A verifier avant tout : la production peut-elle deja encaisser ?

Si `STRIPE_SECRET_KEY` vaut deja `sk_live_…` sur Vercel en Production **et**
qu'aucun endpoint webhook live n'est enregistre, le site est dans un etat
dangereux :

1. une cliente reserve et paie — **le paiement est reel** ;
2. la reservation n'est creee que par le webhook `checkout.session.completed`
   (voir `createBooking`, qui ne cree rien avant) ;
3. sans endpoint, ce webhook n'est envoye nulle part ;
4. **la cliente est debitee, aucune reservation n'existe, aucun email ne part.**

Le meme scenario vaut si l'endpoint existe mais que `STRIPE_WEBHOOK_SECRET`
contient un secret de test : la signature ne correspond pas, la route repond
`400`, Stripe reessaie puis abandonne.

**Verification immediate** : Vercel → Settings → Environment Variables →
Production → valeur de `STRIPE_SECRET_KEY`. Si elle commence par `sk_live_`,
traite cette section en priorite, ou remets une cle de test le temps de finir la
configuration.

### Creation de l'endpoint

Stripe → **Developers → Webhooks** → bouton **« Add endpoint »**, en **mode
live** (bascule Test/Live en haut du dashboard) :

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

### 🚨 « Evenements de » : compte plateforme **et** comptes connectes

C'est le reglage le plus facile a rater, et le plus couteux.

Avec des charges destination, la session Checkout et le PaymentIntent sont crees
**sur le compte plateforme** — c'est lui qui encaisse, `transfer_data` ne fait
que router les fonds ensuite. Les trois evenements de paiement se produisent
donc sur **ton compte**, pas sur celui de la consultante :

| Evenement | Se produit sur |
| --- | --- |
| `checkout.session.completed` | le compte **plateforme** |
| `payment_intent.succeeded` | le compte **plateforme** |
| `charge.refunded` | le compte **plateforme** |
| `account.updated` | un **compte connecte** |
| `account.application.deauthorized` | un **compte connecte** |

Une destination reglee sur « **Comptes connectés** » seulement ne recevra
**jamais** les trois premiers. Consequence exacte : la cliente paie, la
reservation n'est jamais creee, aucun email ne part — le scenario decrit
plus haut.

Si l'interface ne permet pas de cocher les deux origines sur une meme
destination, il en faut **deux** : une pour les evenements du compte, une pour
ceux des comptes connectes. Le meme `whsec_` ne vaut alors que pour une seule —
chaque destination a le sien, et l'application n'en lit qu'un
(`STRIPE_WEBHOOK_SECRET`). Dans ce cas, garde une seule destination pour les
paiements et traite l'onboarding autrement, ou ouvre le sujet : le code n'accepte
aujourd'hui qu'un secret.

Une fois l'endpoint cree, il apparait dans la liste. **Clique dessus** : le
panneau de droite affiche **« Signing secret »** avec un lien **« Reveal »**.
C'est cette valeur, en `whsec_…`, qui va dans `STRIPE_WEBHOOK_SECRET` sur
Vercel, environnement **Production**.

> Le secret est propre a cet endpoint. Si tu supprimes puis recrees l'endpoint,
> le secret change et il faut le reporter a nouveau.

Puis **redeploie** : les variables ne sont lues qu'au build.

### Verifier que ca marche

Depuis la page de l'endpoint, onglet **« Send test event »** → choisis
`checkout.session.completed` → **Send test webhook**. La reponse doit etre
`200`. Un `400` signifie que le secret sur Vercel ne correspond pas a cet
endpoint.

> Cet evenement de test ne cree rien en base : ses metadonnees sont vides, et
> `handleCheckoutCompleted` sort immediatement. Il ne valide que la signature —
> ce qui est precisement ce qu'on cherche a verifier ici.

---

## 6. Purger les comptes Connect de test

> **A faire imperativement apres la bascule des cles, avant tout onboarding.**

Les comptes Connect sont **cloisonnes par environnement** : un `acct_…` cree en
mode test n'existe pas en mode live. Or la colonne
`consultants.stripe_account_id` ne distingue pas les deux — elle contient
aujourd'hui `acct_1TO0AEDjYyOKzuau`, un compte **de test** dont l'onboarding n'a
meme pas ete termine.

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

En mode test, aujourd'hui, il repond :

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
par Stripe, qui peut prendre plusieurs jours. **Ce n'est pas une etape a
decouvrir la veille du lancement.**

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
> `payouts_enabled` a vrai. Utile pour verifier l'ecran et le webhook avant
> d'engager quelqu'un dans un vrai onboarding, mais le compte obtenu est a jeter.

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
| Renonciation au droit de retractation (demande du code) | CGV, point 4 |
| Validation MIME des uploads | 5-3 |
| Seeds `consultant_locations` | 5-4 |
| CSP sans `'unsafe-inline'` (nonces) | 5-2, palier suivant |
| Paiement carte reel de bout en bout automatise | 3-6, bloque |
