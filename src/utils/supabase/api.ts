// src/utils/supabase/api.ts
import supabase, { getBusinessDate } from "./client";

/* ---------------- Types ---------------- */

export type BdcShiftPayload = {
  agent_name: string;
  calls_made: number;
  appointments_set: number;
  appointments_shown: number;
  cars_sold: number;
  notes?: string | null;
};

export type StorewidePayload = {
  closer_name: string;
  generated_time?: string; // optional override
  locked: boolean;

  // headline metrics
  leads_received?: number | null;
  phone_ups?: number | null;
  appointments_meant?: number | null;
  appointments_shown?: number | null;
  appointments_tomorrow?: number | null;
  visits_logged?: number | null;
  cars_sold?: number | null;

  // rollups
  dials_bdc?: number | null;
  dials_sales?: number | null;
  dials_internet?: number | null;

  set_bdc?: number | null;
  set_sales?: number | null;
  set_internet?: number | null;

  shown_bdc?: number | null;
  shown_sales?: number | null;
  shown_internet?: number | null;

  sold_bdc?: number | null;
  sold_sales?: number | null;
  sold_internet?: number | null;
};

export type BdcShiftRow = {
  agent_name: string;
  calls_made: number;
  appointments_set: number;
  appointments_shown: number;
  cars_sold: number;
};

export type AllAgentsStatus = {
  agent_name: string;
  role: "agent" | "assistant_manager" | "manager" | string;
  has_submitted: boolean;
  calls_made: number;
  appointments_set: number;
  appointments_shown: number;
  cars_sold: number;
};

/* --------------- Queries --------------- */

export async function fetchTodayBdcSums() {
  const businessDate = getBusinessDate();
  const { data, error } = await supabase
    .from("v_bdc_quick_totals_today")
    .select("*")
    .eq("report_date", businessDate)
    .maybeSingle();

  if (error) throw error;

  return (
    data ?? {
      report_date: businessDate,
      calls_made: 0,
      appts_set: 0,
      appts_shown: 0,
      cars_sold: 0,
      submitted_agents: [],
    }
  );
}

export async function fetchTodayBdcDetail(): Promise<BdcShiftRow[]> {
  const businessDate = getBusinessDate();
  const { data, error } = await supabase
    .from("bdc_shifts")
    .select("agent_name,calls_made,appointments_set,appointments_shown,cars_sold")
    .eq("shift_date", businessDate)
    .order("agent_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BdcShiftRow[];
}

export async function fetchAllAgentsStatus(): Promise<AllAgentsStatus[]> {
  const { data, error } = await supabase
    .from("v_bdc_today_agent_rows")
    .select("*")
    .order("agent_name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    agent_name: r.agent_name,
    role: r.role,
    has_submitted: !!r.has_submitted,
    calls_made: r.calls_made ?? 0,
    appointments_set: r.appointments_set ?? 0,
    appointments_shown: r.appointments_shown ?? 0,
    cars_sold: r.cars_sold ?? 0,
  }));
}

/* --------------- Mutations --------------- */

export async function upsertBdcShift(payload: BdcShiftPayload) {
  const businessDate = getBusinessDate();
  const row = {
    ...payload,
    shift_date: businessDate,
    notes: payload.notes ?? null,
  };

  const { error } = await supabase
    .from("bdc_shifts")
    .upsert(row, { onConflict: "shift_date,agent_name" });

  if (error) throw error;
  return true;
}

export async function getTodayStorewide() {
  const businessDate = getBusinessDate();
  const { data, error } = await supabase
    .from("storewide_nightly_numbers")
    .select("*")
    .eq("report_date", businessDate)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function isLockedToday(): Promise<boolean> {
  const rec = await getTodayStorewide();
  return !!rec?.locked;
}

export async function upsertStorewide(payload: StorewidePayload) {
  const businessDate = getBusinessDate();
  const nowStr =
    payload.generated_time ??
    new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Denver",
    });

  const row = {
    report_date: businessDate,
    closer_name: payload.closer_name,
    generated_time: nowStr,
    locked: payload.locked,

    leads_received: payload.leads_received ?? null,
    phone_ups: payload.phone_ups ?? null,
    appointments_meant: payload.appointments_meant ?? null,
    appointments_shown: payload.appointments_shown ?? null,
    appointments_tomorrow: payload.appointments_tomorrow ?? null,
    visits_logged: payload.visits_logged ?? null,
    cars_sold: payload.cars_sold ?? null,

    dials_bdc: payload.dials_bdc ?? null,
    dials_sales: payload.dials_sales ?? null,
    dials_internet: payload.dials_internet ?? null,

    set_bdc: payload.set_bdc ?? null,
    set_sales: payload.set_sales ?? null,
    set_internet: payload.set_internet ?? null,

    shown_bdc: payload.shown_bdc ?? null,
    shown_sales: payload.shown_sales ?? null,
    shown_internet: payload.shown_internet ?? null,

    sold_bdc: payload.sold_bdc ?? null,
    sold_sales: payload.sold_sales ?? null,
    sold_internet: payload.sold_internet ?? null,
  };

  const { error } = await supabase
    .from("storewide_nightly_numbers")
    .upsert(row, { onConflict: "report_date" });

  if (error) throw error;
  return true;
}

export async function reopenToday() {
  const businessDate = getBusinessDate();
  const nowStr = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Denver",
  });

  const { error } = await supabase.from("storewide_nightly_numbers").upsert(
    {
      report_date: businessDate,
      closer_name: "Unknown",
      generated_time: nowStr,
      locked: false,
    },
    { onConflict: "report_date" }
  );

  if (error) throw error;
  return true;
}
