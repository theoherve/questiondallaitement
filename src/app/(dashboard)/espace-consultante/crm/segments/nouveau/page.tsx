import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewSegmentForm } from "./_form";

export const metadata: Metadata = {
  title: "Nouveau segment — CRM",
};

const NewSegmentPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/espace-consultante/crm/segments"
          className="rounded-md p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Nouveau segment
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">Définir le segment</CardTitle>
        </CardHeader>
        <CardContent>
          <NewSegmentForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default NewSegmentPage;
