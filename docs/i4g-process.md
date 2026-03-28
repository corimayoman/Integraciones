# I4G - Infrastructure and Security Integration

## What is I4G?

I4G is a sub-team within G4G (Globant for Globers) and stands for "Integrations for Growth." This team focuses on assisting acquired companies in smoothly transitioning to become part of Globant.

## Scope

This process includes multiple sub-processes aimed at bridging the gaps between the standards of the acquired company and those of Globant.

## Integration Tracks

| # | Track | Severity |
|---|-------|----------|
| 01 | Kick Off Integration | Low |
| 02 | Initial Package | High |
| 03 | E-mail & Drives Migration | Critical |
| 04 | IT Experience Integration (Endpoints) | Critical |
| 05 | Application Integration | High |
| 06 | Acquired Official Site | Medium |
| 07 | Acquired URL Address | Medium |
| 08 | Acquired Infra IT Offices | Critical |
| 09 | Acquired Infra IT DCs | Critical |
| 10 | Building Security | Medium |
| 11 | Communication Tools | Medium |
| 12 | Compliance | High |
| 13 | Closure Review & Validate Documentation | Low |
| 14 | Closure Assets Decommissioning | Low |

---

## Track Details

### 01. Kick Off Integration

The integration process begins with establishing contact with the IT team in the acquired company. At this stage, initial questionnaires and foundational spreadsheets are shared, which serve as the basis for the entire integration effort. A comprehensive walkthrough of the process is conducted along with Q&A sessions.

**Expected outcomes:**
- Completed responses for all questionnaires and inventories
- Identification of a primary point of contact within the IT department
- Identification of additional contacts for specific IT-related areas, if applicable

**Completion Criteria:**
The template for new integrations must be shared, completed by the company, and reviewed by the IST & Security Integration team. This template should then be stored in the designated shared folder for each company integration, within the IST & Security sub-folder.

---

### 02. Initial Package

This step provides key individuals in the acquired company with initial access to essential resources, including email, SAP, and other corporate applications.

**Completion Criteria:**
Provision of evidence including: the list of individuals included in this package, the list of required assets for each person, and confirmation of the creation of those assets.

---

### 03. E-mail & Drives Migration

This process migrates historical data from the acquired company's email and storage environment into Globant's systems.

**Primary tasks:**
- **DNS Administration:** Secure control over the acquired company's DNS settings
- **Superuser Access:** Obtain superuser privileges to facilitate data transfer
- **Information Gathering:** Use superuser access to collect necessary information on emails and drives
- **Migration Preparation:** Prepare data for migration, ensuring all steps are ready for smooth transfer
- **Application Compatibility:** Safeguard existing applications, especially those using SSO, to prevent disruptions
- **Migration Scheduling:** Set dates for bulk migration and establish a freeze period for data changes
- **Migration Execution:** Perform the email and drive data migration
- **Post-Migration Support:** Provide support following the migration to resolve any residual issues

**Completion Criteria:**
Provide evidence of the migrated emails and confirmation that the previous email console has been disabled.

---

### 04. IT Experience Integration (Endpoints)

The focus shifts to connecting new team members ('Globers') to Globant's environment and tools by equipping them with devices configured to specific security standards. This can be accomplished either by installing a Globant image on their current devices or by issuing new devices pre-loaded with this configuration.

> **Important:** Users must back up their existing data before this step, as any data stored on their current devices will be permanently lost in the case of a device replacement.

After the migration or upon receiving a new device, users will need to install applications essential for their roles. Careful planning is necessary to avoid any impact on business operations.

**Completion Criteria:**
A comprehensive list of all assets assigned to members of the integrated company, along with a record of devices that were reinstalled. For any equipment that has been replaced, include a list of devices returned to Globant SD administration, along with a description of their final disposition (e.g., reassigned to the previous user, destroyed, added to a backup inventory for temporary use in case of incidents, etc.).

---

### 05. Application Integration

Two primary objectives:

1. **Determining application suitability** for use within the Globant environment:
   - Allowed
   - Allowed with exceptions
   - Forbidden

2. **Outlining the management approach** for the application's budget and finances:
   - Globant (G4G)
   - Project or Studio

3. After analysis, share information with the designated stakeholders. If data migration is necessary, establish who will be responsible.

**Application Decision Matrix:**

| GIST Approved | Corporate Tool | Replacement in Globant | Cost | Usage | Migration | Action | Who performs migration |
|:---:|:---:|:---:|---|---|:---:|---|---|
| Y | Y | Y | Globant | Approved | Yes | Migrate to Globant corporate tool | G4G |
| Y | N | Y | Project or Studio | Approved | Yes | Migrate to Globant non-corp tool | Acquired company |
| Y | N | N | Project or Studio | Approved | No | Keep using the tool | Not needed |
| N | N | Y | Project or Studio | Forbidden or Allowed with exception | Yes | Migrate to Globant non-corp tool (1) | Acquired company |
| N | N | N | Project or Studio | Forbidden or Allowed with exception | No | Keep using the tool (2) | Not needed |

> (1) In a six months framework
> (2) Initially for six months with the possibility of extension upon GIST approval.

**Approved corporate tools:**
- Finance (SAP)
- HR (Glow, SSFF)
- Google accounts and tools

**Completion Criteria:**
A list of applications used within the previously acquired company, along with a description of actions taken for each. This document should be shared with the acquired company's POC.

---

### 06. Acquired Official Site

This track follows up on the decisions made by Marketing regarding the websites of the former companies. Options are either to keep the original site active or to redirect the original website URL to a landing page within the Globant corporate site.

**Completion Criteria:**
Confirmation from the Acquisitions team regarding control of the former company's site, along with an updated list of the acquired company's websites, any new URLs (if applicable), and the final decision made by Marketing.

---

### 07. Acquired URL Address

This track ensures that all domains owned by the acquired companies have been successfully transferred to Globant's team. It includes verification of all necessary DNS configurations for services reliant on these settings, such as email and websites.

**Completion Criteria:**
A comprehensive list of all DNS values and configurations from the former company, along with the decisions made for each. Additionally, confirmation that these configurations have been successfully implemented by the Globant team.

---

### 08. Acquired Infra IT Offices

Ensure that offices of acquired companies meet the security standards outlined in Globant's policies and verify that all essential services (networking, access control, security cameras, etc.) are correctly configured and fully operational to certify the office as a Globant site.

> This process applies only to physical office locations; compliance is not required for co-working spaces.

**Process:**
1. IT POC from the acquisitions must complete the Network Assessment template
2. Assessment is shared with the proper ITX Manager who will share it with the MST team, estimate, plan, and oversee execution
3. The point of contact for I4G to follow up is the ITX Manager

**Regional ITX Managers:**
| Region | Manager |
|--------|---------|
| Asia & Oceania | Leena Kurup |
| Europa & Africa | Ezequiel Pelletieri |
| United States & Canada | Daniel Rico |
| Mexico & Costa Rica | Daniel Rico |
| Colombia, Ecuador & Peru | Alejandra Sierra |
| Brazil | Guilherme Braun |
| Uruguay & Chile | Matias Olivera |
| Argentina | Ana Figuls |

**Completion Criteria:**
A list of offices (excluding co-working spaces), accompanied by confirmation from the ITX Regional team that office networking, access control, cameras, and other infrastructure have been properly adapted to Globant standards. If any adaptations are deemed unnecessary, detailed documentation should be provided including how associated risks will be managed.

---

### 09. Acquired Infra IT DCs

This track ensures that all Datacenters held by the former company have been properly transferred to Globant control. It includes all physical datacenters and cloud installations.

**Cloud Datacenters - Standard steps:**
- Provide and inventory the entire list of accounts/projects/subscriptions
- Confirm SAP Orders in EU10 format
- Superuser Access: Obtain superuser privileges
- Information Gathering: Collect necessary information
- Migration Preparation: Prepare accounts for migration
- Security Scanning and Remediation: Security assessment over Cloud Resources
- Migration Scheduling: Set dates and establish freeze period
- Migration Execution: Perform the account migration
- Post-Migration Support: Resolve any residual issues

**Completion Criteria:**
A list of data centers and cloud installations owned by the former companies, with their intended integration into Globant's infrastructure. Confirmation from the relevant Globant team that control has been successfully transferred.

---

### 10. Building Security

This track ensures that all security devices (VCRs, cameras, access control logs, and other related systems) have been properly transferred to the Globant team responsible for security (WE).

**Completion Criteria:**
A comprehensive list of security systems and devices, along with confirmation from the relevant ITX (WE) teams that control has been successfully transferred.

---

### 11. Communication Tools

This track ensures that all individuals from the acquired company have been successfully added as users to the Slack environment.

**Completion Criteria:**
Confirmation from the team managing the Slack workspace that all individuals from the acquired company have been successfully added.

---

### 12. Compliance

This track ensures that all certifications held by the former company are properly transferred to the internal Globant team responsible for managing corporate certifications.

**Completion Criteria:**
- A comprehensive list of all certifications held by the former company
- Confirmation from the internal team that all certifications have been successfully transferred
- Documentation of the transfer process

---

### 13. Closure Review & Validate Documentation

This step ensures that all preceding tracks have been completed and documented accurately.

**Completion Criteria:**
- All previous tracks are closed and thoroughly documented in Jira
- Relevant information and outcomes for each track are recorded, ensuring full transparency and traceability

---

### 14. Closure Assets Decommissioning

Final decommissioning of assets from the acquired company.

---

## Supporting Documentation

- Weekly status report folder
- IST & Security - Steering Meeting Report
- New acquired company template for Jira (creating new Epic, Stories and Tasks)
  - Field mapping
- Timeline
- Questionnaires (for Kick Off Meeting)
