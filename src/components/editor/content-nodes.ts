import { Node, mergeAttributes } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { parseVideoUrl } from "./video-url";

type VideoChain = {
  focus(): VideoChain;
  deleteRange(r: { from: number; to: number }): VideoChain;
  setVideoEmbed(url: string): VideoChain;
  run(): boolean;
};

/**
 * Demande l'URL de la vidéo et insère le lecteur.
 *
 * Vit ici plutôt que dans `wysiwyg-editor` : la bibliothèque latérale s'en sert
 * aussi, et l'importer de l'éditeur créerait un cycle entre les deux modules.
 *
 * L'URL est validée par `setVideoEmbed`, qui refuse tout ce qui n'est ni
 * YouTube ni Vimeo — on prévient alors plutôt que de laisser croire à une
 * insertion silencieuse.
 */
export const insertVideo = (
  editor: Editor,
  range: { from: number; to: number } | null,
) => {
  const url = window.prompt("Lien de la vidéo (YouTube ou Vimeo)", "") ?? "";
  if (!url) return false;

  const chain = (editor.chain() as unknown as VideoChain).focus();
  if (range) chain.deleteRange(range);
  const inserted = chain.setVideoEmbed(url).run();

  if (!inserted) toast.error("Lien non reconnu, attendu : YouTube ou Vimeo");
  return inserted;
};

/**
 * Vidéo embarquée — YouTube ou Vimeo.
 *
 * Écrite ici plutôt qu'en réutilisant `@tiptap/extension-youtube` (fourni par
 * novel) pour deux raisons : Vimeo n'y est pas géré, et un seul bloc « Vidéo »
 * vaut mieux que deux entrées à choisir dans la bibliothèque.
 *
 * Le conteneur porte le ratio 16/9 : sans lui, l'`iframe` s'affiche à sa taille
 * par défaut et déborde de la colonne d'article sur mobile.
 */
export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (el) =>
          el.querySelector("iframe")?.getAttribute("src") ??
          el.getAttribute("data-video-src") ??
          "",
        renderHTML: (attrs) => ({ "data-video-src": attrs.src as string }),
      },
      provider: {
        default: "youtube",
        parseHTML: (el) => el.getAttribute("data-video-provider") ?? "youtube",
        renderHTML: (attrs) => ({
          "data-video-provider": attrs.provider as string,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-video-embed]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-video-embed": "",
        class: "not-prose my-6 aspect-video w-full overflow-hidden rounded-xl",
      }),
      [
        "iframe",
        {
          src: node.attrs.src as string,
          class: "h-full w-full",
          loading: "lazy",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen",
          allowfullscreen: "true",
          frameborder: "0",
        },
      ],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        (url: string) =>
        ({ commands }: { commands: { insertContent: (c: unknown) => boolean } }) => {
          const parsed = parseVideoUrl(url);
          // Une URL non reconnue n'insère rien : mieux vaut un bloc absent
          // qu'un lecteur vide au milieu de l'article.
          if (!parsed) return false;

          return commands.insertContent({
            type: "videoEmbed",
            attrs: { src: parsed.embedUrl, provider: parsed.provider },
          });
        },
    } as Record<string, unknown> as Partial<
      Record<string, (...args: unknown[]) => unknown>
    >;
  },
});

/**
 * Accordéon repliable — une question, sa réponse.
 *
 * Rendu en `details`/`summary` natifs plutôt qu'en JavaScript : le contenu
 * reste dans le HTML de la page même replié, donc lisible par les moteurs de
 * recherche, et le repli fonctionne sans hydratation.
 */
export const Accordion = Node.create({
  name: "accordion",
  group: "block",
  content: "accordionSummary block+",
  defining: true,

  parseHTML() {
    return [{ tag: "details[data-accordion]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, {
        "data-accordion": "",
        class:
          "not-prose my-4 rounded-lg border border-primary-green/15 bg-background-beige-dark/30 px-4 py-3",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setAccordion:
        () =>
        ({ commands }: { commands: { insertContent: (c: unknown) => boolean } }) =>
          commands.insertContent({
            type: this.name,
            content: [
              {
                type: "accordionSummary",
                content: [{ type: "text", text: "Votre question ?" }],
              },
              { type: "paragraph" },
            ],
          }),
    } as Record<string, unknown> as Partial<
      Record<string, (...args: unknown[]) => unknown>
    >;
  },
});

/** L'intitulé cliquable de l'accordéon. Toujours présent, jamais supprimable
 *  seul : un `details` sans `summary` afficherait « Détails » en anglais. */
export const AccordionSummary = Node.create({
  name: "accordionSummary",
  content: "inline*",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "summary" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "summary",
      mergeAttributes(HTMLAttributes, {
        class: "cursor-pointer font-medium text-primary-green",
      }),
      0,
    ];
  },
});
