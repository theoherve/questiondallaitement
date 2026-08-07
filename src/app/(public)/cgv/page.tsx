import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description:
    "Conditions générales de vente de la plateforme Question d'Allaitement.",
};

const CgvPage = () => (
  <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="font-serif text-3xl font-bold text-primary-green">
      Conditions générales de vente
    </h1>
    <p className="mt-2 text-sm text-muted-foreground">
      Dernière mise à jour : juillet 2026
    </p>

    <div className="mt-8 space-y-8 text-sm text-primary-green/80">
      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          Article 1 — Objet et parties
        </h2>
        <p className="mt-3">
          Les présentes conditions régissent l&apos;utilisation de la plateforme
          Question d&apos;Allaitement, éditée par la personne identifiée dans les{" "}
          <Link
            href="/mentions-legales"
            className="text-primary-red hover:underline"
          >
            mentions légales
          </Link>
          . Toute commande implique leur acceptation sans réserve.
        </p>
        <p className="mt-3">
          La plateforme met en relation des utilisatrices avec des{" "}
          <strong>
            consultantes en lactation exerçant à titre indépendant
          </strong>
          . Question d&apos;Allaitement n&apos;est pas prestataire des
          consultations : elle fournit l&apos;outil de réservation, encaisse le
          prix pour le compte de la consultante et lui reverse sa part. La
          consultante est seule responsable du contenu, de la qualité et de la
          conformité de sa prestation, ainsi que de ses obligations
          professionnelles, fiscales et sociales.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          Article 2 — Nature des prestations
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>
            <strong>Consultations individuelles</strong>, en téléconsultation,
            au cabinet ou à domicile ;
          </li>
          <li>
            <strong>Accompagnements en ligne</strong>, accessibles depuis
            l&apos;espace personnel après achat ;
          </li>
          <li>
            <strong>Formations et ateliers</strong>, à date fixe.
          </li>
        </ul>
        <p className="mt-3">
          L&apos;accompagnement en lactation n&apos;est pas un acte médical. Les
          prestations ne se substituent pas à un avis médical ; en cas de
          symptôme, il convient de consulter un professionnel de santé.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          Article 3 — Compte utilisateur
        </h2>
        <p className="mt-3">
          La création d&apos;un compte est requise pour accéder aux
          accompagnements en ligne. Une utilisatrice peut réserver une
          consultation sans compte préalable : un compte est alors créé
          automatiquement à partir des informations saisies, et un email lui
          permet de définir son mot de passe.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          Article 4 — Prix et paiement
        </h2>
        <p className="mt-3">
          Les prix sont indiqués en euros <strong>toutes taxes comprises</strong>
          . Le prix affiché avant validation est celui qui est prélevé,
          majorations de déplacement ou de créneau comprises. La TVA applicable
          est comprise dans ce prix et détaillée sur la facture.
        </p>
        <p className="mt-3">
          Le paiement en ligne est opéré via <strong>Stripe</strong> ; les
          données de carte ne transitent jamais par les serveurs de Question
          d&apos;Allaitement. Pour les consultations au cabinet ou à domicile, le{" "}
          <strong>paiement sur place</strong> peut être proposé et réglé
          directement à la consultante ; il n&apos;est pas disponible en
          téléconsultation.
        </p>
        <p className="mt-3">
          Question d&apos;Allaitement perçoit une commission sur chaque
          prestation payée en ligne, retenue lors du reversement à la
          consultante. Elle rémunère la mise à disposition de la plateforme, la
          gestion des paiements et le support. Une facture est émise pour chaque
          achat et adressée à la cliente.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          Article 5 — Annulation et remboursement
        </h2>
        <div className="mt-3 space-y-2">
          <p>
            <strong>Annulation plus de 48 h avant le rendez-vous :</strong>{" "}
            remboursement intégral.
          </p>
          <p>
            <strong>Annulation moins de 48 h avant le rendez-vous :</strong>{" "}
            retenue de 50 % du prix.
          </p>
          <p>
            <strong>Annulation par la consultante :</strong> remboursement
            intégral, quel que soit le délai, et possibilité de reprogrammer.
          </p>
          <p>
            <strong>Créneau devenu indisponible après paiement :</strong>{" "}
            remboursement intégral automatique et information par email.
          </p>
        </div>
        <p className="mt-3">
          La somme retenue en cas d&apos;annulation tardive revient intégralement
          à la consultante, en compensation du créneau immobilisé. Question
          d&apos;Allaitement ne perçoit aucune commission sur une annulation. Les
          remboursements sont effectués sur le moyen de paiement d&apos;origine ;
          le délai de restitution dépend de l&apos;établissement bancaire.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          Article 6 — Droit de rétractation
        </h2>
        <p className="mt-3">
          Conformément aux articles L221-18 et suivants du Code de la
          consommation, la cliente dispose d&apos;un délai de quatorze jours pour
          se rétracter.
        </p>
        <p className="mt-3">
          Ce délai ne s&apos;applique pas lorsqu&apos;elle a demandé expressément
          l&apos;exécution de la prestation avant son expiration et renoncé à ce
          droit dans les conditions prévues aux articles L221-25 et L221-28 :
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>
            pour une <strong>consultation réservée à moins de quatorze jours</strong>,
            par acceptation expresse que la consultation ait lieu à la date
            choisie, avant l&apos;expiration du délai ;
          </li>
          <li>
            pour un <strong>accompagnement en ligne</strong> accessible
            immédiatement, par renonciation expresse au droit de rétractation dès
            le début de l&apos;exécution.
          </li>
        </ul>
        <p className="mt-3">
          Ces demandes et renonciations sont recueillies au moment de la
          réservation ou de l&apos;achat, et conservées. Hors de ces cas, la
          rétractation s&apos;exerce par simple demande à{" "}
          <a
            href="mailto:contact@questiondallaitement.fr"
            className="text-primary-red hover:underline"
          >
            contact@questiondallaitement.fr
          </a>
          , sans avoir à se justifier ; le remboursement intervient dans les
          quatorze jours suivant la demande.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          Article 7 — Contestations de paiement
        </h2>
        <p className="mt-3">
          En cas de contestation auprès de l&apos;établissement bancaire de la
          cliente, la somme est débitée de Question d&apos;Allaitement, qui
          supporte également les frais appliqués par Stripe. Lorsque la
          contestation résulte de l&apos;inexécution ou de la mauvaise exécution
          de la prestation, Question d&apos;Allaitement peut récupérer les sommes
          correspondantes sur les reversements ultérieurs dus à la consultante.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          Article 8 — Accompagnements en ligne
        </h2>
        <p className="mt-3">
          L&apos;accès est personnel et incessible, sans limitation de durée,
          sous réserve du maintien du service. Les contenus sont protégés par le
          droit d&apos;auteur ; leur reproduction ou diffusion est interdite.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          Article 9 — Téléconsultation
        </h2>
        <p className="mt-3">
          Les téléconsultations se tiennent via Zoom. Le lien de connexion est
          envoyé par email après confirmation. Il appartient à la cliente de
          disposer d&apos;une connexion suffisante ; une défaillance de son propre
          matériel ne donne pas lieu à remboursement.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          Article 10 — Données personnelles
        </h2>
        <p className="mt-3">
          Les traitements de données personnelles sont décrits dans la{" "}
          <Link
            href="/politique-de-confidentialite"
            className="text-primary-red hover:underline"
          >
            politique de confidentialité
          </Link>
          , qui précise les sous-traitants, les durées de conservation et les
          droits de la cliente.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          Article 11 — Litiges
        </h2>
        <p className="mt-3">
          En cas de litige, une solution amiable sera recherchée avant toute
          action judiciaire. Conformément à l&apos;article L612-1 du Code de la
          consommation, le consommateur peut recourir gratuitement à un médiateur
          de la consommation. Les présentes CGV sont soumises au droit français.
        </p>
      </section>
    </div>
  </div>
);

export default CgvPage;
