// src/components/StorewideStatusPills.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "../utils/supabase/client";

type Agent = { agent_name: string; role?: string | null; active?: boolean | null };

function todayDateStr() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function StorewideStatusPills() {
  const dateStr = useMemo(() => todayDateStr(), []);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setErr(null);
    const [aRes, sRes] = await Promise.all([
      supabase.from("bdc_agents").select("agent_name, role, active").order("agent_name", { ascending: true }),
      supabase.from("bdc_shifts").select("agent_name").eq("shift_date", dateStr),
    ]);

    if (aRes.error) { setErr(aRes.error.message); return; }
    if (sRes.error) { setErr(sRes.error.message); return; }

    const active = (aRes.data ?? []).filter((a) => a.active !== false);
    setAgents(active);

    const sub = new Set<string>();
    for (const r of (sRes.data ?? [])) sub.add(r.agent_name);
    setSubmitted(sub);
  }, [dateStr]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      await fetchData();
      if (!ignore) setLoading(false);
    })();
    return () => { ignore = true; };
  }, [fetchData]);

  // Realtime subscribe to today's shifts
  useEffect(() => {
    const channel = supabase
      .channel("realtime-bdc_shifts-storewide-pill")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bdc_shifts", filter: `shift_date=eq.${dateStr}` },
        () => { fetchData(); }
      )
      .subscribe(() => {});
    return () => { supabase.removeChannel(channel); };
  }, [dateStr, fetchData]);

  const submittedList = useMemo(
    () => agents.filter((a) => submitted.has(a.agent_name)),
    [agents, submitted]
  );
  const missingList = useMemo(
    () => agents.filter((a) => !submitted.has(a.agent_name)),
    [agents, submitted]
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      {err && <div className="mb-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Left: Submitted */}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Submitted</div>
            <div className="flex flex-wrap gap-2">
              {submittedList.map((a) => (
                <span
                  key={`ok-${a.agent_name}`}
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 transition-all"
                >
                  {a.agent_name}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Missing */}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Missing</div>
            <div className="flex flex-wrap gap-2">
              {missingList.map((a) => (
                <span
                  key={`miss-${a.agent_name}`}
                  className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 transition-all"
                >
                  {a.agent_name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
