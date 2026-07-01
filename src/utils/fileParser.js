import * as XLSX from "xlsx";

// ── CSV ───────────────────────────────────────────────────
export function parseCSV(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const vals = [];
    let cur = "",
      inQ = false;
    for (const ch of line) {
      if (ch === '"') {
        inQ = !inQ;
      } else if (ch === "," && !inQ) {
        vals.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] ?? "";
    });
    return obj;
  });
}

// ── Excel ─────────────────────────────────────────────────
export function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return { rows, sheet: wb.SheetNames[0] };
}

// ── JSON ──────────────────────────────────────────────────
export function parseJSON(text) {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && data !== null) {
    // Check if it's an object with array values
    const firstVal = Object.values(data)[0];
    if (Array.isArray(firstVal)) return firstVal;
    return [data];
  }
  return [{ value: String(data) }];
}

// ── TXT ───────────────────────────────────────────────────
export function parseTXT(text) {
  const lines = text
    .trim()
    .split("\n")
    .filter((l) => l.trim());
  if (!lines.length) return [];

  // Try tab separated
  if (lines[0].includes("\t")) {
    const headers = lines[0].split("\t").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split("\t").map((v) => v.trim());
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] ?? "";
      });
      return obj;
    });
  }

  // Try comma separated
  if (lines[0].includes(",")) {
    return parseCSV(text);
  }

  // Try key: value pairs
  if (lines[0].includes(":")) {
    const rows = [];
    let currentRow = {};
    let rowCount = 0;
    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim().replace(/\s+/g, "_");
        const val = line.slice(colonIdx + 1).trim();
        currentRow[key] = val;
        rowCount++;
        if (rowCount % 5 === 0) {
          rows.push({ ...currentRow });
          currentRow = {};
        }
      }
    }
    if (Object.keys(currentRow).length) rows.push(currentRow);
    return rows.length
      ? rows
      : lines.map((l, i) => ({
          Line: i + 1,
          Content: l.trim(),
        }));
  }

  // Plain text fallback
  return lines.map((l, i) => ({ Line: i + 1, Content: l.trim() }));
}

// ── Main readFile ─────────────────────────────────────────
export function readFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected"));
      return;
    }
    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const rows = parseCSV(e.target.result);
          if (!rows.length) throw new Error("File is empty");
          resolve({ rows, fileName: file.name, type: "CSV" });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const { rows, sheet } = parseExcel(e.target.result);
          if (!rows.length) throw new Error("Excel file is empty");
          resolve({ rows, fileName: file.name, type: "Excel", sheet });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    } else if (ext === "json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const rows = parseJSON(e.target.result);
          if (!rows.length) throw new Error("JSON file is empty");
          resolve({ rows, fileName: file.name, type: "JSON" });
        } catch (err) {
          reject(new Error("Invalid JSON: " + err.message));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    } else if (ext === "txt") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const rows = parseTXT(e.target.result);
          if (!rows.length) throw new Error("TXT file is empty");
          resolve({ rows, fileName: file.name, type: "TXT" });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    } else {
      reject(
        new Error(
          `File type .${ext} not supported. Use CSV, Excel, JSON or TXT.`,
        ),
      );
    }
  });
}
