import AppSidebar from "../components/AppSidebar";

export default function ConsoleLayout({ children }) {
  return (
    <div className="kma-dark" style={{ display: "flex", minHeight: "100vh" }}>
      <AppSidebar />
      <div style={{ flex: 1, minWidth: 0, marginLeft: 290, background: "var(--ink)" }}>{children}</div>
    </div>
  );
}
