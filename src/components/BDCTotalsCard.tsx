import { useEffect, useMemo, useState, useCallback } from "react";
import supabase from "../utils/supabase/client";

type Totals = {
  calls_made: number;
  appts_set: number;
  appts_shown: number;
  cars_sold: number;
  show_rate_pct: number; // 0..100
};

function todayDateStr() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function BDCTotalsCard() {
  const dateStr = useMemo(() => todayDateStr(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals>({
    calls_made: 0,
    appts_set: 0,
    appts_shown: 0,
    cars_sold: 0,
    show_rate_pct: 0,
  });

  const fetchTotals = useCallback(async () => {
    setErr(null);
    const { data, error } = await supabase
      .from("v_bdc_quick_totals_today")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      setErr(`Failed to load BDC totals: ${error.message}`);
      return;
    }

    if (data) {
      setTotals({
        calls_made: data.calls_made ?? 0,
        appts_set: data.appts_set ?? 0,
        appts_shown: data.appts_shown ?? 0,
        cars_sold: data.cars_sold ?? 0,
        show_rate_pct: Number(data.show_rate_pct ?? 0),
      });
    } else {
      setTotals({
        calls_made: 0,
        appts_set: 0,
        appts_shown: 0,
        cars_sold: 0,
        show_rate_pct: 0,
      });
    }
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      await fetchTotals();
      if (!ignore) setLoading(false);
    })();
    return () => { ignore = true; };
  }, [fetchTotals]);

  // Realtime: refetch on any change to today's shifts
  useEffect(() => {
    const channel = supabase
      .channel("realtime-bdc_shifts-totals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bdc_shifts", filter: `shift_date=eq.${dateStr}` },
        () => { fetchTotals(); }
      )
      .subscribe(() => {});
    return () => { supabase.removeChannel(channel); };
  }, [dateStr, fetchTotals]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">BDC Quick Totals (Today)</h3>
        {/* Show client-local date to match TodayTable */}
        <span className="text-xs text-gray-500">{dateStr}</span>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : err ? (
        <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{err}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Calls" value={totals.calls_made} />
          <Stat label="Set" value={totals.appts_set} />
          <Stat label="Shown" value={totals.appts_shown} />
          <Stat label="Sold" value={totals.cars_sold} />
          <Stat label="Show Rate" value={`${Math.round(totals.show_rate_pct)}%`} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500 text-left">{label}</div>
      <div className="mt-1 text-xl font-semibold text-gray-900 text-center">{value}</div>
    </div>
  );
}
