import Script from "next/script";
import { googleAnalyticsId } from "@/lib/analytics";

/**
 * Loads Google Analytics 4 when NEXT_PUBLIC_GA_ID is set (format G-XXXXXXXXXX).
 * Measurement id is public by design (same as on any site with GA4).
 */
export function GoogleAnalytics() {
  const measurementId = googleAnalyticsId();
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
