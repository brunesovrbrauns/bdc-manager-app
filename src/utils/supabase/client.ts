// src/utils/supabase/client.ts
import { createClient as supaCreate, type SupabaseClient } from "@supabase/supabase-js";

/** Hardcoded project values (Figma export) */
import { projectId, publicAnonKey } from "./info";

const HARDCODED_URL = `https://${projectId}.supabase.co`;
const HARDCODED_ANON = publicAnonKey;

/** Read from env if present; otherwise undefined */
function readEnv(name: string): string | undefined {
  // Vite (browser)
  const im: any = typeof import.meta !== "undefined" ? (import.meta as any) : undefined;
  const imEnv = im?.env?.[name];

  // Node / Next
  const nodeEnv = typeof process !== "undefined" ? (process as any)?.env?.[name] : undefined;

  // Window globals (rare)
  const winEnv = typeof window !== "undefined" ? (window as any)?.[name] : undefined;

  return (imEnv ?? nodeEnv ?? winEnv) as string | undefined;
}

let _client: SupabaseClient | null = null;

function ensureClient(): SupabaseClient {
  if (_client) return _client;

  const url =
    readEnv("NEXT_PUBLIC_SUPABASE_URL") ||
    readEnv("VITE_SUPABASE_URL") ||
    readEnv("SUPABASE_URL") ||
    HARDCODED_URL;

  const anonKey =
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    readEnv("VITE_SUPABASE_ANON_KEY") ||
    readEnv("SUPABASE_ANON_KEY") ||
    HARDCODED_ANON;

  if (!url || !anonKey) {
    throw new Error("Supabase URL/Anon key missing. Check env vars or utils/supabase/info.tsx.");
  }

  _client = supaCreate(url, anonKey);
  return _client;
}

/**
 * Business day for writes.
 * For MVP we align with Supabase views (which use current_date in UTC),
 * so we return today's date in **UTC** (YYYY-MM-DD).
 */
export function getBusinessDate(): string {
  return new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
}

/** Keep a symbol for later; we’ll likely switch back to a store timezone after we adjust the views. */
export const DEALER_TIMEZONE = "UTC";

/** Factory (preferred) */
export function createClient(): SupabaseClient {
  return ensureClient();
}

/** Default export (back-compat) */
const supabase = ensureClient();
export default supabase;

/** Named export (back-compat) */
export { supabase };
