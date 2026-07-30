// Fetch rows from a public Google Sheet (CSV export URL)
// Sheet must be: File > Share > Publish to web > CSV format
export async function fetchGoogleSheetContacts(sheetUrl: string) {
  // Convert any Google Sheets URL to CSV export URL
  const csvUrl = toCSVUrl(sheetUrl);

  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error("Could not fetch Google Sheet. Make sure it is published to web.");

  const text = await res.text();
  return parseCSV(text);
}

function toCSVUrl(url: string): string {
  // Already a CSV export URL
  if (url.includes("output=csv")) return url;

  // https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error("Invalid Google Sheets URL");

  const sheetId = match[1];
  const gidMatch = url.match(/gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("Sheet must have a header row and at least one data row");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));

  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });

    return {
      name: obj.name || obj.fullname || obj.contactname || "",
      phone: obj.phone || obj.phonenumber || obj.mobile || obj.number || "",
      email: obj.email || obj.emailaddress || "",
      tags: obj.tags ? obj.tags.split("|").map((t) => t.trim()).filter(Boolean) : [],
    };
  }).filter((r) => r.phone);
}
