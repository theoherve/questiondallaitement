import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MaintenancePage } from "@/components/maintenance-page";
import { getSessionUser } from "@/lib/auth";
import { isMaintenanceMode } from "@/lib/maintenance";
import { getAccompagnementsNavPreview } from "@/lib/accompagnements/nav-preview";
import { handleLogout } from "@/app/(auth)/actions";

const PublicLayout = async ({ children }: { children: React.ReactNode }) => {
  const [user, maintenance, accompagnements] = await Promise.all([
    getSessionUser(),
    isMaintenanceMode(),
    getAccompagnementsNavPreview(),
  ]);

  if (maintenance && !user?.roles.includes("admin")) {
    return <MaintenancePage />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        user={user}
        onLogout={handleLogout}
        accompagnements={accompagnements}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
