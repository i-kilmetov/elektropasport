import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-[17px] font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-white shadow-[0_8px_32px_rgba(124,92,255,0.35)] hover:brightness-110",
        secondary:
          "bg-white/10 text-white backdrop-blur-xl border border-white/10 hover:bg-white/15",
        ghost: "bg-transparent text-white/70 hover:text-white hover:bg-white/5",
        outline:
          "border border-white/15 bg-transparent text-white hover:bg-white/8",
      },
      size: {
        default: "h-14 px-6 rounded-[20px]",
        sm: "h-11 px-4 rounded-[16px] text-[15px]",
        lg: "h-16 px-8 rounded-[20px] text-[18px]",
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
