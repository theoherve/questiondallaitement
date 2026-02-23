import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { clientNav } from "@/config/navigation";
import { handleLogout } from "@/app/(auth)/actions";

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar items={clientNav} onLogout={handleLogout} />
      <div className="flex flex-1 flex-col">
        <DashboardHeader title="Espace client" items={clientNav} />
        <main className="flex-1 bg-background-beige p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ClientLayout;
