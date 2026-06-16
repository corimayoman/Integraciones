/**
 * SOX Report — PDF generation, priority matrix analysis, and email delivery.
 *
 * PDF is built with jsPDF (loaded lazily from CDN) + html2canvas for charts.
 * Email is sent via Gmail API using the user's Google OAuth token.
 */

import { t } from '../i18n.js';
import { getGoogleUser, getGoogleAccessToken } from '../firebase-auth.js';

const JIRA_BASE = 'https://globant.atlassian.net/browse';
const DASHBOARD_URL = 'https://prj-istsecintegration-gp-5s.web.app/#/sox';

const STATUS_SCORE = { ok: 3, tiempo: 2, pending: 1, alert: -1, delayed: -2, failed: -3, na: 0 };
const STATUS_COLOR = {
  ok: '#27AE60', failed: '#e91e8c', alert: '#8E44AD',
  delayed: '#DC3545', pending: '#E67E22', tiempo: '#3498DB', na: '#94A3B8',
};
const STATUS_LABEL_EN = {
  ok: 'OK', failed: 'Failed', alert: 'Alert',
  delayed: 'Delayed', pending: 'Pending', tiempo: 'On Time', na: 'N/A',
};

// ── Priority matrix ───────────────────────────────────────────────────────────

/**
 * Compute severity + impact scores for every control and assign quadrants.
 *
 * Severity: sum of status scores over the last 3 months (or all if < 3).
 *   Negative = bad. Clamped so perfectly-OK controls don't crowd the chart.
 * Impact: percentage points gained if this control reaches OK every month.
 *   = (non-OK months / total months) * (1 / total controls) * 100
 *
 * Quadrants (severity low = bad, high = good):
 *   severity < threshold AND impact > threshold → Q1: Critical (resolve now)
 *   severity < threshold AND impact <= threshold → Q2: Escalate
 *   severity >= threshold AND impact > threshold → Q3: Quick win
 *   severity >= threshold AND impact <= threshold → Q4: Monitor
 */
export function computePriorityMatrix(controls, monthlyData, months) {
  const total = controls.length;
  if (!total) return [];

  const WINDOW = Math.min(3, months.length);
  const recentIdx = months.slice(-WINDOW).map((_, i) => months.length - WINDOW + i);

  const scored = controls.map(ctrl => {
    const statuses = monthlyData[ctrl.id] ?? months.map(() => 'na');

    // Severity: average score over recent window
    const recentStatuses = recentIdx.map(i => statuses[i] ?? 'na');
    const severityScore  = recentStatuses.reduce((s, st) => s + (STATUS_SCORE[st] ?? 0), 0) / WINDOW;

    // Consecutive non-OK months (all time)
    let consecutiveBad = 0;
    for (let i = statuses.length - 1; i >= 0; i--) {
      const s = statuses[i];
      if (s === 'na') continue;
      if (s === 'ok' || s === 'tiempo') break;
      consecutiveBad++;
    }

    // Impact: how many non-OK months in the window
    const nonOkInWindow = recentStatuses.filter(s => s !== 'ok' && s !== 'tiempo' && s !== 'na').length;
    const impactScore   = (nonOkInWindow / WINDOW) * (1 / total) * 100;

    // Latest status
    const latestStatus = [...statuses].reverse().find(s => s !== 'na') ?? 'na';

    return {
      ...ctrl,
      statuses,
      severityScore,
      impactScore,
      consecutiveBad,
      latestStatus,
      nonOkInWindow,
    };
  });

  // Thresholds: median of each axis
  const severities = scored.map(c => c.severityScore).sort((a, b) => a - b);
  const impacts    = scored.map(c => c.impactScore).sort((a, b) => a - b);
  const midSev     = severities[Math.floor(severities.length / 2)];
  const midImp     = impacts[Math.floor(impacts.length / 2)];

  return scored.map(c => {
    let quadrant;
    if (c.severityScore < midSev && c.impactScore > midImp)       quadrant = 'critical';
    else if (c.severityScore < midSev && c.impactScore <= midImp) quadrant = 'escalate';
    else if (c.severityScore >= midSev && c.impactScore > midImp) quadrant = 'quickwin';
    else                                                            quadrant = 'monitor';
    return { ...c, quadrant };
  });
}

/**
 * Build a human-readable action summary from the priority matrix.
 */
export function buildActionSummary(matrix, months) {
  const critical  = matrix.filter(c => c.quadrant === 'critical');
  const escalate  = matrix.filter(c => c.quadrant === 'escalate');
  const quickwins = matrix.filter(c => c.quadrant === 'quickwin');
  const total     = matrix.length;
  const notOk     = matrix.filter(c => c.latestStatus !== 'ok' && c.latestStatus !== 'tiempo' && c.latestStatus !== 'na').length;
  const okCount   = total - notOk;
  const currentPct = total ? Math.round(okCount / total * 100) : 0;
  const targetGain = total ? Math.round(notOk / total * 100) : 0;

  const byOwner = {};
  for (const c of [...critical, ...escalate]) {
    if (!byOwner[c.resp]) byOwner[c.resp] = 0;
    byOwner[c.resp]++;
  }
  const topOwners = Object.entries(byOwner)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, n]) => `${name} (${n})`)
    .join(', ');

  const lines = [];
  lines.push(`Current compliance rate: ${currentPct}% (${okCount}/${total} controls OK). Resolving all non-OK controls would add ${targetGain} percentage points to reach 100%.`);
  if (critical.length)  lines.push(`${critical.length} control${critical.length > 1 ? 's' : ''} are CRITICAL (high severity + high impact) and require immediate action: ${critical.slice(0, 5).map(c => c.id).join(', ')}${critical.length > 5 ? '…' : ''}.`);
  if (escalate.length)  lines.push(`${escalate.length} control${escalate.length > 1 ? 's' : ''} should be escalated (high severity, moderate impact): ${escalate.slice(0, 5).map(c => c.id).join(', ')}${escalate.length > 5 ? '…' : ''}.`);
  if (quickwins.length) lines.push(`${quickwins.length} quick win${quickwins.length > 1 ? 's' : ''} identified (low severity, high impact) — resolving these would have outsized effect on the score: ${quickwins.slice(0, 5).map(c => c.id).join(', ')}${quickwins.length > 5 ? '…' : ''}.`);
  if (topOwners)        lines.push(`Owners with most critical/escalated controls: ${topOwners}.`);

  return lines.join('\n\n');
}

// ── PDF generation ────────────────────────────────────────────────────────────

async function loadLibs() {
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  if (!window.html2canvas) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
}

const QUADRANT_COLORS = {
  critical: '#e91e8c',
  escalate: '#DC3545',
  quickwin: '#27AE60',
  monitor:  '#94A3B8',
};
const QUADRANT_LABELS = {
  critical: '🔴 Critical — Resolve Now',
  escalate: '🟠 Escalate',
  quickwin: '🟢 Quick Win',
  monitor:  '⚪ Monitor',
};

/**
 * Generate a PDF report and return it as a Uint8Array blob.
 *
 * @param {object} opts
 * @param {object} opts.soxData
 * @param {object[]} opts.filteredControls  — controls after current filters
 * @param {number[]} opts.visibleIdx        — month indices currently shown
 * @param {object[]} opts.matrix            — output of computePriorityMatrix
 * @param {string}   opts.actionSummary
 * @param {object}   opts.activeFilters     — { app, tipo, freq, month, search }
 * @param {string|null} opts.snapshotDate
 */
export async function generateSOXReportPDF(opts) {
  await loadLibs();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const { filteredControls, visibleIdx, matrix, actionSummary, activeFilters, soxData, snapshotDate } = opts;
  const { monthlyData, monthlyLinks, monthLabels } = soxData;

  const PAGE_W = 210, PAGE_H = 297, MARGIN = 14;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── helpers ─────────────────────────────────────────────────────────────────
  function checkPage(needed = 10) {
    if (y + needed > PAGE_H - MARGIN) { doc.addPage(); y = MARGIN; }
  }

  function heading1(text) {
    checkPage(14);
    doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(15, 23, 42);
    doc.text(text, MARGIN, y);
    y += 8;
    doc.setDrawColor(89, 130, 249).setLineWidth(0.4);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
  }

  function heading2(text, color = [15, 23, 42]) {
    checkPage(10);
    doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(...color);
    doc.text(text, MARGIN, y);
    y += 6;
  }

  function body(text, indent = 0) {
    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(text, CONTENT_W - indent);
    for (const line of lines) {
      checkPage(5);
      doc.text(line, MARGIN + indent, y);
      y += 4.5;
    }
  }

  function chip(text, bgRgb, x, chipY, w = 28) {
    doc.setFillColor(...bgRgb).roundedRect(x, chipY - 3.5, w, 5.5, 1, 1, 'F');
    doc.setFontSize(7).setFont('helvetica', 'bold').setTextColor(255, 255, 255);
    doc.text(text, x + w / 2, chipY, { align: 'center' });
  }

  // ── Cover / Header ──────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42).rect(0, 0, PAGE_W, 36, 'F');
  doc.setFontSize(20).setFont('helvetica', 'bold').setTextColor(255, 255, 255);
  doc.text('SOX Controls Report', MARGIN, 18);
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(148, 163, 184);
  doc.text(`Generated: ${today}`, MARGIN, 26);
  if (snapshotDate) {
    const snap = new Date(snapshotDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`Data snapshot: ${snap}`, MARGIN, 31);
  }
  // Dashboard link
  doc.setTextColor(96, 165, 250);
  doc.textWithLink('View Dashboard →', PAGE_W - MARGIN - 30, 26, { url: DASHBOARD_URL });
  y = 44;

  // Active filters
  const filterParts = [];
  if (activeFilters.app)    filterParts.push(`App: ${activeFilters.app}`);
  if (activeFilters.tipo)   filterParts.push(`Type: ${activeFilters.tipo}`);
  if (activeFilters.freq)   filterParts.push(`Freq: ${activeFilters.freq}`);
  if (activeFilters.month)  filterParts.push(`Month: ${activeFilters.month}`);
  if (activeFilters.search) filterParts.push(`Search: "${activeFilters.search}"`);
  if (filterParts.length) {
    doc.setFontSize(8).setFont('helvetica', 'italic').setTextColor(100, 116, 139);
    doc.text(`Filters applied: ${filterParts.join(' · ')}`, MARGIN, y);
    y += 6;
  }
  y += 2;

  // ── Summary KPIs ────────────────────────────────────────────────────────────
  heading1('Executive Summary');

  const lastIdx = visibleIdx[visibleIdx.length - 1] ?? (soxData.months.length - 1);
  const counts = {};
  for (const s of ['ok', 'failed', 'alert', 'delayed', 'pending', 'tiempo', 'na']) {
    counts[s] = filteredControls.filter(c => (monthlyData[c.id] ?? [])[lastIdx] === s).length;
  }
  const totalCtrl = filteredControls.length;
  const okTotal   = counts.ok + counts.tiempo;
  const pct       = totalCtrl ? Math.round(okTotal / totalCtrl * 100) : 0;
  const lastLabel = monthLabels[lastIdx] ?? '';

  const kpis = [
    { label: 'Total Controls',   value: String(totalCtrl),             bg: [30, 41, 59] },
    { label: `OK (${lastLabel})`, value: `${okTotal} (${pct}%)`,       bg: [21, 128, 61] },
    { label: 'Failed',           value: String(counts.failed),         bg: [185, 28, 28] },
    { label: 'Alert',            value: String(counts.alert),          bg: [109, 40, 217] },
    { label: 'Delayed',          value: String(counts.delayed),        bg: [185, 28, 28] },
    { label: 'Pending',          value: String(counts.pending + counts.tiempo), bg: [154, 52, 18] },
  ];

  const kpiW  = CONTENT_W / kpis.length;
  const kpiY0 = y;
  for (let i = 0; i < kpis.length; i++) {
    const kpi = kpis[i];
    const kx  = MARGIN + i * kpiW;
    doc.setFillColor(...kpi.bg).roundedRect(kx, kpiY0, kpiW - 2, 18, 2, 2, 'F');
    doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(255, 255, 255);
    doc.text(kpi.value, kx + (kpiW - 2) / 2, kpiY0 + 9, { align: 'center' });
    doc.setFontSize(6.5).setFont('helvetica', 'normal').setTextColor(203, 213, 225);
    doc.text(kpi.label, kx + (kpiW - 2) / 2, kpiY0 + 14.5, { align: 'center' });
  }
  y = kpiY0 + 22;

  // ── Trend chart ─────────────────────────────────────────────────────────────
  const chartCanvas = document.getElementById('soxTrendChart');
  if (chartCanvas) {
    heading1('Control Execution Trend');
    const imgData = chartCanvas.toDataURL('image/png');
    const chartH  = Math.round(CONTENT_W * 0.42);
    checkPage(chartH + 5);
    doc.addImage(imgData, 'PNG', MARGIN, y, CONTENT_W, chartH);
    y += chartH + 6;
  }

  // ── Priority matrix ─────────────────────────────────────────────────────────
  heading1('Priority Matrix & Recommended Actions');
  body(actionSummary);
  y += 3;

  for (const q of ['critical', 'escalate', 'quickwin', 'monitor']) {
    const group = matrix.filter(c => c.quadrant === q);
    if (!group.length) continue;
    checkPage(12);

    const hexToRgb = hex => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    heading2(QUADRANT_LABELS[q], hexToRgb(QUADRANT_COLORS[q]));

    for (const ctrl of group) {
      checkPage(7);
      const jiraUrl = (Object.values(monthlyLinks[ctrl.id] ?? {}).find(u => u)) ?? null;
      doc.setFontSize(8.5).setFont('helvetica', 'bold').setTextColor(15, 23, 42);
      if (jiraUrl) {
        doc.textWithLink(ctrl.id, MARGIN + 3, y, { url: jiraUrl });
      } else {
        doc.text(ctrl.id, MARGIN + 3, y);
      }
      doc.setFont('helvetica', 'normal').setTextColor(71, 85, 105);
      doc.text(`${ctrl.resp}  ·  ${ctrl.app}  ·  Latest: ${STATUS_LABEL_EN[ctrl.latestStatus] ?? ctrl.latestStatus}  ·  ${ctrl.consecutiveBad} month(s) non-OK`, MARGIN + 38, y);
      y += 5;
    }
    y += 2;
  }

  // ── Controls table ──────────────────────────────────────────────────────────
  heading1('Controls Detail');

  const staticW = [28, 18, 12, 18, 36]; // ID, App, Type, Freq, Owner
  const monthW  = visibleIdx.length > 0
    ? Math.min(18, (CONTENT_W - staticW.reduce((a,b)=>a+b,0)) / visibleIdx.length)
    : 18;

  const colHeaders = ['Control ID', 'App', 'Type', 'Freq', 'Owner', ...visibleIdx.map(i => monthLabels[i] ?? '')];
  const colWidths  = [...staticW, ...visibleIdx.map(() => monthW)];

  // Table header row
  checkPage(8);
  doc.setFillColor(15, 23, 42);
  let rowX = MARGIN;
  for (let i = 0; i < colHeaders.length; i++) {
    doc.rect(rowX, y - 4, colWidths[i], 7, 'F');
    doc.setFontSize(7).setFont('helvetica', 'bold').setTextColor(255, 255, 255);
    doc.text(colHeaders[i].slice(0, 12), rowX + 1, y);
    rowX += colWidths[i];
  }
  y += 4;

  // Data rows
  for (let ri = 0; ri < filteredControls.length; ri++) {
    const ctrl = filteredControls[ri];
    checkPage(7);

    const rowBg = ri % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
    const statuses = monthlyData[ctrl.id] ?? soxData.months.map(() => 'na');

    rowX = MARGIN;
    doc.setFillColor(...rowBg).rect(MARGIN, y - 3.5, CONTENT_W, 6.5, 'F');

    const staticVals = [ctrl.id, ctrl.app, ctrl.id.split('.')[2] ?? '', ctrl.freq, ctrl.resp];
    for (let i = 0; i < staticVals.length; i++) {
      doc.setFontSize(7).setFont('helvetica', i === 0 ? 'bold' : 'normal').setTextColor(15, 23, 42);
      const txt = staticVals[i].length > 16 ? staticVals[i].slice(0, 15) + '…' : staticVals[i];
      if (i === 0) {
        const jiraUrl = (Object.values(monthlyLinks[ctrl.id] ?? {}).find(u => u)) ?? null;
        if (jiraUrl) doc.textWithLink(txt, rowX + 1, y, { url: jiraUrl });
        else doc.text(txt, rowX + 1, y);
      } else {
        doc.text(txt, rowX + 1, y);
      }
      rowX += colWidths[i];
    }

    for (let mi = 0; mi < visibleIdx.length; mi++) {
      const idx = visibleIdx[mi];
      const s   = statuses[idx] ?? 'na';
      const col = STATUS_COLOR[s] ?? '#94A3B8';
      const rgb = [parseInt(col.slice(1,3),16), parseInt(col.slice(3,5),16), parseInt(col.slice(5,7),16)];
      chip(STATUS_LABEL_EN[s] ?? s, rgb, rowX + 0.5, y, monthW - 1);
      rowX += colWidths[staticVals.length + mi];
    }
    y += 6.5;
  }

  y += 4;

  // ── Footer ──────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(148, 163, 184);
    doc.text(`SOX Controls Report · ${today} · Page ${p} of ${pageCount}`, PAGE_W / 2, PAGE_H - 6, { align: 'center' });
    doc.textWithLink('IST Sec Integration Dashboard', PAGE_W - MARGIN, PAGE_H - 6, { url: DASHBOARD_URL, align: 'right' });
  }

  return doc.output('arraybuffer');
}

// ── Email with PDF attachment ─────────────────────────────────────────────────

function toBase64Url(ab) {
  const bytes = new Uint8Array(ab);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildAttachmentMime({ from, to, subject, bodyHtml, pdfArrayBuffer, pdfFilename }) {
  const boundary = `sox_report_${Date.now()}`;
  const pdfB64   = toBase64Url(pdfArrayBuffer)
    .replace(/-/g, '+').replace(/_/g, '/'); // standard base64 for MIME parts

  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Cc: ${from}`,
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    bodyHtml,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${pdfFilename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    '',
    pdfB64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const encoder = new TextEncoder();
  const bytes   = encoder.encode(mime);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendSOXReportEmail({ to, subject, bodyHtml, pdfArrayBuffer, pdfFilename }) {
  const senderEmail = getGoogleUser()?.email;
  const accessToken = getGoogleAccessToken();
  if (!senderEmail || !accessToken) throw new Error('Not signed in');

  const raw = buildAttachmentMime({ from: senderEmail, to, subject, bodyHtml, pdfArrayBuffer, pdfFilename });

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Gmail API error ${res.status}`);
  }
}
