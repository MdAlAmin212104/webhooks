/* eslint-disable @typescript-eslint/no-explicit-any */
import { authenticate } from "app/shopify.server";
import { FormEvent, useState } from "react";
import { ActionFunctionArgs, useLoaderData, useSubmit } from "react-router";
import db from "../db.server";
import { Product } from "@shopify/app-bridge-react";



export const loader = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const notes = await db.productNote.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  return (notes);
};


// ---------------- BACKEND ----------------
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const { products, note } = await request.json();

  if (!products?.length || !note) {
    return { status: 400 };
  }

  for (const productId of products) {
    await db.productNote.create({
      data: {
        shop,
        productId,
        note,
      },
    });
  }

  return ( { success: true });
};


// ---------------- FRONTEND ----------------
export default function AdditionalPage() {
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [note, setNote] = useState("");
  const submit = useSubmit();
  const data = useLoaderData()
  console.log(data, "this is date for my database");



  // ✅ Product Picker Function
  async function selectProduct() {
    try {
      const products = await (window as any).shopify.resourcePicker({
        type: "product",
        action: "select",
        multiple: true,
      });

      if (!products || products.length === 0) return;

      const formattedProducts: Product[] = products.map((p: any) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        image: p.images?.[0]?.originalSrc || "",
        variantId: p.variants?.[0]?.id,
      }));

      setSelectedProducts(formattedProducts);
    } catch (error) {
      console.error("Error selecting products:", error);
    }
  }

  // ✅ Form Submit Function
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      (window as any).shopify.toast.show("Please select at least one product.", { duration: 2000 });
      return;
    }

    if (!note.trim()) {
      (window as any).shopify.toast.show("Please add a note before saving.", { duration: 2000 });
      return;
    }

    // 👇 Send both product IDs and note together
    const payload = { products: selectedProducts.map(p => p.id), note: note.trim() };
    console.log(payload, "this is payload");

     // 👇 JSON আকারে ডেটা পাঠাও
    submit(JSON.stringify(payload), {
      method: "POST",
      encType: "application/json",
    });
  };

  return (
    <s-page heading="Additional Page">
      <s-section>
        <form data-save-bar onSubmit={handleSubmit}>
          <s-clickable onClick={selectProduct}>
            <s-text-field
              label="Select product"
              placeholder="Select products"
              readOnly
              value={
                selectedProducts.length > 0
                  ? selectedProducts.map((p) => p.title).join(", ")
                  : ""
              }
            />
          </s-clickable>

          <s-clickable paddingBlock="base">
            <s-text-area
              label="Note"
              placeholder="Add a note about these products..."
              value={note}
              onInput={(e: any) => setNote(e.target.value)}
              rows={4}
            />
          </s-clickable>
        </form>
      </s-section>
      <s-section>
        display product list using for datebase.
      </s-section>
    </s-page>
  );
}
