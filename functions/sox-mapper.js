/**
 * SOX Controls — Jira → Dashboard mapper
 * Ported from SOXDashboard/proxy/mapper.js.
 * Detects months dynamically, maps statuses, detects findings via issuelinks.
 */

const MONTH_MAP = {
  ENE: 'ene', FEB: 'feb', MAR: 'mar', ABR: 'abr', MAY: 'may', JUN: 'jun',
  JUL: 'jul', AGO: 'ago', SEP: 'sep', OCT: 'oct', NOV: 'nov', DIC: 'dic',
  JAN: 'ene', APR: 'abr', AUG: 'ago', DEC: 'dic',
};

const MONTH_ORDER = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

const MONTH_LABEL_MAP = {
  ene:'ENE', feb:'FEB', mar:'MAR', abr:'ABR', may:'MAY', jun:'JUN',
  jul:'JUL', ago:'AGO', sep:'SEP', oct:'OCT', nov:'NOV', dic:'DIC',
};

const PLATFORM_MAP = {
  SAP:'SAP', HANA:'SAPHDB', S4:'S4H', 'S/4HANA':'S4H', S4HANA:'S4H',
  BW:'BW', AWS:'AWS', GLOW:'Glow', Glow:'Glow',
  ARIBA:'Ariba', Ariba:'Ariba', GRC:'GRC', SOLMAN:'SOLMAN',
  BTP:'BTP', PAPM:'PAPM', PaPM:'PAPM', SLT:'SLT',
  SSFF:'SSFF', SuccessFactors:'SSFF',
  LINUX:'Linux', Linux:'Linux', WINDOWS:'Windows', Windows:'Windows',
  AD:'AD', INFR:'INFR', MAGNITUDE:'Magnitude', Magnitude:'Magnitude',
  LUMEN:'Lumen', Lumen:'Lumen', CIRION:'Cirion', Cirion:'Cirion',
};

const RESPONSIBLE_MAP = {
  AWS:'IST Architecture', SAP:'Basis SAP', S4H:'Basis SAP',
  BW:'BW Team', SAPHDB:'DBA Team', GRC:'GRC Team',
  SOLMAN:'Basis SAP', Ariba:'Ariba Team', PAPM:'PaPM Team',
  BTP:'IST Architecture', SLT:'Basis SAP', Magnitude:'BI Team',
  SSFF:'SSFF Team', Glow:'INFR Team', INFR:'INFR Team',
  Linux:'INFR Team', Windows:'INFR Team', AD:'INFR Team',
  Lumen:'INFR Team', Cirion:'INFR Team',
};

function hasFindings(issueLinks) {
  return (issueLinks || []).some(link => {
    const inward = (link.type?.inward || '').toLowerCase();
    const name   = (link.type?.name   || '').toLowerCase();
    return inward.includes('affected by') || name.includes('affected by') || name.includes('affects');
  });
}

function mapStatus(jiraStatus, dueDate, issueLinks) {
  const now = new Date();
  const overdue = dueDate && new Date(dueDate) < now;
  const s = (jiraStatus || '').toLowerCase().trim();

  if (s === 'closed' || s === 'resolved') {
    return hasFindings(issueLinks) ? 'failed' : 'ok';
  }
  if (['pending to be deployed','in progress','in testing','planned','refined','backlog','open'].includes(s)) {
    return overdue ? 'delayed' : 'pending';
  }
  return 'alert';
}

function parseControlId(summary) {
  const match = summary.match(/\]\s*(GB\.IT\.[A-Z0-9.]+)/i);
  return match ? match[1].trim() : null;
}

function parseMonthYear(parentSummary) {
  const match = parentSummary.match(/\[([A-Z]{3})-(\d{4})\]/);
  if (!match) return null;
  const month = MONTH_MAP[match[1]] || match[1].toLowerCase();
  return { month, year: match[2] };
}

function parsePlatform(parentSummary) {
  const parts = parentSummary.split(' - ');
  const raw = (parts[parts.length - 1] || '').trim();
  return PLATFORM_MAP[raw] || PLATFORM_MAP[raw.toUpperCase()] || raw;
}

function parseDueDate(parentDescription) {
  if (!parentDescription) return null;
  const text = typeof parentDescription === 'string'
    ? parentDescription
    : JSON.stringify(parentDescription);
  const match = text.match(/al\s+(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function deriveFrequency(controlId) {
  const quarterly = ['ACC.AWS.02','ACC.SAP.02','ACC.GRC.01','ACC.Ariba.01','ACC.MAG.01'];
  return quarterly.some(p => controlId.includes(p)) ? 'Quarterly' : 'Monthly';
}

function transformSOXData(subtasks, parentMap, siteUrl) {
  const controlMap  = new Map();
  const monthKeySet = new Set();
  const currentYear = String(new Date().getFullYear());

  for (const issue of subtasks) {
    const summary   = issue.fields?.summary || '';
    const controlId = parseControlId(summary);
    if (!controlId || !controlId.startsWith('GB.IT.')) continue;

    const parentKey = issue.fields?.parent?.key;
    const parent    = parentMap.get(parentKey);
    if (!parent) continue;

    const parentSummary = parent.fields?.summary || '';
    const monthYear     = parseMonthYear(parentSummary);
    if (!monthYear || monthYear.year !== currentYear) continue;

    const monthKey = `${monthYear.month}-${monthYear.year}`;
    monthKeySet.add(monthKey);

    const platform   = parsePlatform(parentSummary);
    const dueDate    = parseDueDate(parent.fields?.description);
    const jiraStatus = issue.fields?.status?.name || '';
    const issueLinks = issue.fields?.issuelinks || [];
    const status     = mapStatus(jiraStatus, dueDate, issueLinks);
    const jiraUrl    = siteUrl ? `${siteUrl}/browse/${issue.key}` : null;

    if (!controlMap.has(controlId)) {
      controlMap.set(controlId, {
        control: {
          id:   controlId,
          app:  platform,
          freq: deriveFrequency(controlId),
          resp: issue.fields?.assignee?.displayName || RESPONSIBLE_MAP[platform] || 'Unknown',
        },
        monthData: new Map(),
      });
    }
    controlMap.get(controlId).monthData.set(monthKey, { status, url: jiraUrl });
  }

  // Sort months chronologically
  const sortedMonthKeys = Array.from(monthKeySet).sort((a, b) => {
    const [am, ay] = a.split('-');
    const [bm, by] = b.split('-');
    if (ay !== by) return parseInt(ay) - parseInt(by);
    return MONTH_ORDER.indexOf(am) - MONTH_ORDER.indexOf(bm);
  });

  const months      = sortedMonthKeys.map(k => k.split('-')[0]);
  const monthLabels = sortedMonthKeys.map(k => {
    const [m, y] = k.split('-');
    return `${MONTH_LABEL_MAP[m] || m.toUpperCase()} ${y}`;
  });

  const controls     = [];
  const monthlyData  = {};
  const monthlyLinks = {};

  for (const [id, data] of controlMap) {
    controls.push(data.control);
    monthlyData[id]  = sortedMonthKeys.map(k => (data.monthData.get(k) || {}).status || 'na');
    monthlyLinks[id] = sortedMonthKeys.map(k => (data.monthData.get(k) || {}).url   || null);
  }

  return { controls, monthlyData, monthlyLinks, months, monthLabels };
}

module.exports = { transformSOXData };
