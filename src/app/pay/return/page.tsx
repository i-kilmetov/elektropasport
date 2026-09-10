import type { Metadata } from "next";
import { PayReturnClient } from "@/app/pay/return/pay-return-client";

export const metadata: Metadata = {
  title: "Оплата — Током",
  robots: { index: false, follow: false },
};

export default function PayReturnPage() {
  return <PayReturnClient />;
}
