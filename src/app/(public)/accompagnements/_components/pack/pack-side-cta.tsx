import Image from "next/image";
import { BookOpen, Clock, User } from "lucide-react";
import { PurchaseButton } from "../purchase-button";

type Props = {
  priceLabel: string;
  imageUrl: string | null;
  sectionsCount: number;
  lessonsCount: number;
  instructorName: string;
  formationId: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
};

const ANCHORS = [
  { href: "#programme", label: "Programme" },
  { href: "#temoignages", label: "Témoignages" },
  { href: "#tarif", label: "Tarif" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Carte-produit du pack, affichee dans une lane sticky sur desktop (voir
 * PackSalesPage). Le bouton d'achat est le meme composant que la section tarif
 * (gere connexion / achat / acces si deja inscrite).
 */
export function PackSideCta({
  priceLabel,
  imageUrl,
  sectionsCount,
  lessonsCount,
  instructorName,
  formationId,
  isLoggedIn,
  isEnrolled,
}: Props) {
  const meta = [
    {
      icon: BookOpen,
      text:
        `${sectionsCount} section${sectionsCount > 1 ? "s" : ""}` +
        ` · ${lessonsCount} leçon${lessonsCount > 1 ? "s" : ""}`,
      show: sectionsCount > 0 || lessonsCount > 0,
    },
    { icon: Clock, text: "Accès illimité", show: true },
    { icon: User, text: `Par ${instructorName}`, show: true },
  ].filter((m) => m.show);

  return (
    <div className="overflow-hidden rounded-2xl border border-primary-green/10 bg-white shadow-xl">
      {imageUrl && (
        <div className="relative aspect-4/3 w-full bg-background-beige-dark">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="320px"
            className="object-cover"
          />
        </div>
      )}
      <div className="p-6">
        <p className="font-serif text-3xl font-bold text-primary-red">
          {priceLabel}
        </p>
        <ul className="mt-4 space-y-2.5">
          {meta.map((m) => (
            <li
              key={m.text}
              className="flex items-center gap-2.5 text-sm text-primary-green/70"
            >
              <m.icon className="h-4 w-4 shrink-0 text-primary-green/50" aria-hidden />
              <span>{m.text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5">
          <PurchaseButton
            formationId={formationId}
            isLoggedIn={isLoggedIn}
            isEnrolled={isEnrolled}
          />
        </div>

        <nav className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-primary-green/10 pt-4">
          {ANCHORS.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="flex items-center gap-2 text-sm text-primary-green/70 transition-colors hover:text-primary-green"
            >
              <span className="h-1 w-1 rounded-full bg-primary-red" aria-hidden />
              {a.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
