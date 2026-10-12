import fs from "node:fs/promises";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = "C:/Users/marko/Downloads/Gradely-finance-dashboard_2026_updated_with_loans (5).csv";
const outputDir = "C:/Users/marko/Documents/finance-dashboard/outputs";
const outputPath = `${outputDir}/Gradely_Finance_Data_Source.xlsx`;

const headers = [
  "Business Unit", "Date", "MRR", "Gross Profit", "Net Profit", "Total Inflow",
  "Total Outflow", "Cash Balance", "Paying Users", "Customer Acquisition Cost",
  "Churn Rate", "Organic Sales", "Paid Sales", "Referral Sales", "Cash Owed",
  "Loan Balance", "Loans Received", "Loan Repayments", "Loan Interest & Fees",
  "Payables Balance", "Payables Paid"
];

const metricHeaders = [
  "Business Unit", "Date", "MRR", "Gross Margin", "Net Margin", "ARPPU", "CAC",
  "Churn Rate", "LTV", "LTV/CAC", "CAC Payback (Months)", "Organic Sales %",
  "Referral Rate", "Total Sales", "Data Status"
];

function parseCsvLine(line) {
  return line.split(",").map(value => value.trim());
}

function asValue(value, column) {
  if (value === "") return null;
  if (column === "Date") return new Date(`${value}T00:00:00`);
  if (column === "Business Unit") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const csv = await fs.readFile(sourcePath, "utf8");
const sourceRows = csv.split(/\r?\n/).slice(1)
  .map(parseCsvLine)
  .filter(row => ["Overview", "Diaspora Tutoring", "Partnership"].includes(row[0]) && /^2026-\d{2}-\d{2}$/.test(row[1]))
  .map(row => row.map((value, index) => asValue(value, headers[index])));

const workbook = Workbook.create();
const input = workbook.worksheets.add("Monthly Input");
const calculations = workbook.worksheets.add("Calculated Metrics");
const lists = workbook.worksheets.add("Lists");
const quality = workbook.worksheets.add("Data Quality");
const instructions = workbook.worksheets.add("Instructions");

for (const sheet of [input, calculations, lists, quality, instructions]) {
  sheet.showGridLines = false;
}

input.getRange("A1:U1").values = [headers];
input.getRangeByIndexes(1, 0, sourceRows.length, headers.length).values = sourceRows;
input.getRange(`B2:B${sourceRows.length + 1}`).setNumberFormat("yyyy-mm-dd");
input.getRange(`C2:U${sourceRows.length + 1}`).setNumberFormat('#,##0.00;(#,##0.00);-');
input.getRange(`K2:K${sourceRows.length + 1}`).setNumberFormat('0.0%');
input.getRange("A1:U1").format = {
  fill: "#1F4E78", font: { bold: true, color: "#FFFFFF", name: "Arial", size: 10 },
  horizontalAlignment: "center", verticalAlignment: "center", wrapText: true,
  borders: { preset: "outside", style: "thin", color: "#D9E2F3" }
};
input.getRange(`A2:U${sourceRows.length + 1}`).format.font = { name: "Arial", size: 10, color: "#000000" };
input.getRange(`A1:U${sourceRows.length + 1}`).format.verticalAlignment = "center";
input.getRange(`A1:U${sourceRows.length + 1}`).format.borders = { preset: "inside", style: "thin", color: "#E7E6E6" };
input.getRange("A:U").format.columnWidth = 14;
input.getRange("A:A").format.columnWidth = 22;
input.getRange("B:B").format.columnWidth = 12;
input.getRange("J:J").format.columnWidth = 25;
input.getRange("Q:S").format.columnWidth = 18;
input.getRange("T:U").format.columnWidth = 18;
input.freezePanes.freezeRows(1);
input.freezePanes.freezeColumns(2);
input.tabColor = "#D6E4F0";

calculations.getRange("A1:O1").values = [metricHeaders];
calculations.getRange(`A2:B${sourceRows.length + 1}`).formulas = sourceRows.map((_, i) => [
  `='Monthly Input'!A${i + 2}`,
  `='Monthly Input'!B${i + 2}`
]);
calculations.getRange(`C2:O${sourceRows.length + 1}`).formulas = sourceRows.map((_, i) => {
  const r = i + 2;
  return [
    `='Monthly Input'!C${r}`,
    `=IFERROR('Monthly Input'!D${r}/'Monthly Input'!C${r},\"\")`,
    `=IFERROR('Monthly Input'!E${r}/'Monthly Input'!C${r},\"\")`,
    `=IFERROR('Monthly Input'!C${r}/'Monthly Input'!I${r},\"\")`,
    `='Monthly Input'!J${r}`,
    `='Monthly Input'!K${r}/100`,
    `=IFERROR((F${r}*D${r})/H${r},\"\")`,
    `=IFERROR(I${r}/G${r},\"\")`,
    `=IFERROR(G${r}/(F${r}*D${r}),\"\")`,
    `=IFERROR('Monthly Input'!L${r}/SUM('Monthly Input'!L${r}:N${r}),\"\")`,
    `=IFERROR('Monthly Input'!N${r}/SUM('Monthly Input'!L${r}:N${r}),\"\")`,
    `=SUM('Monthly Input'!L${r}:N${r})`,
    `=IF(OR(A${r}=\"\",B${r}=\"\",C${r}=\"\"),\"Missing required data\",\"Ready\")`
  ];
});
calculations.getRange("A1:O1").format = {
  fill: "#1F4E78", font: { bold: true, color: "#FFFFFF", name: "Arial", size: 10 },
  horizontalAlignment: "center", verticalAlignment: "center", wrapText: true
};
calculations.getRange(`A2:O${sourceRows.length + 1}`).format.font = { name: "Arial", size: 10, color: "#000000" };
calculations.getRange(`B2:B${sourceRows.length + 1}`).setNumberFormat("yyyy-mm-dd");
calculations.getRange(`C2:C${sourceRows.length + 1}`).setNumberFormat('₦#,##0.00;(₦#,##0.00);-');
calculations.getRange(`D2:E${sourceRows.length + 1}`).setNumberFormat('0.0%');
calculations.getRange(`F2:G${sourceRows.length + 1}`).setNumberFormat('₦#,##0.00;(₦#,##0.00);-');
calculations.getRange(`H2:H${sourceRows.length + 1}`).setNumberFormat('0.0%');
calculations.getRange(`I2:I${sourceRows.length + 1}`).setNumberFormat('₦#,##0.00;(₦#,##0.00);-');
calculations.getRange(`J2:J${sourceRows.length + 1}`).setNumberFormat('0.0x');
calculations.getRange(`K2:K${sourceRows.length + 1}`).setNumberFormat('0.0');
calculations.getRange(`L2:L${sourceRows.length + 1}`).setNumberFormat('₦#,##0.00;(₦#,##0.00);-');
calculations.getRange(`M2:N${sourceRows.length + 1}`).setNumberFormat('0.0%');
calculations.getRange("A:O").format.columnWidth = 18;
calculations.getRange("A:A").format.columnWidth = 22;
calculations.getRange("O:O").format.columnWidth = 22;
calculations.freezePanes.freezeRows(1);
calculations.freezePanes.freezeColumns(2);
calculations.tabColor = "#D9EAD3";

lists.getRange("A1:B5").values = [
  ["Business Unit", "Use in Monthly Input"],
  ["Overview", "Aggregate company view; do not sum with component units"],
  ["Diaspora Tutoring", "Operating business unit"],
  ["Partnership", "Operating business unit"],
  ["", "Add new units here before entering data"]
];
lists.getRange("A1:B1").format = { fill: "#D9EAD3", font: { bold: true, color: "#000000", name: "Arial", size: 10 } };
lists.getRange("A:A").format.columnWidth = 24;
lists.getRange("B:B").format.columnWidth = 58;
lists.getRange("A1:B5").format.wrapText = true;
lists.tabColor = "#FFF2CC";

quality.getRange("A1:B6").values = [
  ["Data quality check", "Result"],
  ["Input records", `=COUNTA('Monthly Input'!A2:A${sourceRows.length + 1})`],
  ["Unique business units", `=COUNTA(Lists!A2:A4)`],
  ["Latest reported month", `=MAX('Monthly Input'!B2:B${sourceRows.length + 1})`],
  ["Rows missing MRR", `=COUNTBLANK('Monthly Input'!C2:C${sourceRows.length + 1})`],
  ["Rows with missing required fields", `=COUNTIF('Calculated Metrics'!O2:O${sourceRows.length + 1},\"Missing required data\")`]
];
quality.getRange("A1:B1").format = { fill: "#FCE4D6", font: { bold: true, color: "#000000", name: "Arial", size: 10 } };
quality.getRange("B4").setNumberFormat("yyyy-mm-dd");
quality.getRange("A:A").format.columnWidth = 38;
quality.getRange("B:B").format.columnWidth = 22;
quality.tabColor = "#FCE4D6";

instructions.getRange("A1:B10").values = [
  ["Finance dashboard data source", ""],
  ["Purpose", "This workbook is the maintained source for the Next.js finance dashboard."],
  ["Where to enter data", "Add or update one row per business unit per reporting month on Monthly Input."],
  ["Date convention", "Use the first day of the month, formatted YYYY-MM-DD."],
  ["Numbers", "Enter plain numbers only. Do not enter currency symbols, commas, or percentage signs."],
  ["Blank versus zero", "Leave unavailable data blank. Use zero only when the actual value is zero."],
  ["Churn Rate", "Enter the percentage as a number, for example 8.5 for 8.5%."],
  ["Overview rows", "Overview is a company aggregate. Do not add it to a total of the component business units."],
  ["New business units", "Add the unit to Lists before entering its monthly data."],
  ["App connection", "The app should read Calculated Metrics; it will apply period filters and display formatting."],
];
instructions.getRange("A1:B1").format = { fill: "#1F4E78", font: { bold: true, color: "#FFFFFF", name: "Arial", size: 12 } };
instructions.getRange("A2:A10").format.font = { bold: true, name: "Arial", size: 10, color: "#000000" };
instructions.getRange("B2:B10").format = { wrapText: true, font: { name: "Arial", size: 10, color: "#000000" } };
instructions.getRange("A:A").format.columnWidth = 25;
instructions.getRange("B:B").format.columnWidth = 80;
instructions.getRange("A1:B10").format.verticalAlignment = "center";
instructions.tabColor = "#B4C7E7";

workbook.recalculate();
const inspect = await workbook.inspect({ kind: "table", range: "Calculated Metrics!A1:O8", include: "values,formulas", tableMaxRows: 8, tableMaxCols: 15 });
console.log(inspect.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "formula errors" });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: "Monthly Input", range: "A1:U12", scale: 1.5, format: "png" });
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(`${outputDir}/Monthly_Input_preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
