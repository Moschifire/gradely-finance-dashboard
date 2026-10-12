import fs from "node:fs/promises";
import { createSign } from "node:crypto";

const envText = await fs.readFile(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter(line => /^[A-Z0-9_]+=/i.test(line)).map(line => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1).trim().replace(/^"|"$/g, "")];
}));
const key = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const encode = value => Buffer.from(value).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = encode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
const claims = encode(JSON.stringify({ iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
const signer = createSign("RSA-SHA256");
signer.update(`${header}.${claims}`);
const assertion = `${header}.${claims}.${signer.sign(key).toString("base64url")}`;
const auth = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
if (!auth.ok) { console.log(`Authorization failed (${auth.status}): ${(await auth.text()).replace(/"private_key"[^,}]*/g, '"private_key":"[redacted]"')}`); process.exit(1); }
const { access_token: token } = await auth.json();
const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEETS_ID}/values/${encodeURIComponent("Calculated Metrics!A1:O5")}?valueRenderOption=UNFORMATTED_VALUE`, { headers: { Authorization: `Bearer ${token}` } });
if (!response.ok) { console.log(`Sheets read failed (${response.status}): ${await response.text()}`); process.exit(1); }
const payload = await response.json();
console.log(`Sheets read succeeded. Returned ${payload.values?.length ?? 0} rows from Calculated Metrics.`);
