"use client";

import { useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Code2, ImagePlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadFileAction } from "@/lib/storage/actions";

// ─── Bloc de code HTML brut ─────────────────────────────────

/**
 * Éditeur du bloc : on bascule entre le rendu et le code source.
 *
 * Le rendu est affiché tel qu'il apparaîtra dans l'article — c'est le seul
 * moyen de vérifier son HTML sans publier. Il est rendu inerte par
 * `pointer-events-none` : sans cela, cliquer sur un lien du bloc quitterait
 * l'administration en pleine rédaction.
 */
const RawHtmlView = ({ node, updateAttributes }: NodeViewProps) => {
  const html = node.attrs.html as string;
  const [editing, setEditing] = useState(!html);
  const [draft, setDraft] = useState(html);

  return (
    <NodeViewWrapper className="not-prose my-4">
      <div className="rounded-lg border-2 border-dashed border-primary-green/25 bg-background-beige-dark/20">
        <div className="flex items-center justify-between gap-2 border-b border-primary-green/10 px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-medium text-primary-green/80">
            <Code2 className="h-4 w-4" />
            Code HTML
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (editing) updateAttributes({ html: draft });
              setEditing((current) => !current);
            }}
          >
            {editing ? "Appliquer" : "Modifier"}
          </Button>
        </div>

        {editing ? (
          <div className="space-y-2 p-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={12}
              spellCheck={false}
              className="font-mono text-xs"
              placeholder="<div style=&quot;…&quot;>Votre HTML</div>"
            />
            <p className="text-xs text-primary-green/60">
              Le HTML est inséré tel quel dans l&apos;article. Les balises
              &lt;script&gt; ne sont jamais exécutées.
            </p>
          </div>
        ) : (
          <div
            className="pointer-events-none p-3"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
};

/**
 * Bloc de HTML brut, interprété dans l'article publié.
 *
 * Le corps d'article est déjà du HTML rédigé en administration et rendu tel
 * quel : ce bloc n'élargit donc pas la surface de confiance, il rend
 * seulement explicite ce qui était déjà possible. Les `script` restent inertes
 * — ni `innerHTML` ni `dangerouslySetInnerHTML` ne les exécutent.
 */
export const RawHtmlBlock = Node.create({
  name: "rawHtml",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      html: {
        default: "",
        // Le HTML vit dans le contenu de la balise, pas dans un attribut :
        // l'échapper dans un attribut le rendrait illisible et fragile dès
        // qu'il contient des guillemets.
        parseHTML: (el) => el.innerHTML ?? "",
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-raw-html]" }];
  },

  /**
   * Renvoie un élément DOM réel plutôt qu'un gabarit.
   *
   * ProseMirror accepte les deux, et c'est le seul moyen d'émettre du HTML
   * arbitraire : un gabarit `["div", {...}, 0]` ne sait produire que des
   * enfants qu'il connaît, jamais une chaîne à interpréter.
   */
  renderHTML({ HTMLAttributes, node }) {
    const wrapper = document.createElement("div");
    for (const [key, value] of Object.entries(
      mergeAttributes(HTMLAttributes, { "data-raw-html": "", class: "not-prose" }),
    )) {
      if (value != null) wrapper.setAttribute(key, String(value));
    }
    wrapper.innerHTML = (node.attrs.html as string) ?? "";
    return wrapper;
  },

  addNodeView() {
    return ReactNodeViewRenderer(RawHtmlView);
  },

  addCommands() {
    return {
      setRawHtml:
        (html = "") =>
        ({ commands }: { commands: { insertContent: (c: unknown) => boolean } }) =>
          commands.insertContent({ type: this.name, attrs: { html } }),
    } as Record<string, unknown> as Partial<
      Record<string, (...args: unknown[]) => unknown>
    >;
  },
});

// ─── Bannière d'appel à l'action ────────────────────────────

const DEFAULT_BANNER = {
  imageUrl: "",
  imageAlt: "",
  text: "Sondage : mon bébé est-il le seul à se réveiller la nuit ?",
  buttonLabel: "Je participe",
  href: "",
};

const BannerView = ({ node, updateAttributes }: NodeViewProps) => {
  const attrs = node.attrs as typeof DEFAULT_BANNER;
  const [editing, setEditing] = useState(!attrs.href);
  const [uploading, setUploading] = useState(false);

  const upload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setUploading(true);
      const form = new FormData();
      form.set("file", file);
      // `bucket` et `folder` sont exigés par l'action : sans eux elle refuse
      // l'envoi. Mêmes valeurs que le bloc Image, pour que les visuels d'un
      // article vivent tous au même endroit.
      form.set("bucket", "blog");
      form.set("folder", "content");
      const result = await uploadFileAction(form);
      setUploading(false);

      if (result.success && result.data) {
        updateAttributes({ imageUrl: result.data.url, imageAlt: file.name });
      } else {
        toast.error(result.error ?? "Upload échoué");
      }
    };
    input.click();
  };

  return (
    <NodeViewWrapper className="not-prose my-6">
      <BannerPreview {...attrs} />

      <div className="mt-2 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing((current) => !current)}
        >
          <Pencil className="mr-1 h-3 w-3" />
          {editing ? "Terminer" : "Modifier"}
        </Button>
      </div>

      {editing && (
        <div className="mt-2 space-y-3 rounded-lg border border-primary-green/15 bg-background-beige-dark/30 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`banner-text-${node.attrs.href}`}>Texte</Label>
              <Input
                id={`banner-text-${node.attrs.href}`}
                value={attrs.text}
                onChange={(event) => updateAttributes({ text: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor={`banner-label-${node.attrs.href}`}>
                Libellé du bouton
              </Label>
              <Input
                id={`banner-label-${node.attrs.href}`}
                value={attrs.buttonLabel}
                onChange={(event) =>
                  updateAttributes({ buttonLabel: event.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`banner-href-${node.attrs.href}`}>
              Lien de destination
            </Label>
            <Input
              id={`banner-href-${node.attrs.href}`}
              value={attrs.href}
              placeholder="https://…  ou  /blog/mon-article"
              onChange={(event) => updateAttributes({ href: event.target.value })}
            />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1">
              <Label htmlFor={`banner-image-${node.attrs.href}`}>
                Adresse de l&apos;image
              </Label>
              <Input
                id={`banner-image-${node.attrs.href}`}
                value={attrs.imageUrl}
                onChange={(event) =>
                  updateAttributes({ imageUrl: event.target.value })
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={upload}
              disabled={uploading}
            >
              <ImagePlus className="mr-1 h-3 w-3" />
              {uploading ? "Envoi…" : "Téléverser"}
            </Button>
          </div>

          <div>
            <Label htmlFor={`banner-alt-${node.attrs.href}`}>
              Texte alternatif de l&apos;image
            </Label>
            <Input
              id={`banner-alt-${node.attrs.href}`}
              value={attrs.imageAlt}
              placeholder="Décrit l'image pour les lecteurs d'écran"
              onChange={(event) =>
                updateAttributes({ imageAlt: event.target.value })
              }
            />
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

/** Rendu d'édition. Volontairement au plus près du HTML publié ci-dessous —
 *  ce que voit la rédactrice doit être ce que verra le lecteur. */
const BannerPreview = ({
  imageUrl,
  imageAlt,
  text,
  buttonLabel,
}: typeof DEFAULT_BANNER) => (
  <div className="flex flex-col items-stretch gap-4 overflow-hidden rounded border border-primary-red sm:h-40 sm:flex-row sm:items-center sm:pr-8">
    {imageUrl ? (
      // Adresse libre, saisie par la rédactrice : `next/image` exigerait un
      // domaine déclaré dans next.config, impossible à prévoir ici.
      // eslint-disable-next-line @next/next/no-img-element -- cf. ci-dessus
      <img
        src={imageUrl}
        alt={imageAlt}
        className="h-40 w-full object-cover sm:h-full sm:w-2/5"
      />
    ) : (
      <div className="flex h-40 w-full items-center justify-center bg-background-beige-dark text-sm text-primary-green/50 sm:h-full sm:w-2/5">
        Aucune image
      </div>
    )}

    <div className="flex-1 px-4 font-serif text-lg font-medium text-primary-red sm:px-0">
      {text}
    </div>

    <span className="mx-4 mb-4 rounded-sm bg-primary-red px-8 py-3 text-center text-lg text-white sm:mx-0 sm:mb-0">
      {buttonLabel}
    </span>
  </div>
);

/**
 * Bannière image + accroche + bouton.
 *
 * Reprend la bannière que Carole codait à la main dans Wix, en la rendant
 * paramétrable : plus besoin de recopier du HTML pour changer une image ou une
 * URL. Contrairement à l'original, elle s'empile en dessous de 640 px — la
 * version d'origine, figée à 162 px de haut avec une image à 40 %, devenait
 * illisible sur téléphone.
 */
export const CtaBanner = Node.create({
  name: "ctaBanner",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      imageUrl: {
        default: DEFAULT_BANNER.imageUrl,
        parseHTML: (el) => el.querySelector("img")?.getAttribute("src") ?? "",
        renderHTML: () => ({}),
      },
      imageAlt: {
        default: DEFAULT_BANNER.imageAlt,
        parseHTML: (el) => el.querySelector("img")?.getAttribute("alt") ?? "",
        renderHTML: () => ({}),
      },
      text: {
        default: DEFAULT_BANNER.text,
        parseHTML: (el) =>
          el.querySelector("[data-banner-text]")?.textContent?.trim() ?? "",
        renderHTML: () => ({}),
      },
      buttonLabel: {
        default: DEFAULT_BANNER.buttonLabel,
        parseHTML: (el) => el.querySelector("a")?.textContent?.trim() ?? "",
        renderHTML: () => ({}),
      },
      href: {
        default: DEFAULT_BANNER.href,
        parseHTML: (el) => el.querySelector("a")?.getAttribute("href") ?? "",
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-cta-banner]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const attrs = node.attrs as typeof DEFAULT_BANNER;

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-cta-banner": "",
        class:
          "not-prose my-6 flex flex-col items-stretch gap-4 overflow-hidden rounded border border-primary-red sm:h-40 sm:flex-row sm:items-center sm:pr-8",
      }),
      [
        "img",
        {
          src: attrs.imageUrl,
          alt: attrs.imageAlt,
          loading: "lazy",
          class: "h-40 w-full object-cover sm:h-full sm:w-2/5",
        },
      ],
      [
        "div",
        {
          "data-banner-text": "",
          class:
            "flex-1 px-4 font-serif text-lg font-medium text-primary-red sm:px-0",
        },
        attrs.text,
      ],
      [
        "a",
        {
          href: attrs.href,
          target: "_blank",
          // `noopener` est indispensable avec `target="_blank"` : sans lui, la
          // page ouverte garde une référence vers celle-ci et peut la rediriger.
          rel: "noopener noreferrer",
          class:
            "mx-4 mb-4 rounded-sm bg-primary-red px-8 py-3 text-center text-lg text-white no-underline transition-colors hover:bg-primary-red-dark sm:mx-0 sm:mb-0",
        },
        attrs.buttonLabel,
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BannerView);
  },

  addCommands() {
    return {
      setCtaBanner:
        () =>
        ({ commands }: { commands: { insertContent: (c: unknown) => boolean } }) =>
          commands.insertContent({
            type: this.name,
            attrs: { ...DEFAULT_BANNER },
          }),
    } as Record<string, unknown> as Partial<
      Record<string, (...args: unknown[]) => unknown>
    >;
  },
});
