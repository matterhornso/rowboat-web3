import { requireAuth } from "@/app/lib/auth";
import { ConnectClient } from "./connect-client";
import { MemoryNav } from "../memory-nav";

export const metadata = {
  title: "Connect integrations",
  description:
    "Connect Fireflies, Otter, or Granola to import your existing meeting transcripts.",
};

export default async function ConnectPage() {
  await requireAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#FAFAF8]">
      <MemoryNav />
      <ConnectClient />
    </div>
  );
}
