import Link from "next/link";

export function PdConsentLabel({ id }: { id?: string }) {
  return (
    <span id={id} className="text-[13px] leading-relaxed text-zinc-600">
      Я даю{" "}
      <Link
        href="/legal/consent"
        className="font-medium text-zinc-800 underline-offset-2 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        согласие на обработку персональных данных
      </Link>{" "}
      и принимаю{" "}
      <Link
        href="/legal/privacy"
        className="font-medium text-zinc-800 underline-offset-2 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        политику конфиденциальности
      </Link>
      ,{" "}
      <Link
        href="/legal/terms"
        className="font-medium text-zinc-800 underline-offset-2 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        пользовательское соглашение
      </Link>{" "}
      и{" "}
      <Link
        href="/legal/offer"
        className="font-medium text-zinc-800 underline-offset-2 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        публичную оферту
      </Link>
      .
    </span>
  );
}
