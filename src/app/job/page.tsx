import type { Metadata } from "next";
import { JobLandingPage } from "@/components/job-landing-page";

export const metadata: Metadata = {
  title: "Стать мастером — Током",
  description:
    "Присоединяйтесь к команде электриков Током: консультации, выезды, сборка щитков и монтаж.",
};

export default function JobPage() {
  return <JobLandingPage />;
}
