import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

// JetBrains Mono was previously loaded here for the Monaco editor, but
// next/font generates a scoped/hashed font name internally rather than the
// literal "JetBrains Mono" Monaco's fontFamily option expects, so it was
// never actually being applied — removed. The editor now uses the browser's
// generic monospace fallback, which is all a code editor needs.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Ravi Programming Academy",
  description: "Learn. Practice. Improve.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Material Symbols is a variable-axis font next/font/google can't express; loading it
            here in the root layout (not pages/_document) is correct for the App Router. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${manrope.variable} font-body-md bg-background text-on-background antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
