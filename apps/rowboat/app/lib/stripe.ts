import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
    apiVersion: "2026-03-25.dahlia",
});

export const PLANS = {
    EARLY_ACCESS: {
        name: "Early Access",
        priceId: process.env.STRIPE_PRICE_EARLY_ACCESS ?? "",
        amount: 9900, // $99.00
        features: [
            "Unlimited recordings",
            "AI entity extraction",
            "Pre-meeting briefs",
            "Knowledge graph",
            "30-day history",
        ],
    },
    EXECUTIVE: {
        name: "Executive",
        priceId: process.env.STRIPE_PRICE_EXECUTIVE ?? "",
        amount: 29900, // $299.00
        features: [
            "Everything in Early Access",
            "Unlimited history",
            "Gmail + Calendar sync",
            "Team sharing (up to 3)",
            "Priority support",
            "Custom integrations",
        ],
    },
} as const;

export type PlanKey = keyof typeof PLANS;
