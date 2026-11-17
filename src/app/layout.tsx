import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://crewline.me"),
  title: { default: "Crewline | Learn. Build. Get Recognized.", template: "%s | Crewline" },
  description: "Explore technology internships, build practical skills, and earn verifiable certificates with Crewline.",
  openGraph: {
    type: "website",
    siteName: "Crewline",
    title: "Crewline | Learn. Build. Get Recognized.",
    description: "Explore technology internships, build practical skills, and earn verifiable certificates with Crewline.",
    url: "https://crewline.me",
    images: [{ url: "/brand-logo.png", alt: "Crewline — Learn. Build. Get Recognized." }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
