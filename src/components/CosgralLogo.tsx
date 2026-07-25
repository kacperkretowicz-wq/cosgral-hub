import Image from "next/image";
import { LOGO_ALT, LOGO_SRC, LOGO_SIZES } from "@/lib/brand";

type LogoSize = keyof typeof LOGO_SIZES;

interface CosgralLogoProps {
  size?: LogoSize | number;
  className?: string;
  priority?: boolean;
}

export function CosgralLogo({
  size = "md",
  className = "",
  priority = false,
}: CosgralLogoProps) {
  const px = typeof size === "number" ? size : LOGO_SIZES[size];

  return (
    <Image
      src={LOGO_SRC}
      alt={LOGO_ALT}
      width={px}
      height={px}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}

interface CosgralBrandProps {
  size?: LogoSize | number;
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

export function CosgralBrand({
  size = "md",
  showText = true,
  subtitle,
  className = "",
}: CosgralBrandProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <CosgralLogo size={size} priority />
      {showText && (
        <div>
          <p className="text-xs tracking-[0.25em] text-white/50 uppercase">
            Cosgral
          </p>
          <p className="text-sm font-bold leading-tight">
            {subtitle ?? "Agency"}
          </p>
        </div>
      )}
    </div>
  );
}
