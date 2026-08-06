"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function ConditionalChrome({ children }) {
  const pathname = usePathname();
  const isConsole = pathname?.startsWith("/console");

  if (isConsole) return children;

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
