import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-white text-black border border-white hover:scale-[1.03] active:scale-[0.98]",
  secondary:
    "bg-white/[0.04] text-white border border-white/15 hover:border-white/35 hover:bg-white/[0.07] hover:scale-[1.03] active:scale-[0.98]",
  ghost: "bg-transparent text-white/60 border border-transparent hover:text-white hover:bg-white/5",
  danger:
    "bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/25",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-[0.12em] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
