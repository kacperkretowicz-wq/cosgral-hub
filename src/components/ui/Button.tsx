import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-white text-black hover:bg-white/90 border border-white",
  secondary:
    "bg-transparent text-white border border-white/30 hover:border-white/60 hover:bg-white/5",
  ghost: "bg-transparent text-white/70 hover:text-white hover:bg-white/5",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-sm px-6 py-3 text-sm font-medium tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
