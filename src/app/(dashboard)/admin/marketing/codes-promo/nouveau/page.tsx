import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { listPromoTargetOptions } from "../actions";
import { PromoCodeForm } from "../_components/promo-code-form";

export const metadata: Metadata = {
  title: "Nouveau code promo",
};

const NewPromoCodePage = async () => {
  const options = await listPromoTargetOptions();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/marketing/codes-promo">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Codes promo
          </Link>
        </Button>
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Nouveau code promo
        </h1>
      </div>

      <PromoCodeForm
        formations={options.formations}
        events={options.events}
        consultationTypes={options.consultationTypes}
      />
    </div>
  );
};

export default NewPromoCodePage;
