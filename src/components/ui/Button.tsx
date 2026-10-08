import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-white/90 text-black border border-white/70 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] backdrop-blur-md hover:bg-white hover:scale-[1.02] active:scale-[0.96] active:bg-white/80 active:duration-75",
  secondary:
    "bg-white/10 text-white border border-white/20 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset] backdrop-blur-xl hover:border-white/35 hover:bg-white/16 hover:scale-[1.02] active:scale-[0.96] active:bg-white/25 active:duration-75",
  ghost:
    "bg-white/[0.04] text-white/70 border border-white/10 backdrop-blur-md hover:text-white hover:bg-white/10 active:scale-[0.96] active:bg-white/15 active:duration-75",
  danger:
    "bg-red-500/15 text-red-200 border border-red-500/30 backdrop-blur-md hover:bg-red-500/25 active:scale-[0.96] active:bg-red-500/35 active:duration-75",
};

const sizes: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-[0.65rem] tracking-[0.12em]",
  md: "px-5 py-2.5 text-xs tracking-[0.14em]",
  lg: "px-6 py-3 text-sm tracking-[0.16em]",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isButtonDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isButtonDisabled}
      aria-busy={isLoading}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-full font-medium uppercase outline-none transition-[transform,background-color,border-color,opacity,box-shadow] duration-150 ease-out active:duration-75 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="h-3.5 w-3.5 shrink-0 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
            />
          </svg>
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

