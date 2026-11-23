"use client";

import { useParams, useRouter } from "next/navigation";
import MonitorDetail from "../MonitorDetail";

// The monitor's own page (opened from notifications and old links). The Monitor list shows the same content
// expanded inside the app's card.
export default function PulseMonitorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  return <MonitorDetail id={id} onRemoved={() => router.push("/console/pulse")} />;
}
