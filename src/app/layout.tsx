import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { TelegramProvider } from "@/components/telegram-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sf",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Токщиток",
  description: "Цифровой паспорт электрического щитка",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Токщиток",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${manrope.variable} h-full antialiased`}>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" defer />
      </head>
      <body className="min-h-[var(--app-height,100dvh)] w-full bg-[#f7f7f8] font-sans text-[var(--foreground)]">
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
