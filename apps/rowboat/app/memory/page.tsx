import { requireAuth } from "@/app/lib/auth";
import { RecordingClient } from "./recording-client";
import { MemoryNav } from "./memory-nav";

export const metadata = {
    title: "Memory",
    description: "Record conversations and build your AI memory",
};

export default async function MemoryPage() {
    await requireAuth();

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-[#FAFAF8]">
            <MemoryNav />
            <RecordingClient />
        </div>
    );
}
