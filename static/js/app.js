/* ── Constants ──────────────────────────────────────────────────────────── */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

/* ── State ───────────────────────────────────────────────────────────────── */
let barChart      = null;
let doughnutChart = null;
let editingId     = null;   // staff id being edited, or null for new
let allStaff      = [];     // local cache
let currentAgg    = null;   // last aggregate response

/* ══════════════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  buildPeriodSelect();
  buildModalPeriodSelects();
  bindNavTabs();
  bindModalButtons();
  bindFormPreview();
  refresh();
});

/* ══════════════════════════════════════════════════════════════════════════
   PERIOD SELECT
═══════════════════════════════════════════════════════════════════════════ */
function buildPeriodSelect() {
  const sel = document.getElementById("globalMonth");
  const now = new Date();
  for (let i = -12; i <= 3; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const lbl = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const opt = new Option(lbl, val);
    if (i === 0) opt.selected = true;
    sel.appendChild(opt);
  }
}

function buildModalPeriodSelects() {
  const mSel = document.getElementById("inputMonth");
  const ySel = document.getElementById("inputYear");
  mSel.innerHTML = "";
  ySel.innerHTML = "";
  MONTHS.forEach((m, i) => mSel.appendChild(new Option(m, String(i+1).padStart(2,"0"))));
  const y = new Date().getFullYear();
  for (let yr = y - 3; yr <= y + 1; yr++) {
    const opt = new Option(yr, yr);
    if (yr === y) opt.selected = true;
    ySel.appendChild(opt);
  }
}

function currentPeriod() {
  return document.getElementById("globalMonth").value;
}
function periodLabel(p) {
  const [y, m] = p.split("-");
  return `${MONTHS[parseInt(m)-1]} ${y}`;
}
function onPeriodChange() { refresh(); }

/* ══════════════════════════════════════════════════════════════════════════
   NAV TABS
═══════════════════════════════════════════════════════════════════════════ */
function bindNavTabs() {
  document.querySelectorAll(".nav-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("view-" + btn.dataset.view).classList.add("active");
    });
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   API HELPERS
═══════════════════════════════════════════════════════════════════════════ */
async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ══════════════════════════════════════════════════════════════════════════
   REFRESH — fetch everything and re-render
═══════════════════════════════════════════════════════════════════════════ */
async function refresh() {
  try {
    const p = currentPeriod();
    [allStaff, currentAgg] = await Promise.all([
      apiFetch("/api/staff"),
      apiFetch(`/api/aggregate?period=${p}`),
    ]);
    renderKPIs(currentAgg);
    renderCharts(currentAgg);
    renderTable(currentAgg);
    renderAdminGrid(allStaff);
  } catch (e) {
    showToast("Failed to load data: " + e.message, "error");
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   KPI CARDS
═══════════════════════════════════════════════════════════════════════════ */
function renderKPIs(agg) {
  const t = agg.totals;
  const n = agg.staff_count || 1;
  const keys = ["bans","mutes","kicks","warns","messages"];
  keys.forEach(k => {
    document.getElementById(`kpi-${k}`).textContent     = t[k].toLocaleString();
    document.getElementById(`kpi-${k}-sub`).textContent =
      agg.staff_count ? `avg ${(t[k]/n).toFixed(1)} / staff` : "no staff yet";
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   CHARTS
═══════════════════════════════════════════════════════════════════════════ */
const C = {
  ban:  "rgba(239,68,68,0.82)",   banS: "rgba(239,68,68,0.3)",
  mute: "rgba(245,158,11,0.82)",  muteS:"rgba(245,158,11,0.3)",
  kick: "rgba(139,92,246,0.82)",  kickS:"rgba(139,92,246,0.3)",
  warn: "rgba(6,182,212,0.82)",   warnS:"rgba(6,182,212,0.3)",
  msg:  "rgba(16,185,129,0.82)",
  text: "#8892aa", grid: "rgba(28,34,53,0.9)", bg: "#111520",
};

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: C.text, font: { family: "'JetBrains Mono'", size: 11 }, boxWidth: 10, padding: 10 } }
    }
  };
}

function renderCharts(agg) {
  document.getElementById("chartBadge").textContent = periodLabel(currentPeriod());

  const rows   = agg.rows;
  const labels = rows.map(r => r.name);

  // ── Bar chart ──────────────────────────────────────────────────────────
  const bCtx = document.getElementById("barChart").getContext("2d");
  if (barChart) barChart.destroy();

  barChart = new Chart(bCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label:"Bans",  data: rows.map(r=>r.bans),  backgroundColor: C.ban,  borderRadius: 4, borderSkipped: false },
        { label:"Mutes", data: rows.map(r=>r.mutes), backgroundColor: C.mute, borderRadius: 4, borderSkipped: false },
        { label:"Kicks", data: rows.map(r=>r.kicks), backgroundColor: C.kick, borderRadius: 4, borderSkipped: false },
        { label:"Warns", data: rows.map(r=>r.warns), backgroundColor: C.warn, borderRadius: 4, borderSkipped: false },
      ],
    },
    options: {
      ...chartDefaults(),
      scales: {
        x: { grid: { color: C.grid }, ticks: { color: C.text, font: { family: "'JetBrains Mono'", size: 10 } } },
        y: { beginAtZero: true, grid: { color: C.grid }, ticks: { color: C.text, font: { family: "'JetBrains Mono'", size: 10 }, stepSize: 1 } },
      },
    },
  });

  // ── Doughnut chart ─────────────────────────────────────────────────────
  const t    = agg.totals;
  const dCtx = document.getElementById("doughnutChart").getContext("2d");
  if (doughnutChart) doughnutChart.destroy();

  doughnutChart = new Chart(dCtx, {
    type: "doughnut",
    data: {
      labels: ["Bans","Mutes","Kicks","Warns","Messages"],
      datasets: [{
        data: [t.bans, t.mutes, t.kicks, t.warns, t.messages],
        backgroundColor: [C.ban, C.mute, C.kick, C.warn, C.msg],
        borderColor: "#111520",
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      ...chartDefaults(),
      cutout: "68%",
      plugins: {
        legend: { position: "bottom", labels: { color: C.text, font: { family: "'JetBrains Mono'", size: 10 }, boxWidth: 10, padding: 10 } },
      },
    },
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   STAFF TABLE
═══════════════════════════════════════════════════════════════════════════ */
function renderTable(agg) {
  const container = document.getElementById("staffTable");
  if (!agg.rows.length) {
    container.innerHTML = emptyState("📊", "No staff yet", "Add staff members in the Management tab");
    return;
  }
  const totalAct = agg.totals.total_actions || 1;
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Staff Member</th>
          <th>Bans</th>
          <th>Mutes</th>
          <th>Kicks</th>
          <th>Warns</th>
          <th>Messages</th>
          <th>Total Actions</th>
          <th>Share</th>
        </tr>
      </thead>
      <tbody>
        ${agg.rows.map((r, i) => `
          <tr>
            <td class="rank">${i+1}</td>
            <td><div class="staff-name"><div class="staff-avatar">${esc(r.name).slice(0,2)}</div>${esc(r.name)}</div></td>
            <td><span class="pill pill-ban">${r.bans}</span></td>
            <td><span class="pill pill-mute">${r.mutes}</span></td>
            <td><span class="pill pill-kick">${r.kicks}</span></td>
            <td><span class="pill pill-warn">${r.warns}</span></td>
            <td><span class="pill pill-msg">${r.messages.toLocaleString()}</span></td>
            <td class="total-bold">${r.total_actions}</td>
            <td>
              <div class="pct-bar">
                <div class="pct-track"><div class="pct-fill" style="width:${pct(r.total_actions, totalAct)}%"></div></div>
                <span class="pct-label">${pct(r.total_actions, totalAct)}%</span>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   ADMIN GRID
═══════════════════════════════════════════════════════════════════════════ */
function renderAdminGrid(staff) {
  const grid = document.getElementById("adminGrid");
  const p    = currentPeriod();
  const [yr, mo] = p.split("-");

  document.getElementById("adminSub").textContent =
    `${staff.length} staff member${staff.length !== 1 ? "s" : ""} — ${periodLabel(p)}`;

  if (!staff.length) {
    grid.innerHTML = emptyState("✦", "No staff members", 'Click "Add Staff Member" to get started');
    return;
  }

  grid.innerHTML = staff.map(s => {
    const d  = (s.data || {})[p] || { bans:0, mutes:0, kicks:0, warns:0, messages:0 };
    const ta = d.bans + d.mutes + d.kicks + d.warns;
    const gt = ta + d.messages;
    const msgDisp = d.messages > 9999
      ? (d.messages/1000).toFixed(1) + "k"
      : d.messages;
    return `
      <div class="staff-card" id="card-${s.id}">
        <div class="staff-card-header">
          <div class="staff-card-name">
            <div class="staff-card-avatar">${esc(s.name).slice(0,2)}</div>
            <div>
              <div class="staff-card-username">${esc(s.name)}</div>
              <div class="staff-card-period">${MONTHS[parseInt(mo)-1]} ${yr}</div>
            </div>
          </div>
          <div class="card-btns">
            <button class="icon-btn"     title="Edit"   onclick="openModal('${s.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="icon-btn del" title="Delete" onclick="confirmDelete('${s.id}', '${esc(s.name)}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
        <div class="stats-mini">
          <div class="stat-mini">
            <div class="stat-mini-label" style="color:var(--ban-pale)">Bans</div>
            <div class="stat-mini-value" style="color:var(--ban-pale)">${d.bans}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-label" style="color:var(--mute-pale)">Mutes</div>
            <div class="stat-mini-value" style="color:var(--mute-pale)">${d.mutes}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-label" style="color:var(--kick-pale)">Kicks</div>
            <div class="stat-mini-value" style="color:var(--kick-pale)">${d.kicks}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-label" style="color:var(--warn-pale)">Warns</div>
            <div class="stat-mini-value" style="color:var(--warn-pale)">${d.warns}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-label" style="color:var(--msg-pale)">Msgs</div>
            <div class="stat-mini-value" style="color:var(--msg-pale)">${msgDisp}</div>
          </div>
        </div>
        <div class="card-footer">
          <span>Actions: <strong>${ta}</strong></span>
          <span>Grand total: <strong>${gt.toLocaleString()}</strong></span>
        </div>
      </div>`;
  }).join("");
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════════════════════════════════ */
function bindModalButtons() {
  document.getElementById("modalCloseBtn").addEventListener("click", closeModal);
  document.getElementById("modalCancelBtn").addEventListener("click", closeModal);
  document.getElementById("modalSaveBtn").addEventListener("click", saveStaff);
  document.getElementById("modalOverlay").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeModal(); closeConfirm(); }
  });
}

function openModal(id = null) {
  editingId = id;
  const p     = currentPeriod();
  const [yr, mo] = p.split("-");

  // Sync modal period to global period
  document.getElementById("inputMonth").value = mo;
  document.getElementById("inputYear").value  = yr;

  if (id) {
    const s = allStaff.find(x => x.id === id);
    if (!s) return;
    document.getElementById("modalTitle").textContent = `Edit — ${s.name}`;
    document.getElementById("inputName").value        = s.name;
    document.getElementById("nameGroup").style.display = "none"; // hide name when editing period data

    const d = (s.data || {})[p] || { bans:0, mutes:0, kicks:0, warns:0, messages:0 };
    document.getElementById("inputBans").value     = d.bans;
    document.getElementById("inputMutes").value    = d.mutes;
    document.getElementById("inputKicks").value    = d.kicks;
    document.getElementById("inputWarns").value    = d.warns;
    document.getElementById("inputMessages").value = d.messages;
  } else {
    document.getElementById("modalTitle").textContent  = "Add Staff Member";
    document.getElementById("nameGroup").style.display = "block";
    document.getElementById("inputName").value = "";
    ["Bans","Mutes","Kicks","Warns","Messages"].forEach(k =>
      document.getElementById("input"+k).value = 0);
  }
  updatePreview();
  document.getElementById("modalOverlay").classList.add("open");
  setTimeout(() => {
    const focus = id ? document.getElementById("inputBans") : document.getElementById("inputName");
    focus?.focus();
  }, 80);
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  editingId = null;
}

function bindFormPreview() {
  ["inputBans","inputMutes","inputKicks","inputWarns","inputMessages"].forEach(id => {
    document.getElementById(id).addEventListener("input", updatePreview);
  });
  document.getElementById("inputMonth").addEventListener("change", () => {
    if (editingId) loadPeriodIntoModal();
  });
  document.getElementById("inputYear").addEventListener("change", () => {
    if (editingId) loadPeriodIntoModal();
  });
}

function loadPeriodIntoModal() {
  if (!editingId) return;
  const s = allStaff.find(x => x.id === editingId);
  if (!s) return;
  const mo = document.getElementById("inputMonth").value;
  const yr = document.getElementById("inputYear").value;
  const p  = `${yr}-${mo}`;
  const d  = (s.data || {})[p] || { bans:0, mutes:0, kicks:0, warns:0, messages:0 };
  document.getElementById("inputBans").value     = d.bans;
  document.getElementById("inputMutes").value    = d.mutes;
  document.getElementById("inputKicks").value    = d.kicks;
  document.getElementById("inputWarns").value    = d.warns;
  document.getElementById("inputMessages").value = d.messages;
  updatePreview();
}

function updatePreview() {
  const b   = parseInt(document.getElementById("inputBans").value)     || 0;
  const m   = parseInt(document.getElementById("inputMutes").value)    || 0;
  const k   = parseInt(document.getElementById("inputKicks").value)    || 0;
  const w   = parseInt(document.getElementById("inputWarns").value)    || 0;
  const msg = parseInt(document.getElementById("inputMessages").value) || 0;
  const ta  = b + m + k + w;
  const gt  = ta + msg;
  document.getElementById("prevTotal").textContent  = ta;
  document.getElementById("prevGrand").textContent  = gt.toLocaleString();
  document.getElementById("prevAvg").textContent    = ta ? (gt / ta).toFixed(1) : "—";
  document.getElementById("prevBanPct").textContent = ta ? pct(b, ta) + "%" : "—";
}

async function saveStaff() {
  const mo     = document.getElementById("inputMonth").value;
  const yr     = document.getElementById("inputYear").value;
  const period = `${yr}-${mo}`;
  const stats  = {
    period,
    bans:     parseInt(document.getElementById("inputBans").value)     || 0,
    mutes:    parseInt(document.getElementById("inputMutes").value)    || 0,
    kicks:    parseInt(document.getElementById("inputKicks").value)    || 0,
    warns:    parseInt(document.getElementById("inputWarns").value)    || 0,
    messages: parseInt(document.getElementById("inputMessages").value) || 0,
  };

  try {
    if (editingId) {
      // Update period data only
      await apiFetch(`/api/staff/${editingId}/period`, { method:"POST", body: JSON.stringify(stats) });
      showToast("Data saved ✓", "success");
    } else {
      const name = document.getElementById("inputName").value.trim();
      if (!name) { showToast("Enter a name", "error"); return; }
      // POST returns existing staff if name matches, or creates new — no error
      const staffRecord = await apiFetch("/api/staff", { method:"POST", body: JSON.stringify({ name }) });
      await apiFetch(`/api/staff/${staffRecord.id}/period`, { method:"POST", body: JSON.stringify(stats) });
      showToast(`${name} saved for ${periodLabel(stats.period)} ✓`, "success");
    }
    closeModal();
    await refresh();
  } catch (e) {
    showToast(e.message, "error");
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   DELETE
═══════════════════════════════════════════════════════════════════════════ */
function confirmDelete(id, name) {
  document.getElementById("confirmText").textContent =
    `Remove "${name}" and all their data across all months? This cannot be undone.`;
  document.getElementById("confirmOverlay").classList.add("open");

  const yes = document.getElementById("confirmYes");
  const no  = document.getElementById("confirmNo");

  // Clone to remove old listeners
  const newYes = yes.cloneNode(true);
  const newNo  = no.cloneNode(true);
  yes.replaceWith(newYes);
  no.replaceWith(newNo);

  newYes.addEventListener("click", async () => {
    closeConfirm();
    try {
      await apiFetch(`/api/staff/${id}`, { method: "DELETE" });
      showToast(`${name} removed`, "success");
      await refresh();
    } catch (e) {
      showToast(e.message, "error");
    }
  });
  newNo.addEventListener("click", closeConfirm);
}

function closeConfirm() {
  document.getElementById("confirmOverlay").classList.remove("open");
}
document.getElementById("confirmOverlay").addEventListener("click", e => {
  if (e.target === e.currentTarget) closeConfirm();
});

/* ══════════════════════════════════════════════════════════════════════════
   EXPORT
═══════════════════════════════════════════════════════════════════════════ */
function doExport(type) {
  const p = currentPeriod();
  showToast(`Generating ${type.toUpperCase()}…`, "info");
  window.location.href = `/api/export/${type}?period=${p}`;
}

/* ══════════════════════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════════════════════ */
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  const icons = { success: "✓", error: "✗", info: "◌" };
  t.textContent = `${icons[type] || "•"}  ${msg}`;
  t.className   = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3200);
}

/* ══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */
function pct(val, total) {
  if (!total) return "0.0";
  return ((val / total) * 100).toFixed(1);
}
function esc(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function emptyState(icon, title, text, btnLabel, btnCb) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${title}</div>
      <div class="empty-text">${text}</div>
      ${btnLabel ? `<button class="btn btn-primary" onclick="${btnCb}">${btnLabel}</button>` : ""}
    </div>`;
}
