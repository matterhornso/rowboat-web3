import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/app/lib/stripe";
import { db } from "@/app/lib/mongodb";

export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the Stripe customer ID from our users collection
    const user = await db.collection("users").findOne({ clerkId: userId });
    if (!user?.billingCustomerId) {
        return NextResponse.json({ error: "No billing account found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.billingCustomerId,
        return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
}
