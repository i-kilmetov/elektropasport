import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap ty-button transition-all duration-300 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_8px_24px_rgba(17,17,19,0.18)] hover:bg-zinc-800",
        secondary:
          "bg-zinc-100 text-zinc-900 border border-black/5 hover:bg-zinc-200/80",
        ghost: "bg-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100",
        outline:
          "border border-black/10 bg-transparent text-zinc-900 hover:bg-zinc-50",
      },
      size: {
        default: "h-14 px-6 rounded-full",
        sm: "h-11 px-4 rounded-full text-[15px] font-semibold",
        lg: "h-16 px-8 rounded-full text-[18px] font-semibold",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
