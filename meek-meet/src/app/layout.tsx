import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/auth-provider";
import InstallBanner from "@/components/pwa/install-banner";
import "./globals.css";

// Self-hosted fonts (src/app/fonts/, downloaded by scripts/download-fonts.mjs)
// — the build never depends on a live Google Fonts fetch.
const cormorant = localFont({
  variable: "--font-cormorant",
  display: "swap",
  src: [
    { path: "./fonts/cormorant-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cormorant-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/cormorant-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/cormorant-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cormorant-600-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/cormorant-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/cormorant-700-italic.woff2", weight: "700", style: "italic" },
  ],
});

const sourceSans = localFont({
  variable: "--font-source",
  display: "swap",
  src: [
    { path: "./fonts/source-300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/source-300-italic.woff2", weight: "300", style: "italic" },
    { path: "./fonts/source-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/source-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/source-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/source-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/source-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/source-600-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/source-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/source-700-italic.woff2", weight: "700", style: "italic" },
  ],
});

const caveat = localFont({
  variable: "--font-caveat",
  display: "swap",
  src: [
    { path: "./fonts/caveat-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/caveat-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/caveat-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/caveat-700.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://meekmeet.com"),
  verification: {
    google: "zKim6gzkkssIQao4l_3Nw4AfGwa9BkhvA7s0vFkAKpY",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  title: "Meek Meet | Blessed Are The Meek",
  description:
    "A warm community of faith where the meek gather, share, and build something beautiful together. Join us under the new moon.",
  openGraph: {
    siteName: "Meek Meet",
    title: "Meek Meet | Blessed Are The Meek",
    description:
      "A warm community of faith where the meek gather, share, and build something beautiful together. Join us under the new moon.",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meek Meet | Blessed Are The Meek",
    description:
      "A warm community of faith where the meek gather, share, and build something beautiful together. Join us under the new moon.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${sourceSans.variable} ${caveat.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans bg-cream text-charcoal">
        <AuthProvider>
          {children}
          <InstallBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
