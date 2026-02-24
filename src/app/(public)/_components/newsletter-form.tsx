"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2 } from "lucide-react";

export const NewsletterForm = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setTimeout(() => {
      setStatus("success");
      setEmail("");
    }, 800);
  };

  if (status === "success") {
    return (
      <div className="mt-8 flex items-center justify-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <p className="font-medium">Merci ! Vous recevrez nos prochaines actualités.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-8 flex max-w-md gap-3"
    >
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="votre@email.com"
        required
        className="flex-1"
        aria-label="Adresse email pour la newsletter"
      />
      <Button
        type="submit"
        disabled={status === "loading"}
        className="bg-primary-red hover:bg-primary-red-dark"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "S'inscrire"
        )}
      </Button>
    </form>
  );
};
