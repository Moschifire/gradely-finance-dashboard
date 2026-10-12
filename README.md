# Gradely Finance Dashboard

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Connect Google Sheets

1. Copy `.env.example` to `.env.local`.
2. Create a Google Cloud service account and enable the Google Sheets API.
3. Share the Google Sheet with the service-account email as **Viewer**.
4. Add the spreadsheet ID, service-account email, and private key to `.env.local`.

The app reads the `Calculated Metrics` tab and automatically ignores rows whose `Data Status` is not `Ready`. It falls back to demo data until those environment variables are present.
