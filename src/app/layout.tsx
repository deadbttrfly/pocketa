import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "Pocketa",
  description: "Personal finance management made simple.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}