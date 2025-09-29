// src/lib/supabase.ts
import defaultClient from "../utils/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton getter to preserve any legacy usage
let _singleton: SupabaseClient | null = null;

/** Return a singleton Supabase client (backed by utils/supabase/client). */
export function getSupabase(): SupabaseClient {
  if (_singleton) return _singleton;
  _singleton = defaultClient;
  return _singleton;
}

export type { SupabaseClient };
