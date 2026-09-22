"use client";

import type {
  ChangeEvent,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { DateTimeField } from "@/components/ui/DateTimeField";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({
  label,
  className = "",
  id,
  type,
  value,
  defaultValue,
  onChange,
  disabled,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  if (type === "date" || type === "datetime-local") {
    const strValue =
      typeof value === "string"
        ? value
        : typeof defaultValue === "string"
          ? defaultValue
          : "";
    return (
      <DateTimeField
        mode={type === "datetime-local" ? "datetime" : "date"}
        label={label}
        value={strValue}
        disabled={disabled}
        className={className}
        onChange={(next) => {
          if (!onChange) return;
          const fake = {
            target: { value: next },
            currentTarget: { value: next },
          } as ChangeEvent<HTMLInputElement>;
          onChange(fake);
        }}
      />
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm text-white/45">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        className={`glass-field w-full px-4 py-2.5 text-white placeholder:text-white/45 transition focus:ring-2 focus:ring-white/15 ${className}`}
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
        <label htmlFor={inputId} className="block text-sm text-white/45">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`glass-field min-h-[120px] w-full resize-y rounded-2xl px-4 py-3 text-white placeholder:text-white/45 transition focus:ring-2 focus:ring-white/15 ${className}`}
        {...props}
      />
    </div>
  );
}
