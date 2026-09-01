import { cn } from "@/lib/utils";

/** Classic consultation mark: speech bubble with text lines. */
export function ConsultationIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("h-6 w-6 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 4.5H17C18.38 4.5 19.5 5.62 19.5 7V14.5C19.5 15.88 18.38 17 17 17H11.2L7.8 19.6C7.16 20.08 6.25 19.62 6.25 18.82V17H7C5.62 17 4.5 15.88 4.5 14.5V7C4.5 5.62 5.62 4.5 7 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 9H15.5M8.5 12H13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
