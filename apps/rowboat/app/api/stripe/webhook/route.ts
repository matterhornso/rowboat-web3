import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/app/lib/stripe";
import { db } from "@/app/lib/mongodb";

export async function POST(request: NextRequest) {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature") ?? "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Stripe webhook signature verification failed:", message);
        return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
    }

    const users = db.collection("users");

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const clerkUserId = session.metadata?.clerkUserId;
            const customerId = session.customer as string;

            if (clerkUserId && customerId) {
                await users.updateOne(
                    { clerkId: clerkUserId },
                    {
                        $set: {
                            billingCustomerId: customerId,
                            subscriptionStatus: "active",
                            plan: session.metadata?.plan,
                            updatedAt: new Date().toISOString(),
                        },
                    }
                );
            }
            break;
        }

        case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            const status = subscription.status;

            await users.updateOne(
                { billingCustomerId: customerId },
                {
                    $set: {
                        subscriptionStatus: status,
                        updatedAt: new Date().toISOString(),
                    },
                }
            );
            break;
        }

        case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            await users.updateOne(
                { billingCustomerId: customerId },
                {
                    $set: {
                        subscriptionStatus: "cancelled",
                        plan: null,
                        updatedAt: new Date().toISOString(),
                    },
                }
            );
            break;
        }

        default:
            // Unhandled event — log and continue
            console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
