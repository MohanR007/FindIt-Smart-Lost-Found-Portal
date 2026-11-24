# FindIt – Diagram Index & Asset Catalog

This catalog documents all architecture, workflow, data flow, and interface diagrams identified, reused, or designated as missing for the **FindIt – Smart Lost & Found Portal** documentation package.

---

## 1. Diagram Master Index

| # | Diagram Name | Original File Location | New Documentation Location | Where Referenced | Status |
|---|---|---|---|---|:---:|
| 1 | **System Architecture Diagram** | `README.md` (lines 46–80) | `docs/demo/diagrams/system-architecture.mmd` | `SYSTEM_ARCHITECTURE.md`, `DEMO_SCRIPT.md`, `README.md` | **REUSED** |
| 2 | **Two-Level Claim Workflow & State Machine** | `README.md` (lines 88–108) | `docs/demo/diagrams/claim-workflow-state-machine.mmd` | `SYSTEM_ARCHITECTURE.md`, `DEMO_SCRIPT.md`, `README.md` | **REUSED** |
| 3 | **Smart Matching Heuristic Pipeline** | `README.md` (lines 116–131) | `docs/demo/diagrams/smart-matching-pipeline.mmd` | `SYSTEM_ARCHITECTURE.md`, `DEMO_SCRIPT.md`, `README.md` | **REUSED** |
| 4 | **Editorial UI Layout & Custody Protocols** | `C:\Users\mohan\Downloads\127.0.0.1_5173_.png` | `docs/demo/diagrams/findit-editorial-ui-overview.png` | `SYSTEM_ARCHITECTURE.md`, `DEMO_SCRIPT.md` | **REUSED** |
| 5 | **Platform UI Flow & Marketplace Overview** | `C:\Users\mohan\Downloads\localhost_5173_.png` | `docs/demo/diagrams/findit-ui-overview.png` | `SYSTEM_ARCHITECTURE.md`, `DEMO_SCRIPT.md` | **REUSED** |
| 6 | **Data Flow Diagram (DFD - Level 0 / 1)** | *Not previously generated* | *N/A* | `SYSTEM_ARCHITECTURE.md` (Section 4) | **MISSING** |
| 7 | **Use Case Diagram** | *Not previously generated* | *N/A* | `SYSTEM_ARCHITECTURE.md` (Section 4) | **MISSING** |
| 8 | **Sequence Diagram** | *Not previously generated* | *N/A* | `SYSTEM_ARCHITECTURE.md` (Section 4) | **MISSING** |
| 9 | **DynamoDB Data Model / ERD** | *Not previously generated* | *N/A* | `SYSTEM_ARCHITECTURE.md` (Section 4) | **MISSING** |

---

## 2. Reused Diagram Descriptions

### 1. System Architecture Diagram
- **Format**: Mermaid Flowchart (`flowchart TD`)
- **Original Source**: `README.md`
- **Location**: `docs/demo/diagrams/system-architecture.mmd`
- **Scope**: Illustrates the end-to-end layered architecture across Presentation (React 19 + Tailwind CSS v4), State Management (`AuthContext`, `ItemsContext`, Heuristic Engine), and Cloud Services (AWS Cognito, API Gateway HTTP API, Python Lambda, DynamoDB tables, and Amazon S3).

### 2. Two-Level Claim Workflow & State Machine
- **Format**: Mermaid State Diagram (`stateDiagram-v2`)
- **Original Source**: `README.md`
- **Location**: `docs/demo/diagrams/claim-workflow-state-machine.mmd`
- **Scope**: Maps the complete 4-phase claim lifecycle from initial submission with private verification proof, Level 1 Finder Review, Dispute Mediation, Level 2 Admin Approval, Dual Handover Confirmation, to item status resolution (`RETURNED`).

### 3. Smart Matching Heuristic Pipeline
- **Format**: Mermaid Flowchart (`flowchart LR`)
- **Original Source**: `README.md`
- **Location**: `docs/demo/diagrams/smart-matching-pipeline.mmd`
- **Scope**: Illustrates the correlation engine processing newly registered reports through category ontology matching, spatial locus proximity, temporal proximity scans, and tokenized keyword analysis.

### 4. Editorial UI Layout & Custody Protocols
- **Format**: High-resolution PNG (`image/png`)
- **Original Source**: `C:\Users\mohan\Downloads\127.0.0.1_5173_.png`
- **Location**: `docs/demo/diagrams/findit-editorial-ui-overview.png`
- **Scope**: Visual capture of the editorial glass Lost & Found interface, including the verified report stream, the 3-step custody protocol banner, the two-level security breakdown, and conversion CTAs.

### 5. Platform UI Flow & Marketplace Overview
- **Format**: High-resolution PNG (`image/png`)
- **Original Source**: `C:\Users\mohan\Downloads\localhost_5173_.png`
- **Location**: `docs/demo/diagrams/findit-ui-overview.png`
- **Scope**: Full visual overview of the live marketplace navigation, hero search, metrics counters, recently reported lost/found cards, and the 3-step operational workflow.

---

## 3. Missing Diagram Audit & Justification

In strict adherence to project guidelines (*"If an important diagram is missing, list it as missing instead of silently inventing a replacement"*), the following diagrams were searched across all workspace folders, documentation files, and Downloads assets, and verified as missing:

1. **Data Flow Diagram (DFD - Level 0 / Level 1)**:
   - *Status*: **MISSING**
   - *Audit Notes*: While data transformation logic is documented in text and code (`ItemsContext.jsx`, `lambda_function.py`), no formal DFD depicting external entities, data stores, and process bubbles was previously generated.
2. **Use Case Diagram**:
   - *Status*: **MISSING**
   - *Audit Notes*: Roles and user permissions (Student Claimant, Physical Custodian / Finder, Campus Administrator) are established in code and authorization handlers, but no UML Use Case diagram with actors and system boundaries was previously saved.
3. **Sequence Diagram**:
   - *Status*: **MISSING**
   - *Audit Notes*: No UML Sequence Diagram detailing asynchronous lifecycles across Cognito, API Gateway, Lambda, DynamoDB, and S3 was found in existing project files.
4. **Database / DynamoDB Data Model Diagram**:
   - *Status*: **MISSING**
   - *Audit Notes*: The DynamoDB physical schemas for `FindIt-Items`, `FindIt-Claims`, `FindIt-Users`, and `FindIt-ActivityLog` are actively implemented in Python (`lambda_function.py`), but no graphical Entity-Relationship Diagram (ERD) or table schema diagram was generated as an image or diagram asset.

