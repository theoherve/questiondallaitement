"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarPlus, Apple, Download } from "lucide-react";
import {
  buildGoogleCalendarUrl,
  downloadIcsFile,
  type CalendarEventInput,
} from "@/lib/calendar/ics";

type AddToCalendarButtonProps = {
  event: CalendarEventInput;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
};

/** Bouton "Ajouter à mon agenda" : lien direct Google, .ics pour Apple/Outlook/le reste. */
export const AddToCalendarButton = ({
  event,
  variant = "outline",
  size = "sm",
  className,
}: AddToCalendarButtonProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <CalendarPlus className="h-4 w-4" />
          Ajouter à mon agenda
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem asChild>
          <a
            href={buildGoogleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <CalendarPlus className="h-4 w-4" />
            Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadIcsFile(event)}>
          <Apple className="h-4 w-4" />
          Apple Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadIcsFile(event)}>
          <Download className="h-4 w-4" />
          Outlook / fichier .ics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
