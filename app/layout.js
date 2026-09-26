import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalChrome from "./components/ConditionalChrome";
import { ThemeProvider } from "./components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  // opsz axis: the 90px headline picks the Inter Display cut (opsz 32). Everything else stays pinned
  // to the default optical size via `font-optical-sizing: none` in globals.css.
  axes: ["opsz"],
});

export const metadata = {
  metadataBase: new URL("https://kick-my-apps.vercel.app"),
  title: "Kick My Apps",
  description: "AI-powered mobile app health report",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <body className="antialiased">
        <ThemeProvider>
          <ConditionalChrome>{children}</ConditionalChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
