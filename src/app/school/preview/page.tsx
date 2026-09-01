import { SchoolDiagram, SCHOOL_SKETCH_ORDER } from "@/components/school/diagrams";

export const metadata = {
  title: "Подписи на картинках — Школа Током",
};

export default function SchoolSketchPreviewPage() {
  return (
    <main className="mx-auto max-w-xl bg-[#f7f7f8] px-4 py-8 text-zinc-900">
      <h1 className="text-xl font-semibold">Подписи на картинках школы</h1>
      <p className="mt-2 text-[14px] text-zinc-500">
        Одинаковый шаблон: что нарисовано = смысл, ниже буква, единица или как
        узнать. Оплачивать курс не нужно.
      </p>
      <div className="mt-8 space-y-10">
        {SCHOOL_SKETCH_ORDER.map((item, index) => (
          <figure key={item.id}>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-zinc-400">
              {String(index + 1).padStart(2, "0")} · {item.title}
            </p>
            <SchoolDiagram id={item.id} />
          </figure>
        ))}
      </div>
    </main>
  );
}
