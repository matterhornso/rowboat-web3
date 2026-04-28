import "./globals.css";
import { ThemeProvider } from "./providers/theme-provider";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import { Providers } from "./providers";
import { Metadata, Viewport } from "next";
import { HelpModalProvider } from "./providers/help-modal-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { PwaRegister } from "./pwa-register";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Autonomous Memory",
    template: "%s | Autonomous Memory",
  },
  description:
    "Persistent AI memory for executives. Never forget a name, commitment, or context again.",
  applicationName: "Autonomous Memory",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Memory",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/logo-only.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-only.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/logo-only.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0B" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-dvh">
        <ThemeProvider>
          <body className={`${dmSans.variable} ${instrumentSerif.variable} ${dmSans.className} h-full text-base [scrollbar-width:thin] bg-background`}>
            <Providers className='h-full flex flex-col'>
              <HelpModalProvider>
                {children}
              </HelpModalProvider>
            </Providers>
            <PwaRegister />
          </body>
        </ThemeProvider>
      </html>
    </ClerkProvider>
  );
}
