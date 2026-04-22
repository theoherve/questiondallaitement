"use client";

type VideoBlockProps = {
  content: {
    provider: "vimeo" | "youtube";
    video_id: string;
    title: string;
  };
};

const getEmbedUrl = (provider: string, videoId: string): string => {
  if (provider === "vimeo") {
    return `https://player.vimeo.com/video/${videoId}?dnt=1`;
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
};

export const VideoBlock = ({ content }: VideoBlockProps) => (
  <div className="space-y-2">
    {content.title && (
      <h3 className="font-medium text-primary-green">{content.title}</h3>
    )}
    <div className="relative aspect-video overflow-hidden rounded-lg">
      <iframe
        src={getEmbedUrl(content.provider, content.video_id)}
        title={content.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
      />
    </div>
  </div>
);
