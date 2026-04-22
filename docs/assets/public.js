const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const CHART_COLORS = {
  ban: "rgba(239,68,68,0.82)",
  mute: "rgba(245,158,11,0.82)",
  kick: "rgba(139,92,246,0.82)",
  warn: "rgba(6,182,212,0.82)",
  msg: "rgba(16,185,129,0.82)",
  text: "#8892aa",
  grid: "rgba(28,34,53,0.9)",
};

let barChart = null;
let doughnutChart = null;

document.addEventListener("DOMContentLoaded", () => {
  loadDashboard().catch((error) => showError(error.message));
});

async function loadDashboard() {
  setStatus("Loading public snapshot...");
  const response = await fetch("./data/dashboard.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Public data file is missing. Run the export script first.");
  }

  const data = await response.json();
  renderMeta(data);
  renderKpis(data.totals);
  renderCharts(data);
  renderTable(data);
  setStatus(`Public snapshot loaded for ${formatPeriod(data.period)}`);
}

function renderMeta(data) {
  document.getElementById("periodLabel").textContent = formatPeriod(data.period);
  document.getElementById("generatedAt").textContent = formatTimestamp(data.generated_at);
  document.getElementById("heroNote").textContent = `${data.staff_count} staff member${data.staff_count === 1 ? "" : "s"} in the current month`;
  document.getElementById("tableSummary").textContent = `${data.rows.length} ranked entries`;
}

function renderKpis(totals) {
  ["bans", "mutes", "kicks", "warns", "messages"].forEach((key) => {
    document.getElementById(`kpi-${key}`).textContent = Number(totals[key] || 0).toLocaleString();
  });
}

function renderCharts(data) {
  const labels = data.rows.map((row) => row.name);

  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Bans", data: data.rows.map((row) => row.bans), backgroundColor: CHART_COLORS.ban, borderRadius: 4 },
        { label: "Mutes", data: data.rows.map((row) => row.mutes), backgroundColor: CHART_COLORS.mute, borderRadius: 4 },
        { label: "Kicks", data: data.rows.map((row) => row.kicks), backgroundColor: CHART_COLORS.kick, borderRadius: 4 },
        { label: "Warns", data: data.rows.map((row) => row.warns), backgroundColor: CHART_COLORS.warn, borderRadius: 4 },
      ],
    },
    options: chartDefaults({ stacked: false }),
  });

  if (doughnutChart) doughnutChart.destroy();
  doughnutChart = new Chart(document.getElementById("doughnutChart"), {
    type: "doughnut",
    data: {
      labels: ["Bans", "Mutes", "Kicks", "Warns", "Messages"],
      datasets: [{
        data: [data.totals.bans, data.totals.mutes, data.totals.kicks, data.totals.warns, data.totals.messages],
        backgroundColor: [CHART_COLORS.ban, CHART_COLORS.mute, CHART_COLORS.kick, CHART_COLORS.warn, CHART_COLORS.msg],
        borderColor: "#111520",
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: CHART_COLORS.text, font: { family: "'JetBrains Mono'", size: 10 }, boxWidth: 10, padding: 10 },
        },
      },
    },
  });
}

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { color: CHART_COLORS.grid }, ticks: { color: CHART_COLORS.text, font: { family: "'JetBrains Mono'", size: 10 } } },
      y: { beginAtZero: true, grid: { color: CHART_COLORS.grid }, ticks: { color: CHART_COLORS.text, font: { family: "'JetBrains Mono'", size: 10 }, stepSize: 1 } },
    },
    plugins: {
      legend: {
        labels: { color: CHART_COLORS.text, font: { family: "'JetBrains Mono'", size: 11 }, boxWidth: 10, padding: 10 },
      },
    },
  };
}

function renderTable(data) {
  const container = document.getElementById("staffTable");
  if (!data.rows.length) {
    container.innerHTML = '<div class="empty-state">No published staff data yet.</div>';
    return;
  }

  const totalActions = data.totals.total_actions || 1;
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
        ${data.rows.map((row, index) => `
          <tr>
            <td class="rank">${index + 1}</td>
            <td><div class="staff-name"><span class="staff-avatar">${esc(row.name).slice(0, 2)}</span>${esc(row.name)}</div></td>
            <td><span class="pill pill-ban">${row.bans}</span></td>
            <td><span class="pill pill-mute">${row.mutes}</span></td>
            <td><span class="pill pill-kick">${row.kicks}</span></td>
            <td><span class="pill pill-warn">${row.warns}</span></td>
            <td><span class="pill pill-msg">${Number(row.messages).toLocaleString()}</span></td>
            <td>${row.total_actions}</td>
            <td>${percent(row.total_actions, totalActions)}%</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function setStatus(message, type = "") {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = `status ${type}`.trim();
}

function showError(message) {
  setStatus(message, "error");
  document.getElementById("heroNote").textContent = message;
  document.getElementById("staffTable").innerHTML = `<div class="empty-state">${esc(message)}</div>`;
}

function formatPeriod(period) {
  const [year, month] = period.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

function formatTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function percent(value, total) {
  return ((value / total) * 100).toFixed(1);
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
