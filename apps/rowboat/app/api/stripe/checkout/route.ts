import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { stripe, PLANS, PlanKey } from "@/app/lib/stripe";

export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const plan = body.plan as PlanKey;

    if (!plan || !PLANS[plan]) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
            {
                price: PLANS[plan].priceId,
                quantity: 1,
            },
        ],
        customer_email: email,
        client_reference_id: userId,
        metadata: {
            clerkUserId: userId,
            plan,
        },
        success_url: `${appUrl}/billing?success=true&plan=${plan}`,
        cancel_url: `${appUrl}/billing?cancelled=true`,
        subscription_data: {
            metadata: {
                clerkUserId: userId,
                plan,
            },
        },
    });

    return NextResponse.json({ url: session.url });
}
