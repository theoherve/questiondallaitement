"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { Loader2, Save, ImageIcon, Info } from "lucide-react";
import {
  renderBrandHeaderHtml,
  renderBrandFooterHtml,
  type EmailBranding,
} from "@/lib/emails/branding";
import { updateEmailBrandingAction } from "@/lib/emails/branding-action";

type Props = { branding: EmailBranding };

/** Champ couleur : pastille cliquable + saisie hexadecimale, toujours synchrones. */
const ColorField = ({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded border bg-transparent p-1"
        aria-label={`${label}, sélecteur de couleur`}
      />
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono"
        aria-label={label}
      />
    </div>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export const EmailBrandingForm = ({ branding }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<EmailBranding>(branding);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof EmailBranding>(key: K, value: EmailBranding[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // L'apercu reutilise les fonctions qui produisent le HTML reellement envoye :
  // ce qui s'affiche ici est, au pixel, ce que recevra la destinataire.
  const headerHtml = useMemo(() => renderBrandHeaderHtml(form), [form]);
  const footerHtml = useMemo(() => renderBrandFooterHtml(form), [form]);

  const hasBanner =
    Boolean(form.banner_image_url) ||
    Boolean(form.banner_title) ||
    Boolean(form.banner_text) ||
    Boolean(form.banner_cta_label && form.banner_cta_url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateEmailBrandingAction(form);
      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
        return;
      }
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            En-tête des emails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Afficher le logo en en-tête</p>
              <p className="text-sm text-muted-foreground">
                Ajouté automatiquement en haut de tous les emails : transactionnels,
                campagnes, factures. Aucun template à modifier.
              </p>
            </div>
            <Switch
              checked={form.header_enabled}
              onCheckedChange={(v) => set("header_enabled", v)}
              aria-label="Afficher le logo en en-tête des emails"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo</Label>
            <FileUpload
              bucket="mails"
              folder="branding"
              accept="image/png,image/jpeg,image/webp"
              maxSizeMb={2}
              value={form.logo_url ?? undefined}
              onUpload={(url) => set("logo_url", url)}
              onRemove={() => set("logo_url", null)}
              label="Déposer le logo (PNG, JPG ou WebP)"
              cropAspect="free"
            />
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Pas de SVG : Gmail et Outlook ne l&apos;affichent pas. Fournissez une
              image deux fois plus large que la largeur d&apos;affichage pour un
              rendu net sur écrans retina.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="logo_alt">Texte alternatif</Label>
              <Input
                id="logo_alt"
                value={form.logo_alt}
                onChange={(e) => set("logo_alt", e.target.value)}
                aria-label="Texte alternatif du logo"
              />
              <p className="text-xs text-muted-foreground">
                Affiché quand la messagerie bloque les images, le cas par défaut
                chez beaucoup de destinataires.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_width">Largeur d&apos;affichage (px)</Label>
              <Input
                id="logo_width"
                type="number"
                min={60}
                max={300}
                step={10}
                value={form.logo_width}
                onChange={(e) => set("logo_width", Number(e.target.value))}
                aria-label="Largeur du logo en pixels"
              />
              <p className="text-xs text-muted-foreground">
                Entre 60 et 300 px. Recommandé : 140 à 180 px.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              id="header_background"
              label="Fond de l'en-tête"
              value={form.header_background}
              onChange={(v) => set("header_background", v)}
              hint="Beige de la marque : #fff8f6"
            />
            <div className="space-y-2">
              <Label htmlFor="header_link_url">Lien du logo (optionnel)</Label>
              <Input
                id="header_link_url"
                type="url"
                placeholder="https://questiondallaitement.com"
                value={form.header_link_url ?? ""}
                onChange={(e) => set("header_link_url", e.target.value || null)}
                aria-label="Lien du logo"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">Pied de page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Ajouter un pied de page</p>
              <p className="text-sm text-muted-foreground">
                Une ligne par paragraphe. Ajouté sous le contenu de chaque email.
              </p>
            </div>
            <Switch
              checked={form.footer_enabled}
              onCheckedChange={(v) => set("footer_enabled", v)}
              aria-label="Ajouter un pied de page aux emails"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footer_text">Texte du pied de page</Label>
            <Textarea
              id="footer_text"
              rows={3}
              value={form.footer_text}
              onChange={(e) => set("footer_text", e.target.value)}
              aria-label="Texte du pied de page"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-green">
            <ImageIcon className="h-4 w-4" />
            Bannière pré-définie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg bg-background-beige-dark px-3 py-2 text-sm text-muted-foreground">
            Cette bannière n&apos;est pas ajoutée automatiquement : elle
            s&apos;insère en un clic depuis l&apos;éditeur d&apos;email, bouton
            «&nbsp;Insérer la bannière&nbsp;». Le titre et le texte restent
            modifiables après insertion.
          </p>

          <div className="space-y-2">
            <Label>Image de la bannière</Label>
            <FileUpload
              bucket="mails"
              folder="branding"
              accept="image/png,image/jpeg,image/webp"
              maxSizeMb={3}
              value={form.banner_image_url ?? undefined}
              onUpload={(url) => set("banner_image_url", url)}
              onRemove={() => set("banner_image_url", null)}
              label="Déposer la bannière (largeur idéale 1104 px)"
              cropAspect="16:9"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner_alt">Texte alternatif de l&apos;image</Label>
              <Input
                id="banner_alt"
                value={form.banner_alt}
                onChange={(e) => set("banner_alt", e.target.value)}
                aria-label="Texte alternatif de la bannière"
              />
            </div>
            <ColorField
              id="banner_background"
              label="Fond de la bannière"
              value={form.banner_background}
              onChange={(v) => set("banner_background", v)}
              hint="Beige foncé de la marque : #f5ebe8"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner_title">Titre</Label>
            <Input
              id="banner_title"
              value={form.banner_title}
              onChange={(e) => set("banner_title", e.target.value)}
              placeholder="Prochaine formation en septembre"
              aria-label="Titre de la bannière"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner_text">Texte</Label>
            <Textarea
              id="banner_text"
              rows={2}
              value={form.banner_text}
              onChange={(e) => set("banner_text", e.target.value)}
              placeholder="Deux jours pour approfondir l'accompagnement en lactation."
              aria-label="Texte de la bannière"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner_cta_label">Libellé du bouton</Label>
              <Input
                id="banner_cta_label"
                value={form.banner_cta_label}
                onChange={(e) => set("banner_cta_label", e.target.value)}
                placeholder="Voir les formations"
                aria-label="Libellé du bouton de la bannière"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner_cta_url">Lien du bouton</Label>
              <Input
                id="banner_cta_url"
                type="url"
                value={form.banner_cta_url ?? ""}
                onChange={(e) => set("banner_cta_url", e.target.value || null)}
                placeholder="https://questiondallaitement.com/formations"
                aria-label="Lien du bouton de la bannière"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Le bouton n&apos;apparaît que si le libellé et le lien sont tous les
            deux renseignés.
          </p>
        </CardContent>
      </Card>

      {/* ─── Aperçu ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">Aperçu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mx-auto max-w-150 overflow-hidden rounded-lg border bg-white">
            {headerHtml ? (
              <div dangerouslySetInnerHTML={{ __html: headerHtml }} />
            ) : (
              <div className="border-b border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                Aucun en-tête (logo manquant ou désactivé)
              </div>
            )}

            <div className="space-y-3 px-6 py-6">
              <div className="h-4 w-2/5 rounded bg-primary-green/15" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-11/12 rounded bg-muted" />
              <div className="h-3 w-3/4 rounded bg-muted" />

              {hasBanner && (
                <div
                  className="space-y-3 rounded-lg p-5 text-center"
                  style={{ backgroundColor: form.banner_background }}
                >
                  {form.banner_image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={form.banner_image_url}
                      alt={form.banner_alt || form.banner_title || "Bannière"}
                      className="mx-auto w-full rounded"
                    />
                  )}
                  {form.banner_title && (
                    <p className="font-serif text-lg font-bold text-primary-green">
                      {form.banner_title}
                    </p>
                  )}
                  {form.banner_text && (
                    <p className="text-sm text-primary-green">{form.banner_text}</p>
                  )}
                  {form.banner_cta_label && form.banner_cta_url && (
                    <span className="inline-block rounded-md bg-primary-red px-6 py-2.5 text-sm font-medium text-white">
                      {form.banner_cta_label}
                    </span>
                  )}
                </div>
              )}

              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>

            {footerHtml ? (
              <div dangerouslySetInnerHTML={{ __html: footerHtml }} />
            ) : (
              <div className="border-t border-dashed px-4 py-4 text-center text-xs text-muted-foreground">
                Aucun pied de page
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            En-tête et pied de page sont rendus avec le HTML réellement envoyé.
            Le corps est simulé.
          </p>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm font-medium text-green-600" role="status">
          Identité visuelle enregistrée. Elle s&apos;applique aux prochains envois.
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="bg-primary-red hover:bg-primary-red-dark"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Enregistrer l&apos;identité email
      </Button>
    </form>
  );
};
