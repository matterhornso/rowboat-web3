import { IndexDescription } from "mongodb";

export const USERS_COLLECTION = "users";

export const USERS_INDEXES: IndexDescription[] = [
    { key: { clerkId: 1 }, name: "clerkId_unique", unique: true },
];