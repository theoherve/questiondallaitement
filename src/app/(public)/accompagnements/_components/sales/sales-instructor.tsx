import Image from "next/image";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Section } from "./section";

export function SalesInstructor({
  title,
  name,
  bio,
  fallbackBio,
  avatarUrl,
  credentials,
}: {
  title: string;
  name: string;
  bio: string | null;
  fallbackBio: string;
  avatarUrl: string | null;
  credentials: readonly string[];
}) {
  const displayBio = bio ?? fallbackBio;
  return (
    <Section className="bg-accent-cream">
      <ScrollReveal className="mx-auto max-w-3xl">
        <h2 className="text-center font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
        <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={112}
              height={112}
              className="h-28 w-28 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="h-28 w-28 shrink-0 rounded-full bg-primary-green/10" />
          )}
          <div>
            <p className="font-serif text-xl font-semibold text-primary-green">
              {name}
            </p>
            <p className="mt-2 text-primary-green/70">{displayBio}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {credentials.map((c) => (
                <li
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-green/10 px-3 py-1 text-xs font-medium text-primary-green"
                >
                  <CheckCircle className="h-3 w-3 shrink-0 text-accent-sage" aria-hidden />
                  {c}
                </li>
              ))}
            </ul>
            <Link
              href="/a-propos"
              className="mt-4 inline-block text-sm text-primary-green underline-offset-2 hover:underline"
            >
              En savoir plus sur son parcours
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </Section>
  );
}
