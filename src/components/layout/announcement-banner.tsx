"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { dismissKey } from "./announcement-banner-dismiss";

type Props = {
  message: string;
  linkUrl: string | null;
  linkLabel: string;
};

export const AnnouncementBanner = ({ message, linkUrl, linkLabel }: Props) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey(message)) === "1");
  }, [message]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey(message), "1");
    setDismissed(true);
  };

  return (
    <div className="flex items-center justify-center gap-3 bg-primary-rose px-4 py-2 text-center text-sm text-white">
      <span>
        {message}
        {linkUrl && (
          <a href={linkUrl} className="ml-2 underline underline-offset-2">
            {linkLabel || linkUrl}
          </a>
        )}
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fermer le bandeau d'annonce"
        className="shrink-0 rounded p-0.5 hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
