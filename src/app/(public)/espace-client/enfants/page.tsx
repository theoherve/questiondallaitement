import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Baby } from "lucide-react";
import { differenceInMonths } from "date-fns";
import { listMyChildren } from "./actions";
import { ChildForm } from "./_components/child-form";

export const metadata: Metadata = {
  title: "Mes enfants",
};

const MyChildrenPage = async () => {
  const children = await listMyChildren();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Mes enfants
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Suivez le poids de vos enfants au fil des consultations.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {children.map((child) => (
          <Link key={child.id} href={`/espace-client/enfants/${child.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-3 py-4">
                <Baby className="h-8 w-8 text-primary-green" />
                <div>
                  <p className="font-medium">{child.first_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {differenceInMonths(new Date(), new Date(child.birth_date))}{" "}
                    mois
                    {child.is_premature ? " · né prématurément" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <ChildForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default MyChildrenPage;
