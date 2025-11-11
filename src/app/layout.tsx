import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import GlobalAssistant from "@/components/chat/GlobalAssistant";
import ProductTour from "@/components/ProductTour";
import { inter, tiemposHeadline, tiemposText } from "./fonts";
import { I18nProvider } from "@/lib/i18n/provider";
import AutoTranslator from "@/components/AutoTranslator";
import GooglePageTranslate from "@/components/GooglePageTranslate";
import PageTransition from "@/components/layout/PageTransition";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Propel - Property Rental Dashboard",
  description: "Manage rental properties, track prospects, and automate tenant screening",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} ${tiemposHeadline.variable} ${tiemposText.variable} antialiased`}>
          <I18nProvider>
            <ErrorReporter />
            <Script
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
            strategy="afterInteractive"
            data-target-origin="*"
            data-message-type="ROUTE_CHANGE"
            data-include-search-params="true"
            data-only-in-iframe="true"
            data-debug="true"
            data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
          />
            <PageTransition>{children}</PageTransition>
            <ProductTour autoStart />
            <GlobalAssistant />
            <VisualEditsMessenger />
            <AutoTranslator />
            <GooglePageTranslate />
            <Toaster />
          </I18nProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
