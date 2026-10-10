/**
 * Shared semicolon-delimited CSV handling. Keep legacy export schemas intact:
 * callers own their headers, ordering, and line-ending conventions.
 */
export function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

/** BOM + semicolon-delimited quoted cells for local/ANP exports. */
export function serializeSemicolonCsv(rows: readonly (readonly unknown[])[]): string {
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(";")).join("\n");
}

/**
 * Keep the generated object URL available until after the browser has had a
 * chance to begin the download. Immediate revocation can interrupt downloads
 * on slower/mobile browsers.
 */
export function downloadCsvFile(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
