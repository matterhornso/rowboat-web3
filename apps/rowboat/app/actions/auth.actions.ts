"use server";
import { auth } from "@clerk/nextjs/server";
import { USE_AUTH } from "../lib/feature_flags";
import { User } from "@/src/entities/models/user";
import { getUserFromSessionId, GUEST_DB_USER } from "../lib/auth";
import { z } from "zod";
import { container } from "@/di/container";
import { IUsersRepository } from "@/src/application/repositories/users.repository.interface";

const usersRepository = container.resolve<IUsersRepository>("usersRepository");

export async function authCheck(): Promise<z.infer<typeof User>> {
    if (!USE_AUTH) {
        return GUEST_DB_USER;
    }

    const { userId } = await auth();
    if (!userId) {
        throw new Error('User not authenticated');
    }

    const dbUser = await getUserFromSessionId(userId);
    if (!dbUser) {
        throw new Error('User record not found');
    }
    return dbUser;
}

const EmailOnly = z.object({
    email: z.string().email(),
});

export async function updateUserEmail(email: string) {
    if (!USE_AUTH) {
        return;
    }
    const user = await authCheck();

    if (!email.trim()) {
        throw new Error('Email is required');
    }
    if (!EmailOnly.safeParse({ email }).success) {
        throw new Error('Invalid email');
    }

    await usersRepository.updateEmail(user.id, email);
}
