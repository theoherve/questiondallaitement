import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales de la plateforme Question d'Allaitement.",
};

const MentionsLegalesPage = () => (
  <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="font-serif text-3xl font-bold text-primary-green">
      Mentions légales
    </h1>
    <p className="mt-2 text-sm text-muted-foreground">
      Dernière mise à jour : février 2026
    </p>

    <div className="mt-8 space-y-8 text-primary-green/80">
      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          1. Éditeur du site
        </h2>
        <div className="mt-3 space-y-1 text-sm">
          <p>
            <strong>Raison sociale :</strong> [Nom de la société / Auto-entrepreneur]
          </p>
          <p>
            <strong>Forme juridique :</strong> [SAS / SARL / Auto-entrepreneur]
          </p>
          <p>
            <strong>Siège social :</strong> [Adresse complète]
          </p>
          <p>
            <strong>SIRET :</strong> [Numéro SIRET]
          </p>
          <p>
            <strong>N° TVA intracommunautaire :</strong> [Numéro TVA]
          </p>
          <p>
            <strong>Directeur de la publication :</strong> [Prénom Nom]
          </p>
          <p>
            <strong>Contact :</strong> contact@questiondallaitement.fr
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          2. Hébergement
        </h2>
        <div className="mt-3 space-y-1 text-sm">
          <p>
            <strong>Hébergeur :</strong> Vercel Inc.
          </p>
          <p>
            <strong>Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, USA
          </p>
          <p>
            <strong>Site web :</strong>{" "}
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-red hover:underline"
              tabIndex={0}
            >
              vercel.com
            </a>
          </p>
          <p className="mt-2">
            <strong>Base de données :</strong> Supabase Inc. — 970 Toa Payoh
            North #07-04, Singapore 318992
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          3. Propriété intellectuelle
        </h2>
        <p className="mt-3 text-sm">
          L&apos;ensemble du contenu de ce site (textes, images, vidéos,
          graphismes, logo, icônes, sons, logiciels, etc.) est la propriété
          exclusive de l&apos;éditeur ou de ses partenaires et est protégé par
          les lois françaises et internationales relatives à la propriété
          intellectuelle. Toute reproduction, représentation, modification,
          publication, transmission, dénaturation, totale ou partielle du site
          ou de son contenu, par quelque procédé que ce soit, et sur quelque
          support que ce soit est interdite sans autorisation écrite préalable.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          4. Responsabilité
        </h2>
        <p className="mt-3 text-sm">
          Les informations fournies sur ce site le sont à titre informatif et ne
          sauraient se substituer à un avis médical. L&apos;éditeur ne peut être
          tenu responsable des dommages directs ou indirects résultant de
          l&apos;utilisation du site. Les consultantes référencées sur la
          plateforme exercent en toute indépendance et sont seules responsables
          de leurs prestations.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          5. Liens hypertextes
        </h2>
        <p className="mt-3 text-sm">
          Le site peut contenir des liens vers d&apos;autres sites internet.
          L&apos;éditeur ne dispose d&apos;aucun moyen de contrôle du contenu de
          ces sites tiers et décline toute responsabilité quant à leur contenu.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          6. Droit applicable
        </h2>
        <p className="mt-3 text-sm">
          Les présentes mentions légales sont régies par le droit français. En
          cas de litige, les tribunaux français seront seuls compétents.
        </p>
      </section>
    </div>
  </div>
);

export default MentionsLegalesPage;
