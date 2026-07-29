import { Suspense } from "react";
import HistoryPageInner from "./HistoryPageInner";

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryPageInner />
    </Suspense>
  );
}
