import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, topic, shop } = await authenticate.webhook(request);

  try {
    switch (topic) {
      case "PRODUCTS_CREATE": {
        console.log(`🟢 Product created in ${shop}`);
        console.log("Product Create Payload:", payload);
        break;
      }

      case "PRODUCTS_UPDATE": {
        console.log(`🟡 Product updated in ${shop}`);
        console.log("Product Update Payload:", payload);
        break;
      }

      case "PRODUCTS_DELETE": {
        console.log(`🔴 Product deleted in ${shop}`);
        console.log("Product Delete Payload:", payload);
        break;
      }

      default:
        console.log(`⚪ Unhandled webhook topic: ${topic}`);
        break;
    }

    return new Response("Webhook received successfully", { status: 200 });
  } catch (error) {
    console.error("❌ Webhook handling failed:", error);
    return new Response("Webhook error", { status: 500 });
  }
};
