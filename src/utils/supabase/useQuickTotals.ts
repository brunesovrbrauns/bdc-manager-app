// src/utils/supabase/useQuickTotals.ts
import { useEffect, useState, useMemo } from "react";
import { createClient } from "./client";

type Totals = {
  report_date: string;
  calls_made: number;
  appts_set: number;
  appts_shown: number;
  cars_sold: number;
  show_rate_pct: number;
};

export function useQuickTotals() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [byAgent, setByAgent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);

        const totalsQ = supabase.from("v_bdc_quick_totals_today").select("*").maybeSingle();
        const byAgentQ = supabase
          .from("v_bdc_quick_totals_by_agent_today")
          .select("*")
          .order("agent_name", { ascending: true });

        const [{ data: tData, error: tErr }, { data: aData, error: aErr }] = await Promise.all([
          totalsQ,
          byAgentQ,
        ]);

        if (!alive) return;

        if (tErr) {
          setErrorMsg(tErr.message);
          setTotals(null);
        } else {
          setTotals((tData as Totals) ?? null);
          setErrorMsg(null);
        }

        if (aErr) {
          setErrorMsg(aErr.message);
          setByAgent([]);
        } else {
          setByAgent(aData ?? []);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load";
        if (alive) {
          setErrorMsg(msg);
          setTotals(null);
          setByAgent([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [supabase]);

  return { totals, byAgent, loading, errorMsg };
}
