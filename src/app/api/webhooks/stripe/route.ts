import { NextRequest } from "next/server";
import Stripe from "stripe";
import { env } from "@/data/env/server";
import { getTierByPriceId, subscriptionTiers } from "@/data/subscriptionTiers";
import { UserSubscriptionTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { updateUserSubscription } from "@/server/db/subscriptions";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export async function POST(request: NextRequest) {
  const event = await stripe.webhooks.constructEvent(
    await request.text(),
    request.headers.get("stripe-signature") as string,
    env.STRIPE_WEBHOOK_SECRET
  );
  switch (event.type) {
    case "customer.subscription.deleted": {
      await handleDelete(event.data.object);
      break;
    }
    case "customer.subscription.updated": {
      await handleUpdate(event.data.object);
      break;
    }
    case "customer.subscription.created": {
      await handleCreate(event.data.object);
      break;
    }
  }

  return new Response(null, { status: 200 });
}

async function handleCreate(subscription: Stripe.Subscription) {
  const tier = getTierByPriceId(subscription.items.data[0].price.id);
  const clerkUserId = subscription.metadata.clerkUserId;
  if (clerkUserId == null || tier == null) {
    return new Response(null, { status: 500 });
  }

  const customer = subscription.customer;
  const customerId = typeof customer === "string" ? customer : customer.id;

  return await updateUserSubscription(
    {
      stripeCustomerId: customerId,
      tier: tier.name,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionItemId: subscription.items.data[0].id,
    },
    eq(UserSubscriptionTable.clerkUserId, clerkUserId)
  );
}

async function handleUpdate(subscription: Stripe.Subscription) {
  const tier = getTierByPriceId(subscription.items.data[0].price.id);
  const customer = subscription.customer;
  const customerId = typeof customer === "string" ? customer : customer.id;
  if (tier == null) {
    return new Response(null, { status: 500 });
  }

  return await updateUserSubscription(
    { tier: tier.name },
    eq(UserSubscriptionTable.stripeCustomerId, customerId)
  );
}

async function handleDelete(subscription: Stripe.Subscription) {
  const customer = subscription.customer;
  const customerId = typeof customer === "string" ? customer : customer.id;

  return await updateUserSubscription(
    {
      tier: subscriptionTiers.Free.name,
      stripeCustomerId: null,
      stripeSubscriptionItemId: null,
    },
    eq(UserSubscriptionTable.stripeCustomerId, customerId)
  );
}
