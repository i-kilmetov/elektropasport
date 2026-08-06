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
  title: "Электропаспорт",
  description: "Цифровой паспорт электрического щитка",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Электропаспорт",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0B0B0F",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${manrope.variable} h-full antialiased dark`}>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" defer />
      </head>
      <body className="min-h-dvh bg-[#050507] font-sans text-white">
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
