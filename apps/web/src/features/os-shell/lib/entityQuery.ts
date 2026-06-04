export function entityListUrl(
  base: string,
  params: {
    skip?: number;
    limit?: number;
    query?: Record<string, string | number | boolean | null | undefined>;
    sort?: string;
  } = {},
): string {
  const sp = new URLSearchParams();
  sp.set("skip", String(params.skip ?? 0));
  sp.set("limit", String(params.limit ?? 100));
  const q = params.query;
  if (q) {
    const clean = Object.fromEntries(
      Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== ""),
    );
    if (Object.keys(clean).length > 0) {
      sp.set("query", JSON.stringify(clean));
    }
  }
  if (params.sort) sp.set("sort", params.sort);
  return `${base}?${sp.toString()}`;
}
