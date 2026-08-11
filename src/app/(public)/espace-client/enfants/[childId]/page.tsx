import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { WeightChart } from "@/components/growth-charts/weight-chart";
import { listMyChildren, listWeightMeasurements } from "../actions";
import { WeightForm } from "./_components/weight-form";

export const metadata: Metadata = {
  title: "Suivi de poids",
};

const ChildDetailPage = async ({
  params,
}: {
  params: Promise<{ childId: string }>;
}) => {
  const { childId } = await params;
  const [children, measurements] = await Promise.all([
    listMyChildren(),
    listWeightMeasurements(childId),
  ]);

  const child = children.find((c) => c.id === childId);
  if (!child) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        {child.first_name}
      </h1>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <WeightChart
            measurements={measurements}
            birthDate={child.birth_date}
            sex={child.sex}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <WeightForm childId={child.id} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ChildDetailPage;
