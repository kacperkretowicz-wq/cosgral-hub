import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm text-white/70">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-sm border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-white/50 focus:bg-white/8 ${className}`}
        {...props}
      />
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = "", id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm text-white/70">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`min-h-[120px] w-full resize-y rounded-sm border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-white/50 focus:bg-white/8 ${className}`}
        {...props}
      />
    </div>
  );
}
