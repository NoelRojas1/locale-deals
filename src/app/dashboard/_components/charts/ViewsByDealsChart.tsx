"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCompactNumber } from "@/lib/formatters";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

export default function ViewsByDealChart({
  chartData,
}: {
  chartData: {
    dealGroupName: string;
    views: number;
  }[];
}) {
  if (chartData.length === 0) {
    <p className="flex items-center justify-center text-muted-foreground min-h-[150px] max-h-[250px]">
      No data available
    </p>;
  }

  const chartConfig = {
    views: {
      label: "visitors",
      color: "hsl(var(--accent))",
    },
  };

  const data = chartData.map((dataPoint) => ({
    ...dataPoint,
    dealGroupName: dataPoint.dealGroupName.replace("Parity Group: ", ""),
  }));
  return (
    <ChartContainer
      config={chartConfig}
      className="min-h-[150px] max-h-[250px] w-full"
    >
      <BarChart accessibilityLayer data={data}>
        <XAxis dataKey="dealGroupName" tickLine={false} tickMargin={10} />
        <YAxis
          tickLine={false}
          tickMargin={10}
          allowDecimals={false}
          tickFormatter={formatCompactNumber}
        />
        <ChartTooltip content={<ChartTooltipContent nameKey="countryName" />} />
        <Bar dataKey="views" fill="var(--color-views)" />
      </BarChart>
    </ChartContainer>
  );
}
