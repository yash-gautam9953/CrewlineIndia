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
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
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
  const admin = Boolean(session && isAdminIdentity(session.user.$id));
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem('crewline-theme');var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme:dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);r.style.colorScheme=d?'dark':'light';}catch(e){}`,
          }}
        />
      </head>
      <body className={`${nunito.variable} min-h-screen bg-[#F7F9FC] text-[#101D35] antialiased dark:bg-[#0B1220] dark:text-[#F1F5FB]`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-[#1769D2] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <SiteHeader loggedIn={Boolean(session)} admin={admin} />
        <div id="main-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
