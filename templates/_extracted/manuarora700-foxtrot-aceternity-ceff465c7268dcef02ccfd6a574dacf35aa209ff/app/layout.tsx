import "../styles/globals.css";
import { Metadata } from "next";
import { Banner } from "@components/Banner";
import Navbar from "@components/Navbar/Navbar";
import { Footer } from "@components/Footer";

export const metadata: Metadata = {
  title: "Foxtrot | SaaS Marketing Template",
  description:
    "Foxtrot is a SaaS marketing template developed at Aceternity. It is built with Next.js, Tailwind CSS, and Framer Motion.",
  openGraph: {
    type: "website",
    siteName: "foxtrotaceternity",
    images: [
      {
        url: "https://foxtrot.aceternity.com/banner.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@foxtrotaceternity",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
