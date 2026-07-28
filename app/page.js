import HealthReport from "./components/HealthReport";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#14151a] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <HealthReport />
      </div>
    </main>
  );
}
