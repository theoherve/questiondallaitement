import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getSessionUser } from "@/lib/auth";
import { handleLogout } from "@/app/(auth)/actions";

const PublicLayout = async ({ children }: { children: React.ReactNode }) => {
  const user = await getSessionUser();
  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} onLogout={handleLogout} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
