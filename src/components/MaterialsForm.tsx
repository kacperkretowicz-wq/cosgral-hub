"use client";

import { useCallback, useEffect, useState } from "react";
import { MATERIAL_SECTIONS } from "@/lib/offer-templates";
import { Button } from "./ui/Button";
import { FileDropzone } from "./ui/FileDropzone";
import { GlassCard } from "./ui/GlassCard";
import { Input, Textarea } from "./ui/Input";

interface MaterialsFormProps {
  token: string;
}

type FormValues = Record<string, Record<string, string>>;

export function MaterialsForm({ token }: MaterialsFormProps) {
  const [values, setValues] = useState<FormValues>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string[]>>(
    {},
  );
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/submissions?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const loaded: FormValues = {};
        for (const sub of data) {
          if (!loaded[sub.section_key]) loaded[sub.section_key] = {};
          loaded[sub.section_key][sub.field_key] = sub.text_content;
        }
        setValues(loaded);
      })
      .catch(() => {});

    fetch(`/api/upload?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const files: Record<string, string[]> = {};
        for (const f of data) {
          if (!files[f.section_key]) files[f.section_key] = [];
          files[f.section_key].push(f.file_name);
        }
        setUploadedFiles(files);
      })
      .catch(() => {});
  }, [token]);

  const setField = useCallback(
    (sectionKey: string, fieldKey: string, value: string) => {
      setValues((prev) => ({
        ...prev,
        [sectionKey]: { ...prev[sectionKey], [fieldKey]: value },
      }));
    },
    [],
  );

  const handleUpload = useCallback(
    async (sectionKey: string, files: File[]) => {
      setUploading((prev) => ({ ...prev, [sectionKey]: true }));
      setError("");

      for (const file of files) {
        const formData = new FormData();
        formData.append("token", token);
        formData.append("section_key", sectionKey);
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          setError(err.error ?? "Błąd uploadu");
          setUploading((prev) => ({ ...prev, [sectionKey]: false }));
          return;
        }

        const data = await res.json();
        setUploadedFiles((prev) => ({
          ...prev,
          [sectionKey]: [...(prev[sectionKey] ?? []), data.file_name],
        }));
      }

      setUploading((prev) => ({ ...prev, [sectionKey]: false }));
    },
    [token],
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    const submissions = Object.entries(values).flatMap(
      ([section_key, fields]) =>
        Object.entries(fields).map(([field_key, text_content]) => ({
          section_key,
          field_key,
          text_content,
        })),
    );

    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, submissions }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? "Błąd wysyłania");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="glass-strong rounded-lg p-12 text-center space-y-4">
        <div className="text-4xl">✓</div>
        <h2 className="text-2xl font-bold">Dziękujemy!</h2>
        <p className="text-white/60">
          Materiały zostały przesłane. Skontaktujemy się w razie pytań.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold md:text-3xl">Prześlij materiały</h1>
        <p className="text-sm text-white/60">
          Wypełnij pola tekstowe i wgraj pliki w każdej sekcji. Możesz wracać
          i uzupełniać dane w dowolnym momencie.
        </p>
      </header>

      {error && (
        <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {MATERIAL_SECTIONS.map((section) => (
        <GlassCard
          key={section.key}
          title={section.title}
          description={section.description}
        >
          <div className="space-y-4">
            {section.fields.map((field) =>
              field.type === "textarea" ? (
                <Textarea
                  key={field.key}
                  label={field.label}
                  placeholder={field.placeholder}
                  value={values[section.key]?.[field.key] ?? ""}
                  onChange={(e) =>
                    setField(section.key, field.key, e.target.value)
                  }
                />
              ) : (
                <Input
                  key={field.key}
                  label={field.label}
                  placeholder={field.placeholder}
                  value={values[section.key]?.[field.key] ?? ""}
                  onChange={(e) =>
                    setField(section.key, field.key, e.target.value)
                  }
                />
              ),
            )}

            {section.uploadLabel && (
              <div className="pt-2">
                {uploading[section.key] ? (
                  <p className="text-sm text-white/50">Wgrywanie...</p>
                ) : (
                  <FileDropzone
                    label={section.uploadLabel}
                    multiple={section.uploadMultiple}
                    onFilesSelected={(files) =>
                      handleUpload(section.key, files)
                    }
                    uploadedFiles={uploadedFiles[section.key] ?? []}
                  />
                )}
              </div>
            )}
          </div>
        </GlassCard>
      ))}

      <div className="flex justify-center pt-4">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-10 py-4 text-base"
        >
          {submitting ? "Wysyłanie..." : "Wyślij materiały"}
        </Button>
      </div>
    </div>
  );
}
