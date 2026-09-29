import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalChrome from "./components/ConditionalChrome";
import { ThemeProvider } from "./components/ThemeProvider";
import AuthSessionProvider from "./components/AuthSessionProvider";
import { SignInModalProvider } from "./components/SignInModalProvider";
import SignInModal from "./components/SignInModal";

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

// viewport-fit=cover: without it, env(safe-area-inset-*) always resolves to 0, and content drawn
// under the phone's home indicator / the browser's own bottom bar can't account for that space.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <body className="antialiased">
        <AuthSessionProvider>
          <ThemeProvider>
            <SignInModalProvider>
              <ConditionalChrome>{children}</ConditionalChrome>
              <SignInModal />
            </SignInModalProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
