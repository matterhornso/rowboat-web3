import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { User } from "@/src/entities/models/user";
import { USE_AUTH } from "./feature_flags";
import { redirect } from "next/navigation";
import { container } from "@/di/container";
import { IUsersRepository } from "@/src/application/repositories/users.repository.interface";

export const GUEST_DB_USER: z.infer<typeof User> = {
    id: "guest_user",
    clerkId: "guest_user",
    name: "Guest",
    email: "guest@autonomous.com",
    createdAt: new Date().toISOString(),
}

/**
 * Ensures the user is authenticated. Redirects to sign-in if not.
 * Returns the db User record, creating one on first login.
 *
 * Usage in server components:
 * ```ts
 * const user = await requireAuth();
 * ```
 */
export async function requireAuth(): Promise<z.infer<typeof User>> {
    if (!USE_AUTH) {
        return GUEST_DB_USER;
    }

    const { userId } = await auth();
    if (!userId) {
        redirect('/sign-in');
    }

    const usersRepository = container.resolve<IUsersRepository>("usersRepository");
    let dbUser = await getUserFromSessionId(userId);

    if (!dbUser) {
        const clerkUser = await currentUser();
        dbUser = await usersRepository.create({
            clerkId: userId,
            email: clerkUser?.emailAddresses?.[0]?.emailAddress,
        });
        console.log(`created new user id ${dbUser.id} for clerk id ${userId}`);
    }

    return dbUser;
}

export async function getUserFromSessionId(clerkUserId: string): Promise<z.infer<typeof User> | null> {
    if (!USE_AUTH) {
        return GUEST_DB_USER;
    }

    const usersRepository = container.resolve<IUsersRepository>("usersRepository");
    return await usersRepository.fetchByClerkId(clerkUserId);
}
