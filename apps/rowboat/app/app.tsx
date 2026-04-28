'use client';
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { useEffect } from "react";

export function App() {
    const router = useRouter();
    const { user, isLoaded } = useUser();

    useEffect(() => {
        if (!isLoaded) return;
        if (user) {
            router.push("/projects");
        } else {
            router.push("/sign-in");
        }
    }, [user, isLoaded, router]);

    return (
        <div className="min-h-screen w-full bg-[#0A0A0B] flex flex-col items-center justify-between py-10">
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="font-[--font-instrument-serif] text-3xl text-[#FAFAF8]">
                        Autonomous Memory
                    </div>
                    <Spinner size="sm" color="warning" />
                    {isLoaded && user && (
                        <div className="text-sm text-neutral-400">
                            Welcome back, {user.firstName ?? user.primaryEmailAddress?.emailAddress}
                        </div>
                    )}
                </div>
            </div>

            <div className="text-xs text-neutral-600">
                &copy; 2025 The Autonomous Org
            </div>
        </div>
    );
}
