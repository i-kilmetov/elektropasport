import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import {
  LEGAL_DOCUMENTS,
  LEGAL_OPERATOR,
  operatorEmail,
  operatorInn,
} from "@/lib/legal-operator";

export const metadata: Metadata = {
  title: "Юридическая информация — Током",
  description:
    "Оферта, политика конфиденциальности, пользовательское соглашение и реквизиты самозанятого.",
};

export default function LegalIndexPage() {
  const inn = operatorInn();
  const email = operatorEmail();

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-10 pb-16 pt-[max(2rem,env(safe-area-inset-top))] text-zinc-800">
      <p className="mb-8">
        <Link
          href="/"
          className="ty-subtitle text-zinc-600 underline-offset-2 hover:underline"
        >
          ← На главную
        </Link>
      </p>

      <BrandLogo className="h-8" />
      <h1 className="mt-5 ty-display text-zinc-900">
        Юридическая информация
      </h1>
      <p className="mt-2 ty-body">
        Документы сервиса «{LEGAL_OPERATOR.serviceName}» и реквизиты исполнителя.
      </p>

      <section className="mt-8">
        <h2 className="mb-3 ty-label uppercase tracking-[0.14em] text-zinc-400">
          Реквизиты
        </h2>
        <div className="rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-[0_1px_1px_rgba(17,17,19,0.04),0_2px_6px_rgba(17,17,19,0.04)]">
          <dl className="space-y-3 text-[15px]">
            <div>
              <dt className="ty-meta">ФИО</dt>
              <dd className="mt-0.5 font-medium text-zinc-900">
                {LEGAL_OPERATOR.fullName}
              </dd>
            </div>
            <div>
              <dt className="ty-meta">Статус</dt>
              <dd className="mt-0.5 text-zinc-800">{LEGAL_OPERATOR.status}</dd>
            </div>
            <div>
              <dt className="ty-meta">ИНН</dt>
              <dd className="mt-0.5 font-mono ty-heading tabular-nums text-zinc-900">
                {inn || "—"}
              </dd>
            </div>
            <div>
              <dt className="ty-meta">Email</dt>
              <dd className="mt-0.5">
                <a
                  href={`mailto:${email}`}
                  className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                >
                  {email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="ty-meta">Сайт</dt>
              <dd className="mt-0.5 text-zinc-800">{LEGAL_OPERATOR.siteUrl}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 ty-label uppercase tracking-[0.14em] text-zinc-400">
          Документы
        </h2>
        <ul className="space-y-3">
          {LEGAL_DOCUMENTS.map((doc) => (
            <li key={doc.href}>
              <Link
                href={doc.href}
                className="block rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-[0_1px_1px_rgba(17,17,19,0.04),0_2px_6px_rgba(17,17,19,0.04)] transition-colors hover:bg-zinc-50"
              >
                <div className="ty-heading">
                  {doc.title}
                </div>
                <p className="mt-1 ty-note">
                  {doc.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
