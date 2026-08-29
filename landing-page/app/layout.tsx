import type { Metadata } from "next";
import Script from "next/script";
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-K2VEZ85XE2"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-K2VEZ85XE2');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
