/**
 * Compliance View — G4G Compliance Dashboard
 *
 * Renders a dashboard with 3 dimensions: SOX (5 sub-dims), Compliance, GIST.
 * Shows task completion vs due-date tracking per initiative/epic.
 *
 * @module compliance-view
 */

import { computeStats, transformComplianceData, groupTasksByStatus } from '../business/compliance-transformer.js';
import { t } from '../i18n.js';
import { getGoogleUser, isAdmin, getGoogleAccessToken, refreshGoogleToken } from '../firebase-auth.js';
import { parseComplianceCSV } from '../data/compliance-csv.js';
import { PROXY_BASE_URL } from '../constants.js';

async function lookupAssigneeEmail(accountId) {
  const res = await fetch(`/api/jira/user-email?accountId=${encodeURIComponent(accountId)}`);
  if (!res.ok) return null;
  const { email } = await res.json();
  return email ?? null;
}

function toAsciiSubject(str) {
  return str
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/·/g, '-')
    .replace(/[^\x00-\x7F]/g, '');
}

function buildMimeEmail({ from, to, cc, subject, body }) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    `Subject: ${toAsciiSubject(subject)}`,
    '',
    body,
  ];
  return btoa(unescape(encodeURIComponent(lines.join('\r\n'))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


async function callGmailSend(accessToken, raw) {
  return fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
}

async function sendGmailEmail({ subject, htmlBody, to, cc }) {
  const senderEmail = getGoogleUser()?.email;
  let accessToken   = getGoogleAccessToken();
  if (!senderEmail || !accessToken) throw new Error('Not signed in');

  const raw = buildMimeEmail({ from: senderEmail, to, cc: cc ?? senderEmail, subject, body: htmlBody });

  let res = await callGmailSend(accessToken, raw);

  // Token expired — refresh silently and retry once
  if (res.status === 401) {
    accessToken = await refreshGoogleToken();
    res = await callGmailSend(accessToken, raw);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Gmail API error ${res.status}`);
  }
}

function showEmailPreviewModal({ subject, htmlBody, toEmail, ccEmail, onSend, onCancel }) {
  // Remove any existing modal
  document.getElementById('email-preview-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'email-preview-modal';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);
    display:flex;align-items:center;justify-content:center;padding:16px;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background:var(--bg-card,#1e1e2e);color:var(--text-primary,#cdd6f4);
    border-radius:10px;border:1px solid var(--border,#45475a);
    width:100%;max-width:680px;max-height:90vh;display:flex;flex-direction:column;
    box-shadow:0 8px 32px rgba(0,0,0,.5);overflow:hidden;
  `;

  const header = document.createElement('div');
  header.style.cssText = 'padding:16px 20px;border-bottom:1px solid var(--border,#45475a);display:flex;justify-content:space-between;align-items:center;';
  header.innerHTML = `<strong style="font-size:1rem">Email Preview</strong>`;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'background:none;border:none;color:inherit;font-size:1.1rem;cursor:pointer;padding:4px 8px;';
  closeBtn.addEventListener('click', () => { overlay.remove(); onCancel?.(); });
  header.appendChild(closeBtn);

  const unresolved = !toEmail || toEmail === '(could not resolve)';

  const meta = document.createElement('div');
  meta.style.cssText = 'padding:12px 20px;border-bottom:1px solid var(--border,#45475a);font-size:.85rem;line-height:1.8;background:var(--bg-sidebar,#181825);';

  const toInput = document.createElement('input');
  toInput.type = 'email';
  toInput.value = unresolved ? '' : toEmail;
  toInput.placeholder = 'recipient@globant.com';
  toInput.style.cssText = `
    background:var(--bg-card,#1e1e2e);color:var(--text-primary,#cdd6f4);
    border:1px solid ${unresolved ? '#f38ba8' : 'var(--border,#45475a)'};
    border-radius:4px;padding:3px 8px;font-size:.85rem;width:280px;
  `;

  const toRow = document.createElement('div');
  toRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
  toRow.innerHTML = `<span style="color:var(--text-muted,#6c7086);min-width:60px;">To:</span>`;
  toRow.appendChild(toInput);
  if (unresolved) {
    const warn = document.createElement('span');
    warn.textContent = 'Email not resolved — enter manually';
    warn.style.cssText = 'color:#f38ba8;font-size:.78rem;';
    toRow.appendChild(warn);
  }

  meta.appendChild(toRow);

  const ccInput = document.createElement('input');
  ccInput.type = 'text';
  ccInput.value = ccEmail;
  ccInput.placeholder = 'cc1@globant.com, cc2@globant.com';
  ccInput.style.cssText = `
    background:var(--bg-card,#1e1e2e);color:var(--text-primary,#cdd6f4);
    border:1px solid var(--border,#45475a);
    border-radius:4px;padding:3px 8px;font-size:.85rem;width:340px;
  `;

  const ccRow = document.createElement('div');
  ccRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:4px;';
  ccRow.innerHTML = `<span style="color:var(--text-muted,#6c7086);min-width:60px;">CC:</span>`;
  ccRow.appendChild(ccInput);

  const ccHint = document.createElement('span');
  ccHint.textContent = 'separate multiple with commas';
  ccHint.style.cssText = 'color:var(--text-muted,#6c7086);font-size:.75rem;';
  ccRow.appendChild(ccHint);

  meta.appendChild(ccRow);
  meta.insertAdjacentHTML('beforeend', `
    <div style="margin-top:4px;"><span style="color:var(--text-muted,#6c7086);min-width:60px;display:inline-block;">Subject:</span> <strong>${subject}</strong></div>
  `);

  const body = document.createElement('div');
  body.style.cssText = 'flex:1;overflow-y:auto;padding:20px;';
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:100%;min-height:260px;border:none;background:#fff;border-radius:6px;';
  iframe.srcdoc = `<html><body style="font-family:sans-serif;font-size:14px;color:#333;padding:12px;">${htmlBody}</body></html>`;
  body.appendChild(iframe);

  const footer = document.createElement('div');
  footer.style.cssText = 'padding:14px 20px;border-top:1px solid var(--border,#45475a);display:flex;justify-content:flex-end;gap:10px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'padding:8px 20px;border-radius:6px;border:1px solid var(--border,#45475a);background:none;color:inherit;cursor:pointer;font-size:.9rem;';
  cancelBtn.addEventListener('click', () => { overlay.remove(); onCancel?.(); });

  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send Email';
  sendBtn.style.cssText = 'padding:8px 20px;border-radius:6px;border:none;background:#89b4fa;color:#1e1e2e;font-weight:600;cursor:pointer;font-size:.9rem;';
  sendBtn.addEventListener('click', () => {
    const finalTo = toInput.value.trim();
    if (!finalTo) { toInput.style.border = '1px solid #f38ba8'; toInput.focus(); return; }
    const finalCc = ccInput.value.trim() || undefined;
    overlay.remove();
    onSend(finalTo, finalCc);
  });

  footer.appendChild(cancelBtn);
  footer.appendChild(sendBtn);
  modal.appendChild(header);
  modal.appendChild(meta);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  // Close on backdrop click
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); onCancel?.(); } });

  document.body.appendChild(overlay);
}

async function sendReminder(btn, task) {
  const jiraUrl  = `https://globant.atlassian.net/browse/${task.key}`;
  const subject  = `Reminder: ${task.key} - ${task.summary} - due ${task.duedate}`;
  const htmlBody = `
    <p>Hi ${task.assignee ?? 'there'},</p>
    <p>This is a friendly reminder that <a href="${jiraUrl}"><strong>${task.key} · ${task.summary}</strong></a>
    has a due date of <strong>${task.duedate}</strong> and is currently
    in status <strong>${task.status}</strong>.</p>
    <p>Could you please confirm the steps you have in place to meet this deadline,
    or flag any blockers that may affect delivery?</p>
    <p>→ <a href="${jiraUrl}">View ticket in Jira</a></p>
    <p>Sent from the Compliance Dashboard by ${getGoogleUser()?.email ?? ''}.</p>
  `;

  const senderEmail = getGoogleUser()?.email ?? '';
  const assigneeEmail = await lookupAssigneeEmail(task.assigneeAccountId) ?? '(could not resolve)';

  showEmailPreviewModal({
    subject, htmlBody,
    toEmail: assigneeEmail,
    ccEmail: senderEmail,
    onCancel: () => {},
    onSend: async (finalTo, finalCc) => {
      btn.disabled = true;
      btn.textContent = t('compliance.remindSending');
      try {
        await sendGmailEmail({ subject, htmlBody, to: finalTo, cc: finalCc });
        btn.textContent = t('compliance.remindSent');
        btn.classList.add('compliance-remind-btn--sent');
      } catch (err) {
        btn.textContent = t('compliance.remindError');
        btn.classList.add('compliance-remind-btn--error');
        btn.title = err.message;
        btn.disabled = false;
      }
    },
  });
}

async function sendEscalation(btn, task) {
  const jiraUrl     = `https://globant.atlassian.net/browse/${task.key}`;
  const today       = new Date().toISOString().slice(0, 10);
  const msPerDay    = 86_400_000;
  const daysOverdue = Math.floor((Date.parse(today) - Date.parse(task.duedate)) / msPerDay);
  const subject     = `[OVERDUE] ${task.key} - ${task.summary} - ${daysOverdue} days past due`;
  const htmlBody    = `
    <h3>⚠ Overdue Notice — Action Required</h3>
    <p>Hi ${task.assignee ?? 'there'},</p>
    <p><a href="${jiraUrl}"><strong>${task.key} · ${task.summary}</strong></a> was due on
    <strong>${task.duedate}</strong> and is currently <strong>${task.status}</strong>.
    This task is now <strong>${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</strong>
    and may have downstream impact on the compliance program.</p>
    <p>Please take the following actions:</p>
    <ol>
      <li><strong>Document a contingency plan</strong> — describe the steps you will take
      to resolve this, any dependencies, and how downstream risk will be mitigated.</li>
      <li><strong>Commit to a new target date</strong> — provide a revised due date
      with a realistic estimate.</li>
    </ol>
    <p>→ <a href="${jiraUrl}">View ticket in Jira</a></p>
    <p>This notice was sent from the Compliance Dashboard by ${getGoogleUser()?.email ?? ''}.</p>
  `;

  const senderEmail = getGoogleUser()?.email ?? '';
  const assigneeEmail = await lookupAssigneeEmail(task.assigneeAccountId) ?? '(could not resolve)';

  showEmailPreviewModal({
    subject, htmlBody,
    toEmail: assigneeEmail,
    ccEmail: senderEmail,
    onCancel: () => {},
    onSend: async (finalTo, finalCc) => {
      btn.disabled = true;
      btn.textContent = t('compliance.escalateSending');
      try {
        await sendGmailEmail({ subject, htmlBody, to: finalTo, cc: finalCc });
        btn.textContent = t('compliance.escalateSent');
        btn.classList.add('compliance-escalate-btn--sent');
      } catch (err) {
        btn.textContent = t('compliance.escalateError');
        btn.classList.add('compliance-escalate-btn--error');
        btn.title = err.message;
        btn.disabled = false;
      }
    },
  });
}

let isJiraLive = false;

const PRIORITY_COLORS = {
  Critical: '#D32F2F',
  High:     '#F57C00',
  Medium:   '#1976D2',
  Low:      '#388E3C',
};

const SOX_DIM_LABELS = {
  sap:  'SAP',
  ssff: 'SSFF',
  glow: 'Glow',
  aws:  'AWS',
  other: 'Other',
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * @param {HTMLElement} container
 * @param {object|null} complianceModel - output of transformComplianceData
 * @param {boolean} isRefreshing - true while a live fetch is in progress
 * @param {string|null} error
 */
function getTabs() {
  return [
    { id: 'sox',       label: 'SOX' },
    { id: 'internal',  label: t('compliance.internalLabel') },
    { id: 'external',  label: t('compliance.externalLabel') },
    { id: 'soxInfra',  label: t('compliance.soxInfraLabel') },
  ];
}

// Remember the last active tab across re-renders
let _activeTab = 'sox';

export function renderComplianceView(container, complianceModel, isRefreshing, error, jiraLive = false) {
  isJiraLive = jiraLive;
  container.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'compliance-view';

  const titleRow = document.createElement('div');
  titleRow.className = 'compliance-title-row';
  const title = document.createElement('h2');
  title.className = 'compliance-title';
  title.textContent = t('compliance.title');
  titleRow.appendChild(title);

  // CSV upload fallback — only shown when Jira is NOT live
  if (!jiraLive) {
    const uploadWrap = document.createElement('div');
    uploadWrap.className = 'compliance-upload-wrap';

    const hint = document.createElement('span');
    hint.className = 'compliance-upload-hint';
    hint.textContent = t('compliance.uploadHint');
    uploadWrap.appendChild(hint);

    // Remove any stale file input from a previous render
    document.getElementById('compliance-csv-input')?.remove();

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    fileInput.id = 'compliance-csv-input';
    document.body.appendChild(fileInput);

    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'compliance-upload-btn';
    uploadBtn.textContent = t('compliance.uploadBtn');
    uploadBtn.setAttribute('aria-label', t('compliance.uploadBtn'));
    uploadWrap.appendChild(uploadBtn);

    const statusMsg = document.createElement('span');
    statusMsg.className = 'compliance-upload-status';
    uploadWrap.appendChild(statusMsg);

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      uploadBtn.disabled = true;
      statusMsg.textContent = t('compliance.uploading');
      statusMsg.className = 'compliance-upload-status';

      try {
        const text = await file.text();
        const issues = parseComplianceCSV(text);
        statusMsg.textContent = `Parsed ${issues.length} issues…`;

        const res = await fetch(`${PROXY_BASE_URL}/api/compliance/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issues }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        const { count } = await res.json();
        statusMsg.textContent = t('compliance.uploadSuccess', { n: count });
        statusMsg.className = 'compliance-upload-status compliance-upload-status--ok';

        const newModel = transformComplianceData(issues);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('compliance:csv-uploaded', { detail: { model: newModel } }));
        }, 800);
      } catch (err) {
        console.error('CSV upload error:', err);
        statusMsg.textContent = `Error: ${err.message}`;
        statusMsg.className = 'compliance-upload-status compliance-upload-status--error';
        uploadBtn.disabled = false;
      }
    });

    titleRow.appendChild(uploadWrap);
  }

  wrapper.appendChild(titleRow);

  if (error) {
    const errEl = document.createElement('p');
    errEl.className = 'compliance-error';
    errEl.textContent = `Error loading data: ${error}`;
    wrapper.appendChild(errEl);
    container.appendChild(wrapper);
    return;
  }

  if (!complianceModel) {
    const empty = document.createElement('div');
    empty.className = 'compliance-not-connected';
    empty.innerHTML = `
      <p class="compliance-not-connected__title">${t('compliance.noData')}</p>
      <p class="compliance-not-connected__hint">${t('compliance.connectPrompt')}</p>
    `;
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return;
  }

  // --- Tab bar ---
  const tabBar = document.createElement('div');
  tabBar.className = 'compliance-tab-bar';
  tabBar.setAttribute('role', 'tablist');

  const panels = {
    sox:      buildSoxSection(complianceModel.sox),
    internal: buildOffenseTabSection(t('compliance.internalLabel'), complianceModel.internal),
    external: buildOffenseTabSection(t('compliance.externalLabel'), complianceModel.external),
    soxInfra: buildOffenseTabSection(t('compliance.soxInfraLabel'), complianceModel.soxInfra),
  };

  const tabEls = {};
  for (const tab of getTabs()) {
    const btn = document.createElement('button');
    btn.className = 'compliance-tab-btn';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', tab.id === _activeTab ? 'true' : 'false');
    btn.dataset.tab = tab.id;
    btn.textContent = tab.label;
    btn.addEventListener('click', () => switchTab(tab.id));
    tabBar.appendChild(btn);
    tabEls[tab.id] = btn;
  }

  // --- Panel container ---
  const panelWrap = document.createElement('div');
  panelWrap.className = 'compliance-tab-panel';

  function switchTab(id) {
    _activeTab = id;
    for (const [tid, btn] of Object.entries(tabEls)) {
      btn.setAttribute('aria-selected', tid === id ? 'true' : 'false');
      btn.classList.toggle('compliance-tab-btn--active', tid === id);
    }
    panelWrap.textContent = '';
    panelWrap.appendChild(panels[id]);
  }

  wrapper.appendChild(tabBar);
  wrapper.appendChild(panelWrap);
  container.appendChild(wrapper);

  switchTab(_activeTab);
}

/* ------------------------------------------------------------------ */
/*  SOX section                                                        */
/* ------------------------------------------------------------------ */

function buildSoxSection(sox) {
  const section = document.createElement('div');
  section.className = 'compliance-sox-section';

  const header = document.createElement('div');
  header.className = 'compliance-sox-header';

  const titleEl = document.createElement('h3');
  titleEl.className = 'compliance-section-title';
  titleEl.textContent = 'SOX Compliance';
  header.appendChild(titleEl);

  header.appendChild(buildStatsBar(sox.stats, 'sox-aggregate'));

  section.appendChild(header);

  // Aggregate pie charts for all SOX tasks
  const allSoxTasks = Object.values(sox.dimensions).flatMap(d => d.tasks);
  const soxVulnGroups = groupTasksByStatus(allSoxTasks);
  if (soxVulnGroups.total > 0) {
    const note = document.createElement('p');
    note.className = 'compliance-vuln-note';
    note.textContent = t('compliance.taskCount', { total: soxVulnGroups.total });
    section.appendChild(note);

    section.appendChild(buildClickablePieSection(soxVulnGroups, allSoxTasks));
  }

  const dimGrid = document.createElement('div');
  dimGrid.className = 'compliance-sox-dims';

  for (const [dimId, dimLabel] of Object.entries(SOX_DIM_LABELS)) {
    const dim = sox.dimensions[dimId];
    dimGrid.appendChild(buildSoxDimCard(dimLabel, dim));
  }

  section.appendChild(dimGrid);
  return section;
}

function buildSoxDimCard(label, dim) {
  const card = document.createElement('div');
  card.className = 'compliance-dim-card';

  const cardTitle = document.createElement('div');
  cardTitle.className = 'compliance-dim-title';
  cardTitle.textContent = label;
  card.appendChild(cardTitle);

  const epicName = document.createElement('div');
  epicName.className = 'compliance-dim-epic';
  epicName.textContent = dim.epic.summary;
  epicName.title = dim.epic.key;
  card.appendChild(epicName);

  card.appendChild(buildProgressBar(dim.stats.pctComplete, dim.stats));
  card.appendChild(buildStatsPills(dim.stats));

  if (dim.tasks.length > 0) {
    card.appendChild(buildTaskList(sortTasksByStatus(dim.tasks)));
  }

  return card;
}

/* ------------------------------------------------------------------ */
/*  Offense tab section (Internal / External / SOX Infrastructure)    */
/* ------------------------------------------------------------------ */

function buildOffenseTabSection(label, model) {
  const section = document.createElement('div');
  section.className = 'compliance-section compliance-section--offense';

  const header = document.createElement('div');
  header.className = 'compliance-section-header';

  const titleEl = document.createElement('h3');
  titleEl.className = 'compliance-section-title';
  titleEl.textContent = label;
  header.appendChild(titleEl);

  section.appendChild(header);
  section.appendChild(buildStatsBar(model.stats, 'offense'));

  const vg = model.vulnGroups;
  if (vg && vg.total > 0) {
    const note = document.createElement('p');
    note.className = 'compliance-vuln-note';
    note.textContent = t('compliance.taskCount', { total: vg.total });
    section.appendChild(note);

    section.appendChild(buildClickablePieSection(vg, model.tasks, true, true));
  } else {
    const empty = document.createElement('p');
    empty.className = 'compliance-vuln-note';
    empty.textContent = t('compliance.noTasksInFilter');
    section.appendChild(empty);
  }

  return section;
}

function buildPieCard(label, bucket, variant, onClick, isActive) {
  const card = document.createElement('div');
  card.className = `compliance-pie-card compliance-pie-card--${variant}${isActive ? ' compliance-pie-card--active' : ''}`;

  const cardTitle = document.createElement('div');
  cardTitle.className = 'compliance-pie-title';
  cardTitle.textContent = label;
  card.appendChild(cardTitle);

  card.appendChild(buildDonutSVG(bucket));
  card.appendChild(buildPieLegend(bucket));

  if (onClick) {
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', onClick);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') onClick(); });
  }

  return card;
}

/**
 * Renders three clickable pie cards (Open/Blocked/Closed) with a task panel
 * below that updates on click. Defaults to showing Open tasks.
 *
 * @param {object} vulnGroups - { open, blocked, closed, total }
 * @param {Array}  tasks      - all tasks for this section
 * @param {boolean} showPriority - pass true to show priority column in task table
 * @returns {HTMLElement}
 */
const ALL_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const DEFAULT_PRIORITIES = new Set(['Critical', 'High']);

function buildClickablePieSection(vulnGroups, tasks, showPriority = false, useSeverity = false) {
  const wrap = document.createElement('div');
  wrap.className = 'compliance-clickable-pie-section';

  let activeFilter   = 'open';
  let activePriorities = new Set(DEFAULT_PRIORITIES);

  // ── Priority filter bar ──────────────────────────────────────────────
  const priorityBar = document.createElement('div');
  priorityBar.className = 'compliance-priority-bar';

  const priorityBtns = {};
  for (const p of ALL_PRIORITIES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'compliance-priority-btn';
    btn.dataset.priority = p;
    btn.style.setProperty('--priority-color', PRIORITY_COLORS[p]);
    btn.textContent = p;
    if (activePriorities.has(p)) btn.classList.add('compliance-priority-btn--active');
    btn.addEventListener('click', () => {
      if (activePriorities.has(p)) {
        // Don't allow deselecting all
        if (activePriorities.size > 1) activePriorities.delete(p);
      } else {
        activePriorities.add(p);
      }
      btn.classList.toggle('compliance-priority-btn--active', activePriorities.has(p));
      renderTasks();
    });
    priorityBtns[p] = btn;
    priorityBar.appendChild(btn);
  }
  wrap.appendChild(priorityBar);

  // ── Pie charts row ───────────────────────────────────────────────────
  const chartsRow = document.createElement('div');
  chartsRow.className = 'compliance-vuln-charts';
  wrap.appendChild(chartsRow);

  const taskPanel = document.createElement('div');
  taskPanel.className = 'compliance-pie-task-panel';
  wrap.appendChild(taskPanel);

  const filterByStatus = (filter) => {
    if (filter === 'open')    return tasks.filter(t => t.status !== 'Completado' && t.status !== 'Bloqueado' && t.status !== 'Rechazado');
    if (filter === 'blocked') return tasks.filter(t => t.status === 'Bloqueado');
    if (filter === 'closed')  return tasks.filter(t => t.status === 'Completado' || t.status === 'Rechazado');
    return [];
  };

  const renderCards = () => {
    chartsRow.textContent = '';
    for (const [filter, label, bucket] of [
      ['open',    t('compliance.open'),    vulnGroups.open],
      ['blocked', t('compliance.blocked'), vulnGroups.blocked],
      ['closed',  t('compliance.closed'),  vulnGroups.closed],
    ]) {
      const isActive = filter === activeFilter;
      const card = buildPieCard(label, bucket, filter, () => {
        activeFilter = filter;
        renderCards();
        renderTasks();
      }, isActive);
      chartsRow.appendChild(card);
    }
  };

  const renderTasks = () => {
    taskPanel.textContent = '';
    const byStatus   = filterByStatus(activeFilter);
    const filtered   = byStatus.filter(t => activePriorities.has(useSeverity ? (t.severity ?? t.priority) : t.priority));
    if (filtered.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'compliance-pie-task-empty';
      empty.textContent = t('compliance.noTasksInFilter');
      taskPanel.appendChild(empty);
      return;
    }
    taskPanel.appendChild(buildTaskList(sortTasksByStatus(filtered), showPriority, useSeverity));
  };

  renderCards();
  renderTasks();

  return wrap;
}

/* ------------------------------------------------------------------ */
/*  SVG donut chart                                                    */
/* ------------------------------------------------------------------ */

function buildDonutSVG(bucket) {
  const size   = 100;
  const cx = size / 2, cy = size / 2;
  const R  = 38;   // outer radius
  const r  = 22;   // inner radius (hole)

  const segments = [
    { label: 'Critical', value: bucket.critical ?? 0, color: PRIORITY_COLORS.Critical },
    { label: 'High',     value: bucket.high     ?? 0, color: PRIORITY_COLORS.High },
    { label: 'Medium',   value: bucket.medium   ?? 0, color: PRIORITY_COLORS.Medium },
    { label: 'Low',      value: bucket.low      ?? 0, color: PRIORITY_COLORS.Low },
  ].filter(s => s.value > 0);

  const total = bucket.total ?? (bucket.critical + bucket.high);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'compliance-donut');

  if (total === 0) {
    // Empty state circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', R);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'var(--color-border)');
    circle.setAttribute('stroke-width', R - r);
    svg.appendChild(circle);
  } else if (segments.length === 1) {
    // Single color — full ring
    const seg = segments[0];
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', cx);
    ring.setAttribute('cy', cy);
    ring.setAttribute('r', (R + r) / 2);
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', seg.color);
    ring.setAttribute('stroke-width', R - r);
    svg.appendChild(ring);
  } else {
    // Multi-segment donut
    let startAngle = -Math.PI / 2;
    for (const seg of segments) {
      const sweep = (seg.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sweep;

      const x1 = cx + R * Math.cos(startAngle);
      const y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle);
      const y2 = cy + R * Math.sin(endAngle);
      const ix1 = cx + r * Math.cos(endAngle);
      const iy1 = cy + r * Math.sin(endAngle);
      const ix2 = cx + r * Math.cos(startAngle);
      const iy2 = cy + r * Math.sin(startAngle);
      const largeArc = sweep > Math.PI ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${r} ${r} 0 ${largeArc} 0 ${ix2} ${iy2}`,
        'Z',
      ].join(' ');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', seg.color);
      svg.appendChild(path);

      startAngle = endAngle;
    }
  }

  // Center total label
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', cx);
  text.setAttribute('y', cy + 5);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', '16');
  text.setAttribute('font-weight', 'bold');
  text.setAttribute('fill', 'var(--color-text-primary)');
  text.textContent = total;
  svg.appendChild(text);

  return svg;
}

function buildPieLegend(bucket) {
  const legend = document.createElement('div');
  legend.className = 'compliance-pie-legend';

  for (const [label, value, color] of [
    ['Critical', bucket.critical ?? 0, PRIORITY_COLORS.Critical],
    ['High',     bucket.high     ?? 0, PRIORITY_COLORS.High],
    ['Medium',   bucket.medium   ?? 0, PRIORITY_COLORS.Medium],
    ['Low',      bucket.low      ?? 0, PRIORITY_COLORS.Low],
  ]) {
    const item = document.createElement('div');
    item.className = 'compliance-pie-legend-item';

    const dot = document.createElement('span');
    dot.className = 'compliance-pie-legend-dot';
    dot.style.background = color;
    item.appendChild(dot);

    const lbl = document.createElement('span');
    lbl.textContent = `${label}: ${value}`;
    item.appendChild(lbl);

    legend.appendChild(item);
  }

  return legend;
}

/* ------------------------------------------------------------------ */
/*  Generic dimension card (Compliance, GIST)                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Reusable sub-components                                            */
/* ------------------------------------------------------------------ */

function buildInitiativeTag(initiative) {
  const tag = document.createElement('span');
  tag.className = `compliance-status-badge compliance-status-badge--${statusClass(initiative.status)}`;
  tag.textContent = `${initiative.key} · ${statusLabel(initiative.status)}`;
  tag.title = initiative.summary;
  return tag;
}

function buildStatsBar(stats, _colorClass) {
  const bar = document.createElement('div');
  bar.className = 'compliance-stats-bar';

  bar.appendChild(buildProgressBar(stats.pctComplete, stats));
  bar.appendChild(buildStatsPills(stats));

  return bar;
}

function buildProgressBar(pct, stats) {
  const wrap = document.createElement('div');
  wrap.className = 'compliance-progress-wrap';

  const track = document.createElement('div');
  track.className = 'compliance-progress-track';

  const fill = document.createElement('div');
  fill.className = 'compliance-progress-fill';
  fill.style.width = `${pct}%`;
  fill.style.backgroundColor = pct === 100 ? 'var(--color-success)' : stats.overdue > 0 ? 'var(--color-error)' : 'var(--color-primary)';
  track.appendChild(fill);

  const label = document.createElement('span');
  label.className = 'compliance-progress-label';
  label.textContent = `${pct}%`;

  wrap.appendChild(track);
  wrap.appendChild(label);
  return wrap;
}

function buildStatsPills(stats) {
  const pills = document.createElement('div');
  pills.className = 'compliance-pills';

  pills.appendChild(makePill(t('compliance.completed', { done: stats.completed, total: stats.total }), 'neutral'));
  if (stats.overdue > 0) {
    pills.appendChild(makePill(t('compliance.overdue', { n: stats.overdue }), 'danger'));
  } else {
    pills.appendChild(makePill(t('compliance.noOverdue'), 'ok'));
  }

  return pills;
}

function makePill(text, variant) {
  const pill = document.createElement('span');
  pill.className = `compliance-pill compliance-pill--${variant}`;
  pill.textContent = text;
  return pill;
}

const PAGE_SIZE = 10;

function buildTaskList(tasks, showPriority = false, useSeverity = false) {
  const today = new Date().toISOString().slice(0, 10);

  const wrap = document.createElement('div');
  wrap.className = 'compliance-task-table-wrap';

  const cols = [t('compliance.colId'), t('compliance.colTitle'), t('compliance.colAssignedTo'), t('compliance.colCreated'), t('compliance.colAging'), t('compliance.colDueDate'), t('compliance.colStatus'), ''];
  if (showPriority) cols.splice(6, 0, useSeverity ? t('compliance.colSeverity') : t('compliance.colPriority'));

  // --- build table (just thead + empty tbody to be filled per page) ---
  const table = document.createElement('table');
  table.className = 'compliance-task-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of cols) {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  wrap.appendChild(table);

  // --- pagination controls ---
  const totalPages = Math.ceil(tasks.length / PAGE_SIZE);
  let currentPage = 0;

  const pager = document.createElement('div');
  pager.className = 'compliance-pager';

  const btnPrev = document.createElement('button');
  btnPrev.className = 'compliance-pager-btn';
  btnPrev.textContent = t('compliance.prev');

  const pageLabel = document.createElement('span');
  pageLabel.className = 'compliance-pager-label';

  const btnNext = document.createElement('button');
  btnNext.className = 'compliance-pager-btn';
  btnNext.textContent = t('compliance.next');

  pager.appendChild(btnPrev);
  pager.appendChild(pageLabel);
  pager.appendChild(btnNext);
  wrap.appendChild(pager);

  function renderPage(page) {
    currentPage = page;
    tbody.textContent = '';

    const start = page * PAGE_SIZE;
    const slice = tasks.slice(start, start + PAGE_SIZE);

    for (const task of slice) {
      const overdue = task.status !== 'Completado' && task.duedate && task.duedate < today;
      const tr = document.createElement('tr');
      if (overdue) tr.classList.add('compliance-task-row--overdue');

      const tdKey = document.createElement('td');
      tdKey.className = 'compliance-task-td compliance-task-td--key';
      const keyLink = document.createElement('a');
      keyLink.href = `https://globant.atlassian.net/browse/${task.key}`;
      keyLink.target = '_blank';
      keyLink.rel = 'noopener noreferrer';
      keyLink.textContent = task.key;
      keyLink.className = 'compliance-jira-link';
      tdKey.appendChild(keyLink);
      tr.appendChild(tdKey);

      const tdSummary = document.createElement('td');
      tdSummary.className = 'compliance-task-td compliance-task-td--summary';
      tdSummary.textContent = task.summary;
      tr.appendChild(tdSummary);

      const tdAssignee = document.createElement('td');
      tdAssignee.className = 'compliance-task-td';
      tdAssignee.textContent = task.assignee ?? '—';
      tr.appendChild(tdAssignee);

      const tdCreated = document.createElement('td');
      tdCreated.className = 'compliance-task-td compliance-task-td--date';
      tdCreated.textContent = task.created ?? '—';
      tr.appendChild(tdCreated);

      // Aging: days from created to today
      const tdAging = document.createElement('td');
      tdAging.className = 'compliance-task-td compliance-task-td--num';
      if (task.created) {
        const msPerDay = 86_400_000;
        const agingDays = Math.floor((Date.parse(today) - Date.parse(task.created)) / msPerDay);
        tdAging.textContent = agingDays >= 0 ? agingDays : '—';
      } else {
        tdAging.textContent = '—';
      }
      tr.appendChild(tdAging);

      // Due Date + semaphore
      const tdDue = document.createElement('td');
      tdDue.className = `compliance-task-td compliance-task-td--date compliance-task-td--due${overdue ? ' compliance-task-td--overdue' : ''}`;

      if (task.duedate) {
        const isClosed   = task.status === 'Completado' || task.status === 'Rechazado';
        // Green: closed (we assume on-time since no actual close-date field),
        //        OR not closed but still within due date.
        // Red:   not closed and past due date.
        const semClass = (!isClosed && overdue) ? 'semaphore--red' : 'semaphore--green';
        const semTitle = (!isClosed && overdue)
          ? t('compliance.overdueDate', { date: task.duedate })
          : isClosed ? t('compliance.closedDate', { date: task.duedate }) : t('compliance.onTrackDate', { date: task.duedate });

        const dot = document.createElement('span');
        dot.className = `compliance-semaphore ${semClass}`;
        dot.title = semTitle;
        dot.setAttribute('aria-label', semTitle);
        tdDue.appendChild(dot);

        const dateSpan = document.createElement('span');
        dateSpan.textContent = task.duedate;
        tdDue.appendChild(dateSpan);
      } else {
        tdDue.textContent = '—';
      }
      tr.appendChild(tdDue);

      if (showPriority) {
        const tdPriority = document.createElement('td');
        tdPriority.className = 'compliance-task-td';
        const displayVal = useSeverity ? (task.severity ?? task.priority) : task.priority;
        if (displayVal) {
          const pb = document.createElement('span');
          pb.className = 'compliance-priority-badge';
          pb.style.color = PRIORITY_COLORS[displayVal] ?? 'inherit';
          pb.textContent = displayVal;
          tdPriority.appendChild(pb);
        } else {
          tdPriority.textContent = '—';
        }
        tr.appendChild(tdPriority);
      }

      const tdStatus = document.createElement('td');
      tdStatus.className = 'compliance-task-td';
      const badge = document.createElement('span');
      badge.className = `compliance-status-badge compliance-status-badge--${statusClass(task.status)}`;
      badge.textContent = statusLabel(task.status);
      tdStatus.appendChild(badge);
      tr.appendChild(tdStatus);

      // Action buttons column
      const tdAction = document.createElement('td');
      tdAction.className = 'compliance-task-td compliance-task-td--action';
      const isClosed = task.status === 'Completado' || task.status === 'Rechazado';

      // Remind button — tasks with a due date, not closed, admin only
      if (isAdmin() && task.duedate && !isClosed && task.assigneeAccountId) {
        const remindBtn = document.createElement('button');
        remindBtn.className = 'compliance-remind-btn';
        remindBtn.textContent = t('compliance.remind');
        remindBtn.title = t('compliance.remindTitle');
        remindBtn.addEventListener('click', () => sendReminder(remindBtn, task));
        tdAction.appendChild(remindBtn);
      }

      // Escalate button — all non-closed tasks, admin only; enabled only when overdue
      if (isAdmin() && !isClosed && task.assigneeAccountId) {
        const escalateBtn = document.createElement('button');
        escalateBtn.className = 'compliance-escalate-btn';
        escalateBtn.textContent = t('compliance.escalate');
        if (overdue) {
          escalateBtn.title = t('compliance.escalateTitle');
          escalateBtn.addEventListener('click', () => sendEscalation(escalateBtn, task));
        } else {
          escalateBtn.disabled = true;
          escalateBtn.title = t('compliance.escalateNotOverdue');
        }
        tdAction.appendChild(escalateBtn);
      }

      tr.appendChild(tdAction);

      tbody.appendChild(tr);
    }

    const from = start + 1;
    const to   = Math.min(start + PAGE_SIZE, tasks.length);
    pageLabel.textContent = t('compliance.pager', { from, to, total: tasks.length });
    btnPrev.disabled = currentPage === 0;
    btnNext.disabled = currentPage >= totalPages - 1;
  }

  btnPrev.addEventListener('click', () => renderPage(currentPage - 1));
  btnNext.addEventListener('click', () => renderPage(currentPage + 1));

  // hide pager when results fit on one page
  if (totalPages <= 1) pager.style.display = 'none';

  renderPage(0);
  return wrap;
}

function statusLabel(status) {
  const map = {
    'Completado':  t('compliance.closed'),
    'En Progreso': t('compliance.open'),
    'No Iniciado': t('compliance.open'),
    'Bloqueado':   t('compliance.blocked'),
    'Rechazado':   t('compliance.closed'),
  };
  return map[status] ?? status;
}

const STATUS_SORT_ORDER = { 'Bloqueado': 0, 'En Progreso': 1, 'No Iniciado': 2, 'Completado': 3, 'Rechazado': 4 };

function sortTasksByStatus(tasks) {
  return [...tasks].sort((a, b) => {
    const oa = STATUS_SORT_ORDER[a.status] ?? 99;
    const ob = STATUS_SORT_ORDER[b.status] ?? 99;
    return oa - ob;
  });
}

function statusClass(status) {
  switch (status) {
    case 'Completado':  return 'completed';
    case 'En Progreso': return 'in-progress';
    case 'Bloqueado':   return 'blocked';
    case 'Rechazado':   return 'rejected';
    default:            return 'not-started';
  }
}
