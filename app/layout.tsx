import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Decision Mapping",
  description: "Seats at the Table Decision Journey Mapper",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
