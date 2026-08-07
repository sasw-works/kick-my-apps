import HealthReport from "../components/HealthReport";

export default function ReportPage() {
  return (
    <main className="min-h-screen p-4 md:p-8" style={{ background: "var(--ink)" }}>
      <div className="max-w-[1240px] mx-auto">
        <HealthReport />
      </div>
    </main>
  );
}
