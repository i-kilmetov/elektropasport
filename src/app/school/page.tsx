import type { Metadata } from "next";
import { SchoolPageClient } from "@/app/school/school-page-client";

export const metadata: Metadata = {
  title: "Школа Током",
  description:
    "Короткие уроки по домашней электрике: от розетки до щитка. Школа Током.",
};

export default function SchoolPage() {
  return <SchoolPageClient />;
}
