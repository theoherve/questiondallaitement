import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { adminNav } from "@/config/navigation";
import { handleLogout } from "@/app/(auth)/actions";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar items={adminNav} onLogout={handleLogout} />
      <div className="flex flex-1 flex-col">
        <DashboardHeader title="Administration" items={adminNav} />
        <main className="flex-1 bg-background-beige p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
