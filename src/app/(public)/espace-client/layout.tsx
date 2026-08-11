import { ClientSpaceTabs } from "@/components/espace-client/client-space-tabs";
import { isBookingEnabled } from "@/lib/settings/feature-flags/store";

const EspaceClientLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const bookingEnabled = await isBookingEnabled();

  return (
    <div className="flex flex-col">
      <ClientSpaceTabs bookingEnabled={bookingEnabled} />
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default EspaceClientLayout;
