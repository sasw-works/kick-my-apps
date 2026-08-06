import AppSidebar from "../components/AppSidebar";

export default function ConsoleLayout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AppSidebar />
      <div style={{ flex: 1, minWidth: 0, marginLeft: 260, background: "var(--ink)" }}>{children}</div>
    </div>
  );
}
