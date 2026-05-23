"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/core/ui/button";
import { publicFormsApi } from "@/features/dashboard/api";

type Field = { id: string; type: string; label: string; placeholder?: string; required?: boolean; options?: string[] };

function str(v: unknown, fb = ""): string {
  if (v == null || v === "") return fb;
  return String(v);
}

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const slug = str(params?.slug);
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [started] = useState(() => Date.now());

  const load = useCallback(async () => {
    const f = await publicFormsApi.get(slug);
    setForm(f);
  }, [slug]);

  useEffect(() => {
    load().catch(() => setForm(null));
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form?.id) return;
    const completion_seconds = Math.round((Date.now() - started) / 1000);
    const res = await publicFormsApi.submit(str(form.id), {
      responses: values,
      visitor_info: {},
      completion_seconds,
    });
    setMessage(str(res.success_message, "¡Gracias!"));
    setDone(true);
    const redirect = str(res.redirect_url);
    if (redirect) {
      setTimeout(() => router.push(redirect), 1500);
    }
  }

  if (!form) {
    return <div className="p-8 text-center text-muted-foreground">Cargando formulario…</div>;
  }

  const fields = (form.fields as Field[]) ?? [];
  const settings = (form.settings as Record<string, unknown>) ?? {};

  if (done) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">{message}</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{str(form.title)}</h1>
        {form.description ? <p className="mt-1 text-muted-foreground">{str(form.description)}</p> : null}
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {fields.map((field) => (
          <label key={field.id} className="block text-sm">
            {field.label}
            {field.required ? " *" : ""}
            {field.type === "select" ? (
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                required={field.required}
                value={values[field.id] ?? ""}
                onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
              >
                <option value="">—</option>
                {(field.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <input
                type="checkbox"
                className="ml-2"
                checked={values[field.id] === "true"}
                onChange={(e) => setValues({ ...values, [field.id]: e.target.checked ? "true" : "false" })}
              />
            ) : (
              <input
                type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "date" ? "date" : "text"}
                className="mt-1 w-full rounded border px-3 py-2"
                placeholder={field.placeholder}
                required={field.required}
                value={values[field.id] ?? ""}
                onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
              />
            )}
          </label>
        ))}
        <Button type="submit">{str(settings.submit_button_text, "Enviar")}</Button>
      </form>
    </div>
  );
}
