import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function AgeIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

/** Младенец — первый класс. */
export function BabyAgeIcon(props: IconProps) {
  return (
    <AgeIcon {...props}>
      <circle cx="12" cy="9" r="4" />
      <path d="M8.4 14.6c1-1.6 2.2-2.3 3.6-2.3s2.6.7 3.6 2.3" />
      <ellipse cx="12" cy="17.4" rx="3.2" ry="2.4" />
      <path d="M8.8 16.6c-1.2.2-2 .9-2 1.8 0 1 1.4 1.6 3.2 1.6" />
      <path d="M15.2 16.6c1.2.2 2 .9 2 1.8 0 1-1.4 1.6-3.2 1.6" />
    </AgeIcon>
  );
}

/** Подросток — второй класс. */
export function TeenAgeIcon(props: IconProps) {
  return (
    <AgeIcon {...props}>
      <circle cx="12" cy="6.4" r="2.4" />
      <path d="M9.4 10.2h5.2c.7 0 1.2.6 1.1 1.3l-.6 3.7H8.9l-.6-3.7c-.1-.7.4-1.3 1.1-1.3Z" />
      <path d="M10.2 15.2v6.2" />
      <path d="M13.8 15.2v6.2" />
      <path d="M8.4 12.4 6.8 15" />
      <path d="M15.6 12.4 17.2 15" />
    </AgeIcon>
  );
}

/** Взрослый — третий класс. */
export function AdultAgeIcon(props: IconProps) {
  return (
    <AgeIcon {...props}>
      <circle cx="12" cy="5.5" r="2.3" />
      <path d="M12 7.9v6.6" />
      <path d="M7.2 11.2 12 12.8l4.8-1.6" />
      <path d="M8.4 21.5 12 14.5l3.6 7" />
    </AgeIcon>
  );
}
