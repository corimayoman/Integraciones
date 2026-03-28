# I4G Jira Hierarchy

## Structure (5 levels)

```
Theme (25)          → Empresa adquirida (ej: "Omni Pro - 2025", "Adbid - 2023")
  └─ Initiative (85)  → Plan de integración (ej: "Omni Pro - IST & Security Integration - Plan")
       └─ Story (15)    → Tareas específicas de trabajo (ej: "Deploy AWS Fallback Dev Env")
  └─ Epic (367)       → Tracks del proceso (ej: "01. Kick Off Integration", "03. E-mail & Drives Migration")
       └─ Sub-task (1567) → Pasos dentro de cada track (ej: "Review documentation checklist")
```

## Total issues: ~2059

## Key observations
- Theme = empresa adquirida + año de adquisición
- Initiative = plan de integración IST&SEC por empresa (puede haber varios por empresa, por quarter)
- Epic = los 14 tracks del proceso I4G (numerados 01-14)
- Sub-task = pasos individuales dentro de cada track
- Story = tareas de trabajo adicionales (pocas, 15)

## Status values observed
- Closed, Open, In Progress, Reopened, Blocked, Rejected, Analyzing, 
  Solution In Progress, Backlog

## Projects involved
- G4G (Themes, Initiatives, Stories)
- GLO586 (Epics, Sub-tasks)
