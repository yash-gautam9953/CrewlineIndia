import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSessionUser } from "@/lib/appwrite/session";
import { isAdminIdentity } from "@/lib/authz";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-nunito",
});

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionUser();
  const admin = Boolean(session?.user.emailVerification && isAdminIdentity(session.user.$id));
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${nunito.variable} min-h-screen antialiased`}>
        <SiteHeader loggedIn={Boolean(session)} admin={admin} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
