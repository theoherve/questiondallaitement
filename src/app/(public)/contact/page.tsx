import type { Metadata } from "next";
import { ContactForm } from "./_components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Une question ? Écrivez-nous, nous vous répondons rapidement.",
  alternates: { canonical: "/contact" },
};

const ContactPage = () => {
  return (
    <section className="section-padding">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold text-primary-green">
            Contactez-nous
          </h1>
          <p className="mt-4 text-primary-green/70">
            Une question, une demande particulière ? Écrivez-nous, nous vous
            répondons rapidement.
          </p>
        </div>
        <div className="mt-10">
          <ContactForm />
        </div>
      </div>
    </section>
  );
};

export default ContactPage;
