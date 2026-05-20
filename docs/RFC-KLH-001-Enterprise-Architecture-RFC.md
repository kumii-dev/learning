# Request for Change (RFC)

**RFC Reference:** RFC-KLH-001  
**System / Application:** Kumii Learning Hub — Enterprise Learning Management System  
**Change Type:** Significant (Multi-Domain Impact)

**Submitted By:** Digital Lead  
**Submission Date:** 20 May 2026

**Review Authority:** Architecture Board  
**Status:** Submitted for Review

---

## 1. Request for Change Summary

### 1.1 Change Title: Kumii Learning Hub — Full Platform Architecture Adoption

Design, development, and governance formalisation of the Kumii Learning Hub as an enterprise-grade, iframe-native, CMS-driven Learning Management System (LMS) integrated into the Kumii platform.

### 1.2 Change Description: Integration of Learning Hub into the Kumii Enterprise Platform

This Architecture Change Request proposes the formal adoption and governance approval of the Kumii Learning Hub as a fully operational module of the Kumii platform, integrating:

- An iframe-native React (Vite) single-page application embedded within the parent Kumii host
- A Node.js / Express REST API backend with structured route → controller → service layering
- Supabase PostgreSQL as the sole persistence and authentication layer
- An AI-enhanced assessment feedback engine (OpenAI API)
- Certificate generation (PDFKit) with transactional email delivery (Resend API)
- A Jitsi Meet-based live session video platform with RSVP management
- A full Admin CMS portal for content, course, learner, and session governance

The change establishes a new application service layer within the Kumii enterprise architecture digital landscape, introducing:

- A new iframe-embedded learner-facing presentation layer
- A fully governed CMS administration layer
- External API dependencies (OpenAI, Resend, Jitsi Meet, Supabase)
- A structured 16-migration database schema lifecycle
- A secure postMessage-based cross-frame authentication handshake

---

## 2. Business / Strategic Driver

### 2.1 Business Drivers

| Driver | Description |
|--------|-------------|
| **Digital Skills Development** | Deliver structured, AI-enhanced learning to MSME operators and professionals through a managed LMS |
| **MSME Capability Building** | Provide competency-assessed, certificate-bearing learning pathways aligned to MSME market needs |
| **Enterprise Platform Consolidation** | Embed learning as a native capability within the broader Kumii platform rather than a stand-alone tool |
| **AI-Driven Learning Quality** | Use OpenAI to generate personalised assessment feedback, improving learning outcomes at scale |
| **Digital Innovation** | Deploy modern cloud-native infrastructure (Vercel, Supabase, Jitsi) to reduce operating costs and time-to-value |
| **Compliance & Credentialing** | Issue verifiable PDF certificates on assessment completion, supporting professional development records |

---

## 3. Architecture Domains Impacted

| Domain | Impact Description |
|--------|--------------------|
| **Business Architecture** | Introduction of new digital business capability: "Managed Digital Learning & Competency Certification" |
| **Application Architecture** | New React SPA (iframe-native); new Express REST API; new Admin CMS portal; new live session module |
| **Data Architecture** | 16-migration PostgreSQL schema (courses, modules, enrolments, assessments, submissions, certificates, profiles, grades, live_sessions, session_rsvps) |
| **Integration Architecture** | Supabase Auth + DB + Storage; OpenAI API (assessment feedback); Resend API (transactional email); Jitsi Meet (video); postMessage (parent-child iframe) |
| **Technology Architecture** | Vite 5 + React 18 + CSS Modules + Express + Supabase + PDFKit + FullCalendar deployed on Vercel |
| **Security Architecture** | JWT-based authentication via postMessage handshake; Supabase Row Level Security; Helmet CSP; role-based access control (`learner` / `admin`) |

---

## 4. Current (Baseline) Architecture State

### 4.1 Baseline Situation

- No internal enterprise LMS existed within the Kumii platform
- Learners relied on:
  - External third-party learning platforms with no Kumii integration
  - Manual content distribution with no progress tracking
- No enterprise-level assessment engine, grading rules, or certificate issuance
- No CMS-governed course content workflow
- No internal live session scheduling or video conferencing capability
- No AI-assisted feedback loop on assessments
- No standardised learner credential or certificate record

---

## 5. Proposed (Target) Architecture State

### 5.1 Target Architecture Overview

The Kumii Learning Hub introduces the following layered architecture:

#### Presentation Layer
- React 18 (Vite 5) single-page application
- CSS Modules — scoped, zero-global-leakage styling
- FullCalendar 6 for live session scheduling UI
- ApexCharts for analytics visualisation
- Feather Icons for consistent iconography
- Responsive layouts optimised for desktop and tablet

#### Application Services Layer

| Service | Capability |
|---------|------------|
| Course Service | CMS-managed course catalogue; enrolment; progress tracking |
| Module Service | Ordered, typed content units (text, video, PDF) |
| Assessment Service | Quiz auto-grading; assignment/project manual grading |
| Grading Service | Configurable pass marks; submission scoring |
| Certificate Service | PDF generation (PDFKit); issuance trigger on pass; Resend email delivery |
| Live Sessions Service | Jitsi Meet room provisioning; RSVP management; LIVE NOW detection |
| AI Service | OpenAI GPT assessment feedback; skill gap analysis |
| Admin CMS Service | Course CRUD; module management; learner oversight; analytics |

#### Integration Layer
- **Supabase**: PostgreSQL persistence + Auth (JWT validation) + Storage (video/PDF assets)
- **OpenAI API**: Assessment feedback generation (non-blocking, graceful degradation)
- **Resend API**: Certificate issuance transactional email
- **Jitsi Meet** (`meet.jit.si`): Zero-cost, zero-account iframe-embedded video rooms
- **postMessage**: Secure cross-frame JWT handshake with Kumii parent platform

#### Deployment Layer
- Vercel (static client build + serverless-compatible Express API)
- Environment secrets managed via `.env` (never committed)
- 16 versioned Supabase SQL migrations under `supabase/migrations/`

### 5.2 Key Architectural Characteristics

| Attribute | Design Decision |
|-----------|----------------|
| **Integration Style** | REST (internal); postMessage (cross-frame auth); REST pull (Jitsi, OpenAI, Resend) |
| **Authentication** | Delegated to Kumii host via postMessage JWT; validated via Supabase `auth.getUser()` |
| **Authorisation** | Role-based: `learner` (default) / `admin`; enforced in Express middleware + Supabase RLS |
| **Data Storage** | Supabase PostgreSQL; Supabase Storage (media); no local disk persistence |
| **Certificate Delivery** | PDFKit stream → Supabase Storage → signed URL → Resend email |
| **Video Platform** | Jitsi Meet (public server); deterministic room naming `kumii-{session-uuid}` |
| **AI Integration** | Non-blocking; fallback to standard feedback if OpenAI unavailable |
| **Scalability** | Stateless Express API; Supabase connection pooling; client-side pagination |
| **Compliance** | Supabase RLS on all tables; Helmet security headers; no PII exposed to third parties |

---

## 6. Request for Change Classification

### 6.1 Classification

> **Incremental Change** — The Learning Hub is introduced as a new bounded module within the existing Kumii platform. It does not re-architect existing Kumii host capabilities but establishes a new capability domain (Learning & Certification) via iframe integration. Architecture Work is advised to govern external API dependency lifecycle and data schema evolution.

---

## 7. Architecture Impact Assessment

### 7.1 Business Impact

| Area | Impact |
|------|--------|
| **Users (Learners)** | Structured course access, progress tracking, AI-enhanced assessments, certificate issuance, live session attendance |
| **Users (Admins)** | Full CMS governance: course/module authoring, assessment configuration, learner management, analytics dashboard |
| **Business Processes** | Replaces manual learning distribution; introduces automated grading and credentialing workflows |
| **Capabilities Introduced** | "Digital Learning", "Competency Assessment", "Credential Issuance", "Live Session Delivery" |

### 7.2 Application Impact

| Aspect | Impact |
|--------|--------|
| **New Systems** | Yes — Kumii Learning Hub (LMS), Kumii Admin CMS |
| **Modified Systems** | Kumii Platform (host) — receives postMessage events from Learning Hub |
| **External Dependencies** | Supabase, OpenAI, Resend, Jitsi Meet (meet.jit.si) |
| **Coupling** | Loose: iframe embedding; event-driven postMessage; REST APIs |
| **Maintainability** | High — layered architecture (routes → controllers → services), CSS Modules, versioned DB migrations |

### 7.3 Data Impact

| Aspect | Impact |
|--------|--------|
| **Schema** | 16 versioned migrations: `courses`, `modules`, `enrolments`, `assessments`, `submissions`, `certificates`, `profiles`, `grades`, `live_sessions`, `session_rsvps` |
| **Data Ownership** | Kumii (all learner/course/certificate data); External (OpenAI feedback — ephemeral) |
| **Storage** | Supabase Storage (course videos, PDFs, certificate files) |
| **Persistence** | Full — all learner progress, grades, certificates persisted |
| **PII** | Learner profile data (name, email) stored in Supabase under RLS; not shared externally |
| **Certificates** | PDF stored in Supabase Storage; URL delivered via Resend; no third-party retention |

### 7.4 Integration Impact

| Integration | Risk | Assessment |
|-------------|------|------------|
| **Supabase Auth + DB** | Low | Core dependency; production-grade; RLS enforced |
| **Supabase Storage** | Low | Used for course media and certificate PDFs |
| **OpenAI API** | Medium | Non-critical path; graceful degradation implemented |
| **Resend API** | Low | Transactional only; fire-and-forget on certificate issuance |
| **Jitsi Meet (meet.jit.si)** | Medium | Public server; no SLA; enterprise Jitsi self-hosting recommended for production |
| **postMessage (Kumii Host)** | Low | Origin-validated; strictly typed message schema |

**Mitigations:**
- All external API calls are wrapped in `try/catch` with graceful degradation
- OpenAI failures do not block assessment submission or grading
- Resend failures do not block certificate issuance (fire-and-forget)
- Jitsi iframe uses `AbortController`-equivalent via room-name determinism; falls back to external URL
- postMessage validates `event.origin` against allowlist; never uses `"*"` wildcard

### 7.5 Security & Compliance Impact

| Area | Assessment |
|------|------------|
| **Authentication** | JWT delegated from Kumii host; validated server-side via Supabase `auth.getUser()` |
| **Authorisation** | Express `requireRole()` middleware; Supabase Row Level Security on all tables |
| **Data Classification** | Learner data (restricted); Course content (internal); Certificates (restricted) |
| **PII Exposure** | Name + email stored in `profiles`; not forwarded to OpenAI or Jitsi |
| **External Redirection** | Session join URLs are Jitsi `meet.jit.si` only; no user-supplied URL redirection |
| **HTTP Security** | Helmet.js (CSP, HSTS, X-Frame-Options, XSS protection) |
| **Secrets Management** | All API keys via environment variables; `.env` excluded from version control |
| **iframe Security** | `window.self !== window.top` detection; strict `postMessage` origin validation |

**Compliance posture:**
- No passwords stored (Supabase Auth)
- No plaintext secrets in repository
- HTTPS only (Vercel + Supabase)
- RLS enforced at database layer
- POPIA-aligned: minimal data collection, purpose-limited processing

### 7.6 Technology Impact

| Area | Impact |
|------|--------|
| **Frontend Stack** | React 18 + Vite 5 + CSS Modules + FullCalendar + ApexCharts |
| **Backend Stack** | Node.js + Express 4 + Supabase JS SDK + PDFKit + OpenAI SDK + Resend SDK |
| **Database** | Supabase PostgreSQL (managed); 16-migration versioned schema |
| **Hosting** | Vercel (frontend + API proxy); Supabase cloud (DB + Auth + Storage) |
| **DevOps** | GitHub (`kumii-dev/learning`); Vercel CI/CD on `main` push; no separate pipeline required |
| **Video** | Jitsi Meet public server (`meet.jit.si`); iframe-embedded; zero infrastructure cost |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Supabase outage | Low | High | Supabase 99.9% SLA; graceful loading states; retry on session restore |
| OpenAI API rate limiting / unavailability | Medium | Low | Non-blocking path; assessment submits without AI feedback |
| Jitsi public server degradation | Medium | Medium | Room URL stored in DB; fall back to external browser join |
| Resend email delivery failure | Low | Low | Fire-and-forget; certificate URL still accessible in-app |
| postMessage origin spoofing | Low | High | Strict origin validation in `authBridge.js`; never `"*"` |
| Database schema drift | Low | Medium | Versioned migrations (`001–016`); no direct schema edits |
| Vercel cold start latency | Low | Low | Lightweight Express; serverless-compatible; static SPA pre-built |
| PDF generation memory (large certs) | Low | Low | Streaming PDFKit pipeline; no full buffer in memory |

**Residual risk:** Acceptable for initial production deployment. Jitsi self-hosting to be considered at scale.

---

## 9. Roadmap & Dependencies

### 9.1 External Dependencies

| Dependency | Criticality | Notes |
|------------|------------|-------|
| Supabase (PostgreSQL + Auth + Storage) | **Critical** | Core persistence and identity layer |
| OpenAI API | Non-critical | AI feedback only; graceful degradation |
| Resend API | Low | Transactional email; non-blocking |
| Jitsi Meet (`meet.jit.si`) | Medium | Live sessions; self-host at scale |
| Vercel | High | Hosting and CI/CD |
| GitHub (`kumii-dev/learning`) | High | Version control and deployment trigger |

### 9.2 Roadmap Alignment (TOGAF ADM)

| TOGAF Phase | Activity |
|-------------|----------|
| **Phase A — Architecture Vision** | Capability introduction: Digital Learning within Kumii platform |
| **Phase B — Business Architecture** | Business capability mapping: Learning, Assessment, Certification, Live Delivery |
| **Phase C — Information Systems Architecture** | Data architecture (16-table schema); Application architecture (SPA + API + CMS) |
| **Phase D — Technology Architecture** | Stack deployment: Vite + React + Express + Supabase + Vercel |
| **Phase E — Opportunities & Solutions** | Jitsi self-hosting evaluation; OpenAI model fine-tuning; mobile-native wrapper |
| **Phase F — Migration Planning** | Phased data migration from legacy learner records; SCORM import consideration |
| **Phase G — Implementation Governance** | Architecture compliance reviews; API dependency governance; RLS audit |
| **Phase H — Architecture Change Management** | Continuous change management; RFC process for all subsequent significant changes |

### 9.3 Completed Milestones

| Milestone | Status | Commit |
|-----------|--------|--------|
| DB schema migrations 001–009 (core tables) | ✅ Complete | — |
| Migrations 010–015 (extensions + certificates) | ✅ Complete | — |
| MyLearning, file upload, Discover page | ✅ Complete | — |
| Certificate PDF generation + Resend email | ✅ Complete | `f13a1cd` |
| Admin assessment results page | ✅ Complete | `f13a1cd` |
| Migration 016: live_sessions + session_rsvps | ✅ Complete | `7abba66` |
| Jitsi Meet in-page video + RSVP system | ✅ Complete | `7abba66` |
| Admin Live Sessions scheduling CMS | ✅ Complete | `7abba66` |

---

## 10. Architecture Board Decision *(To Be Completed)*

| Decision Option | Selection |
|----------------|-----------|
| Approve | ☐ |
| Approve with Conditions | ☐ |
| Defer | ☐ |
| Reject | ☐ |
| Escalate | ☐ |

**Conditions / Notes**

> *[Architecture Board comments to be recorded here following review]*

---

## 11. Implementation Governance

If approved, the following architecture artefacts are to be produced and maintained:

- **Application Architecture Diagram** — iframe embedding topology; API service map
- **Integration Architecture View** — postMessage handshake; Supabase; OpenAI; Resend; Jitsi
- **Data Architecture View** — full ERD for 16-table schema; RLS policy matrix
- **Security Posture Statement** — JWT flow; RLS coverage; CSP policy; secrets management
- **Deployment Architecture View** — Vercel + Supabase topology; CI/CD pipeline

Compliance reviews to be conducted under:
- **ADM Phase G** — Architecture compliance reviews at each feature increment
- **ADM Phase H** — RFC process mandated for all changes classified as Incremental or above

---

## 12. Repository & Version Control

| Artefact | Location |
|----------|----------|
| **Source Code** | [https://github.com/kumii-dev/learning](https://github.com/kumii-dev/learning) |
| **Deployed Application** | Vercel (production branch: `main`) |
| **Database Migrations** | `supabase/migrations/001–016` (version-controlled in repository) |
| **Architecture Records** | Architecture Repository, this RFC document |
| **Environment Secrets** | Vercel Environment Variables (never in repository) |

---

## 13. Formal Control Statement

This Architecture Change introduces a new enterprise digital capability — a fully governed Learning Management System embedded within the Kumii platform — and establishes external API integrations with Supabase, OpenAI, Resend, and Jitsi Meet. It therefore requires formal governance approval under **TOGAF ADM Phase H**. No further production capability additions (new modules, external API integrations, schema changes exceeding two tables) shall proceed without a reviewed and approved Architecture Change Request. All incremental changes must follow the RFC process defined herein.

---

## 14. Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Enterprise Architect | | | |
| Architecture Board Chair | | | |
| Product Lead | | | |
| Digital Lead | | | |

---

*RFC-KLH-001 | Kumii Learning Hub | Version 1.0 | 20 May 2026*
