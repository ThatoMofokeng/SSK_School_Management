import type { Metadata } from "next";
import { Inter } from "next/font/google";
// @ts-ignore - Next.js global stylesheet type declarations are not available in this setup.
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastContainer } from "react-toastify";
// @ts-ignore - react-toastify CSS side-effect import type declarations are not available in this setup.
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Siyakha Student Management System",
  description: "Siyakha Student Management System",
  icons: {
    icon: "/SSKLogo02.png",
    shortcut: "/SSKLogo02.png",
    apple: "/SSKLogo02.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}

          <ToastContainer
            position="bottom-right"
            theme="dark"
            autoClose={3000}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}