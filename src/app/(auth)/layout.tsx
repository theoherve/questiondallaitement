import Link from "next/link";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background-beige px-4">
      <div className="mb-8">
        <Link
          href="/"
          className="font-serif text-2xl font-bold text-primary-green"
          aria-label="Retour à l'accueil"
          tabIndex={0}
        >
          Question d&apos;Allaitement
        </Link>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
};

export default AuthLayout;
