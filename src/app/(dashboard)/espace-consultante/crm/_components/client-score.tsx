import { cn } from "@/lib/utils";

interface Props {
  score: number;
  size?: "sm" | "md";
}

function getScoreColor(score: number) {
  if (score >= 71) return "bg-green-100 text-green-800";
  if (score >= 41) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

function getScoreLabel(score: number) {
  if (score >= 71) return "Fidèle";
  if (score >= 41) return "Actif";
  return "Nouveau";
}

export function ClientScore({ score, size = "sm" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        getScoreColor(score),
      )}
      title={`Score client : ${score}/100`}
    >
      <span>{score}</span>
      <span className="opacity-70">/100</span>
      {size === "md" && (
        <span className="ml-1 opacity-70">&middot; {getScoreLabel(score)}</span>
      )}
    </span>
  );
}
