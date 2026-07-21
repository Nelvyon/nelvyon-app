import { describe, expect, it } from "vitest";
import { escapeHtml, sanitizeRichHtml } from "../htmlEscape";

describe("escapeHtml", () => {
  it("escapes XSS payloads used in LMS cert / email HTML", () => {
    expect(escapeHtml(`<script>alert(1)</script>`)).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(escapeHtml(`" onerror="alert(1)`)).toBe("&quot; onerror=&quot;alert(1)");
    expect(escapeHtml(`O'Brien & Co`)).toBe("O&#39;Brien &amp; Co");
  });

  it("leaves safe text unchanged", () => {
    expect(escapeHtml("María García")).toBe("María García");
  });
});

describe("sanitizeRichHtml", () => {
  it("strips script tags and event handlers", () => {
    const dirty = `<p>Hola</p><script>alert(1)</script><img src=x onerror="alert(1)">`;
    const clean = sanitizeRichHtml(dirty);
    expect(clean).toContain("<p>Hola</p>");
    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toMatch(/onerror/i);
  });

  it("neutralizes javascript: hrefs", () => {
    expect(sanitizeRichHtml(`<a href="javascript:alert(1)">x</a>`)).not.toMatch(/javascript:/i);
  });
});
