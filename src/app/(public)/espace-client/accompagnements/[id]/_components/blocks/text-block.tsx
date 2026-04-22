"use client";

type TextBlockProps = {
  content: { html: string };
};

export const TextBlock = ({ content }: TextBlockProps) => (
  <div
    className="prose prose-green max-w-none"
    dangerouslySetInnerHTML={{ __html: content.html }}
  />
);
