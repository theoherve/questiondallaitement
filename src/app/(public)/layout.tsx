import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MaintenancePage } from "@/components/maintenance-page";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { getSessionUser } from "@/lib/auth";
import { isMaintenanceMode } from "@/lib/maintenance";
import { getAccompagnementsNavPreview } from "@/lib/accompagnements/nav-preview";
import { handleLogout } from "@/app/(auth)/actions";
import {
  getAnnouncementBanner,
  isAnnouncementBannerActive,
} from "@/lib/announcement-banner/store";
import { isBookingEnabled } from "@/lib/settings/feature-flags/store";

const PublicLayout = async ({ children }: { children: React.ReactNode }) => {
  const [user, maintenance, accompagnements, banner, bookingEnabled] = await Promise.all([
    getSessionUser(),
    isMaintenanceMode(),
    getAccompagnementsNavPreview(),
    getAnnouncementBanner(),
    isBookingEnabled(),
  ]);

  if (maintenance && !user?.roles.includes("admin")) {
    return <MaintenancePage />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {isAnnouncementBannerActive(banner) && (
        <AnnouncementBanner
          message={banner.message}
          linkUrl={banner.link_url}
          linkLabel={banner.link_label}
        />
      )}
      <Header
        user={user}
        onLogout={handleLogout}
        accompagnements={accompagnements}
        bookingEnabled={bookingEnabled}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
