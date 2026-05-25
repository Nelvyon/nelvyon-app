import fs from "fs";
import path from "path";

const ROOT = path.join(
  "c:/Users/Asus/Downloads/app_v181/apps/web/src/app/dashboard",
);

for (const file of fs.readdirSync(ROOT, { recursive: true })) {
  if (typeof file !== "string" || !file.endsWith("page.tsx")) continue;
  const full = path.join(ROOT, file);
  let t = fs.readFileSync(full, "utf8");
  if (!t.includes("<EliteModal")) continue;
  const re =
    /import \{([^}]+)\} from "@\/features\/dashboard\/components\/DashboardTabs";/;
  const m = t.match(re);
  if (!m) continue;
  const parts = m[1].split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.includes("EliteModal")) {
    parts.push("EliteModal");
    t = t.replace(re, `import { ${parts.join(", ")} } from "@/features/dashboard/components/DashboardTabs";`);
    fs.writeFileSync(full, t);
    console.log("fixed", file);
  }
}
