import { db } from "@/drizzle/db";
import {
  CountryGroupTable,
  CountryTable,
  ProductTable,
  ProductViewTable,
} from "@/drizzle/schema";
import {
  CACHE_TAGS,
  dbCache,
  getGlobalTag,
  getIdTag,
  getUserTag,
  revalidateDbCache,
} from "@/lib/cache";
import { startOfDay, subDays } from "date-fns";
import { and, count, desc, eq, gte, SQL, sql } from "drizzle-orm";
import { tz } from "@date-fns/tz";

export function getProductViewCount(userId: string, startDate: Date) {
  const cacheFn = dbCache(getProductViewCountInternal, {
    tags: [getUserTag(userId, CACHE_TAGS.productView)],
  });

  return cacheFn(userId, startDate);
}

export async function createProductView({
  productId,
  countryId,
  userId,
}: {
  productId: string;
  countryId?: string;
  userId: string;
}) {
  const [newRow] = await db
    .insert(ProductViewTable)
    .values({
      productId,
      visitedAt: new Date(),
      countryId,
    })
    .returning({ id: ProductViewTable.id });

  if (newRow != null) {
    revalidateDbCache({ tag: CACHE_TAGS.productView, userId, id: newRow.id });
  }
}

export async function getViewsByCountryChartData({
  timezone,
  productId,
  userId,
  interval,
}: {
  timezone: string;
  productId?: string;
  userId: string;
  interval: (typeof CHART_INTERVALS)[keyof typeof CHART_INTERVALS];
}) {
  const cacheFn = dbCache(getViewsByCountryChartDataInternal, {
    tags: [
      getUserTag(userId, CACHE_TAGS.productView),
      productId == null
        ? getUserTag(userId, CACHE_TAGS.products)
        : getIdTag(productId, CACHE_TAGS.products),
      getGlobalTag(CACHE_TAGS.countries),
    ],
  });

  return cacheFn({
    timezone,
    productId,
    userId,
    interval,
  });
}

export async function getViewsByDealsChartData({
  timezone,
  productId,
  userId,
  interval,
}: {
  timezone: string;
  productId?: string;
  userId: string;
  interval: (typeof CHART_INTERVALS)[keyof typeof CHART_INTERVALS];
}) {
  const cacheFn = dbCache(getViewsByDealsChartDataInternal, {
    tags: [
      getUserTag(userId, CACHE_TAGS.productView),
      productId == null
        ? getUserTag(userId, CACHE_TAGS.products)
        : getIdTag(productId, CACHE_TAGS.products),
      getGlobalTag(CACHE_TAGS.countries),
      getGlobalTag(CACHE_TAGS.countryGroups),
    ],
  });

  return cacheFn({
    timezone,
    productId,
    userId,
    interval,
  });
}

export async function getViewsByDayChartData({
  timezone,
  productId,
  userId,
  interval,
}: {
  timezone: string;
  productId?: string;
  userId: string;
  interval: (typeof CHART_INTERVALS)[keyof typeof CHART_INTERVALS];
}) {
  const cacheFn = dbCache(getViewsByDayChartDataInternal, {
    tags: [
      getUserTag(userId, CACHE_TAGS.productView),
      productId == null
        ? getUserTag(userId, CACHE_TAGS.products)
        : getIdTag(productId, CACHE_TAGS.products),
    ],
  });

  return cacheFn({
    timezone,
    productId,
    userId,
    interval,
  });
}

// INTERNAL

async function getProductViewCountInternal(userId: string, startDate: Date) {
  const counts = await db
    .select({ pricingViewCount: count() })
    .from(ProductViewTable)
    .innerJoin(ProductTable, eq(ProductTable.id, ProductViewTable.productId))
    .where(
      and(
        eq(ProductTable.clerkUserId, userId),
        gte(ProductViewTable.visitedAt, startDate)
      )
    );

  return counts[0]?.pricingViewCount ?? 0;
}

async function getViewsByCountryChartDataInternal({
  timezone,
  productId,
  userId,
  interval,
}: {
  timezone: string;
  productId?: string;
  userId: string;
  interval: (typeof CHART_INTERVALS)[keyof typeof CHART_INTERVALS];
}) {
  const startDate = startOfDay(interval.startDate, { in: tz(timezone) });
  const productSubQuery = getProductSubQuery(userId, productId);
  return await db
    .with(productSubQuery)
    .select({
      views: count(ProductViewTable.visitedAt),
      countryName: CountryTable.name,
      countryCode: CountryTable.code,
    })
    .from(ProductViewTable)
    .innerJoin(
      productSubQuery,
      eq(productSubQuery.id, ProductViewTable.productId)
    )
    .innerJoin(CountryTable, eq(CountryTable.id, ProductViewTable.countryId))
    .where(
      gte(
        sql`${ProductViewTable.visitedAt} AT TIME ZONE ${timezone}`.inlineParams(),
        startDate
      )
    )
    .groupBy(({ countryCode, countryName }) => [countryCode, countryName])
    .orderBy(({ views }) => desc(views))
    .limit(25);
}

async function getViewsByDealsChartDataInternal({
  timezone,
  productId,
  userId,
  interval,
}: {
  timezone: string;
  productId?: string;
  userId: string;
  interval: (typeof CHART_INTERVALS)[keyof typeof CHART_INTERVALS];
}) {
  const startDate = startOfDay(interval.startDate, { in: tz(timezone) });
  const productSubQuery = getProductSubQuery(userId, productId);
  const productViewSubQuery = db.$with("productViews").as(
    db
      .with(productSubQuery)
      .select({
        visitedAt: sql`${ProductViewTable.visitedAt} AT TIME ZONE ${timezone}`
          .inlineParams()
          .as("visitedAt"),
        countryGroupId: CountryTable.countryGroupId,
      })
      .from(ProductViewTable)
      .innerJoin(
        productSubQuery,
        eq(productSubQuery.id, ProductViewTable.productId)
      )
      .innerJoin(CountryTable, eq(CountryTable.id, ProductViewTable.countryId))
      .where(({ visitedAt }) => gte(visitedAt, startDate))
  );

  return await db
    .with(productViewSubQuery)
    .select({
      dealGroupName: CountryGroupTable.name,
      views: count(productViewSubQuery.visitedAt),
    })
    .from(CountryGroupTable)
    .leftJoin(
      productViewSubQuery,
      eq(productViewSubQuery.countryGroupId, CountryGroupTable.id)
    )
    .groupBy(({ dealGroupName }) => [dealGroupName])
    .orderBy(({ dealGroupName }) => dealGroupName);
}

async function getViewsByDayChartDataInternal({
  timezone,
  productId,
  userId,
  interval,
}: {
  timezone: string;
  productId?: string;
  userId: string;
  interval: (typeof CHART_INTERVALS)[keyof typeof CHART_INTERVALS];
}) {
  const productSubQuery = getProductSubQuery(userId, productId);
  const productViewSubQuery = db.$with("productViews").as(
    db
      .with(productSubQuery)
      .select({
        visitedAt: sql`${ProductViewTable.visitedAt} AT TIME ZONE ${timezone}`
          .inlineParams()
          .as("visitedAt"),
        productId: productSubQuery.id,
      })
      .from(ProductViewTable)
      .innerJoin(
        productSubQuery,
        eq(productSubQuery.id, ProductViewTable.productId)
      )
  );

  return await db
    .with(productViewSubQuery)
    .select({
      date: interval
        .dateGrouper(sql.raw("series"))
        .mapWith((dateString) => interval.dateFormatter(new Date(dateString))),
      views: count(productViewSubQuery.visitedAt),
    })
    .from(interval.sql)
    .leftJoin(productViewSubQuery, ({ date }) =>
      eq(interval.dateGrouper(productViewSubQuery.visitedAt), date)
    )
    .groupBy(({ date }) => [date])
    .orderBy(({ date }) => date);
}

function getProductSubQuery(userId: string, productId: string | undefined) {
  return db.$with("products").as(
    db
      .select()
      .from(ProductTable)
      .where(
        and(
          eq(ProductTable.clerkUserId, userId),
          productId == null ? undefined : eq(ProductTable.id, productId)
        )
      )
  );
}

export const CHART_INTERVALS = {
  last7Days: {
    dateFormatter: (date: Date) => dateFormatter.format(date),
    startDate: subDays(new Date(), 7),
    label: "Last 7 Days",
    sql: sql`GENERATE_SERIES(current_date - 7, current_date, '1 day'::interval) as series`,
    dateGrouper: (col: SQL | SQL.Aliased) =>
      sql<string>`DATE(${col})`.inlineParams(),
  },
  last30Days: {
    dateFormatter: (date: Date) => dateFormatter.format(date),
    startDate: subDays(new Date(), 30),
    label: "Last 30 Days",
    sql: sql`GENERATE_SERIES(current_date - 30, current_date, '1 day'::interval) as series`,
    dateGrouper: (col: SQL | SQL.Aliased) =>
      sql<string>`DATE(${col})`.inlineParams(),
  },
  last365Days: {
    dateFormatter: (date: Date) => monthFormatter.format(date),
    startDate: subDays(new Date(), 365),
    label: "Last 365 Days",
    sql: sql`GENERATE_SERIES(DATE_TRUNC('month', current_date - 365), DATE_TRUNC('month', current_date), '1 month'::interval) as series`,
    dateGrouper: (col: SQL | SQL.Aliased) =>
      sql<string>`DATE_TRUNC('month', ${col})`.inlineParams(),
  },
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  year: "2-digit",
  month: "short",
  timeZone: "UTC",
});
