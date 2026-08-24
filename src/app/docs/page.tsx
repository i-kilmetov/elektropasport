import type { Metadata } from "next";
import { DocsAccessGate } from "@/components/docs/docs-access-gate";
import { ServiceDocsPage } from "@/components/docs/service-docs-page";

export const metadata: Metadata = {
  title: "Документация сервиса — Током",
  description:
    "Бизнес-требования, логика работы, хранение данных и API сервиса tokom.ru",
  robots: { index: false, follow: false },
};

export default function DocsPage() {
  return (
    <DocsAccessGate>
      <ServiceDocsPage />
    </DocsAccessGate>
  );
}
