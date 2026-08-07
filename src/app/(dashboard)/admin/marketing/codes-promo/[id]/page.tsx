import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import {
  getPromoCode,
  getPromoCodeStats,
  listPromoTargetOptions,
} from "../actions";
import { PromoCodeForm } from "../_components/promo-code-form";
import { formatMoney } from "../_components/format";

export const metadata: Metadata = {
  title: "Modifier un code promo",
};

type Props = { params: Promise<{ id: string }> };

const EditPromoCodePage = async ({ params }: Props) => {
  const { id } = await params;

  const [code, options, stats] = await Promise.all([
    getPromoCode(id),
    listPromoTargetOptions(),
    getPromoCodeStats(id),
  ]);

  if (!code) notFound();

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
          {code.code}
        </h1>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              Utilisations
            </p>
            <p className="text-2xl font-bold text-primary-green">
              {stats.redemptions}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              CA généré
            </p>
            <p className="text-2xl font-bold text-primary-green">
              {formatMoney(stats.revenueCents)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              Remise consentie
            </p>
            <p className="text-2xl font-bold text-primary-green">
              {formatMoney(stats.discountCents)}
            </p>
          </div>
        </CardContent>
      </Card>

      <PromoCodeForm
        initial={code}
        accompagnements={options.accompagnements}
        formations={options.formations}
        consultationTypes={options.consultationTypes}
      />
    </div>
  );
};

export default EditPromoCodePage;
