import { createSign } from "node:crypto";
import type { FinanceData, FinanceRow } from "./types";

const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const base64Url = (value: string) => Buffer.from(value).toString("base64url");
let accessToken: { value: string; expiresAt: number } | undefined;

async function getAccessToken() {
  if (accessToken && Date.now() < accessToken.expiresAt) return accessToken.value;
  if (!serviceAccount || !privateKey) throw new Error("Missing Google service-account settings.");

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: serviceAccount,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${signer.sign(privateKey).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Google could not authorize the dashboard connection.");
  const payload = await response.json() as { access_token: string; expires_in: number };
  accessToken = { value: payload.access_token, expiresAt: Date.now() + (payload.expires_in - 60) * 1000 };
  return accessToken.value;
}

function serialToDate(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const serial = Number(value);
  if (!Number.isFinite(serial)) return "";
  return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000).toISOString().slice(0, 10);
}

const numberOrNull = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function mapRows(values: unknown[][]): FinanceRow[] {
  return values.slice(1).map((row) => ({
    businessUnit: String(row[0] ?? ""), date: serialToDate(row[1]), mrr: numberOrNull(row[2]) ?? 0,
    grossMargin: numberOrNull(row[3]), netMargin: numberOrNull(row[4]), arppu: numberOrNull(row[5]),
    cac: numberOrNull(row[6]), churnRate: numberOrNull(row[7]), ltv: numberOrNull(row[8]),
    ltvCac: numberOrNull(row[9]), cacPayback: numberOrNull(row[10]), organicSalesPct: numberOrNull(row[11]),
    referralRate: numberOrNull(row[12]), totalSales: numberOrNull(row[13]), dataStatus: String(row[14] ?? ""),
  })).filter((row) => row.businessUnit && row.date && row.dataStatus === "Ready");
}

type DemoSeed = [string, string, number, number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null];
const demoSeed: DemoSeed[] = [
  ["Overview", "2026-04-01", 10414070.6, .601, -.066, 122.75, null, .063, 1170.84, null, null],
  ["Overview", "2026-05-01", 11262574.89, .930, .323, 135.63, null, .045, 2802.25, null, null],
  ["Overview", "2026-06-01", 10290678.7, .600, -.205, 142.25, 13536.67, .036, 2369.09, .175, 158.7],
  ["Overview", "2026-07-01", 10856316.3, .811, -1.144, 151.95, 335449.49, .051, 2417.84, .007, 2720.4],
  ["Overview", "2026-08-01", 14180649.1, .728, -.998, 189.45, 446381.36, .142, 970.83, .002, 3238],
  ["Overview", "2026-09-01", 13443954.98, .816, -.552, 198.72, 2130360, .061, 2658.87, .001, 13134.9],
  ["Diaspora Tutoring", "2026-04-01", 7136884.1, .418, null, 182997, null, 0, 0, null, null],
  ["Diaspora Tutoring", "2026-05-01", 7853466.39, .900, null, 191548, null, .077, 2238, null, null],
  ["Diaspora Tutoring", "2026-06-01", 7645119.7, .461, null, 182027, 13536.67, .049, 1711, .126, 7.95],
  ["Diaspora Tutoring", "2026-07-01", 8430301.8, .757, null, 187340, 335449.49, .024, 5913, .018, 56.6],
  ["Diaspora Tutoring", "2026-08-01", 9592993.3, .598, null, 191860, 446381.36, 0, null, null, null],
  ["Diaspora Tutoring", "2026-09-01", 9772440.98, .750, null, 187931, 2130360, .04, 3523, .002, 15.9],
  ["Partnership", "2026-04-01", 3277186.5, 1, .085, 39.03, null, .063, 620, null, null],
  ["Partnership", "2026-05-01", 3409108.5, 1, 1, 41.07, null, .045, 913, null, null],
  ["Partnership", "2026-06-01", 2645559, 1, 1, 36.59, null, .036, 1016, null, null],
  ["Partnership", "2026-07-01", 2426014.5, 1, .176, 33.98, null, .051, 666, null, null],
  ["Partnership", "2026-08-01", 4587655.8, 1, .346, 61.33, null, .142, 432, null, null],
  ["Partnership", "2026-09-01", 3671514, 1, 1, 54.31, null, .061, 890, null, null],
];

const demoRows: FinanceRow[] = demoSeed.map(([businessUnit, date, mrr, grossMargin, netMargin, arppu, cac, churnRate, ltv, ltvCac, cacPayback]) => ({
  businessUnit, date, mrr, grossMargin, netMargin, arppu, cac, churnRate, ltv, ltvCac, cacPayback,
  organicSalesPct: null, referralRate: null, totalSales: null, dataStatus: "Ready",
}));

export async function getFinanceData(): Promise<FinanceData> {
  if (!spreadsheetId || !serviceAccount || !privateKey) return { rows: demoRows, source: "demo", updatedAt: new Date().toISOString(), connectionMessage: "Add the Google Sheets variables to .env.local to load live data." };
  try {
    const token = await getAccessToken();
    const range = encodeURIComponent("Calculated Metrics!A:O");
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`, {
      headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error("Unable to read Google Sheets values.");
    const payload = await response.json() as { values?: unknown[][] };
    return { rows: mapRows(payload.values ?? []), source: "live", updatedAt: new Date().toISOString(), connectionMessage: null };
  } catch {
    return { rows: demoRows, source: "demo", updatedAt: new Date().toISOString(), connectionMessage: "Google Sheets returned a permission error. Confirm the exact service-account email in .env.local has Viewer access to the spreadsheet in GOOGLE_SHEETS_ID." };
  }
}
