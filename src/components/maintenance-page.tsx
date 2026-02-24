import { Wrench } from "lucide-react";

export const MaintenancePage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-background-beige px-4 text-center">
    <Wrench className="mb-6 h-16 w-16 text-primary-green/50" />
    <h1 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
      Site en maintenance
    </h1>
    <p className="mt-4 max-w-md text-lg text-primary-green/70">
      Nous effectuons actuellement une maintenance. Le site sera de retour très
      prochainement. Merci de votre patience.
    </p>
    <p className="mt-8 text-sm text-muted-foreground">
      Question d&apos;Allaitement
    </p>
  </div>
);
