"use client";

/**
 * Custom Tiptap extensions for the rich blog editor:
 *  - Image upload (Supabase storage)
 *  - Two-column layout
 *  - Callout / info box
 *
 * Kept in a separate file so `wysiwyg-editor.tsx` stays focused on the chrome
 * (toolbar, slash menu) and we can compose the extension list cleanly.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import {
  UpdatedImage,
  UploadImagesPlugin,
  createImageUpload,
  type UploadFn,
} from "novel";
import { uploadFileAction } from "@/lib/storage/actions";
import { toast } from "sonner";

// ─── Image upload wired to Supabase ─────────────────────────

const onUpload = async (file: File): Promise<string> => {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("bucket", "blog");
  fd.set("folder", "content");
  const result = await uploadFileAction(fd);
  if (!result.success || !result.data) {
    throw new Error(result.error ?? "Upload failed");
  }
  return result.data.url;
};

export const blogImageUpload: UploadFn = createImageUpload({
  onUpload,
  validateFn: (file) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Le fichier doit être une image.");
      return false;
    }
    if (file.size / 1024 / 1024 > 5) {
      toast.error("L'image dépasse 5 Mo.");
      return false;
    }
    return true;
  },
});

/** Image extension with drag/drop & paste hooks pre-wired. */
export const ImageExtension = UpdatedImage.extend({
  addProseMirrorPlugins() {
    return [UploadImagesPlugin({ imageClass: "rounded-lg shadow-sm" })];
  },
}).configure({
  HTMLAttributes: {
    class: "rounded-lg shadow-sm max-w-full h-auto",
  },
});

// ─── Columns layout ─────────────────────────────────────────

export const Column = Node.create({
  name: "column",
  group: "column",
  content: "block+",
  isolating: true,
  parseHTML() {
    return [{ tag: "div[data-column]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-column": "",
        class: "flex-1 min-w-0",
      }),
      0,
    ];
  },
});

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column+",
  addAttributes() {
    return {
      count: {
        default: 2,
        parseHTML: (el) => Number(el.getAttribute("data-columns-count")) || 2,
        renderHTML: (attrs) => ({
          "data-columns-count": String(attrs.count ?? 2),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-columns]" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const count = Number(node.attrs.count) === 3 ? 3 : 2;
    const gridClass =
      count === 3
        ? "grid grid-cols-1 gap-4 md:grid-cols-3 my-6 not-prose [&>div]:min-w-0"
        : "grid grid-cols-1 gap-4 md:grid-cols-2 my-6 not-prose [&>div]:min-w-0";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-columns": "",
        class: gridClass,
      }),
      0,
    ];
  },
  addCommands() {
    const insertCols = (count: 2 | 3) =>
      ({ commands }: { commands: { insertContent: (c: unknown) => boolean } }) =>
        commands.insertContent({
          type: "columns",
          attrs: { count },
          content: Array.from({ length: count }, () => ({
            type: "column",
            content: [{ type: "paragraph" }],
          })),
        });

    return {
      setColumns: () => insertCols(2),
      setColumns3: () => insertCols(3),
    } as Record<string, unknown> as Partial<Record<string, (...args: unknown[]) => unknown>>;
  },
});

// Module augmentation skipped: Maily already augments `@tiptap/core` Commands
// for `columns` with a different shape — declaring it again triggers TS2717.
// Callers use `(editor as any).chain().setColumns()` instead.

// ─── Callout / info box ─────────────────────────────────────

export type CalloutVariant = "info" | "tip" | "warning" | "note";

const CALLOUT_STYLES: Record<CalloutVariant, string> = {
  info: "bg-background-beige-dark border-primary-green/20 text-primary-green",
  tip: "bg-primary-red/5 border-primary-red/30 text-primary-red-dark",
  warning: "bg-amber-50 border-amber-300 text-amber-900",
  note: "bg-slate-50 border-slate-300 text-slate-800",
};

export const Callout = Node.create<{ HTMLAttributes: Record<string, string> }>({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      variant: {
        default: "info" as CalloutVariant,
        parseHTML: (el) =>
          (el.getAttribute("data-callout-variant") as CalloutVariant) ?? "info",
        renderHTML: (attrs) => ({
          "data-callout-variant": attrs.variant as string,
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const variant = (node.attrs.variant ?? "info") as CalloutVariant;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-callout": "",
        class: `not-prose my-6 rounded-lg border-l-4 px-4 py-3 ${CALLOUT_STYLES[variant]}`,
      }),
      0,
    ];
  },
  addCommands() {
    return {
      setCallout:
        (variant: CalloutVariant = "info") =>
        ({ commands }: { commands: { insertContent: (c: unknown) => boolean } }) =>
          commands.insertContent({
            type: this.name,
            attrs: { variant },
            content: [{ type: "paragraph" }],
          }),
    } as Record<string, unknown> as Partial<Record<string, (...args: unknown[]) => unknown>>;
  },
});
