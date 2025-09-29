// src/components/NightlyNumbersReport.tsx
import { useEffect, useMemo, useState } from "react";
import supabase from "../utils/supabase/client";

type Storewide = {
  report_date: string;
  closer_name: string | null;
  generated_time?: string | null;
  leads_received: number | null;
  phone_ups: number | null;
  appointments_meant: number | null;
  appointments_shown: number | null;
  appointments_tomorrow: number | null;
  visits_logged: number | null;
  cars_sold: number | null;
  dials_bdc: number | null;
  dials_sales: number | null;
  dials_internet: number | null;
  set_bdc: number | null;
  set_sales: number | null;
  set_internet: number | null;
  shown_bdc: number | null;
  shown_sales: number | null;
  shown_internet: number | null;
  sold_internet: number | null;
  sold_bdc: number | null;
  sold_sales: number | null;
};

function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NightlyNumbersReport() {
  const dateStr = useMemo(() => todayDateStr(), []);
  const [row, setRow] = useState<Storewide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("storewide_nightly_numbers")
        .select(
          "report_date, closer_name, leads_received, phone_ups, appointments_meant, appointments_shown, appointments_tomorrow, visits_logged, cars_sold, dials_bdc, dials_sales, dials_internet, set_bdc, set_sales, set_internet, shown_bdc, shown_sales, shown_internet, sold_internet, sold_bdc, sold_sales"
        )
        .eq("report_date", dateStr)
        .maybeSingle();

      if (ignore) return;
      setRow((data as Storewide) ?? null);
      setError(error?.message ?? null);
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [dateStr]);

  // Fallbacks for header when empty
  const closer = row?.closer_name || "Unknown";
  const generatedAt = new Date().toLocaleTimeString();

  const fmt = (v: number | null | undefined) => (v ?? 0).toLocaleString();
  const isZero = (v: number | null | undefined) => (v ?? 0) === 0;

  // Order matches your Figma build
  const fields: { label: string; value: number | null }[] = [
    { label: "Yesterday's Leads", value: row?.leads_received ?? null },
    { label: "Phone Ups", value: row?.phone_ups ?? null },
    { label: "Appts Meant", value: row?.appointments_meant ?? null },
    { label: "Appts Shown (All)", value: row?.appointments_shown ?? null },
    { label: "Appts for Tomorrow (ALL)", value: row?.appointments_tomorrow ?? null },
    { label: "Store Visits Today", value: row?.visits_logged ?? null },
    { label: "SOLD", value: row?.cars_sold ?? null },

    { label: "Calls BDC", value: row?.dials_bdc ?? null },
    { label: "Calls Sales", value: row?.dials_sales ?? null },
    { label: "Calls Internet", value: row?.dials_internet ?? null },

    { label: "Set BDC", value: row?.set_bdc ?? null },
    { label: "Set Sales", value: row?.set_sales ?? null },
    { label: "Set Internet", value: row?.set_internet ?? null },

    { label: "Shown BDC", value: row?.shown_bdc ?? null },
    { label: "Shown Sales", value: row?.shown_sales ?? null },
    { label: "Shown Internet", value: row?.shown_internet ?? null },

    { label: "Sold Internet", value: row?.sold_internet ?? null },
    { label: "Sold BDC", value: row?.sold_bdc ?? null },
    { label: "Sold Sales", value: row?.sold_sales ?? null },
  ];

  // Screenshot box sizing — tweak here if you want tighter/looser
  const BOX_W = 420;      // width of the screenshot box (px)
  const ROW_H = 38;       // height of each row (px)
  const VALUE_W = 120;    // right column (numbers) width (px)
  const OUTER_BORDER = 4; // matches border-4
  const BOX_H = fields.length * ROW_H + OUTER_BORDER * 2;

  return (
    <div className="pt-6 sm:pt-0"> {/* extra top padding to avoid Back button overlap on narrow screens */}
      {/* Header (outside of screenshot box) */}
      <div className="mb-3 text-gray-800">
        <div className="text-sm">{dateStr} • Closer: <span className="font-semibold">{closer}</span> • {generatedAt}</div>
      </div>

      {/* Screenshot box */}
      <div className="flex justify-center">
        <div
          className="border-4 border-gray-700 rounded-md shadow-sm overflow-hidden bg-white"
          style={{ width: BOX_W, height: BOX_H }}
          aria-label="Screenshot this box"
        >
          {fields.map((f, i) => {
            const bg = i % 2 === 0 ? "#FFF8D1" : "#FFFFFF"; // alternating (soft yellow, then white)
            const isLast = i === fields.length - 1;
            return (
              <div
                key={f.label}
                className="flex items-center justify-between"
                style={{
                  height: ROW_H,
                  backgroundColor: bg,
                  borderBottom: isLast ? "none" : "1px solid rgba(0,0,0,0.12)",
                }}
              >
                {/* Label (left) */}
                <div className="px-3 text-gray-700" style={{ width: BOX_W - VALUE_W }}>
                  {f.label}
                </div>

                {/* Value (right) */}
                <div
                  className={`px-3 font-semibold tabular-nums ${isZero(f.value) ? "text-red-600" : "text-gray-900"}`}
                  style={{ width: VALUE_W, textAlign: "right" }}
                >
                  {fmt(f.value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tip (outside the screenshot box) */}
      <div className="mt-4 text-[15px] italic text-gray-700 text-center">
        <span className="font-bold not-italic">Tip:</span>{" "}
        Zoom your browser to 125–150% before taking the screenshot so numbers stay sharp in Signal.
      </div>

      {/* Loading / error messages (kept subtle) */}
      {loading && <div className="mt-2 text-sm text-gray-500 text-center">Loading…</div>}
      {error && <div className="mt-2 text-sm text-red-600 text-center">Error: {error}</div>}
    </div>
  );
}
