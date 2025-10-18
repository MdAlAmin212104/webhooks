import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { payload, topic, shop } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);

    console.log("PRODUCTS_UPDATE webhook payload:");
    console.log(payload, "PRODUCTS_UPDATE webhook payload");

    return new Response();
};
