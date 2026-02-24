import { ClientSpaceTabs } from "@/components/espace-client/client-space-tabs";

const EspaceClientLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col">
      <ClientSpaceTabs />
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default EspaceClientLayout;
