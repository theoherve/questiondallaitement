import { Metadata } from "next";
import { getContactEmail } from "@/lib/settings/seo-defaults/store";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales de la plateforme Question d'Allaitement.",
};

const MentionsLegalesPage = async () => {
  const contactEmail = await getContactEmail();

  return (
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
            <strong>Raison sociale :</strong> Carole HERVÉ
          </p>
          <p>
            <strong>Forme juridique :</strong> Entreprise individuelle (EI)
          </p>
          <p>
            <strong>Siège social :</strong> 43 rue Guy Môquet, 75017 Paris
          </p>
          <p>
            <strong>SIRET :</strong> 540 075 819 00016
          </p>
          <p>
            <strong>N° TVA intracommunautaire :</strong> FR94540075819
          </p>
          <p>
            <strong>Directeur de la publication :</strong> Carole HERVÉ
          </p>
          <p>
            <strong>Contact :</strong> {contactEmail}
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
            <strong>Base de données :</strong> Supabase Inc., 970 Toa Payoh
            North #07-04, Singapore 318992
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          3. Propriété intellectuelle
        </h2>
        <div className="mt-3 space-y-3 text-sm">
          <p>
            Le site et les contenus de caroleherve.fr sont la propriété
            exclusive de Carole Hervé. Toute reproduction, intégrale ou
            partielle des éléments du site est interdite sauf autorisation
            expresse et préalable de Carole Hervé.
          </p>
          <p>
            L&apos;ensemble du Site relève de la législation française et
            internationale sur le droit d&apos;auteur et la propriété
            intellectuelle. En ces termes, l&apos;article L 122-4 du Code de la
            propriété intellectuelle indique : « Toute représentation ou
            reproduction intégrale ou partielle faite sans le consentement de
            l&apos;auteur ou de ses ayants droit ou ayants cause est illicite.
            Il en est de même pour la traduction, l&apos;adaptation ou la
            transformation, l&apos;arrangement ou la reproduction par un art ou
            un procédé quelconque. »
          </p>
          <p>
            Ainsi, toute copie illicite du site, de son contenu et de son
            architecture peut faire l&apos;objet de poursuites sur le terrain de
            la contrefaçon sanctionnée par les articles L 335-2 et suivants du
            Code de la propriété intellectuelle.
          </p>
          <p>
            Tous les droits de reproduction sont réservés, y compris pour les
            documents téléchargeables et les représentations iconographiques et
            photographiques, sauf note contraire ou accord écrit préalable.
          </p>
        </div>
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
};

export default MentionsLegalesPage;
