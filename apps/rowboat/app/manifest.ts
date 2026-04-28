import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Autonomous Memory",
    short_name: "Memory",
    description:
      "Executive memory for CEOs, CROs, and founders. Never forget a conversation.",
    start_url: "/memory",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0A0B",
    theme_color: "#0A0A0B",
    categories: ["productivity", "business"],
    icons: [
      {
        src: "/logo-only.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-only.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-only.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Record",
        short_name: "Record",
        description: "Start a new recording",
        url: "/memory",
      },
      {
        name: "Brief",
        short_name: "Brief",
        description: "Get a pre-meeting brief",
        url: "/memory/brief",
      },
      {
        name: "Library",
        short_name: "Library",
        description: "Browse your memory",
        url: "/memory/library",
      },
    ],
  };
}
