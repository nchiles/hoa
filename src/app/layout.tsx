import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Summer Meadows HOA",
  description: "Member and board portal for the Summer Meadows HOA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
