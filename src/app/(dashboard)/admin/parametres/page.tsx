import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Paramètres plateforme",
};

const ParametresPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Paramètres plateforme
      </h1>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Cette fonctionnalité sera disponible prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParametresPage;
