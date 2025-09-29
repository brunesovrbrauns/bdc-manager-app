import { useEffect, useMemo, useState, useCallback } from "react";
import supabase from "../utils/supabase/client";

type ShiftRow = {
  agent_name: string;
  shift_date: string;
  calls_made: number;
  appointments_set: number;
  appointments_shown: number;
  cars_sold: number;
  emails_sent: number;
  texts_sent: number;
  contacted_calls: number;
};

type Agent = { agent_name: string; role?: string | null; active?: boolean | null };

function todayDateStr() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function pct(n: number | null, d: number | null) {
  if (!d || d <= 0 || !n || n < 0) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

function roleAlias(raw?: string | null) {
  const r = (raw || "").toLowerCase().trim();
  if (!r) return "—";
  if (r.includes("assistant")) return "asst-manager"; // triggers two-line render below
  if (r.includes("manager")) return "Manager";
  return "Agent";
}

function roleRank(raw?: string | null) {
  const a = roleAlias(raw);
  if (a === "Manager") return 0;
  if (a === "asst-manager") return 1;
  return 2; // Agent or —
}

export default function TodayTable() {
  const dateStr = useMemo(() => todayDateStr(), []);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchAgentsAndShifts = useCallback(async () => {
    setErr(null);
    const [agentsRes, shiftsRes] = await Promise.all([
      supabase.from("bdc_agents").select("agent_name, role, active").order("agent_name", { ascending: true }),
      supabase
        .from("bdc_shifts")
        .select(
          "agent_name, shift_date, calls_made, appointments_set, appointments_shown, cars_sold, emails_sent, texts_sent, contacted_calls"
        )
        .eq("shift_date", dateStr),
    ]);

    if (agentsRes.error) {
      setErr(`Failed to load agents: ${agentsRes.error.message}`);
      return;
    }
    if (shiftsRes.error) {
      setErr(`Failed to load today’s shifts: ${shiftsRes.error.message}`);
      return;
    }

    const activeAgents = (agentsRes.data ?? [])
      .filter((a) => a.active !== false)
      .sort((a, b) => {
        const rr = roleRank(a.role) - roleRank(b.role);
        if (rr !== 0) return rr;
        return a.agent_name.localeCompare(b.agent_name);
      });

    setAgents(activeAgents);
    setRows(shiftsRes.data ?? []);
  }, [dateStr]);

  // Initial load
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      await fetchAgentsAndShifts();
      if (!ignore) setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [fetchAgentsAndShifts]);

  // Realtime subscription for today's shifts
  useEffect(() => {
    const channel = supabase
      .channel("realtime-bdc_shifts-today")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bdc_shifts", filter: `shift_date=eq.${dateStr}` },
        async () => {
          const shiftsRes = await supabase
            .from("bdc_shifts")
            .select(
              "agent_name, shift_date, calls_made, appointments_set, appointments_shown, cars_sold, emails_sent, texts_sent, contacted_calls"
            )
            .eq("shift_date", dateStr);

          if (shiftsRes.error) {
            setErr(`Failed to refresh shifts: ${shiftsRes.error.message}`);
          } else {
            setErr(null);
            setRows(shiftsRes.data ?? []);
          }
        }
      )
      .subscribe(() => {});

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateStr]);

  const byAgent = useMemo(() => {
    const m = new Map<string, ShiftRow>();
    for (const r of rows) m.set(r.agent_name, r);
    return m;
  }, [rows]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Today’s BDC Table</h3>
        <span className="text-xs text-gray-500">{dateStr}</span>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : err ? (
        <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{err}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-600">
              <tr>
                <th className="py-2 pr-3 w-[28%]">Agent</th>
                <th className="py-2 pr-3 w-[10%]">Role</th>
                <th className="py-2 pr-3">Show Rate</th>
                <th className="py-2 pr-3">Close Rate</th>
                <th className="py-2 pr-3">Set Rate</th>
                <th className="py-2 pr-3">Activity</th>
                <th className="py-2 pr-3">Booked</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const r = byAgent.get(a.agent_name);
                const showRate = pct(r?.appointments_shown ?? 0, r?.appointments_set ?? 0);
                const closeRate = pct(r?.cars_sold ?? 0, r?.appointments_shown ?? 0);
                const setRate = pct(r?.appointments_set ?? 0, r?.calls_made ?? 0);
                const activity = (r?.calls_made ?? 0) + (r?.texts_sent ?? 0) + (r?.emails_sent ?? 0);
                const booked = pct(r?.appointments_set ?? 0, r?.contacted_calls ?? 0);
                const status = r ? "Submitted" : "Missing";
                const alias = roleAlias(a.role);

                return (
                  <tr key={a.agent_name} className="border-b border-gray-100">
                    {/* top-aligned for name + bubbles */}
                    <td className="py-2 pr-3 align-top">
                      <div className="font-medium text-gray-900">{a.agent_name}</div>
                      <div className="mt-1 flex flex-nowrap gap-1.5 overflow-hidden">
                        <MiniBubble label="Calls" value={r?.calls_made ?? 0} />
                        <MiniBubble label="Set" value={r?.appointments_set ?? 0} />
                        <MiniBubble label="Shown" value={r?.appointments_shown ?? 0} />
                        <MiniBubble label="Sold" value={r?.cars_sold ?? 0} />
                        <MiniBubble label="Emails" value={r?.emails_sent ?? 0} />
                        <MiniBubble label="Texts" value={r?.texts_sent ?? 0} />
                        <MiniBubble label="Contacted" value={r?.contacted_calls ?? 0} />
                      </div>
                    </td>

                    {/* centered from Role → Status */}
                    <td className="py-2 pr-3 align-middle text-gray-700 whitespace-nowrap">
                      {alias === "asst-manager" ? (
                        <span className="leading-tight">
                          Asst.<br />Manager
                        </span>
                      ) : (
                        alias
                      )}
                    </td>
                    <td className="py-2 pr-3 align-middle">{showRate}</td>
                    <td className="py-2 pr-3 align-middle">{closeRate}</td>
                    <td className="py-2 pr-3 align-middle">{setRate}</td>
                    <td className="py-2 pr-3 align-middle">{activity}</td>
                    <td className="py-2 pr-3 align-middle">{booked}</td>
                    <td className="py-2 pr-3 align-middle">
                      <StatusPill status={status as "Submitted" | "Missing"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {agents.length === 0 && (
            <div className="mt-3 text-sm text-gray-500">No active agents configured.</div>
          )}
        </div>
      )}
    </div>
  );
}

/** UI bits */
function MiniBubble({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-700">
      <span className="uppercase tracking-wide text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </span>
  );
}

function StatusPill({ status }: { status: "Submitted" | "Missing" }) {
  const cls =
    status === "Submitted"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
