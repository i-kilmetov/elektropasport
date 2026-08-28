import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPageLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-10 pb-16 pt-[max(2rem,env(safe-area-inset-top))] text-zinc-800">
      <p className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          href="/legal"
          className="ty-subtitle text-zinc-600 underline-offset-2 hover:underline"
        >
          ← Все документы
        </Link>
        <Link
          href="/"
          className="ty-body underline-offset-2 hover:underline"
        >
          На главную
        </Link>
      </p>
      <h1 className="mb-2 ty-display text-zinc-900">
        {title}
      </h1>
      <p className="mb-8 ty-note">
        Редакция от {updatedAt}
      </p>
      <article className="legal-prose space-y-5 ty-body">
        {children}
      </article>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 ty-title">{title}</h2>
      <div className="space-y-2 text-zinc-700">{children}</div>
    </section>
  );
}
