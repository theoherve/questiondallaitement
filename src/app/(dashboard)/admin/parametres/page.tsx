import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Paramètres plateforme",
};

const ParametresPage = async () => {
  const user = await getSessionUser();
  if (user?.role === "marketing_manager") redirect("/admin");
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
