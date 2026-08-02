import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

export const metadata = {
  metadataBase: new URL("https://kick-my-apps.vercel.app"),
  title: "Kick My Apps",
  description: "AI-powered mobile app health report",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Header />
        <div style={{ flex: 1 }}>{children}</div>
        <Footer />
      </body>
    </html>
  );
}
