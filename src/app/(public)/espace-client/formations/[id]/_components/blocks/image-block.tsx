"use client";

type ImageBlockProps = {
  content: {
    url: string;
    alt: string;
    caption?: string;
  };
};

export const ImageBlock = ({ content }: ImageBlockProps) => (
  <figure className="space-y-2">
    <img
      src={content.url}
      alt={content.alt}
      className="w-full rounded-lg object-cover"
      loading="lazy"
    />
    {content.caption && (
      <figcaption className="text-center text-sm text-muted-foreground italic">
        {content.caption}
      </figcaption>
    )}
  </figure>
);
