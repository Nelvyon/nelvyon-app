"use client";

import { useEffect, useState } from "react";

import { settingsApi } from "@/features/settings/api";

/**
 * Campo assignee con sugerencias de miembros del workspace (email).
 * Mantiene texto libre para no romper datos históricos.
 */
export function OsAssigneeInput({
  value,
  onChange,
  label = "Responsable",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const listId = "os-assignee-suggestions";

  useEffect(() => {
    let cancelled = false;
    void settingsApi
      .listMembers()
      .then((members) => {
        if (cancelled) return;
        const emails = members
          .map((m) => m.email?.trim())
          .filter((e): e is string => Boolean(e));
        setSuggestions([...new Set(emails)]);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <label className={`flex flex-col gap-1 text-xs text-white/50 ${className}`}>
      {label}
      <input
        list={suggestions.length > 0 ? listId : undefined}
        className="rounded border border-white/15 bg-[#0b1428] px-3 py-2 text-sm text-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nombre o email"
      />
      {suggestions.length > 0 ? (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
      <span className="text-[10px] text-white/30">
        Texto libre; sugerencias desde miembros del workspace cuando están disponibles.
      </span>
    </label>
  );
}
