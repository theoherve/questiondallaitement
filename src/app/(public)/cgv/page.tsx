import { Metadata } from "next";

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
      Dernière mise à jour : février 2026
    </p>

    <div className="mt-8 space-y-8 text-primary-green/80">
      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          1. Objet
        </h2>
        <p className="mt-3 text-sm">
          Les présentes conditions générales de vente (CGV) régissent les
          relations contractuelles entre l&apos;éditeur de la plateforme
          Question d&apos;Allaitement et toute personne effectuant un achat sur
          le site. Toute commande implique l&apos;acceptation sans réserve des
          présentes CGV.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          2. Services proposés
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
          <li>
            <strong>Formations en ligne :</strong> accès à des contenus
            pédagogiques (vidéos, textes, quiz, fichiers téléchargeables) après
            achat
          </li>
          <li>
            <strong>Consultations :</strong> réservation de créneaux de
            consultation avec des professionnelles certifiées
          </li>
          <li>
            <strong>Événements :</strong> inscription à des ateliers,
            webinaires et événements
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          3. Prix et paiement
        </h2>
        <p className="mt-3 text-sm">
          Les prix sont indiqués en euros TTC. Le paiement est effectué en
          ligne par carte bancaire via la plateforme sécurisée Stripe. La
          commande est confirmée après réception du paiement complet.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          4. Formations en ligne
        </h2>
        <p className="mt-3 text-sm">
          L&apos;accès aux formations est illimité dans le temps après achat.
          Le contenu des formations est protégé par le droit d&apos;auteur et
          ne peut être reproduit, partagé ou redistribué sans autorisation
          écrite préalable. Tout accès est strictement personnel et
          nominatif.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          5. Consultations — Annulation et remboursement
        </h2>
        <div className="mt-3 space-y-2 text-sm">
          <p>
            <strong>Annulation plus de 48h avant le rendez-vous :</strong>{" "}
            remboursement intégral.
          </p>
          <p>
            <strong>Annulation moins de 48h avant le rendez-vous :</strong>{" "}
            remboursement partiel (50% du montant retenu à titre de
            dédommagement).
          </p>
          <p>
            <strong>Absence sans prévenir (no-show) :</strong> aucun
            remboursement.
          </p>
          <p>
            <strong>Annulation par la consultante :</strong> remboursement
            intégral et possibilité de reprogrammer.
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          6. Droit de rétractation
        </h2>
        <p className="mt-3 text-sm">
          Conformément à l&apos;article L.221-28 du Code de la consommation,
          le droit de rétractation ne s&apos;applique pas aux contenus
          numériques fournis sur support immatériel dont l&apos;exécution a
          commencé (formations en ligne consultées). Pour les consultations
          non encore effectuées, le droit de rétractation de 14 jours
          s&apos;applique, sous réserve que la consultation n&apos;ait pas
          encore eu lieu.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          7. Responsabilité
        </h2>
        <p className="mt-3 text-sm">
          La plateforme agit en qualité d&apos;intermédiaire entre les clients
          et les consultantes. Les consultantes exercent en toute indépendance
          et sont seules responsables de la qualité de leurs prestations. Les
          informations et conseils prodigués ne se substituent en aucun cas à
          un avis médical.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          8. Litiges
        </h2>
        <p className="mt-3 text-sm">
          En cas de litige, une solution amiable sera recherchée avant toute
          action judiciaire. Conformément à l&apos;article L.612-1 du Code de
          la consommation, le consommateur peut recourir gratuitement au service
          de médiation. Les présentes CGV sont soumises au droit français. Les
          tribunaux compétents sont ceux du siège social de l&apos;éditeur.
        </p>
      </section>
    </div>
  </div>
);

export default CgvPage;
