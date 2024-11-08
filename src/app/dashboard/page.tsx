import React from "react";
import { auth } from "@clerk/nextjs/server";
import { getProducts } from "@/server/db/products";
import NoProducts from "./_components/NoProducts";
import Link from "next/link";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductGrid from "./_components/ProductGrid";
import { HasPermission } from "@/components/HasPermission";
import { canAccessAnalytics } from "@/server/permissions";
import {
  CHART_INTERVALS,
  getViewsByDayChartData,
} from "@/server/db/productView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ViewsByDayChart from "./_components/charts/ViewsByDayChart";

export default async function DashboardPage() {
  const { userId, redirectToSignIn } = await auth();

  if (userId == null) return redirectToSignIn();

  const products = await getProducts(userId, { limit: 6 });

  if (products.length === 0) return <NoProducts />;

  return (
    <>
      <h2 className="mb-6 text-3xl font-semibold flex justify-between">
        <Link
          className="group flex gap-2 items-center hover:underline"
          href="/dashboard/products"
        >
          Products
          <ArrowRightIcon className="group-hover:translate-x-1 transition-transform" />
        </Link>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <PlusIcon className="size-4 mr-2" />
            New Product
          </Link>
        </Button>
      </h2>

      <ProductGrid products={products} />

      <h2 className="mt-6 mb-6 text-3xl font-semibold flex justify-between">
        <Link
          className="group flex gap-2 items-center hover:underline"
          href="/dashboard/analytics"
        >
          Analytics
          <ArrowRightIcon className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </h2>
      <HasPermission permission={canAccessAnalytics} renderFallback>
        <AnalyticsChart userId={userId} />
      </HasPermission>
    </>
  );
}

async function AnalyticsChart({ userId }: { userId: string }) {
  const chartData = await getViewsByDayChartData({
    userId,
    interval: CHART_INTERVALS.last30Days,
    timezone: "UTC",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Views by Day</CardTitle>
        <CardContent>
          <ViewsByDayChart chartData={chartData} />
        </CardContent>
      </CardHeader>
    </Card>
  );
}
