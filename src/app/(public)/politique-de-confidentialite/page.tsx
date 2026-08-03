import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et protection des données personnelles de Question d'Allaitement.",
};

const PolitiqueConfidentialitePage = () => (
  <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="font-serif text-3xl font-bold text-primary-green">
      Politique de confidentialité
    </h1>
    <p className="mt-2 text-sm text-muted-foreground">
      Dernière mise à jour : février 2026
    </p>

    <div className="mt-8 space-y-8 text-primary-green/80">
      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          1. Responsable du traitement
        </h2>
        <p className="mt-3 text-sm">
          Le responsable du traitement des données personnelles collectées sur
          ce site est [Nom de la société], dont le siège social est situé
          [Adresse complète]. Contact : contact@questiondallaitement.fr
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          2. Données collectées
        </h2>
        <p className="mt-3 text-sm">
          Nous collectons les données suivantes dans le cadre de
          l&apos;utilisation de notre plateforme :
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
          <li>
            <strong>Données d&apos;identification :</strong> prénom, nom, adresse
            email, numéro de téléphone
          </li>
          <li>
            <strong>Données de connexion :</strong> adresse IP, date et heure
            de connexion, navigateur utilisé
          </li>
          <li>
            <strong>Données de paiement :</strong> traitées directement par
            Stripe (nous ne stockons aucune donnée bancaire)
          </li>
          <li>
            <strong>Données de santé :</strong> motif de consultation
            (communiqué volontairement lors de la réservation)
          </li>
          <li>
            <strong>Données de progression :</strong> avancement dans les
            formations en ligne
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          3. Finalités du traitement
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
          <li>Création et gestion de votre compte utilisateur</li>
          <li>Réservation et gestion des consultations</li>
          <li>Accès aux formations en ligne et suivi de progression</li>
          <li>Inscription aux événements</li>
          <li>Traitement des paiements (via Stripe)</li>
          <li>
            Communication transactionnelle (confirmations, rappels,
            notifications)
          </li>
          <li>Amélioration de nos services et de l&apos;expérience utilisateur</li>
          <li>
            <strong>Newsletter :</strong> envoi de la newsletter hebdomadaire,
            du mémo offert à l&apos;inscription et d&apos;informations sur nos
            accompagnements et formations
          </li>
        </ul>
        <p className="mt-3 text-sm">
          L&apos;inscription à la newsletter repose sur votre consentement
          explicite, recueilli par une case à cocher jamais pré-cochée. Nous
          conservons la preuve de ce consentement : sa date et le texte exact
          que vous avez accepté. Chaque email contient un lien de désinscription
          en un clic.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          4. Base légale
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
          <li>
            <strong>Exécution du contrat :</strong> création de compte,
            réservation, achat de formations
          </li>
          <li>
            <strong>Consentement :</strong> newsletter, cookies non essentiels
          </li>
          <li>
            <strong>Intérêt légitime :</strong> amélioration du service,
            prévention de la fraude
          </li>
          <li>
            <strong>Obligation légale :</strong> conservation des factures et
            données comptables
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          5. Destinataires des données
        </h2>
        <p className="mt-3 text-sm">Vos données peuvent être partagées avec :</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
          <li>
            <strong>Les consultantes :</strong> dans le cadre de vos
            réservations (prénom, nom, email, téléphone, motif)
          </li>
          <li>
            <strong>Stripe :</strong> pour le traitement des paiements
          </li>
          <li>
            <strong>Resend :</strong> pour l&apos;envoi d&apos;emails
            transactionnels
          </li>
          <li>
            <strong>Brevo :</strong> gestion de la liste de contacts et envoi
            d&apos;emails marketing (avec votre consentement)
          </li>
          <li>
            <strong>Zoom :</strong> visioconférences pour les consultations en
            ligne (prénom, nom, email)
          </li>
          <li>
            <strong>Supabase :</strong> hébergement de la base de données
          </li>
          <li>
            <strong>Vercel :</strong> hébergement de l&apos;application
          </li>
        </ul>
        <p className="mt-2 text-sm">
          Nous ne vendons jamais vos données personnelles à des tiers.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          6. Durée de conservation
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
          <li>
            <strong>Comptes utilisateurs :</strong> conservés tant que le
            compte est actif, puis 3 ans après la dernière activité
          </li>
          <li>
            <strong>Données de paiement :</strong> 10 ans (obligation
            comptable)
          </li>
          <li>
            <strong>Données de consultation :</strong> 5 ans après la dernière
            consultation
          </li>
          <li>
            <strong>Logs de connexion :</strong> 12 mois
          </li>
          <li>
            <strong>Inscription à la newsletter :</strong> conservée jusqu&apos;à
            votre désinscription, puis 3 ans au titre de la preuve du
            consentement
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          7. Vos droits
        </h2>
        <p className="mt-3 text-sm">
          Conformément au RGPD, vous disposez des droits suivants :
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
          <li>
            <strong>Droit d&apos;accès :</strong> obtenir une copie de vos
            données
          </li>
          <li>
            <strong>Droit de rectification :</strong> corriger vos données
            inexactes
          </li>
          <li>
            <strong>Droit à l&apos;effacement :</strong> demander la
            suppression de vos données (sous réserve des obligations légales)
          </li>
          <li>
            <strong>Droit à la portabilité :</strong> recevoir vos données
            dans un format structuré
          </li>
          <li>
            <strong>Droit d&apos;opposition :</strong> vous opposer au
            traitement de vos données
          </li>
          <li>
            <strong>Droit à la limitation :</strong> limiter le traitement de
            vos données
          </li>
        </ul>
        <p className="mt-3 text-sm">
          Pour exercer vos droits, contactez-nous à{" "}
          <a
            href="mailto:contact@questiondallaitement.fr"
            className="text-primary-red hover:underline"
            tabIndex={0}
          >
            contact@questiondallaitement.fr
          </a>
          . Nous nous engageons à vous répondre dans un délai de 30 jours.
        </p>
        <p className="mt-2 text-sm">
          Vous pouvez également introduire une réclamation auprès de la{" "}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-red hover:underline"
            tabIndex={0}
          >
            CNIL
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          8. Cookies
        </h2>
        <p className="mt-3 text-sm">
          Ce site utilise des cookies strictement nécessaires au fonctionnement
          du service (session d&apos;authentification). Aucun cookie de suivi
          publicitaire n&apos;est utilisé. Aucun consentement n&apos;est
          requis pour les cookies essentiels conformément à la directive
          ePrivacy.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          9. Sécurité
        </h2>
        <p className="mt-3 text-sm">
          Nous mettons en oeuvre des mesures techniques et organisationnelles
          appropriées pour protéger vos données : chiffrement HTTPS, mots de
          passe hashés (bcrypt), Row Level Security sur la base de données,
          audit des accès.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          10. Modifications
        </h2>
        <p className="mt-3 text-sm">
          Nous nous réservons le droit de modifier cette politique de
          confidentialité à tout moment. Les modifications seront publiées sur
          cette page avec une date de mise à jour.
        </p>
      </section>
    </div>
  </div>
);

export default PolitiqueConfidentialitePage;
