import type { Metadata, Viewport } from "next";
import { Geologica, Manrope } from "next/font/google";
import { TelegramProvider } from "@/components/telegram-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sf",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geologica = Geologica({
  variable: "--font-geologica",
  subsets: ["latin", "cyrillic"],
  weight: "500",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Током",
  description: "Самодиагностика и помощь в электрике",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Током",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f7f7f8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${geologica.variable} h-full antialiased`}
    >
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" defer />
      </head>
      <body className="min-h-[var(--app-height,100dvh)] w-full bg-[#f7f7f8] font-sans text-[var(--foreground)]">
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
