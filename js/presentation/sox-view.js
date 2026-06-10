/**
 * SOX Controls — View renderer
 * Renders the full SOX controls dashboard within the Integraciones app.
 */

import { fetchSOXControls } from '../data/sox-api.js';

const STATUS_LABEL = {
  ok:      '✓ OK',
  failed:  '✕ Failed',
  alert:   '⚠ Alert',
  pending: 'Pending',
  tiempo:  'On Time',
  delayed: '⏱ Delayed',
  na:      'N/A',
};

const CELL_CLASS = {
  ok:      'sox-s-ok',
  failed:  'sox-s-failed',
  alert:   'sox-s-alert',
  pending: 'sox-s-pending',
  tiempo:  'sox-s-tiempo',
  delayed: 'sox-s-delayed',
  na:      'sox-s-na',
};

function tipoCode(id) {
  return id.split('.')[2] || 'OPE';
}

let chartInstance = null;

/** Entry point — called by app.js */
export async function renderSOXView(container) {
  container.innerHTML = '';

  const view = document.createElement('div');
  view.className = 'sox-view';
  container.appendChild(view);

  // Header
  const header = document.createElement('div');
  header.className = 'sox-view__header';
  header.innerHTML = `
    <h2 class="sox-view__title">SOX Controls</h2>
    <span class="sox-view__subtitle">Execution status by control and month — current year</span>
  `;
  view.appendChild(header);

  // Loading state
  const loadingEl = document.createElement('div');
  loadingEl.className = 'sox-loading';
  loadingEl.textContent = 'Loading data from Jira…';
  view.appendChild(loadingEl);

  let data;
  try {
    data = await fetchSOXControls();
  } catch (err) {
    loadingEl.remove();
    const errEl = document.createElement('div');
    errEl.className = 'sox-error';
    errEl.textContent = err.message === 'NOT_AUTHENTICATED'
      ? 'Not connected to Jira. Use the Connect button in the header to authenticate.'
      : `Error loading SOX data: ${err.message}`;
    view.appendChild(errEl);
    return;
  }

  loadingEl.remove();

  const { controls, monthlyData, monthlyLinks, months, monthLabels } = data;

  // State
  let filterApp   = '';
  let filterTipo  = '';
  let filterFreq  = '';
  let filterMonth = '';
  let filterSearch = '';

  // --- Summary cards ---
  const summaryEl = document.createElement('div');
  summaryEl.className = 'sox-summary';
  summaryEl.id = 'sox-summary';
  view.appendChild(summaryEl);

  // --- Chart ---
  const chartWrap = document.createElement('div');
  chartWrap.className = 'sox-chart-wrap';
  chartWrap.innerHTML = `
    <div class="sox-chart-wrap__title">Control Execution Trend</div>
    <canvas id="soxTrendChart"></canvas>
  `;
  view.appendChild(chartWrap);

  // --- Filters ---
  const filtersEl = document.createElement('div');
  filtersEl.className = 'sox-filters';
  filtersEl.id = 'sox-filters';
  view.appendChild(filtersEl);

  // --- Legend ---
  const legendEl = document.createElement('div');
  legendEl.className = 'sox-legend';
  legendEl.innerHTML = `
    <span>Status:</span>
    ${Object.entries(STATUS_LABEL).filter(([k]) => k !== 'na').map(([k, v]) => `
      <span><span class="sox-legend__dot" style="background:${dotColor(k)}"></span>${v}</span>
    `).join('')}
    <span><span class="sox-legend__dot" style="background:#e5e7eb"></span>N/A</span>
  `;
  view.appendChild(legendEl);

  // --- Table ---
  const tableWrap = document.createElement('div');
  tableWrap.className = 'sox-table-wrap';
  tableWrap.id = 'sox-table-wrap';
  view.appendChild(tableWrap);

  // Populate filters
  buildFilters(filtersEl, controls, months, monthLabels, onChange);

  // Initial render
  refresh();

  function onChange() {
    filterApp    = filtersEl.querySelector('#soxFilterApp')?.value    || '';
    filterTipo   = filtersEl.querySelector('#soxFilterTipo')?.value   || '';
    filterFreq   = filtersEl.querySelector('#soxFilterFreq')?.value   || '';
    filterMonth  = filtersEl.querySelector('#soxFilterMonth')?.value  || '';
    filterSearch = filtersEl.querySelector('#soxFilterSearch')?.value || '';
    refresh();
  }

  function refresh() {
    const filtered = getFiltered(controls, monthlyData, months);
    const visibleIdx = months.map((_, i) => i).filter(i =>
      !filterMonth || monthLabels[i] === filterMonth
    );
    renderSummary(summaryEl, filtered, months, monthLabels, visibleIdx);
    renderChart(filtered, months, monthLabels, visibleIdx);
    renderTable(tableWrap, filtered, months, monthLabels, monthlyLinks, visibleIdx);
  }

  function getFiltered(ctrls, mData, mths) {
    return ctrls
      .map(c => ({ ...c, months: mData[c.id] || mths.map(() => 'na') }))
      .filter(c =>
        (!filterApp    || c.app === filterApp) &&
        (!filterTipo   || tipoCode(c.id) === filterTipo) &&
        (!filterFreq   || c.freq === filterFreq) &&
        (!filterSearch || c.id.toLowerCase().includes(filterSearch.toLowerCase()) ||
                          c.resp.toLowerCase().includes(filterSearch.toLowerCase()))
      );
  }
}

function dotColor(status) {
  return {
    ok: '#27AE60', failed: '#e91e8c', alert: '#8E44AD',
    pending: '#E67E22', tiempo: '#3498DB', delayed: '#DC3545',
  }[status] || '#95A5A6';
}

function buildFilters(el, controls, months, monthLabels, onChange) {
  const apps  = [...new Set(controls.map(c => c.app))].sort();
  const tipos = [...new Set(controls.map(c => tipoCode(c.id)))].sort();
  const freqs = [...new Set(controls.map(c => c.freq))].sort();

  const groups = [
    { id: 'soxFilterApp',    label: 'Application', options: apps },
    { id: 'soxFilterTipo',   label: 'Type',        options: tipos },
    { id: 'soxFilterFreq',   label: 'Frequency',   options: freqs },
    { id: 'soxFilterMonth',  label: 'Month',       options: monthLabels },
  ];

  for (const g of groups) {
    const div = document.createElement('div');
    div.className = 'sox-filter-group';
    const label = document.createElement('label');
    label.htmlFor = g.id;
    label.textContent = g.label;
    const sel = document.createElement('select');
    sel.id = g.id;
    sel.innerHTML = `<option value="">All</option>` +
      g.options.map(o => `<option value="${o}">${o}</option>`).join('');
    sel.addEventListener('change', onChange);
    div.appendChild(label);
    div.appendChild(sel);
    el.appendChild(div);
  }

  // Search
  const searchDiv = document.createElement('div');
  searchDiv.className = 'sox-filter-group';
  searchDiv.innerHTML = `
    <label for="soxFilterSearch">Search</label>
    <input type="text" id="soxFilterSearch" placeholder="ID or owner…">
  `;
  searchDiv.querySelector('input').addEventListener('input', onChange);
  el.appendChild(searchDiv);
}

function renderSummary(el, data, months, monthLabels, visibleIdx) {
  const total = data.length;
  let html = `
    <div class="sox-card sox-card--total">
      <div class="sox-card__label">Total Controls</div>
      <div class="sox-card__value">${total}</div>
      <div class="sox-card__sub">in scope</div>
    </div>
  `;

  for (const i of visibleIdx) {
    const ok      = data.filter(c => c.months[i] === 'ok').length;
    const failed  = data.filter(c => c.months[i] === 'failed').length;
    const issues  = data.filter(c => ['alert','delayed'].includes(c.months[i])).length;
    const pending = data.filter(c => ['pending','tiempo'].includes(c.months[i])).length;
    const pct     = total ? Math.round(ok / total * 100) : 0;
    const hasIssues = failed > 0 || issues > 0;

    if (hasIssues) {
      html += `
        <div class="sox-card sox-card--failed">
          <div class="sox-card__label">${monthLabels[i]}</div>
          <div class="sox-card__value">${failed + issues}</div>
          <div class="sox-card__sub">${failed} failed · ${issues} issues</div>
        </div>
      `;
    } else if (ok > 0) {
      html += `
        <div class="sox-card sox-card--ok">
          <div class="sox-card__label">${monthLabels[i]}</div>
          <div class="sox-card__value">${pct}%</div>
          <div class="sox-card__sub">${ok} OK</div>
        </div>
      `;
    } else {
      html += `
        <div class="sox-card sox-card--warning">
          <div class="sox-card__label">${monthLabels[i]}</div>
          <div class="sox-card__value">${pending}</div>
          <div class="sox-card__sub">on time</div>
        </div>
      `;
    }
  }

  el.innerHTML = html;
}

function renderChart(data, months, monthLabels, visibleIdx) {
  if (!window.Chart) return;
  const canvas = document.getElementById('soxTrendChart');
  if (!canvas) return;

  const labels   = visibleIdx.map(i => monthLabels[i]);
  const mkSeries = (s) => visibleIdx.map(i => data.filter(c => c.months[i] === s).length);
  const mkMulti  = (...ss) => visibleIdx.map(i => data.filter(c => ss.includes(c.months[i])).length);

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  chartInstance = new window.Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'OK',      data: mkSeries('ok'),      borderColor: '#27AE60', backgroundColor: 'rgba(39,174,96,0.08)',   tension: 0.4, pointRadius: 5, fill: true },
        { label: 'Failed',  data: mkSeries('failed'),  borderColor: '#e91e8c', backgroundColor: 'rgba(233,30,140,0.06)',  tension: 0.4, pointRadius: 5, fill: false },
        { label: 'Alert',   data: mkSeries('alert'),   borderColor: '#8E44AD', backgroundColor: 'rgba(142,68,173,0.06)', tension: 0.4, pointRadius: 5, fill: false },
        { label: 'Delayed', data: mkSeries('delayed'), borderColor: '#DC3545', backgroundColor: 'rgba(220,53,69,0.06)',  tension: 0.4, pointRadius: 5, fill: false },
        { label: 'Pending', data: mkMulti('pending','tiempo'), borderColor: '#E67E22', backgroundColor: 'rgba(230,126,34,0.06)', tension: 0.4, pointRadius: 4, fill: false },
        { label: 'N/A',     data: mkSeries('na'),      borderColor: '#95A5A6', backgroundColor: 'rgba(149,165,166,0.04)', tension: 0.4, pointRadius: 3, fill: false },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { size: 11 }, boxWidth: 12 } },
        tooltip: { borderWidth: 1 },
      },
      scales: {
        x: { ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { ticks: { font: { size: 11 }, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
      },
    },
  });
}

function renderTable(wrap, data, months, monthLabels, monthlyLinks, visibleIdx) {
  if (!data.length) {
    wrap.innerHTML = `<div class="sox-no-results">No controls match the selected filters.</div>`;
    return;
  }

  // Build thead
  const staticCols = ['Control ID', 'App', 'Type', 'Frequency', 'Owner'];
  const monthCols  = visibleIdx.map(i =>
    `<th class="sox-month-col">${monthLabels[i].replace(' ', '<br>')}</th>`
  ).join('');

  const thead = `
    <thead>
      <tr>
        ${staticCols.map(c => `<th>${c}</th>`).join('')}
        ${monthCols}
      </tr>
    </thead>
  `;

  // Build tbody
  const rows = data.map(c => {
    const tipo = tipoCode(c.id);
    const cells = visibleIdx.map(i => {
      const s   = c.months[i];
      const url = (monthlyLinks[c.id] || [])[i];
      const cls = CELL_CLASS[s] || 'sox-s-na';
      const lbl = STATUS_LABEL[s] || 'N/A';
      const clickable = s !== 'na' || url;
      const onclick = url
        ? `onclick="window.open('${url}','_blank')" title="Open in Jira"`
        : '';
      return `<td><div class="sox-status-cell ${cls}" ${onclick} style="${!clickable ? 'cursor:default' : ''}">${lbl}</div></td>`;
    }).join('');

    return `
      <tr>
        <td><span class="sox-ctrl-id" title="${c.id}">${c.id}</span></td>
        <td><span class="sox-badge sox-badge--app">${c.app}</span></td>
        <td><span class="sox-badge sox-badge--${tipo}">${tipo}</span></td>
        <td style="font-size:var(--font-size-small);color:var(--color-text-secondary)">${c.freq}</td>
        <td style="font-size:var(--font-size-small);color:var(--color-text-secondary)">${c.resp}</td>
        ${cells}
      </tr>
    `;
  }).join('');

  wrap.innerHTML = `
    <table class="sox-table">
      ${thead}
      <tbody>${rows}</tbody>
    </table>
  `;
}
