/**
 * SOX Controls — View renderer
 * Renders the full SOX controls dashboard within the Integraciones app.
 *
 * Accepts pre-loaded data from app.js (which handles caching and fetching),
 * following the same pattern as compliance-view.js.
 *
 * @param {HTMLElement} container
 * @param {object|null} soxData  - { controls, monthlyData, monthlyLinks, months, monthLabels }
 * @param {boolean}     isLive   - whether Jira is currently connected
 * @param {string|null} snapshotDate - ISO date of last successful fetch
 */

import { t } from '../i18n.js';

function getStatusLabel() {
  return {
    ok:      t('sox.ok'),
    failed:  t('sox.failed'),
    alert:   t('sox.alert'),
    pending: t('sox.pending'),
    tiempo:  t('sox.onTime'),
    delayed: t('sox.delayed'),
    na:      t('sox.na'),
  };
}

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
export function renderSOXView(container, soxData, isLive, snapshotDate) {
  container.innerHTML = '';

  const view = document.createElement('div');
  view.className = 'sox-view';
  container.appendChild(view);

  // Header
  const header = document.createElement('div');
  header.className = 'sox-view__header';
  header.innerHTML = `
    <h2 class="sox-view__title">${t('sox.title')}</h2>
    <span class="sox-view__subtitle">${t('sox.subtitle')}</span>
  `;
  view.appendChild(header);

  // ── No data at all (never fetched + offline) ──────────────────────────────
  if (!soxData) {
    const msgEl = document.createElement('div');
    msgEl.className = 'sox-error';
    msgEl.textContent = t('sox.notConnected');
    view.appendChild(msgEl);
    return;
  }

  // ── Snapshot banner when showing stale data ───────────────────────────────
  if (!isLive && snapshotDate) {
    const d = new Date(snapshotDate);
    const formatted = d.toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const banner = document.createElement('div');
    banner.className = 'snapshot-banner snapshot-banner--inline';
    banner.innerHTML = `
      <span class="snapshot-banner__icon">📅</span>
      <span class="snapshot-banner__text">${t('header.snapshotData', { date: `<strong>${formatted}</strong>` })}</span>
    `;
    view.appendChild(banner);
  }

  const { controls, monthlyData, monthlyLinks, months, monthLabels } = soxData;

  // State
  let filterApp    = '';
  let filterTipo   = '';
  let filterFreq   = '';
  let filterMonth  = '';
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
    <div class="sox-chart-wrap__title">${t('sox.trend')}</div>
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
  const STATUS_LABEL_NOW = getStatusLabel();
  legendEl.innerHTML = `
    <span>${t('sox.statusLabel')}</span>
    ${Object.entries(STATUS_LABEL_NOW).filter(([k]) => k !== 'na').map(([k, v]) => `
      <span><span class="sox-legend__dot" style="background:${dotColor(k)}"></span>${v}</span>
    `).join('')}
    <span><span class="sox-legend__dot" style="background:#e5e7eb"></span>${t('sox.na')}</span>
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
    const filtered  = getFiltered(controls, monthlyData, months);
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
    { id: 'soxFilterApp',   label: t('sox.filterApp'),   options: apps },
    { id: 'soxFilterTipo',  label: t('sox.filterType'),  options: tipos },
    { id: 'soxFilterFreq',  label: t('sox.filterFreq'),  options: freqs },
    { id: 'soxFilterMonth', label: t('sox.filterMonth'), options: monthLabels },
  ];

  for (const g of groups) {
    const div = document.createElement('div');
    div.className = 'sox-filter-group';
    const label = document.createElement('label');
    label.htmlFor = g.id;
    label.textContent = g.label;
    const sel = document.createElement('select');
    sel.id = g.id;
    sel.innerHTML = `<option value="">${t('common.all')}</option>` +
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
    <label for="soxFilterSearch">${t('sox.filterSearch')}</label>
    <input type="text" id="soxFilterSearch" placeholder="${t('sox.filterSearchPlaceholder')}">
  `;
  searchDiv.querySelector('input').addEventListener('input', onChange);
  el.appendChild(searchDiv);
}

/* ── SVG donut helpers ─────────────────────────────────────────────────── */

const STATUS_COLORS = {
  ok:      '#27AE60',
  failed:  '#e91e8c',
  alert:   '#8E44AD',
  delayed: '#DC3545',
  pending: '#E67E22',
  tiempo:  '#3498DB',
  na:      '#CBD5E1',
};

/**
 * Build an SVG donut chart for the given segments.
 * @param {Array<{value:number, color:string}>} segments
 * @param {string} centerText  — shown in the middle
 */
function buildDonut(segments, centerText) {
  const SIZE = 100, CX = 50, CY = 50, R = 38, r = 24;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.setAttribute('class', 'sox-donut');

  if (total === 0) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', CX); circle.setAttribute('cy', CY);
    circle.setAttribute('r', (R + r) / 2);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', '#e2e8f0');
    circle.setAttribute('stroke-width', R - r);
    svg.appendChild(circle);
  } else {
    const nonZero = segments.filter(s => s.value > 0);
    if (nonZero.length === 1) {
      // Full ring
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', CX); ring.setAttribute('cy', CY);
      ring.setAttribute('r', (R + r) / 2);
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', nonZero[0].color);
      ring.setAttribute('stroke-width', R - r);
      svg.appendChild(ring);
    } else {
      let angle = -Math.PI / 2;
      for (const seg of nonZero) {
        const sweep = (seg.value / total) * 2 * Math.PI;
        const end   = angle + sweep;
        const x1 = CX + R * Math.cos(angle),  y1 = CY + R * Math.sin(angle);
        const x2 = CX + R * Math.cos(end),    y2 = CY + R * Math.sin(end);
        const ix1= CX + r * Math.cos(end),    iy1= CY + r * Math.sin(end);
        const ix2= CX + r * Math.cos(angle),  iy2= CY + r * Math.sin(angle);
        const large = sweep > Math.PI ? 1 : 0;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${ix1} ${iy1} A${r} ${r} 0 ${large} 0 ${ix2} ${iy2} Z`);
        path.setAttribute('fill', seg.color);
        svg.appendChild(path);
        angle = end;
      }
    }
  }

  // Centre label
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', CX); text.setAttribute('y', CY + 5);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', '16');
  text.setAttribute('font-weight', 'bold');
  text.setAttribute('fill', 'currentColor');
  text.textContent = centerText;
  svg.appendChild(text);

  return svg;
}

/* ── renderSummary ─────────────────────────────────────────────────────── */

function renderSummary(el, data, months, monthLabels, visibleIdx) {
  el.textContent = '';

  const total = data.length;

  // ── Total card (no donut, just the number) ────────────────────────────
  const totalCard = document.createElement('div');
  totalCard.className = 'sox-card sox-card--total';
  totalCard.innerHTML = `
    <div class="sox-card__label">${t('sox.totalControls')}</div>
    <div class="sox-card__total-num">${total}</div>
    <div class="sox-card__sub">${t('sox.inScope')}</div>
  `;
  el.appendChild(totalCard);

  // ── One donut card per visible month ──────────────────────────────────
  for (const i of visibleIdx) {
    const counts = {
      ok:      data.filter(c => c.months[i] === 'ok').length,
      failed:  data.filter(c => c.months[i] === 'failed').length,
      alert:   data.filter(c => c.months[i] === 'alert').length,
      delayed: data.filter(c => c.months[i] === 'delayed').length,
      pending: data.filter(c => ['pending','tiempo'].includes(c.months[i])).length,
      na:      data.filter(c => c.months[i] === 'na').length,
    };

    const hasProblems = counts.failed > 0 || counts.alert > 0 || counts.delayed > 0;
    const cardClass   = hasProblems ? 'sox-card--failed' : counts.ok > 0 ? 'sox-card--ok' : 'sox-card--warning';

    // Centre text: % OK if any passed, else pending count
    const pct        = total ? Math.round(counts.ok / total * 100) : 0;
    const centerText = counts.ok > 0 ? `${pct}%` : String(counts.pending + counts.na);

    // Segments — only non-zero, in a meaningful order
    const segments = [
      { key: 'ok',      value: counts.ok },
      { key: 'pending', value: counts.pending },
      { key: 'delayed', value: counts.delayed },
      { key: 'alert',   value: counts.alert },
      { key: 'failed',  value: counts.failed },
      { key: 'na',      value: counts.na },
    ].map(s => ({ ...s, color: STATUS_COLORS[s.key] }));

    const card = document.createElement('div');
    card.className = `sox-card ${cardClass}`;

    const lbl = document.createElement('div');
    lbl.className = 'sox-card__label';
    lbl.textContent = monthLabels[i];
    card.appendChild(lbl);

    card.appendChild(buildDonut(segments, centerText));

    // Legend rows — only non-zero statuses
    const legendWrap = document.createElement('div');
    legendWrap.className = 'sox-card__pie-legend';
    for (const seg of segments.filter(s => s.value > 0)) {
      const row = document.createElement('div');
      row.className = 'sox-card__pie-row';
      row.innerHTML = `
        <span class="sox-card__pie-dot" style="background:${seg.color}"></span>
        <span class="sox-card__pie-num">${seg.value}</span>
        <span class="sox-card__pie-lbl">${getStatusLabel()[seg.key] ?? seg.key}</span>
      `;
      legendWrap.appendChild(row);
    }
    card.appendChild(legendWrap);

    el.appendChild(card);
  }
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
        { label: t('sox.ok'),      data: mkSeries('ok'),               borderColor: '#27AE60', backgroundColor: 'rgba(39,174,96,0.08)',   tension: 0.4, pointRadius: 5, fill: true },
        { label: t('sox.failed'),  data: mkSeries('failed'),           borderColor: '#e91e8c', backgroundColor: 'rgba(233,30,140,0.06)',  tension: 0.4, pointRadius: 5, fill: false },
        { label: t('sox.alert'),   data: mkSeries('alert'),            borderColor: '#8E44AD', backgroundColor: 'rgba(142,68,173,0.06)', tension: 0.4, pointRadius: 5, fill: false },
        { label: t('sox.delayed'), data: mkSeries('delayed'),          borderColor: '#DC3545', backgroundColor: 'rgba(220,53,69,0.06)',  tension: 0.4, pointRadius: 5, fill: false },
        { label: t('sox.pending'), data: mkMulti('pending','tiempo'),  borderColor: '#E67E22', backgroundColor: 'rgba(230,126,34,0.06)', tension: 0.4, pointRadius: 4, fill: false },
        { label: t('sox.na'),      data: mkSeries('na'),               borderColor: '#95A5A6', backgroundColor: 'rgba(149,165,166,0.04)', tension: 0.4, pointRadius: 3, fill: false },
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
    wrap.innerHTML = `<div class="sox-no-results">${t('sox.noResults')}</div>`;
    return;
  }

  const staticCols = [t('sox.colId'), t('sox.colApp'), t('sox.colType'), t('sox.colFreq'), t('sox.colOwner')];
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

  const STATUS_LABEL = getStatusLabel();
  const rows = data.map(c => {
    const tipo  = tipoCode(c.id);
    const cells = visibleIdx.map(i => {
      const s   = c.months[i];
      const url = (monthlyLinks[c.id] || [])[i];
      const cls = CELL_CLASS[s] || 'sox-s-na';
      const lbl = STATUS_LABEL[s] || t('sox.na');
      const onclick = url
        ? `onclick="window.open('${url}','_blank')" title="${t('sox.openInJira')}"`
        : '';
      return `<td><div class="sox-status-cell ${cls}" ${onclick}>${lbl}</div></td>`;
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
