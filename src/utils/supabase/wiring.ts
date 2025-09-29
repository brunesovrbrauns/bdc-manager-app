// utils/supabase/wiring.ts
import {
  upsertBdcShift,
  isLockedToday,
  fetchTodayBdcSums,
  upsertStorewide,
  getTodayStorewide,
  reopenToday,
  fetchTodayBdcDetail,
  fetchAllAgentsStatus, // <-- import it, do NOT define it here
} from './api';

// ------- tiny DOM helpers -------
function val(id: string): string {
  const el: any = document.getElementById(id);
  return (el?.value ?? el?.textContent ?? '').toString().trim();
}
function setVal(id: string, v: any) {
  const el: any = document.getElementById(id);
  if (!el) return;
  if ('value' in el) el.value = v;
  else el.textContent = String(v ?? '');
}
function setDisabled(ids: string[], disabled: boolean) {
  ids.forEach((id) => {
    const el: any = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
}

// ------- handlers you call from components -------

export async function onShiftScreenMount() {
  try {
    const locked = await isLockedToday();
    if (locked) {
      setDisabled(['agentName','calls','sets','shows','sold','notes','btnShiftSubmit'], true);
      alert('Tonight is already locked. Shift submissions are disabled.');
    }
  } catch (e) {
    console.error(e);
  }
}

export async function onSubmitShift() {
  try {
    if (await isLockedToday()) {
      alert('Day is locked. Storewide Nightly Numbers already submitted.');
      return;
    }
    await upsertBdcShift({
      agent_name: val('agentName'),
      calls_made: Number(val('calls') || 0),
      appointments_set: Number(val('sets') || 0),
      appointments_shown: Number(val('shows') || 0),
      cars_sold: Number(val('sold') || 0),
      notes: val('notes') || null,
    });
    alert('Shift saved.');
  } catch (e: any) {
    alert(`Error saving shift: ${e.message || e}`);
  }
}

export async function onStorewideMount() {
  try {
    // Load all agents status (both submitted and not submitted)
    const allAgentsStatus = await fetchAllAgentsStatus();

    // Create detailed display with all agents
    const agentElements = allAgentsStatus.map((agent) => {
      const safe = escapeHtml(agent.agent_name);
      if (agent.has_submitted) {
        return `${safe} (${agent.calls_made}/${agent.appointments_set}/${agent.appointments_shown}/${agent.cars_sold})`;
      } else {
        return `${safe} <span style="color:#DC2626;">(Not Submitted)</span>`;
      }
    });

    const displayText = allAgentsStatus.length ? agentElements.join(', ') : '—';

    // Set the HTML content (since we're using spans with styling)
    const element = document.getElementById('submittedAgentsDetail');
    if (element) {
      element.innerHTML = displayText;
    }

    // Also keep the old simple list for compatibility
    const sums = await fetchTodayBdcSums();
    if (Array.isArray(sums?.submitted_agents)) {
      setVal('submittedAgents', (sums.submitted_agents as string[]).join(', '));
    }
  } catch (e: any) {
    console.error('Failed to load agents status:', e);
    // Fallback to old method if new method fails
    try {
      const detail = await fetchTodayBdcDetail();
      const pretty = detail.length
        ? detail
            .map(
              (r) =>
                `${r.agent_name} (${r.calls_made}/${r.appointments_set}/${r.appointments_shown}/${r.cars_sold})`
            )
            .join(', ')
        : '—';
      setVal('submittedAgentsDetail', pretty);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
  }
}

export async function onPrefillFromBDC() {
  try {
    // Only prefill the number fields, submitted agents are now loaded on mount
    const sums = await fetchTodayBdcSums();
    setVal('q8',  sums?.calls_made ?? 0);
    setVal('q11', sums?.appts_set ?? 0);
    setVal('q14', sums?.appts_shown ?? 0);
    setVal('q18', sums?.cars_sold ?? 0);
  } catch (e: any) {
    alert(`Prefill failed: ${e.message || e}`);
  }
}

export async function onCloseDay() {
  try {
    await upsertStorewide({
      closer_name: val('closerName') || 'Unknown',
      locked: false,

      leads_received: Number(val('leads_received') || 0),
      phone_ups: Number(val('phone_ups') || 0),
      appointments_meant: Number(val('appointments_meant') || 0),
      appointments_shown: Number(val('appointments_shown') || 0),
      appointments_tomorrow: Number(val('appointments_tomorrow') || 0),
      visits_logged: Number(val('visits_logged') || 0),
      cars_sold: Number(val('cars_sold_total') || 0),

      dials_bdc: Number(val('q8') || 0),
      dials_sales: Number(val('q9') || 0),
      dials_internet: Number(val('q10') || 0),

      set_bdc: Number(val('q11') || 0),
      set_sales: Number(val('q12') || 0),
      set_internet: Number(val('q13') || 0),

      shown_bdc: Number(val('q14') || 0),
      shown_sales: Number(val('q15') || 0),
      shown_internet: Number(val('q16') || 0),

      sold_internet: Number(val('q17') || 0),
      sold_bdc: Number(val('q18') || 0),
      sold_sales: Number(val('q19') || 0),
    });

    const nav: any = (globalThis as any).navigate;
    if (typeof nav === 'function') nav('/report');
    else alert('Day closed. Open the Report screen to view.');
  } catch (e: any) {
    alert(`Close Day failed: ${e.message || e}`);
  }
}

export async function onReportMount() {
  try {
    const rec = await getTodayStorewide();
    if (!rec) {
      setVal('reportStatus', 'Open (no record yet)');
      return;
    }
    setVal('reportStatus', rec.locked ? 'Closed' : 'Open');
    setVal('r_closerName', rec.closer_name);
    setVal('r_generatedTime', rec.generated_time);
    setVal('r_dials_bdc', rec.dials_bdc ?? 0);
    setVal('r_set_bdc', rec.set_bdc ?? 0);
    setVal('r_shown_bdc', rec.shown_bdc ?? 0);
    setVal('r_sold_bdc', rec.sold_bdc ?? 0);
  } catch (e: any) {
    alert(`Report load failed: ${e.message || e}`);
  }
}

/** Permanently available action: re-open day (unlock). */
export async function onReopenDay() {
  try {
    await reopenToday();
    // immediately re-enable the Shift form controls
    setDisabled(['agentName','calls','sets','shows','sold','notes','btnShiftSubmit'], false);
    alert('Day re-opened. Shift submissions are enabled again.');
  } catch (e: any) {
    alert(`Re-open failed: ${e.message || e}`);
  }
}
