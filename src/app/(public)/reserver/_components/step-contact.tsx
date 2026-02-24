"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { contactSchema } from "@/validations/bookings";

type ContactValues = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  reason: string;
};

type StepContactProps = {
  initialValues: ContactValues | null;
  onSubmit: (values: ContactValues) => void;
};

export const StepContact = ({ initialValues, onSubmit }: StepContactProps) => {
  const [values, setValues] = useState<ContactValues>(
    initialValues ?? {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      reason: "",
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    field: keyof ContactValues,
    value: string
  ) => {
    setValues({ ...values, [field]: value });
    setErrors({ ...errors, [field]: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-serif text-xl font-semibold text-primary-green">
        Vos coordonnées
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">Prénom</Label>
          <Input
            id="first_name"
            value={values.first_name}
            onChange={(e) => handleChange("first_name", e.target.value)}
            required
            aria-label="Prénom"
          />
          {errors.first_name && (
            <p className="text-xs text-destructive">{errors.first_name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Nom</Label>
          <Input
            id="last_name"
            value={values.last_name}
            onChange={(e) => handleChange("last_name", e.target.value)}
            required
            aria-label="Nom"
          />
          {errors.last_name && (
            <p className="text-xs text-destructive">{errors.last_name}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={values.email}
          onChange={(e) => handleChange("email", e.target.value)}
          required
          aria-label="Email"
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone</Label>
        <Input
          id="phone"
          type="tel"
          value={values.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          required
          aria-label="Téléphone"
        />
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Motif de la consultation</Label>
        <Textarea
          id="reason"
          value={values.reason}
          onChange={(e) => handleChange("reason", e.target.value)}
          rows={3}
          required
          placeholder="Décrivez brièvement la raison de votre consultation..."
          aria-label="Motif de la consultation"
        />
        {errors.reason && (
          <p className="text-xs text-destructive">{errors.reason}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Un compte sera créé automatiquement avec cet email pour suivre vos
        rendez-vous. Si vous avez déjà un compte, il sera réutilisé.
      </p>

      <Button
        type="submit"
        className="w-full bg-primary-red hover:bg-primary-red-dark"
      >
        Continuer
      </Button>
    </form>
  );
};
