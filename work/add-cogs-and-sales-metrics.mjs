import fs from "node:fs/promises";
import { createSign } from "node:crypto";

const envText = await fs.readFile(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/i.test(line)).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1).trim().replace(/^"|"$/g, "")];
}));
const encode = (value) => Buffer.from(value).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = encode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
const claims = encode(JSON.stringify({ iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
const signer = createSign("RSA-SHA256");
signer.update(`${header}.${claims}`);
const assertion = `${header}.${claims}.${signer.sign(env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")).toString("base64url")}`;
const auth = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
if (!auth.ok) throw new Error(`Authorization failed: ${auth.status}`);
const { access_token: token } = await auth.json();
const headers = { Authorization: `Bearer ${token}`, "content-type": "application/json" };
const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEETS_ID}`;

const metadataResponse = await fetch(`${sheetUrl}?fields=sheets.properties`, { headers });
if (!metadataResponse.ok) throw new Error(`Metadata read failed: ${metadataResponse.status}`);
const metadata = await metadataResponse.json();
const monthly = metadata.sheets.find((sheet) => sheet.properties.title === "Monthly Input")?.properties;
if (!monthly) throw new Error("Monthly Input tab was not found.");

const inputResponse = await fetch(`${sheetUrl}/values/${encodeURIComponent("Monthly Input!A2:U1000")}?valueRenderOption=UNFORMATTED_VALUE`, { headers });
if (!inputResponse.ok) throw new Error(`Monthly Input read failed: ${inputResponse.status}`);
const inputRows = (await inputResponse.json()).values ?? [];
const populatedRows = inputRows.filter((row) => row[0]);
if (!populatedRows.length) throw new Error("No Monthly Input records were found.");
const lastRow = populatedRows.length + 1;
const cogsValues = populatedRows.map((row) => {
  const mrr = Number(row[2]);
  const grossProfit = Number(row[3]);
  return [Number.isFinite(mrr) && Number.isFinite(grossProfit) ? mrr - grossProfit : ""];
});

const structureResponse = await fetch(`${sheetUrl}:batchUpdate`, {
  method: "POST", headers, body: JSON.stringify({ requests: [
    { insertDimension: { range: { sheetId: monthly.sheetId, dimension: "COLUMNS", startIndex: 3, endIndex: 4 }, inheritFromBefore: true } },
    { copyPaste: { source: { sheetId: monthly.sheetId, startRowIndex: 0, endRowIndex: lastRow, startColumnIndex: 2, endColumnIndex: 3 }, destination: { sheetId: monthly.sheetId, startRowIndex: 0, endRowIndex: lastRow, startColumnIndex: 3, endColumnIndex: 4 }, pasteType: "PASTE_FORMAT", pasteOrientation: "NORMAL" } },
    { updateDimensionProperties: { range: { sheetId: monthly.sheetId, dimension: "COLUMNS", startIndex: 3, endIndex: 4 }, properties: { pixelSize: 130 }, fields: "pixelSize" } },
  ] }),
});
if (!structureResponse.ok) throw new Error(`Column insertion failed: ${structureResponse.status} ${await structureResponse.text()}`);

const formulas = [[
  "=ARRAYFORMULA(IFERROR(('Monthly Input'!C2:C-'Monthly Input'!D2:D)/'Monthly Input'!C2:C,\"\"))",
  "=ARRAYFORMULA(IFERROR('Monthly Input'!F2:F/'Monthly Input'!C2:C,\"\"))",
  "=ARRAYFORMULA(IFERROR('Monthly Input'!C2:C/'Monthly Input'!J2:J,\"\"))",
  "=ARRAYFORMULA(IF('Monthly Input'!A2:A=\"\",\"\",'Monthly Input'!K2:K))",
  "=ARRAYFORMULA(IF('Monthly Input'!A2:A=\"\",\"\",'Monthly Input'!L2:L/100))",
  "=ARRAYFORMULA(IFERROR((F2:F*D2:D)/H2:H,\"\"))",
  "=ARRAYFORMULA(IFERROR(I2:I/G2:G,\"\"))",
  "=ARRAYFORMULA(IFERROR(G2:G/(F2:F*D2:D),\"\"))",
  "=ARRAYFORMULA(IF('Monthly Input'!A2:A=\"\",\"\",'Monthly Input'!M2:M))",
  "=ARRAYFORMULA(IF('Monthly Input'!A2:A=\"\",\"\",'Monthly Input'!O2:O))",
  "=ARRAYFORMULA(IF('Monthly Input'!A2:A=\"\",\"\",'Monthly Input'!M2:M+'Monthly Input'!N2:N+'Monthly Input'!O2:O))",
  "=ARRAYFORMULA(IF('Monthly Input'!A2:A=\"\",\"\",IF(('Monthly Input'!B2:B=\"\")+('Monthly Input'!C2:C=\"\"),\"Missing required data\",\"Ready\")))",
]];
const valuesResponse = await fetch(`${sheetUrl}/values:batchUpdate`, {
  method: "POST", headers, body: JSON.stringify({ valueInputOption: "USER_ENTERED", data: [
    { range: `Monthly Input!D1:D${lastRow}`, values: [["COGS"], ...cogsValues] },
    { range: "Calculated Metrics!L1:N1", values: [["Organic Sales", "Referral Sales", "Total Sales"]] },
    { range: "Calculated Metrics!D2:O2", values: formulas },
  ] }),
});
if (!valuesResponse.ok) throw new Error(`Metric update failed: ${valuesResponse.status} ${await valuesResponse.text()}`);

const metricTab = metadata.sheets.find((sheet) => sheet.properties.title === "Calculated Metrics")?.properties;
if (!metricTab) throw new Error("Calculated Metrics tab was not found.");
const formatResponse = await fetch(`${sheetUrl}:batchUpdate`, {
  method: "POST", headers, body: JSON.stringify({ requests: [{ repeatCell: {
    range: { sheetId: metricTab.sheetId, startRowIndex: 1, endRowIndex: Math.max(lastRow, 1000), startColumnIndex: 11, endColumnIndex: 14 },
    cell: { userEnteredFormat: { numberFormat: { type: "CURRENCY", pattern: "₦#,##0.00;(₦#,##0.00);-" } } }, fields: "userEnteredFormat.numberFormat",
  } }] }),
});
if (!formatResponse.ok) throw new Error(`Metric formatting failed: ${formatResponse.status} ${await formatResponse.text()}`);

const verifyResponse = await fetch(`${sheetUrl}/values:batchGet?ranges=${encodeURIComponent("Monthly Input!A1:O3")}&ranges=${encodeURIComponent("Calculated Metrics!A1:O3")}&valueRenderOption=FORMULA`, { headers });
if (!verifyResponse.ok) throw new Error(`Verification read failed: ${verifyResponse.status}`);
const verified = await verifyResponse.json();
console.log(JSON.stringify(verified.valueRanges, null, 2));
console.log(`Updated ${populatedRows.length} historical rows. COGS was backfilled as MRR minus the prior Gross Profit input.`);
