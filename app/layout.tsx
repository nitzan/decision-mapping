import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader, SiteFooter } from "@/components/ToolsChrome";

export const metadata: Metadata = {
  title: "Seats at the Table — Decision journey mapping",
  description: "Map the aspects of a decision, set the balance you want to live within, and see where your options land. A tool by Nitzan Hermon, In Process Coaching.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body id="top">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
