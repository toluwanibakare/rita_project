import "./globals.css";
import DashboardShell from "@/components/DashboardShell";

export const metadata = {
  title: "IoMT Security Dashboard",
  description: "Internet of Medical Things — Telemetry Security & Database Protection",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
