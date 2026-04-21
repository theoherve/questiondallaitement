"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Globe, EyeOff, Archive } from "lucide-react";
import { updateFormationStatus } from "../actions";
import { toast } from "sonner";

type Status = "draft" | "published" | "archived";

const STATUS_CONFIG: Record<
  Status,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  draft: { label: "Brouillon", variant: "secondary" },
  published: { label: "Publiée", variant: "default" },
  archived: { label: "Archivée", variant: "outline" },
};

type Props = {
  formationId: string;
  currentStatus: Status;
};

export const FormationStatusToggle = ({
  formationId,
  currentStatus,
}: Props) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<Status>(currentStatus);

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  const handleChange = async (newStatus: Status) => {
    if (newStatus === status) return;
    setIsPending(true);
    const result = await updateFormationStatus(formationId, newStatus);
    setIsPending(false);

    if (result.success) {
      setStatus(newStatus);
      toast.success(
        newStatus === "published"
          ? "Accompagnement publié"
          : newStatus === "archived"
            ? "Accompagnement archivé"
            : "Accompagnement dépublié"
      );
      router.refresh();
    } else {
      toast.error(result.error ?? "Erreur lors du changement de statut");
    }
  };

  const actions: { status: Status; label: string; icon: React.ReactNode }[] = [
    {
      status: "published",
      label: "Publier",
      icon: <Globe className="mr-2 h-3.5 w-3.5 text-green-600" />,
    },
    {
      status: "draft",
      label: "Dépublier (brouillon)",
      icon: <EyeOff className="mr-2 h-3.5 w-3.5 text-yellow-600" />,
    },
    {
      status: "archived",
      label: "Archiver",
      icon: <Archive className="mr-2 h-3.5 w-3.5 text-gray-500" />,
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="h-7 gap-1 px-2"
        >
          <Badge variant={config.variant} className="pointer-events-none">
            {config.label}
          </Badge>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
          Changer le statut
        </p>
        <DropdownMenuSeparator />
        {actions
          .filter((a) => a.status !== status)
          .map((a) => (
            <DropdownMenuItem
              key={a.status}
              onClick={() => handleChange(a.status)}
              className="cursor-pointer text-sm"
            >
              {a.icon}
              {a.label}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
