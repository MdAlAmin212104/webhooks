/* eslint-disable @typescript-eslint/no-explicit-any */
import { authenticate } from "app/shopify.server";
import { FormEvent, useState } from "react";
import { ActionFunctionArgs, useLoaderData } from "react-router";
import db from "../db.server";

// ---------------- BACKEND ----------------
export const loader = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const notes = await db.productNote.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  const productsWithData = await Promise.all(
    notes.map(async (note) => {
      try {
        const response = await admin.graphql(`
          query {
            product(id: "${note.productId}") {
              id
              title
              featuredImage {
                originalSrc
              }
            }
          }
        `);

        const result = await response.json();
        const product = result.data?.product;

        return {
          ...note,
          title: product?.title || "Unknown Product",
          image: product?.featuredImage?.originalSrc || "",
        };
      } catch {
        return { ...note, title: "Error loading product", image: "" };
      }
    })
  );

  return productsWithData;
};

// ---------------- ACTION (Add / Update / Delete) ----------------
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const { actionType, noteId, products, note } = await request.json();

  switch (actionType) {
    case "delete":
      await db.productNote.delete({ where: { id: noteId } });
      return { success: true, message: "Note deleted" };

    case "update":
      await db.productNote.update({
        where: { id: noteId },
        data: { note },
      });
      return { success: true, message: "Note updated" };

    case "add":
      if (!products?.length || !note?.trim()) return { status: 400 };
      await Promise.all(
        products.map((productId: string) =>
          db.productNote.create({
            data: { shop, productId, note },
          })
        )
      );
      return { success: true, message: "Note added" };

    default:
      return { success: false, message: "Invalid action" };
  }
};

// ---------------- FRONTEND ----------------
export default function AdditionalPage() {
  const data = useLoaderData<typeof loader>();
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [editingNote, setEditingNote] = useState<any | null>(null);

  // ✅ Product Picker
  const selectProduct = async () => {
    try {
      const products = await (window as any).shopify.resourcePicker({
        type: "product",
        action: "select",
        multiple: true,
      });

      if (!products?.length) return;

      setSelectedProducts(
        products.map((p: any) => ({
          id: p.id,
          title: p.title,
          image: p.images?.[0]?.originalSrc || "",
        }))
      );
    } catch (error) {
      console.error("Error selecting products:", error);
    }
  };

  // ✅ Handle Add / Update
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!note.trim()) {
      (window as any).shopify.toast.show("Please add a note.", { duration: 2000 });
      return;
    }

    const payload = editingNote
      ? { actionType: "update", noteId: editingNote.id, note }
      : { actionType: "add", products: selectedProducts.map((p) => p.id), note };

    await fetch(window.location.pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    (window as any).shopify.toast.show(
      editingNote ? "✅ Note updated!" : "✅ Note added!",
      { duration: 2500 }
    );

    setSelectedProducts([]);
    setNote("");
    setEditingNote(null);
    window.location.reload();
  };

  // ✅ Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    await fetch(window.location.pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType: "delete", noteId: id }),
    });
    (window as any).shopify.toast.show("🗑️ Note deleted!", { duration: 2500 });
    window.location.reload();
  };

  // ✅ Handle Edit
  const handleEdit = (item: any) => {
    setEditingNote(item);
    setNote(item.note);
    setSelectedProducts([
      { id: item.productId, title: item.title, image: item.image },
    ]);
  };

  return (
    <s-page heading="Additional Page">
      {editingNote && (
        <s-button
          tone="neutral"
          slot="secondary-actions"
          onClick={() => {
            setEditingNote(null);
            setNote("");
            setSelectedProducts([]);
          }}
        >
          Cancel
        </s-button>
      )}

      {/* ================= Add / Edit Form ================= */}
      <s-section>
        <form data-save-bar onSubmit={handleSubmit}>
          {!editingNote && (
            <div style={{ marginBlock: "1rem" }}>
              <s-text-field
                onClick={selectProduct}
                label="Select product"
                placeholder="Select products"
                readOnly
                value={
                  selectedProducts.length > 0
                    ? selectedProducts.map((p) => p.title).join(", ")
                    : ""
                }
              />
            </div>
          )}

          <div style={{ marginBlock: "1rem" }}>
            <s-text-area
              label={editingNote ? "Update Note" : "Add Note"}
              placeholder="Write something about this product..."
              value={note}
              onInput={(e: any) => setNote(e.target.value)}
              rows={4}
            />
          </div>
        </form>
      </s-section>

      {/* ================= Display Table ================= */}
      {data && data.length > 0 &&  (
      <s-section heading="Saved Product Notes">
        
          <s-table>
            <s-table-header-row>
              <s-table-header>Image</s-table-header>
              <s-table-header>Title</s-table-header>
              <s-table-header>Note</s-table-header>
              <s-table-header>Created</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>

            <s-table-body>
              {data.map((item: any) => {
                const productId = item.productId?.split("/").pop();
                const shopName = item.shop?.replace(".myshopify.com", "");

                return (
                  <s-table-row key={item.id}>
                    <s-table-cell>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          width="50"
                          height="50"
                          style={{ borderRadius: "6px" }}
                        />
                      ) : (
                        "No Image"
                      )}
                    </s-table-cell>

                    <s-table-cell>
                      <s-link
                        href={`https://admin.shopify.com/store/${shopName}/products/${productId}`}
                        target="_blank"
                      >
                        {item.title}
                      </s-link>
                    </s-table-cell>

                    <s-table-cell>{item.note}</s-table-cell>
                    <s-table-cell>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </s-table-cell>
                    <s-table-cell>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <s-button icon="edit" onClick={() => handleEdit(item)} />
                        <s-button
                          icon="delete"
                          tone="critical"
                          onClick={() => handleDelete(item.id)}
                        />
                      </div>
                    </s-table-cell>
                  </s-table-row>
                );
              })}
            </s-table-body>
          </s-table>
      </s-section>
      )}
    </s-page>
  );
}
