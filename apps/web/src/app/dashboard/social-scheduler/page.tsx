"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { socialApi } from "@/features/builders/api";

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-500",
  linkedin: "bg-blue-700",
  facebook: "bg-blue-600",
  tiktok: "bg-black",
};

type ViewMode = "calendar" | "list";

interface SocialPostRow {
  id: string;
  content?: string;
  status: string;
  scheduled_at?: string;
  platforms?: string[];
}

export default function SocialSchedulerPage() {
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<Record<string, SocialPostRow[]>>({});
  const [posts, setPosts] = useState<SocialPostRow[]>([]);
  const [accounts, setAccounts] = useState<{ platform: string; connected?: boolean }[]>([]);
  const [view, setView] = useState<ViewMode>("calendar");
  const [modal, setModal] = useState(false);
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [file, setFile] = useState<File | null>(null);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
    const res = await socialApi.calendar(year, month);
    setDays((res.days as Record<string, SocialPostRow[]>) ?? {});
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
    const res = await socialApi.posts();
    setPosts((res.items as SocialPostRow[]) ?? []);
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalendar().catch(() => setDays({}));
    loadPosts().catch(() => setPosts([]));
    socialApi
      .accounts()
      .then((r) => setAccounts((r.accounts as { platform: string; connected?: boolean }[]) ?? []))
      .catch(() => setAccounts([]));
  }, [loadCalendar, loadPosts]);

  const monthLabel = useMemo(
    () => new Date(year, month - 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
    [year, month],
  );

  const calendarCells = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  async function connect(platform: string) {
    const redirect = `${window.location.origin}/dashboard/social-scheduler`;
    const res = await socialApi.oauthUrl(platform, redirect);
    if (res.url) window.location.href = res.url;
  }

  async function createPost() {
    let mediaUrl: string | undefined;
    if (file) {
      const up = await socialApi.uploadMedia(file);
      mediaUrl = up.url;
    }
    await socialApi.createPost({
      content,
      scheduled_at: scheduledAt || new Date().toISOString(),
      platforms,
      media_url: mediaUrl,
      post_type: mediaUrl ? "image" : "text",
    });
    setModal(false);
    setContent("");
    setFile(null);
    loadCalendar();
    loadPosts();
  }

  function togglePlatform(p: string) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  const defaultAccounts = ["instagram", "linkedin", "facebook", "tiktok"];

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Social Scheduler</h1>
            <p className="text-sm text-muted-foreground">Programa publicaciones en redes sociales</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setView("calendar")} variant={view === "calendar" ? "default" : "outline"}>
              Calendario
            </Button>
            <Button onClick={() => setView("list")} variant={view === "list" ? "default" : "outline"}>
              Lista
            </Button>
            <Button onClick={() => setModal(true)}>Nuevo post</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {defaultAccounts.map((p) => {
            const acc = accounts.find((a) => a.platform === p);
            return (
              <Button key={p} onClick={() => connect(p)} size="sm" variant={acc?.connected ? "default" : "outline"}>
                {acc?.connected ? `${p} ✓` : `Conectar ${p}`}
              </Button>
            );
          })}
        </div>

        {view === "calendar" ? (
          <div className="rounded-xl border p-4">
            <div className="mb-4 flex items-center justify-between">
              <Button onClick={prevMonth} size="sm" variant="outline">
                ←
              </Button>
              <h2 className="font-semibold capitalize">{monthLabel}</h2>
              <Button onClick={nextMonth} size="sm" variant="outline">
                →
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarCells.map((day, i) => {
                const key = day ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                const dayPosts = day ? days[key] ?? [] : [];
                return (
                  <div className="min-h-[72px] rounded border p-1 text-left text-xs" key={i}>
                    {day ? <span className="font-medium">{day}</span> : null}
                    <div className="mt-1 space-y-0.5">
                      {dayPosts.slice(0, 3).map((post) =>
                        (post.platforms ?? ["instagram"]).map((pl) => (
                          <span className={`block truncate rounded px-1 text-[10px] text-white ${PLATFORM_COLORS[pl] ?? "bg-gray-500"}`} key={`${post.id}-${pl}`}>
                            {pl}
                          </span>
                        )),
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">Contenido</th>
                  <th>Estado</th>
                  <th>Programado</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr className="border-b" key={p.id}>
                    <td className="max-w-xs truncate p-3">{p.content ?? "—"}</td>
                    <td>{p.status}</td>
                    <td>{p.scheduled_at ? new Date(p.scheduled_at).toLocaleString("es-ES") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPageTransition>

      <EliteModal onClose={() => setModal(false)} open={modal} title="Nuevo post">
        <textarea className="mb-3 w-full rounded-lg border px-3 py-2" onChange={(e) => setContent(e.target.value)} placeholder="Texto del post" rows={4} value={content} />
        <input className="mb-3 w-full rounded-lg border px-3 py-2" onChange={(e) => setScheduledAt(e.target.value)} type="datetime-local" />
        <input accept="image/*" className="mb-3 w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} type="file" />
        <p className="mb-2 text-sm font-medium">Redes</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {defaultAccounts.map((p) => (
            <Button key={p} onClick={() => togglePlatform(p)} size="sm" variant={platforms.includes(p) ? "default" : "outline"}>
              {p}
            </Button>
          ))}
        </div>
        <Button className="w-full" onClick={createPost}>
          Programar
        </Button>
      </EliteModal>
    </ProtectedLayout>
  );
}
