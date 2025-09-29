// src/components/StorewideNumbersCard.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "../utils/supabase/client";

type Props = {
  bdcData?: any;
  bdcAgents?: any;
  onCloseDay?: () => void;
  onCollapse?: () => void;
  disabled?: boolean; // accepted but ignored for locking behavior
};

type Totals = {
  report_date: string;
  calls_made: number;
  appts_set: number;
  appts_shown: number;
  cars_sold: number;
};

type Agent = { agent_name: string; role?: string | null; active?: boolean | null };
type ShiftRow = { agent_name: string; shift_date: string };

function todayDateStr() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function StorewideNumbersCard({
  onCloseDay,
  onCollapse,
}: Props) {
  const [closerName, setCloserName] = useState("");
  const [leads_received, setLeadsReceived] = useState<number | "">("");
  const [phone_ups, setPhoneUps] = useState<number | "">("");
  const [appointments_meant, setAppointmentsMeant] = useState<number | "">("");
  const [appointments_shown, setAppointmentsShown] = useState<number | "">("");
  const [appointments_tomorrow, setAppointmentsTomorrow] = useState<number | "">("");
  const [visits_logged, setVisitsLogged] = useState<number | "">("");
  const [cars_sold, setCarsSold] = useState<number | "">("");

  const [dials_bdc, setDialsBDC] = useState<number | "">("");
  const [dials_sales, setDialsSales] = useState<number | "">("");
  const [dials_internet, setDialsInternet] = useState<number | "">("");

  const [set_bdc, setSetBDC] = useState<number | "">("");
  const [set_sales, setSetSales] = useState<number | "">("");
  const [set_internet, setSetInternet] = useState<number | "">("");

  const [shown_bdc, setShownBDC] = useState<number | "">("");
  const [shown_sales, setShownSales] = useState<number | "">("");
  const [shown_internet, setShownInternet] = useState<number | "">("");

  const [sold_bdc, setSoldBDC] = useState<number | "">("");
  const [sold_sales, setSoldSales] = useState<number | "">("");
  const [sold_internet, setSoldInternet] = useState<number | "">("");

  const [agents, setAgents] = useState<Agent[]>([]);
  const [submittedSet, setSubmittedSet] = useState<Set<string>>(new Set());

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Once "Prefill from BDC" is clicked, keep those four fields auto-refreshed via realtime
  const [prefillArmed, setPrefillArmed] = useState(false);

  // Whether a storewide row for today already exists (controls button label: Submit vs Re-Submit)
  const [hasExisting, setHasExisting] = useState(false);

  const toInt = (v: number | "") => (typeof v === "number" ? v : Number(v || 0));
  const dateStr = useMemo(() => todayDateStr(), []);

  // IMPORTANT: no external lock. Only disable while saving.
  const isDisabled = busy;

  // Fetch agents + submitted set for today
  const fetchAgentsAndSubmitted = useCallback(async () => {
    const [agentsRes, shiftsRes] = await Promise.all([
      supabase.from("bdc_agents").select("agent_name, role, active").order("agent_name", { ascending: true }),
      supabase.from("bdc_shifts").select("agent_name, shift_date").eq("shift_date", dateStr),
    ]);

    if (!agentsRes.error) setAgents((agentsRes.data ?? []).filter((a) => a.active !== false));
    if (!shiftsRes.error) setSubmittedSet(new Set((shiftsRes.data ?? []).map((r: ShiftRow) => r.agent_name)));
  }, [dateStr]);

  // Prefill helper used both for manual click and auto-refresh
  const prefillFromBDCInternal = useCallback(
    async (silent: boolean) => {
      const { data, error } = await supabase.from("v_bdc_quick_totals_today").select("*").maybeSingle();
      if (error) {
        if (!silent) setErr(error.message);
        return;
      }
      const t = (data ?? {}) as Partial<Totals>;
      setDialsBDC(t.calls_made ?? 0);
      setSetBDC(t.appts_set ?? 0);
      setShownBDC(t.appts_shown ?? 0);
      setSoldBDC(t.cars_sold ?? 0);
      if (!silent) setMsg("Prefilled from BDC.");
      else setMsg((m) => (m ? m : "BDC totals refreshed from latest agent submissions."));
    },
    []
  );

  // Manual button handler
  async function prefillFromBDC() {
    setErr(null);
    setMsg(null);
    setPrefillArmed(true); // arm for this session
    await prefillFromBDCInternal(false);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      // Load today's storewide record (if any)
      const { data: sw, error: swErr } = await supabase
        .from("storewide_nightly_numbers")
        .select(
          "report_date, closer_name, leads_received, phone_ups, appointments_meant, appointments_shown, appointments_tomorrow, visits_logged, cars_sold, dials_bdc, dials_sales, dials_internet, set_bdc, set_sales, set_internet, shown_bdc, shown_sales, shown_internet, sold_bdc, sold_sales, sold_internet"
        )
        .eq("report_date", dateStr)
        .maybeSingle();

      if (!alive) return;

      if (swErr && swErr.code !== "PGRST116") setErr(`Load error: ${swErr.message}`);
      else if (sw) {
        setHasExisting(true);
        setCloserName(sw.closer_name ?? "");
        setLeadsReceived(sw.leads_received ?? "");
        setPhoneUps(sw.phone_ups ?? "");
        setAppointmentsMeant(sw.appointments_meant ?? "");
        setAppointmentsShown(sw.appointments_shown ?? "");
        setAppointmentsTomorrow(sw.appointments_tomorrow ?? "");
        setVisitsLogged(sw.visits_logged ?? "");
        setCarsSold(sw.cars_sold ?? "");

        setDialsBDC(sw.dials_bdc ?? "");
        setDialsSales(sw.dials_sales ?? "");
        setDialsInternet(sw.dials_internet ?? "");

        setSetBDC(sw.set_bdc ?? "");
        setSetSales(sw.set_sales ?? "");
        setSetInternet(sw.set_internet ?? "");

        setShownBDC(sw.shown_bdc ?? "");
        setShownSales(sw.shown_sales ?? "");
        setShownInternet(sw.shown_internet ?? "");

        setSoldBDC(sw.sold_bdc ?? "");
        setSoldSales(sw.sold_sales ?? "");
        setSoldInternet(sw.sold_internet ?? "");
      } else {
        setHasExisting(false);
      }

      // initial load of agents + submitted set
      await fetchAgentsAndSubmitted();
    })();
    return () => {
      alive = false;
    };
  }, [dateStr, fetchAgentsAndSubmitted]);

  // Realtime: keep pills live for today’s shifts, and auto-refresh prefilled fields if armed
  useEffect(() => {
    const channel = supabase
      .channel("realtime-bdc_shifts-storewide")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bdc_shifts", filter: `shift_date=eq.${dateStr}` },
        async () => {
          await fetchAgentsAndSubmitted();
          if (prefillArmed) {
            await prefillFromBDCInternal(true);
          }
        }
      )
      .subscribe(() => {});
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateStr, fetchAgentsAndSubmitted, prefillArmed, prefillFromBDCInternal]);

  async function save(invokedFromClose: boolean) {
    setErr(null); setMsg(null); setBusy(true);
    try {
      const payload = {
        report_date: dateStr,
        closer_name: closerName || "Unknown",
        locked: false, // never lock from this card
        leads_received: toInt(leads_received),
        phone_ups: toInt(phone_ups),
        appointments_meant: toInt(appointments_meant),
        appointments_shown: toInt(appointments_shown),
        appointments_tomorrow: toInt(appointments_tomorrow),
        visits_logged: toInt(visits_logged),
        cars_sold: toInt(cars_sold),
        dials_bdc: toInt(dials_bdc),
        dials_sales: toInt(dials_sales),
        dials_internet: toInt(dials_internet),
        set_bdc: toInt(set_bdc),
        set_sales: toInt(set_sales),
        set_internet: toInt(set_internet),
        shown_bdc: toInt(shown_bdc),
        shown_sales: toInt(shown_sales),
        shown_internet: toInt(shown_internet),
        sold_bdc: toInt(sold_bdc),
        sold_sales: toInt(sold_sales),
        sold_internet: toInt(sold_internet),
      };
      const { error } = await supabase
        .from("storewide_nightly_numbers")
        .upsert(payload as any, { onConflict: "report_date" });
      if (error) throw error;

      setHasExisting(true); // now we have a record for today
      setMsg(invokedFromClose ? "Submitted." : "Saved.");
      if (invokedFromClose) onCloseDay?.();
    } catch (e: any) {
      setErr(e?.message || "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  const submittedAgents = useMemo(
    () => agents.filter((a) => submittedSet.has(a.agent_name)).map((a) => a.agent_name),
    [agents, submittedSet]
  );
  const missingAgents = useMemo(
    () => agents.filter((a) => !submittedSet.has(a.agent_name)).map((a) => a.agent_name),
    [agents, submittedSet]
  );

  const submitLabel = hasExisting ? "Re-Submit Storewide Nightly Numbers" : "Submit Storewide Nightly Numbers";

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Storewide Nightly Numbers</h2>
        <div className="flex gap-2">
          {onCollapse && (
            <button onClick={onCollapse} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
              Collapse
            </button>
          )}
          <button
            onClick={prefillFromBDC}
            disabled={isDisabled}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60"
            title="Pull today's submitted agent shifts into the storewide totals (and keep them in sync this session)"
          >
            Prefill from BDC
          </button>
        </div>
      </div>

      {/* Submitted / Missing badges (live via Realtime) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <BadgeRow label="Submitted" items={submittedAgents} variant="submitted" />
        <BadgeRow label="Missing" items={missingAgents} variant="missing" />
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {msg && <div className="text-sm text-green-700">{msg}</div>}

      {/* Headline fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Closer Name" value={closerName} onChange={setCloserName} disabled={isDisabled} />

        <NumberField label="Leads Received" value={leads_received} onChange={setLeadsReceived} disabled={isDisabled} />
        <NumberField label="Phone Ups" value={phone_ups} onChange={setPhoneUps} disabled={isDisabled} />
        <NumberField label="Appointments Meant" value={appointments_meant} onChange={setAppointmentsMeant} disabled={isDisabled} />
        <NumberField label="Appointments Shown" value={appointments_shown} onChange={setAppointmentsShown} disabled={isDisabled} />
        <NumberField label="Appointments Tomorrow" value={appointments_tomorrow} onChange={setAppointmentsTomorrow} disabled={isDisabled} />
        <NumberField label="Visits Logged" value={visits_logged} onChange={setVisitsLogged} disabled={isDisabled} />
        <NumberField label="Cars Sold (Total)" value={cars_sold} onChange={setCarsSold} disabled={isDisabled} />
      </div>

      {/* === Two rows: Dials | Set  AND  Shown | Sold === */}
      <DuoRow
        leftTitle="Dials"
        left={
          <CenteredTriplet>
            <TinyNumber label="BDC" value={dials_bdc} onChange={setDialsBDC} disabled={isDisabled} />
            <TinyNumber label="Sales" value={dials_sales} onChange={setDialsSales} disabled={isDisabled} />
            <TinyNumber label="Internet" value={dials_internet} onChange={setDialsInternet} disabled={isDisabled} />
          </CenteredTriplet>
        }
        rightTitle="Set"
        right={
          <CenteredTriplet>
            <TinyNumber label="BDC" value={set_bdc} onChange={setSetBDC} disabled={isDisabled} />
            <TinyNumber label="Sales" value={set_sales} onChange={setSetSales} disabled={isDisabled} />
            <TinyNumber label="Internet" value={set_internet} onChange={setSetInternet} disabled={isDisabled} />
          </CenteredTriplet>
        }
      />

      <DuoRow
        leftTitle="Shown"
        left={
          <CenteredTriplet>
            <TinyNumber label="BDC" value={shown_bdc} onChange={setShownBDC} disabled={isDisabled} />
            <TinyNumber label="Sales" value={shown_sales} onChange={setShownSales} disabled={isDisabled} />
            <TinyNumber label="Internet" value={shown_internet} onChange={setShownInternet} disabled={isDisabled} />
          </CenteredTriplet>
        }
        rightTitle="Sold"
        right={
          <CenteredTriplet>
            <TinyNumber label="BDC" value={sold_bdc} onChange={setSoldBDC} disabled={isDisabled} />
            <TinyNumber label="Sales" value={sold_sales} onChange={setSoldSales} disabled={isDisabled} />
            <TinyNumber label="Internet" value={sold_internet} onChange={setSoldInternet} disabled={isDisabled} />
          </CenteredTriplet>
        }
      />

      {/* Big orange button (never locks; label reflects existing row) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => save(true)}
          disabled={isDisabled}
          className="w-full rounded-md bg-orange-500 px-6 py-3 text-base font-semibold text-white hover:bg-orange-500/90 disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

/** UI bits */
function NumberField({
  label, value, onChange, disabled,
}: { label: string; value: number | ""; onChange: (v: number | "") => void; disabled: boolean; }) {
  return (
    <label className="text-sm">
      <div className="mb-1 text-gray-700">{label}</div>
      <input
        type="number"
        min={0}
        className="w-full rounded-md border px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        disabled={disabled}
      />
    </label>
  );
}

function TextField({
  label, value, onChange, disabled,
}: { label: string; value: string; onChange: (v: string) => void; disabled: boolean; }) {
  return (
    <label className="text-sm">
      <div className="mb-1 text-gray-700">{label}</div>
      <input
        className="w-full rounded-md border px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function BadgeRow({
  label,
  items,
  variant,
}: {
  label: string;
  items: string[];
  variant: "submitted" | "missing";
}) {
  const base =
    variant === "submitted"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500">{label}:</span>
      {items.length === 0 ? (
        <span className="text-xs text-gray-400">—</span>
      ) : (
        items.map((name) => (
          <span
            key={`${label}-${name}`}
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${base}`}
          >
            {name}
          </span>
        ))
      )}
    </div>
  );
}

function DuoRow({
  leftTitle,
  rightTitle,
  left,
  right,
}: {
  leftTitle: string;
  rightTitle: string;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CompactSection title={leftTitle}>{left}</CompactSection>
      <CompactSection title={rightTitle}>{right}</CompactSection>
    </div>
  );
}

function CompactSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      {children}
    </div>
  );
}

/* Centers the three tiny inputs horizontally */
function CenteredTriplet({ children }: { children: React.ReactNode }) {
  return <div className="flex items-end justify-center gap-3">{children}</div>;
}

function TinyNumber({
  label, value, onChange, disabled,
}: { label: string; value: number | ""; onChange: (v: number | "") => void; disabled: boolean; }) {
  return (
    <label className="text-xs text-gray-600">
      <div className="mb-0.5 text-center">{label}</div>
      <input
        type="number"
        min={0}
        className="w-24 rounded-md border px-2 py-1 text-sm text-center"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        disabled={disabled}
      />
    </label>
  );
}
