import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Gradely Finance Dashboard",
  title: {
    default: "Gradely Finance Dashboard",
    template: "%s | Gradely Finance Dashboard",
  },
  description: "Real-time financial reporting and performance analytics powered by Google Sheets.",
  keywords: ["Gradely", "finance dashboard", "financial reporting", "Google Sheets", "analytics"],
  category: "finance",
  openGraph: {
    title: "Gradely Finance Dashboard",
    description: "Real-time financial reporting and performance analytics powered by Google Sheets.",
    type: "website",
    siteName: "Gradely Finance Dashboard",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
