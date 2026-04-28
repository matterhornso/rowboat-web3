import { requireAuth } from "@/app/lib/auth";
import { BriefClient } from "./brief-client";
import { MemoryNav } from "../memory-nav";

export const metadata = {
  title: "Pre-meeting brief",
  description:
    "Get a synthesized brief before your next meeting — last conversation, open commitments, and what to decide.",
};

export default async function BriefPage() {
  await requireAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#FAFAF8]">
      <MemoryNav />
      <BriefClient />
    </div>
  );
}
