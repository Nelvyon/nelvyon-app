/**
 * export-utils.ts — Utilities for exporting content in multiple formats.
 * Uses browser-native APIs to generate downloads without heavy external dependencies.
 */

interface PDFSection {
  title?: string;
  heading?: string;
  content?: string;
  text?: string;
  items?: string[];
}

interface PDFMeta {
  author?: string;
  date?: string;
  footer?: string;
}

/**
 * Generate and download a PDF from structured sections using a print-friendly iframe.
 */
export function exportPDF(
  documentTitle: string,
  sections: PDFSection[],
  filename: string,
  meta?: PDFMeta,
): void {
  const html = buildPrintHTML(documentTitle, sections, meta);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    downloadBlob(html, `${filename}.html`, "text/html;charset=utf-8");
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (err) {
      downloadBlob(html, `${filename}.html`, "text/html;charset=utf-8");
    }
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  }, 500);
}

/**
 * Export plain text content as a .txt file.
 */
export function exportTXT(content: string, filename: string): void {
  downloadBlob(content, `${filename}.txt`, "text/plain;charset=utf-8");
}

/**
 * Export markdown content as a .md file.
 */
export function exportMarkdown(content: string, filename: string): void {
  downloadBlob(content, `${filename}.md`, "text/markdown;charset=utf-8");
}

/**
 * Export HTML content as a .html file (wrapped in a basic document).
 */
export function exportHTML(content: string, filename: string): void {
  const fullHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 28px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { font-size: 20px; color: #333; margin-top: 24px; }
    p { margin: 8px 0; }
    ul { padding-left: 20px; }
    li { margin: 4px 0; }
    .badge { background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
${content}
</body>
</html>`;
  downloadBlob(fullHTML, `${filename}.html`, "text/html;charset=utf-8");
}

/**
 * Export data as a .json file.
 */
export function exportJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(json, `${filename}.json`, "application/json;charset=utf-8");
}

/**
 * Export rows as a .csv file.
 */
export function exportCSV(rows: Record<string, unknown>[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines: string[] = [headers.map(escapeCSVField).join(",")];
  for (const row of rows) {
    csvLines.push(headers.map((h) => escapeCSVField(String(row[h] ?? ""))).join(","));
  }
  const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  downloadBlob(bom + csvLines.join("\n"), `${filename}.csv`, "text/csv;charset=utf-8");
}

/**
 * Export rows as an .xlsx-compatible file (actually a well-formatted HTML table
 * that Excel can open). For a true .xlsx, a library like SheetJS would be needed.
 */
export function exportExcel(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = "Sheet1",
): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);

  let table = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${escapeHTML(sheetName)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body><table border="1">`;

  table += "<thead><tr>";
  for (const h of headers) {
    table += `<th style="background:#4472C4;color:white;font-weight:bold;padding:8px;">${escapeHTML(h)}</th>`;
  }
  table += "</tr></thead><tbody>";

  for (const row of rows) {
    table += "<tr>";
    for (const h of headers) {
      table += `<td style="padding:6px;">${escapeHTML(String(row[h] ?? ""))}</td>`;
    }
    table += "</tr>";
  }

  table += "</tbody></table></body></html>";
  downloadBlob(table, `${filename}.xls`, "application/vnd.ms-excel;charset=utf-8");
}

/**
 * Export a presentation/slides as a PDF using a print-friendly iframe.
 * Each slide is rendered as a separate page.
 */
export function exportPresentationPDF(
  title: string,
  slides: Array<{
    slide_number: number;
    layout: string;
    title: string;
    subtitle?: string;
    content?: string;
    bullets?: string[];
    stats?: Array<{ value: string; label: string }>;
    visual_notes?: string;
    speaker_notes?: string;
  }>,
  filename: string,
): void {
  const slidesHTML = slides
    .map((slide) => {
      let html = '<div class="slide">';
      html += `<div class="slide-number">Slide ${slide.slide_number}</div>`;
      html += `<h2 class="slide-title">${escapeHTML(slide.title)}</h2>`;
      if (slide.subtitle) html += `<p class="slide-subtitle">${escapeHTML(slide.subtitle)}</p>`;
      if (slide.content) html += `<p class="slide-content">${escapeHTML(slide.content)}</p>`;
      if (slide.bullets && slide.bullets.length > 0) {
        html += '<ul class="slide-bullets">';
        for (const b of slide.bullets) {
          html += `<li>${escapeHTML(b)}</li>`;
        }
        html += "</ul>";
      }
      if (slide.stats && slide.stats.length > 0) {
        html += '<div class="slide-stats">';
        for (const s of slide.stats) {
          html += `<div class="stat"><span class="stat-value">${escapeHTML(s.value)}</span><span class="stat-label">${escapeHTML(s.label)}</span></div>`;
        }
        html += "</div>";
      }
      if (slide.speaker_notes) {
        html += `<div class="speaker-notes"><strong>Notas:</strong> ${escapeHTML(slide.speaker_notes)}</div>`;
      }
      html += "</div>";
      return html;
    })
    .join("\n");

  const fullHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escapeHTML(title)}</title>
  <style>
    @page { margin: 1.5cm; size: landscape; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; margin: 0; padding: 0; }
    .slide {
      page-break-after: always;
      min-height: 90vh;
      padding: 40px 60px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      border: 1px solid #e5e7eb;
      margin: 20px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }
    .slide:last-child { page-break-after: auto; }
    .slide-number { position: absolute; top: 20px; right: 30px; font-size: 12px; color: #94a3b8; }
    .slide-title { font-size: 28px; font-weight: 700; margin: 0 0 8px 0; color: #1e293b; }
    .slide-subtitle { font-size: 16px; color: #64748b; margin: 0 0 20px 0; }
    .slide-content { font-size: 14px; line-height: 1.7; color: #334155; }
    .slide-bullets { font-size: 14px; line-height: 1.8; padding-left: 24px; color: #334155; }
    .slide-bullets li { margin: 6px 0; }
    .slide-stats { display: flex; gap: 30px; margin-top: 20px; }
    .stat { text-align: center; }
    .stat-value { display: block; font-size: 28px; font-weight: 800; color: #2563eb; }
    .stat-label { display: block; font-size: 12px; color: #64748b; margin-top: 4px; }
    .speaker-notes { margin-top: 24px; padding: 12px 16px; background: #fef3c7; border-radius: 8px; font-size: 11px; color: #92400e; }
    @media print {
      .slide { border: none; margin: 0; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="slide" style="text-align:center;">
    <h1 style="font-size:36px;font-weight:800;color:#1e293b;">${escapeHTML(title)}</h1>
    <p style="font-size:14px;color:#64748b;margin-top:12px;">${slides.length} slides · Generado por NELVYON SaaS</p>
  </div>
  ${slidesHTML}
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    downloadBlob(fullHTML, `${filename}.html`, "text/html;charset=utf-8");
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(fullHTML);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (err) {
      downloadBlob(fullHTML, `${filename}.html`, "text/html;charset=utf-8");
    }
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  }, 500);
}

/**
 * Flatten segment data into flat rows suitable for CSV/Excel export.
 */
export function flattenSegmentData(
  segments: Array<{
    name: string;
    description: string;
    count: number;
    percentage: string;
    potential_score: number;
    characteristics: string[];
    recommended_actions: string[];
    suggested_campaign: string;
    contact_ids: number[];
  }>,
  contacts: Array<Record<string, unknown>>,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const seg of segments) {
    for (const cId of seg.contact_ids) {
      const contact = contacts[cId] ?? {};
      rows.push({
        Segmento: seg.name,
        Descripcion: seg.description,
        Puntuacion: seg.potential_score,
        Porcentaje: seg.percentage,
        Campaña_Sugerida: seg.suggested_campaign,
        Caracteristicas: seg.characteristics.join(', '),
        Acciones: seg.recommended_actions.join(', '),
        ...contact,
      });
    }
  }
  // If no contact_ids matched, still export segment-level rows
  if (rows.length === 0) {
    for (const seg of segments) {
      rows.push({
        Segmento: seg.name,
        Descripcion: seg.description,
        Puntuacion: seg.potential_score,
        Porcentaje: seg.percentage,
        Cantidad: seg.count,
        Campaña_Sugerida: seg.suggested_campaign,
        Caracteristicas: seg.characteristics.join(', '),
        Acciones: seg.recommended_actions.join(', '),
      });
    }
  }
  return rows;
}

/**
 * Export multiple sheets as a single Excel (HTML-table based) file.
 * Each sheet is rendered as a separate worksheet via XML spreadsheet format.
 */
export function exportExcelMultiSheet(
  sheets: Array<{ name: string; data: Record<string, unknown>[] }>,
  filename: string,
): void {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';

  for (const sheet of sheets) {
    const safeName = sheet.name.replace(/[^\w\s]/g, '').slice(0, 31) || 'Sheet';
    xml += `<Worksheet ss:Name="${safeName}"><Table>\n`;

    if (sheet.data.length > 0) {
      const headers = Object.keys(sheet.data[0]);
      // Header row
      xml += '<Row>';
      for (const h of headers) {
        xml += `<Cell><Data ss:Type="String">${escapeHTML(h)}</Data></Cell>`;
      }
      xml += '</Row>\n';
      // Data rows
      for (const row of sheet.data) {
        xml += '<Row>';
        for (const h of headers) {
          const val = row[h];
          const isNum = typeof val === 'number';
          xml += `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeHTML(String(val ?? ''))}</Data></Cell>`;
        }
        xml += '</Row>\n';
      }
    }

    xml += '</Table></Worksheet>\n';
  }

  xml += '</Workbook>';
  downloadBlob(xml, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8');
}

/* ─── Internal helpers ─── */

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPrintHTML(title: string, sections: PDFSection[], meta?: PDFMeta): string {
  const sectionsHTML = sections
    .map((s) => {
      const heading = s.title || s.heading || "";
      const body = s.content || s.text || "";
      const items = s.items || [];
      let html = '<div class="section">';
      if (heading) html += `<h2>${escapeHTML(heading)}</h2>`;
      if (body) html += `<p>${escapeHTML(body)}</p>`;
      if (items.length > 0) {
        html += "<ul>";
        for (const item of items) {
          html += `<li>${escapeHTML(item)}</li>`;
        }
        html += "</ul>";
      }
      html += "</div>";
      return html;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escapeHTML(title)}</title>
  <style>
    @page { margin: 2cm; size: A4; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #1a1a1a;
      line-height: 1.6;
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 22px;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header .meta {
      font-size: 11px;
      color: #666;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section h2 {
      font-size: 13px;
      font-weight: bold;
      margin: 0 0 6px 0;
      color: #1a1a1a;
    }
    .section p {
      font-size: 11px;
      margin: 0 0 6px 0;
      text-align: justify;
    }
    .section ul {
      font-size: 11px;
      margin: 4px 0;
      padding-left: 20px;
    }
    .section li {
      margin: 2px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      font-size: 10px;
      color: #999;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHTML(title)}</h1>
    <div class="meta">
      ${meta?.author ? `Autor: ${escapeHTML(meta.author)} · ` : ""}
      ${meta?.date ? `Fecha: ${escapeHTML(meta.date)}` : ""}
    </div>
  </div>
  ${sectionsHTML}
  <div class="footer">
    ${meta?.footer ? escapeHTML(meta.footer) + " · " : ""}Documento generado el ${new Date().toLocaleString("es")}
  </div>
</body>
</html>`;
}