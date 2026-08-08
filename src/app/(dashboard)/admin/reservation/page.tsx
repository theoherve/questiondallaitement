import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LocationConfigsSection } from "./_components/location-configs";
import { getLocationConfigs } from "./actions";

export const metadata: Metadata = {
  title: "Réservation : Administration",
};

const ReservationAdminPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/admin");

  const locationConfigs = await getLocationConfigs();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Réservation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paramètres globaux du tunnel de réservation.
        </p>
      </div>

      <LocationConfigsSection locationConfigs={locationConfigs} />
    </div>
  );
};

export default ReservationAdminPage;
