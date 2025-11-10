import localFont from "next/font/local";
import { Inter } from "next/font/google";

export const tiemposText = localFont({
  src: [
    {
      path: "../../fonts/TestTiemposText-Regular-BF66457a50cd521.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/TestTiemposText-Medium-BF66457a508489a.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../fonts/TestTiemposText-Semibold-BF66457a4fed201.otf",
      weight: "600",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-tiempos-text",
});

export const tiemposHeadline = localFont({
  src: [
    {
      path: "../../fonts/TestTiemposHeadline-Regular-BF66457a508e31a.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/TestTiemposHeadline-Medium-BF66457a509b4ec.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../fonts/TestTiemposHeadline-Semibold-BF66457a509040b.otf",
      weight: "600",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-tiempos-headline",
});

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});


