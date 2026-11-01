import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FSN 10",
  description: "FSN 10",
  openGraph: {
    title: "FSN 10",
    description: "FSN 10",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "FSN 10",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FSN 10",
    description: "FSN 10",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
