import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "$Neurons — Knowledge becomes verifiable value",
  description:
    "The Proof-of-Knowledge token designed for the Axodus ecosystem. Explore the protocol, tokenomics and open development repository.",
  other: {
    "codex-preview": "development",
    "theme-color": "#080b09",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="neurons-site"
      >
        {children}
      </body>
    </html>
  );
}
