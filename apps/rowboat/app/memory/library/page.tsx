import { requireAuth } from "@/app/lib/auth";
import { LibraryClient } from "./library-client";
import { MemoryNav } from "../memory-nav";

export const metadata = {
  title: "Memory Library",
  description: "Browse and search every recording, person, commitment, and decision.",
};

export default async function LibraryPage() {
  await requireAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#FAFAF8]">
      <MemoryNav />
      <LibraryClient />
    </div>
  );
}
