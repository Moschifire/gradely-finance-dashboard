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
const claims = encode(JSON.stringify({ iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
const signer = createSign("RSA-SHA256");
signer.update(`${header}.${claims}`);
const assertion = `${header}.${claims}.${signer.sign(env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")).toString("base64url")}`;
const auth = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
const { access_token: token } = await auth.json();
const headers = { Authorization: `Bearer ${token}` };
for (const range of ["Monthly Input!A1:V4", "Calculated Metrics!A1:O4"]) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEETS_ID}/values/${encodeURIComponent(range)}?valueRenderOption=FORMULA`, { headers });
  if (!response.ok) throw new Error(`${range}: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  console.log(`\n${range}`);
  console.log(JSON.stringify(payload.values, null, 2));
}
