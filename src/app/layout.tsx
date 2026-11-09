import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import ThemeRegistry from "@/components/ThemeRegistry";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Payment management",
  description: "Payment management",
  icons: {
    icon: [{ url: "/bitcoin.png?v=2", type: "image/png" }],
    apple: "/bitcoin.png?v=2",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={publicSans.variable}
      suppressHydrationWarning
    >
      <body>
        <InitColorSchemeScript defaultMode="light" />
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
