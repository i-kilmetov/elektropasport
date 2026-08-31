import type { Metadata } from "next";
import { BrandLaunchWaitlist } from "@/components/brand-splash";

export const metadata: Metadata = {
  title: "Открытие Током",
  description: "Оставьте номер — напишем, когда откроется tokom.ru.",
};

export default function OpeningPage() {
  return <BrandLaunchWaitlist startAtPhone />;
}
