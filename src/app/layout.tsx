import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthSessionProvider } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "Northline CRM — LinkedIn-integrated pipeline",
  description: "A B2B CRM with LinkedIn content analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
