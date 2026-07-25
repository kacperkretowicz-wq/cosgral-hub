"use client";

import { useCallback, useState } from "react";

interface FileDropzoneProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  uploadedFiles?: string[];
}

export function FileDropzone({
  label = "Upuść pliki lub kliknij, aby wgrać",
  accept,
  multiple = true,
  onFilesSelected,
  uploadedFiles = [],
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;
      onFilesSelected(Array.from(fileList));
    },
    [onFilesSelected],
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed px-4 py-8 text-center transition ${
          isDragging
            ? "border-white/60 bg-white/10"
            : "border-white/30 bg-white/3 hover:border-white/50 hover:bg-white/5"
        }`}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          id={`file-${label.replace(/\s+/g, "-")}`}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <label
          htmlFor={`file-${label.replace(/\s+/g, "-")}`}
          className="cursor-pointer space-y-2"
        >
          <svg
            className="mx-auto h-8 w-8 text-white/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-white/60">{label}</p>
          <p className="text-xs text-white/30">
            JPG, PNG, SVG, PDF, MP4 — max 50 MB
          </p>
        </label>
      </div>
      {uploadedFiles.length > 0 && (
        <ul className="space-y-1 text-sm text-white/50">
          {uploadedFiles.map((name) => (
            <li key={name} className="flex items-center gap-2">
              <span className="text-green-400/80">✓</span> {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
