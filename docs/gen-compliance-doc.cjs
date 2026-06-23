'use strict';
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
        ExternalHyperlink, LevelFormat } = require('/opt/homebrew/lib/node_modules/docx/dist/index.umd.cjs');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const headerShading = { fill: 'D5E8F0', type: ShadingType.CLEAR };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };
const PAGE_W = 9360;

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, bold: true, size: 32, font: 'Arial' })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, bold: true, size: 26, font: 'Arial' })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, font: 'Arial' })],
  });
}
function p(text, opts) {
  opts = opts || {};
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun(Object.assign({ text, font: 'Arial', size: 22 }, opts))],
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: 'Arial', size: 22 })],
  });
}
function numbered(text) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: 'Arial', size: 22 })],
  });
}
function blank() { return new Paragraph({ children: [new TextRun('')] }); }

function headerCell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: headerShading, margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: 'Arial', size: 20 })] })],
  });
}
function dataCell(text, width, bold) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 20, bold: bold || false })] })],
  });
}
function codeCell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, font: 'Courier New', size: 18 })] })],
  });
}

function hierarchyTable(rows) {
  const COL = [2000, 2800, PAGE_W - 4800];
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: COL,
    rows: [
      new TableRow({ children: [headerCell('Level', COL[0]), headerCell('ID / Value', COL[1]), headerCell('Name / Notes', COL[2])] }),
    ].concat(rows.map(function(r) { return new TableRow({ children: [dataCell(r[0], COL[0]), codeCell(r[1], COL[1]), dataCell(r[2], COL[2])] }); })),
  });
}

function fieldsTable(rows) {
  const COL = [2200, 4500, 2660];
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: COL,
    rows: [
      new TableRow({ children: [headerCell('Field', COL[0]), headerCell('Description', COL[1]), headerCell('Required', COL[2])] }),
    ].concat(rows.map(function(r) { return new TableRow({ children: [dataCell(r[0], COL[0], true), dataCell(r[1], COL[1]), dataCell(r[2], COL[2])] }); })),
  });
}

function namingTable(rows) {
  const COL = [2800, PAGE_W - 2800];
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: COL,
    rows: [
      new TableRow({ children: [headerCell('Group', COL[0]), headerCell('Structure', COL[1])] }),
    ].concat(rows.map(function(r) { return new TableRow({ children: [dataCell(r[0], COL[0]), dataCell(r[1], COL[1])] }); })),
  });
}

const FIELDS_INFRA = [
  ['Summary', 'Issue name following the naming standard', '✅'],
  ['Description', 'Full detail of the vulnerability: how it was detected, tool used, severity, CVSS score if available, context of the affected system', '✅'],
  ['Target / Expected Outcome', 'What is expected: remediation confirmation, mitigation plan, impact analysis, evidence of patch applied, etc.', '✅'],
  ['Severity', 'Critical / High / Medium / Low based on vulnerability severity', '✅'],
  ['Label', 'Must be set to Offense-Discovered-Vuln (and/or External-Pentest for External Infrastructure) -- issues without the correct label will not appear in the tracker', '✅'],
  ['Due Date', 'Expected resolution or response date', '✅'],
  ['Attachments', 'Scan report, screenshot, log file, etc.', 'Recommended'],
];

const FIELDS_SOX = [
  ['Summary', 'Sub-task name following the naming standard', '✅'],
  ['Description', 'Detail of the SOX control: control identifier, affected cycle or process, fiscal period in question, context of the request (internal audit, external audit, self-assessment)', '✅'],
  ['Target / Expected Outcome', 'What evidence or deliverable is required: configuration screenshot, access report, meeting minutes, updated policy, etc.', '✅'],
  ['Priority', 'Based on urgency within the audit cycle', '✅'],
  ['Parent Task', 'Select the Task matching the system involved (SAP / GLOW / AWS / SSFF). Items that do not fit any system will appear under Other.', '✅'],
  ['Due Date', 'Deadline imposed by the SOX audit team', '✅'],
  ['Attachments', 'Formal SOX auditor request, partial evidence already available', 'Recommended'],
];

const versionTable = new Table({
  width: { size: PAGE_W, type: WidthType.DXA },
  columnWidths: [1200, 1800, 2500, PAGE_W - 5500],
  rows: [
    new TableRow({ children: [headerCell('Version', 1200), headerCell('Date', 1800), headerCell('Author', 2500), headerCell('Changes', PAGE_W - 5500)] }),
    new TableRow({ children: [dataCell('0.1', 1200), dataCell('2026-06-09', 1800), dataCell('Martin Moresco', 2500), dataCell('Initial version', PAGE_W - 5500)] }),
    new TableRow({ children: [dataCell('0.2', 1200), dataCell('2026-06-22', 1800), dataCell('Martin Moresco', 2500), dataCell('Updated SOX hierarchy (GLO220-11373, Tasks GLO220-11377/11383/11384/11385), Vulnerability issue type for infrastructure tabs, External-Pentest label for External Infrastructure, severity field replacing priority', PAGE_W - 5500)] }),
  ],
});

const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: 'AMD - Compliance Internal Control', bold: true, size: 40, font: 'Arial' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 400 },
        children: [new TextRun({ text: 'Information Request Reporting Process via Jira', size: 26, font: 'Arial', color: '444444' })],
      }),

      h1('1. Purpose'),
      p('This document describes the process by which the Internal Infrastructure, External Infrastructure, SOX Infrastructure, and SOX teams must channel their requests for information, evidence, and inquiries related to vulnerabilities and SOX control adherence.'),
      blank(),
      p('All requests must be formalized as Jira issues in the project corresponding to each area. For the three infrastructure sections, issues must be of type Vulnerability and tagged with the label Offense-Discovered-Vuln (External Infrastructure also accepts External-Pentest). Issues without the correct label and type will not appear in the tracker.'),
      blank(),
      p('This ensures full traceability, proper prioritization, and a single source of truth for tracking.'),
      blank(),

      h1('2. Jira Hierarchy'),
      h2('Infrastructure Sections (Internal, External, SOX Infrastructure)'),
      p('All items follow this structure:'),
      blank(),
      p('Project -> Vulnerability issue (with required label)', { bold: true }),
      blank(),
      p('Issues must be created directly in the Jira project assigned to the area with issue type set to Vulnerability. The label Offense-Discovered-Vuln must always be applied (External Infrastructure also accepts External-Pentest) -- this is the mechanism by which the tracker identifies and displays the item.'),
      blank(),
      h2('SOX -- Controls and Adherence'),
      p('SOX requests follow this structure:'),
      blank(),
      p('Initiative -> Task (system area) -> Sub-task (individual control request)', { bold: true }),
      blank(),
      p('Sub-tasks must be created under the Task that corresponds to the system involved. See section 4 for details.'),
      blank(),

      h1('3. General Assignment Principle'),
      p('All issues must be initially assigned to the manager for this project (currently Martin Moresco), who will redirect each request to the appropriate owner based on the type of request and team availability.'),
      blank(),

      h1('4. Step-by-Step Process'),
      numbered('The requesting area identifies the need for information, evidence, or analysis.'),
      numbered('Access the Jira project assigned to the area (see section 5 below) and create a new issue with the correct type (Vulnerability for infrastructure sections, Sub-task for SOX). The correct project and issue type must be selected based on the nature and scope of the request.'),
      numbered('Fill in all required fields following the naming standard defined for the group. Ensure the required label is applied -- this is mandatory for the item to appear in the tracker.'),
      numbered('Assign the issue to the project manager (currently Martin Moresco).'),
      numbered('The manager reviews the request and reassigns it to the appropriate technical or functional owner.'),
      numbered('The assigned owner updates the issue with progress, attaches evidence if applicable, and closes it once the request is fulfilled.'),
      blank(),

      h1('5. Groups, Projects, and Hierarchies'),
      p('Three areas use project-based routing with label filters. SOX uses a task-based hierarchy.'),
      blank(),

      h2('5.1 Internal Infrastructure'),
      hierarchyTable([
        ['Project', 'GBN980', 'G4G-AMS-Properties'],
        ['Issue type', '--', 'Vulnerability'],
        ['Required label', '--', 'Offense-Discovered-Vuln'],
        ['Initial assignee', '--', 'Project manager (currently Martin Moresco)'],
      ]),
      blank(),
      h3('Naming Standard'),
      p('[Application/Infrastructure] -- [Brief description of the vulnerability]'),
      blank(),
      h3('Examples'),
      bullet('Customer Portal -- SQL Injection on search endpoint'),
      bullet('DB-PROD-01 Server -- Port 22 exposed without IP restriction'),
      bullet('API Gateway -- Outdated version with CVE-2025-XXXXX'),
      blank(),
      h3('Fields to Complete'),
      fieldsTable(FIELDS_INFRA),
      blank(),

      h2('5.2 External Infrastructure'),
      hierarchyTable([
        ['Project', 'GL1404', 'G4G GIST Offense'],
        ['Issue type', '--', 'Vulnerability'],
        ['Required label', '--', 'Offense-Discovered-Vuln OR External-Pentest'],
        ['Initial assignee', '--', 'Project manager (currently Martin Moresco)'],
      ]),
      blank(),
      p('Note: External Infrastructure accepts issues with either the Offense-Discovered-Vuln or the External-Pentest label. Issues with either label will appear in the tracker under the External Infrastructure tab.', { italics: true }),
      blank(),
      h3('Naming Standard'),
      p('[Application/Infrastructure] -- [Brief description of the vulnerability]'),
      blank(),
      h3('Examples'),
      bullet('Customer Portal -- SQL Injection on search endpoint'),
      bullet('External API -- Expired TLS certificate on production endpoint'),
      bullet('CDN -- Missing security headers (CSP, HSTS)'),
      blank(),
      h3('Fields to Complete'),
      p('Same fields as Internal Infrastructure (see above). At least one of the labels Offense-Discovered-Vuln or External-Pentest is mandatory.'),
      blank(),

      h2('5.3 SOX Infrastructure'),
      hierarchyTable([
        ['Project', 'GLO815X', 'G4G - FINANCE/S4HANA'],
        ['Issue type', '--', 'Vulnerability'],
        ['Required label', '--', 'Offense-Discovered-Vuln'],
        ['Initial assignee', '--', 'Project manager (currently Martin Moresco)'],
      ]),
      blank(),
      h3('Naming Standard'),
      p('[Application/Infrastructure] -- [Brief description of the vulnerability]'),
      blank(),
      h3('Fields to Complete'),
      p('Same fields as Internal Infrastructure (see above). The label Offense-Discovered-Vuln is mandatory.'),
      blank(),

      h2('5.4 SOX -- Controls and Adherence'),
      p('SOX requests are organized under a shared Initiative and split across Tasks by system. The requesting area must create a Sub-task under the Task that corresponds to the system involved in the control being requested.'),
      blank(),
      p('How to choose the right Task: select the Task that matches the primary system the control applies to. If the request spans multiple systems or does not fit any specific system, it will appear under Other in the dashboard.', { italics: true }),
      blank(),
      hierarchyTable([
        ['Initiative', 'GLO220-11373', '[G4G - Compliance]'],
        ['Task', 'GLO220-11377', 'Internal request - SOX - SAP'],
        ['Task', 'GLO220-11384', 'Internal request - SOX - GLOW'],
        ['Task', 'GLO220-11383', 'Internal request - SOX - AWS'],
        ['Task', 'GLO220-11385', 'Internal request - SOX - SSFF'],
        ['Issue type', '--', 'Sub-task (created under the corresponding Task above)'],
        ['Initial assignee', '--', 'Project manager (currently Martin Moresco)'],
      ]),
      blank(),
      h3('Naming Standard'),
      p('[XX.XX.XXX.XXX.XXX.NN] -- [Brief description of the request]'),
      blank(),
      h3('Examples'),
      bullet('GB.IT.OPE.GLW.ARI.07 -- Evidence of access review for financial systems Q1 2026'),
      bullet('GB.IT.OPE.GLW.ARI.12 -- Change logs for in-scope system configurations'),
      bullet('GB.IT.OPE.GLW.ARI.03 -- Updated segregation of duties matrix'),
      blank(),
      h3('Fields to Complete'),
      fieldsTable(FIELDS_SOX),
      blank(),

      h1('6. Critical Fields: Description and Target / Expected Outcome'),
      p('These are the two most important fields in any issue.'),
      blank(),
      h2('Description'),
      p('Must answer: what, where, when, and why.'),
      bullet('For vulnerabilities: detection origin, tool used, affected system, severity.'),
      bullet('For SOX: control identifier, business process, fiscal period, audit context.'),
      blank(),
      p('An incomplete description generates rework and delays. The requesting area is responsible for providing enough context so the technical team can act without having to chase down additional information.'),
      blank(),
      h2('Target / Expected Outcome'),
      p('Must answer: what is specifically needed?'),
      blank(),
      p('Describing the problem is not enough -- the expected deliverable must be clearly stated.'),
      blank(),
      h3('Examples'),
      bullet('"I need PDF evidence that the patch was applied before 06/30/2026."'),
      bullet('"I require a report listing users with privileged access and the business justification for each."'),
      bullet('"I request documented confirmation that control GB.IT.OPE.GLW.ARI.07 operated effectively during Q1 2026."'),
      blank(),

      h1('7. Naming Standard Summary'),
      namingTable([
        ['Internal Infrastructure', '[App/Infra] -- [Description]'],
        ['External Infrastructure', '[App/Infra] -- [Description]'],
        ['SOX Infrastructure', '[App/Infra] -- [Description]'],
        ['SOX Controls', '[XX.XX.XXX.XXX.XXX.NN] -- [Description]'],
      ]),
      blank(),

      h1('8. Version History'),
      versionTable,
    ],
  }],
});

Packer.toBuffer(doc).then(function(buf) {
  const out = require('path').join(__dirname, 'AMD-Compliance-Internal-Control.docx');
  fs.writeFileSync(out, buf);
  console.log('Done:', out);
}).catch(function(err) {
  console.error(err);
  process.exit(1);
});
