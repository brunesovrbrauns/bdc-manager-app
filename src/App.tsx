// src/App.tsx
import { useState } from "react";
import BDCTotalsCard from "./components/BDCTotalsCard";
import TodayTable from "./components/TodayTable";
import ShiftSubmissionCard from "./components/ShiftSubmissionCard";
import StorewideNumbersCard from "./components/StorewideNumbersCard";
import NightlyNumbersReport from "./components/NightlyNumbersReport";

type View = "dashboard" | "report";

export default function App() {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [dayStatus, setDayStatus] = useState<"open" | "closed">("open");
  const [shiftSubmitted, setShiftSubmitted] = useState(false);
  const [storewideExpanded, setStorewideExpanded] = useState(false);

  function handleShiftSubmit(_: {
    callsMade: number;
    appointmentsSet: number;
    appointmentsShown: number;
    carsSold: number;
  }) {
    // Realtime handles UI updates; we just flip the local badge.
    setShiftSubmitted(true);
  }

  function handleCloseDay() {
    setDayStatus("closed");
    setCurrentView("report");
  }

  if (currentView === "report") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <button
            onClick={() => setCurrentView("dashboard")}
            className="mb-4 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ← Back to Dashboard
          </button>
          <NightlyNumbersReport />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <header className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Nightly Numbers</h1>
        </header>

        {/* Quick Totals */}
        <BDCTotalsCard />

        {/* Today table */}
        <TodayTable status={dayStatus} />

        {/* Shift submission */}
        <ShiftSubmissionCard
          onSubmit={handleShiftSubmit}
          isSubmitted={shiftSubmitted}
          disabled={dayStatus === "closed"}
        />

        {/* Storewide numbers accordion */}
        {!storewideExpanded ? (
          <div className="pt-2">
            <button
              onClick={() => setStorewideExpanded(true)}
              disabled={dayStatus === "closed"}
              className="w-full rounded-md bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-500/90 disabled:opacity-60"
            >
              Storewide Nightly Numbers
            </button>
          </div>
        ) : (
          <StorewideNumbersCard
            onCloseDay={handleCloseDay}
            onCollapse={() => setStorewideExpanded(false)}
            disabled={dayStatus === "closed"}
          />
        )}

        {/* View report button (when closed) */}
        {dayStatus === "closed" && (
          <div className="text-center">
            <button
              onClick={() => setCurrentView("report")}
              className="rounded-md border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-600 hover:text-white"
            >
              View Nightly Numbers Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
