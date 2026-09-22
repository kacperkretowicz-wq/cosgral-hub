import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-white/88 text-black border border-white/70 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] backdrop-blur-md hover:bg-white hover:scale-[1.03] active:scale-[0.98]",
  secondary:
    "bg-white/10 text-white border border-white/20 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset] backdrop-blur-xl hover:border-white/35 hover:bg-white/16 hover:scale-[1.03] active:scale-[0.98]",
  ghost:
    "bg-white/[0.04] text-white/55 border border-white/10 backdrop-blur-md hover:text-white hover:bg-white/10",
  danger:
    "bg-red-500/15 text-red-200 border border-red-500/30 backdrop-blur-md hover:bg-red-500/25",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
