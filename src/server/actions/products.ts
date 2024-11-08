"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  productCountryDiscountsSchema,
  productCustomizationSchema,
  productDetailsSchema,
} from "@/schemas/products";
import {
  createProduct as createProductDb,
  deleteProduct as deleteProductDb,
  updateProduct as updateProductDb,
  updateCountryDiscounts as updateCountryDiscountsDb,
  updateProductCustomization as updateProductCustomizationDb,
} from "@/server/db/products";
import { redirect } from "next/navigation";
import { canCreateProduct, canCustomizeBanner } from "../permissions";

export async function createProduct(
  unsafeData: z.infer<typeof productDetailsSchema>
): Promise<{ error: boolean; message: string } | undefined> {
  const { userId } = await auth();
  const { success, data } = productDetailsSchema.safeParse(unsafeData);
  const canCreate = await canCreateProduct(userId);

  if (!success || userId == null || !canCreate) {
    return { error: true, message: "There was an error creating your product" };
  }

  const { id } = await createProductDb({ ...data, clerkUserId: userId });

  redirect(`/dashboard/products/${id}/edit?tab=countries`);
}

export async function updateProduct(
  id: string,
  unsafeData: z.infer<typeof productDetailsSchema>
): Promise<{ error: boolean; message: string } | undefined> {
  const { userId } = await auth();
  const { success, data } = productDetailsSchema.safeParse(unsafeData);
  const errorMessage = "There was an error updating your product";

  if (!success || userId == null) {
    return { error: true, message: errorMessage };
  }

  const isSuccess = await updateProductDb(data, { id, userId });

  return {
    error: !isSuccess,
    message: isSuccess ? "Product details updated" : errorMessage,
  };
}

export async function deleteProduct(id: string) {
  const { userId } = await auth();
  const errorMessage = "There was an error deleting your product";
  if (!userId) {
    return { error: true, message: errorMessage };
  }

  const isSuccess = await deleteProductDb({ id, userId });

  return {
    error: !isSuccess,
    message: isSuccess ? "Successfully deleted your product" : errorMessage,
  };
}

export async function updateCountryDiscounts(
  id: string,
  unsafeData: z.infer<typeof productCountryDiscountsSchema>
) {
  const { userId } = await auth();
  const { success, data } = productCountryDiscountsSchema.safeParse(unsafeData);

  const errorMessage = "There was an error updating your discounts";

  if (!success || userId == null) {
    return { error: true, message: errorMessage };
  }

  const insert: {
    countryGroupId: string;
    productId: string;
    coupon: string;
    discountPercentage: number;
  }[] = [];
  const deleteIds: { countryGroupId: string }[] = [];

  data.groups.forEach((group) => {
    if (
      group.coupon != null &&
      group.coupon.length > 0 &&
      group.discountPercentage != null &&
      group.discountPercentage > 0
    ) {
      insert.push({
        countryGroupId: group.countryGroupId,
        productId: id,
        coupon: group.coupon,
        discountPercentage: group.discountPercentage / 100,
      });
    } else {
      deleteIds.push({ countryGroupId: group.countryGroupId });
    }
  });

  const isSuccess = await updateCountryDiscountsDb(deleteIds, insert, {
    productId: id,
    userId,
  });

  return {
    error: !isSuccess,
    message: isSuccess ? "Successfully updated your discounts" : errorMessage,
  };
}

export async function updateProductCustomization(
  id: string,
  unsafeData: z.infer<typeof productCustomizationSchema>
) {
  const { userId } = await auth();
  const { success, data } = productCustomizationSchema.safeParse(unsafeData);
  const canCustomize = await canCustomizeBanner(userId as string);

  if (!success || userId == null || !canCustomize) {
    return {
      error: true,
      message: "There was an error updating your banner",
    };
  }

  await updateProductCustomizationDb(data, { userId, productId: id });

  return { error: false, message: "Banner updated" };
}
