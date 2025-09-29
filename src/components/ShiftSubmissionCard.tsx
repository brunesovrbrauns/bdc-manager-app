// src/components/ShiftSubmissionCard.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import supabase from "../utils/supabase/client";

type Agent = { agent_name: string; role?: string | null; active?: boolean | null };

function todayDateStr() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toInt(el: HTMLInputElement | null): number {
  if (!el) return 0;
  const s = (el.value || "").trim();
  if (s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export default function ShiftSubmissionCard() {
  const dateStr = useMemo(() => todayDateStr(), []);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agent, setAgent] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Uncontrolled numeric inputs via refs
  const callsRef = useRef<HTMLInputElement>(null);
  const setRef = useRef<HTMLInputElement>(null);
  const shownRef = useRef<HTMLInputElement>(null);
  const soldRef = useRef<HTMLInputElement>(null);
  const emailsRef = useRef<HTMLInputElement>(null);
  const textsRef = useRef<HTMLInputElement>(null);
  const contactedRef = useRef<HTMLInputElement>(null);

  // Optional notes
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await supabase
        .from("bdc_agents")
        .select("agent_name, role, active")
        .order("agent_name", { ascending: true });

      if (!ignore) {
        if (res.error) {
          setErr(`Failed to load agents: ${res.error.message}`);
        } else {
          const list = (res.data ?? []).filter((a) => a.active !== false);
          setAgents(list);
          if (list.length === 1) setAgent(list[0].agent_name);
        }
      }
    })();
    return () => { ignore = true; };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!agent) {
      setErr("Please choose an agent.");
      return;
    }

    // Always include notes: empty -> null (clears prior note), text -> saved
    const notesRaw = (notesRef.current?.value ?? "").trim();

    const payload: Record<string, any> = {
      agent_name: agent,
      shift_date: dateStr,
      calls_made: toInt(callsRef.current),
      appointments_set: toInt(setRef.current),
      appointments_shown: toInt(shownRef.current),
      cars_sold: toInt(soldRef.current),
      emails_sent: toInt(emailsRef.current),
      texts_sent: toInt(textsRef.current),
      contacted_calls: toInt(contactedRef.current),
      notes: notesRaw.length ? notesRaw : null,
    };

    setSaving(true);
    const { error } = await supabase
      .from("bdc_shifts")
      .upsert([payload], { onConflict: "agent_name,shift_date" });

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    // Clear notes after a successful save so they never leak into another submission
    if (notesRef.current) notesRef.current.value = "";

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    setSavedAt(`${hh}:${mm}:${ss}`);
  }

  function NumericInput({
    id,
    label,
    inputRef,
    placeholder,
  }: {
    id: string;
    label: string;
    inputRef: React.RefObject<HTMLInputElement>;
    placeholder?: string;
  }) {
    return (
      <label htmlFor={id} className="block text-sm">
        <span className="text-gray-700">{label}</span>
        <input
          id={id}
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder={placeholder ?? "0"}
          onFocus={(e) => e.currentTarget.select()}
          onWheel={(ev) => (ev.target as HTMLElement).blur()}
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          onInput={(e) => {
            const el = e.currentTarget as HTMLInputElement;
            const cleaned = el.value.replace(/\D+/g, "");
            if (el.value !== cleaned) {
              const pos = el.selectionStart || cleaned.length;
              el.value = cleaned;
              requestAnimationFrame(() => el.setSelectionRange(pos, pos));
            }
          }}
        />
      </label>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Submit My Shift</h3>
      </div>

      {err && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm">
          <span className="text-gray-700">Agent</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
          >
            <option value="">Select agent…</option>
            {agents.map((a) => (
              <option key={a.agent_name} value={a.agent_name}>
                {a.agent_name}
              </option>
            ))}
          </select>
        </label>

        <NumericInput id="calls" label="Calls Made" inputRef={callsRef} />
        <NumericInput id="apptsSet" label="Appointments Set" inputRef={setRef} />
        <NumericInput id="apptsShown" label="Appointments Shown" inputRef={shownRef} />
        <NumericInput id="sold" label="Cars Sold" inputRef={soldRef} />
        <NumericInput id="emails" label="Emails Sent" inputRef={emailsRef} />
        <NumericInput id="texts" label="Texts Sent" inputRef={textsRef} />
        <NumericInput id="contacted" label="Contacted Calls" inputRef={contactedRef} />

        {/* Optional Notes */}
        <label className="block text-sm sm:col-span-2 lg:col-span-3">
          <span className="text-gray-700">Optional Notes</span>
          <textarea
            ref={notesRef}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Anything useful for the closer or manager…"
          />
        </label>

        {/* Full-width submit row */}
        <div className="col-span-full mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={saving || !agent}
            className="w-full inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-3 text-base font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Submit My Shift"}
          </button>

          {savedAt && (
            <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
              <span className="text-xs text-gray-500">Last saved at {savedAt}</span>
              <div className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                Saved successfully.
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
