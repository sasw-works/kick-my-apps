import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalChrome from "./components/ConditionalChrome";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://kick-my-apps.vercel.app"),
  title: "Kick My Apps",
  description: "AI-powered mobile app health report",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`h-full antialiased ${inter.variable}`}>
      <body className="antialiased">
        <ConditionalChrome>{children}</ConditionalChrome>
      </body>
    </html>
  );
}
