"use client";

import { TextBlock } from "./blocks/text-block";
import { VideoBlock } from "./blocks/video-block";
import { ImageBlock } from "./blocks/image-block";
import { QuizBlock } from "./blocks/quiz-block";
import { DownloadBlock } from "./blocks/download-block";

type BlockRendererProps = {
  type: string;
  content: unknown;
  formationId: string;
  blockId: string;
};

export const BlockRenderer = ({
  type,
  content,
  formationId,
  blockId,
}: BlockRendererProps) => {
  switch (type) {
    case "text":
      return <TextBlock content={content as { html: string }} />;
    case "video":
      return (
        <VideoBlock
          content={
            content as { provider: "vimeo" | "youtube"; video_id: string; title: string }
          }
        />
      );
    case "image":
      return (
        <ImageBlock
          content={content as { url: string; alt: string; caption?: string }}
        />
      );
    case "quiz":
      return (
        <QuizBlock
          content={
            content as {
              question: string;
              options: { id: string; text: string; is_correct: boolean }[];
              explanation: string;
            }
          }
        />
      );
    case "download":
      return (
        <DownloadBlock
          content={
            content as { url: string; filename: string; size_bytes: number }
          }
          formationId={formationId}
          blockId={blockId}
        />
      );
    default:
      return (
        <p className="text-sm text-muted-foreground italic">
          Type de bloc non supporté : {type}
        </p>
      );
  }
};
