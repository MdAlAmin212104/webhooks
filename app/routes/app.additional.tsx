/* eslint-disable @typescript-eslint/no-explicit-any */
import { authenticate } from "app/shopify.server";
import { FormEvent, useState } from "react";
import { ActionFunctionArgs, useSubmit } from "react-router";

interface Product {
  id: string;
  title: string;
  handle: string;
  image?: string;
  variantId?: string;
}

// ---------------- BACKEND ----------------
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const { products, note } = await request.json();
  console.log("🛍️ Selected Products:", products);
  console.log("📝 Note:", note);

  // প্রতিটি product এর জন্য metafield তৈরি
  for (const productId of products) {
    try {
      await admin.graphql(
        `#graphql
        mutation CreateProductMetafield($productId: ID!, $note: String!) {
          metafieldsSet(
            metafields: [
              {
                ownerId: $productId
                namespace: "custom"
                key: "extra_note"
                type: "single_line_text_field"
                value: $note
              }
            ]
          ) {
            metafields {
              id
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
        {
          variables: {
            productId,
            note,
          },
        }
      );

      console.log(`✅ Metafield added for product: ${productId}`);
    } catch (error) {
      console.error(`❌ Failed to add metafield for product ${productId}`, error);
    }
  }

  return Response.json({ success: true, message: "Metafields added successfully!" });
};


// ---------------- FRONTEND ----------------
export default function AdditionalPage() {
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [note, setNote] = useState("");
  const submit = useSubmit();

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
              rows="4"
            />
          </s-clickable>
        </form>
      </s-section>
    </s-page>
  );
}
