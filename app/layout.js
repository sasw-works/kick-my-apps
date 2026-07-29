import "./globals.css";

export const metadata = {
  title: "Kick My Apps",
  description: "AI destekli mobil uygulama sağlık raporu",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
