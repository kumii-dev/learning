-- ============================================================
-- supabase/migrations/004_seed_courses.sql
-- Kumii Learning Hub — seed 10 ESD programme courses with
-- modules and assessments.
-- Run via: Supabase Dashboard → SQL Editor
-- ============================================================

DO $$
DECLARE
  c1  uuid := gen_random_uuid(); -- Plumbing Incubator Programme
  c2  uuid := gen_random_uuid(); -- Cleaning Incubator Programme
  c3  uuid := gen_random_uuid(); -- Spill Clean-Up and Environmental Compliance
  c4  uuid := gen_random_uuid(); -- Maritime Development Programme
  c5  uuid := gen_random_uuid(); -- Constructor Development Programme
  c6  uuid := gen_random_uuid(); -- Exporter Development Programme
  c7  uuid := gen_random_uuid(); -- Supplier Development: Industrial Maturity Assessment
  c8  uuid := gen_random_uuid(); -- Supplier Quality Management Programme
  c9  uuid := gen_random_uuid(); -- Business Support Services for SMMEs
  c10 uuid := gen_random_uuid(); -- Monitoring, Evaluation and Portfolio of Evidence
BEGIN

-- ══════════════════════════════════════════════════════════════
-- COURSES
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.courses (id, title, description, level, category, estimated_hours, tags, pass_mark, published, published_at, created_at)
VALUES

(c1,
 'Plumbing Incubator Programme',
 'This course equips black youth-owned SMMEs with practical plumbing knowledge, installation and maintenance skills, safety practices, equipment usage, troubleshooting capability, and quality-control discipline to improve sustainability and competitiveness in plumbing services. Covers basic plumbing principles, installation and maintenance of pipes, fixtures, geysers, showers and toilets, tool safety, repairs, equipment usage, and quality management control.',
 'Beginner–Intermediate', 'Technical Skills / ESD', 50,
 ARRAY['plumbing','SMME','tools','safety','maintenance'], 70, true, now(), now()),

(c2,
 'Cleaning Incubator Programme',
 'This course develops cleaning-sector SMMEs in hygiene, spillage removal, chemical handling, cleaning equipment usage, pest-control awareness, and quality-control systems. Covers basic cleaning, spillage removal, toilet cleaning, chemical usage, equipment usage, quality management control, and pest control.',
 'Beginner–Intermediate', 'Technical Skills / ESD', 50,
 ARRAY['cleaning','hygiene','chemicals','pest control','SMME'], 70, true, now(), now()),

(c3,
 'Spill Clean-Up and Environmental Compliance Programme',
 'This course prepares SMMEs for the hydrocarbon spill clean-up and recovery sector by covering spill remediation, incident reporting, OHS, waste manifests, contaminated water treatment, excavation, biopads, biosolve application, industrial-waste transportation, standards, market access, productivity improvement, and beneficiary exit planning. Aligned with NEMA, the National Water Act, OHS Act, and SABS Codes 0231 and 0232.',
 'Intermediate–Advanced', 'Environmental / Compliance / ESD', 100,
 ARRAY['spill cleanup','NEMA','NWA','waste','hydrocarbons','ESD'], 70, true, now(), now()),

(c4,
 'Maritime Development Programme',
 'This course supports black-owned SMMEs in the maritime sector, especially ship repair and maintenance services. Covers marine hull blasting, valve repair, navigation equipment, marine electrical repairs, waste management, hull cleaning, marine pollution combating, spray painting, life-saving appliance servicing, TNPA compliance, project management, customer service, financial management, and digital transformation.',
 'Intermediate', 'Maritime / Business Support / ESD', 100,
 ARRAY['maritime','TNPA','ship repair','compliance','ESD'], 70, true, now(), now()),

(c5,
 'Constructor Development Programme',
 'This course develops construction-sector SMMEs in site operations, scheduling, workforce management, cash flow, costing and pricing, bill of quantities, quality management, compliance, governance, Transnet procurement requirements, tender processes, and business development.',
 'Intermediate', 'Construction / Business Management / ESD', 65,
 ARRAY['construction','tendering','costing','project management','ESD'], 70, true, now(), now()),

(c6,
 'Exporter Development Programme',
 'This course prepares SMMEs in PPE, cleaning consumables, and engineering services for export readiness. Covers needs assessment, baseline analysis, export documentation, product development, quality control, supply chain, logistics, regulatory compliance, Kaizen, HS codes, IP, advanced exporter training, market access, capital equipment funding, productivity improvement, ISO standards, export missions, and exit strategy.',
 'Intermediate–Advanced', 'Export Readiness / Market Access / ESD', 120,
 ARRAY['export','HS codes','IP','ISO','market access','ESD'], 70, true, now(), now()),

(c7,
 'Supplier Development: Industrial Maturity Assessment',
 'This course develops black-owned SMMEs through industrial maturity assessment training, including auditing, operational management, capacity assessments, method times, QRQC, 8D, non-conformance management, root-cause analysis, PFMEA, RPN, and lean manufacturing.',
 'Intermediate–Advanced', 'Supplier Development / Manufacturing / Quality', 75,
 ARRAY['auditing','QRQC','8D','PFMEA','lean','supplier development'], 70, true, now(), now()),

(c8,
 'Supplier Quality Management Programme',
 'This course prepares ESD beneficiaries to improve their quality systems and meet quality, environmental, health and safety, food safety, and occupational health and safety standards. Covers SANS/ISO 9001, ISO 14001, ISO 45001, ISO 22000 training, certification, product testing, technical support, accreditation, and closeout reporting.',
 'Intermediate–Advanced', 'ISO Standards / Quality / Compliance', 100,
 ARRAY['ISO 9001','ISO 14001','ISO 45001','ISO 22000','quality','compliance'], 70, true, now(), now()),

(c9,
 'Business Support Services for SMMEs',
 'This course strengthens SMME sustainability through core business management, labour relations, contract management, supplier relationship management, business model development, financial management, budgeting, marketing, PR, operational management, social media visibility, B2B sales, governance, compliance, and beneficiary exit planning. Applicable to all ESD beneficiaries.',
 'Beginner–Intermediate', 'Business Management / Entrepreneurship', 70,
 ARRAY['business management','finance','marketing','governance','entrepreneurship'], 70, true, now(), now()),

(c10,
 'Monitoring, Evaluation and Portfolio of Evidence',
 'This course addresses the RFP requirements for KPIs, progress reporting, review meetings, closeout reports, portfolio of evidence, and monitoring and evaluation audit readiness. Designed for programme administrators, coaches, and beneficiary leads.',
 'Intermediate', 'Programme Management / Reporting', 25,
 ARRAY['M&E','KPI','reporting','POE','closeout','programme management'], 70, true, now(), now());


-- ══════════════════════════════════════════════════════════════
-- MODULES — Course 1: Plumbing Incubator Programme
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.modules (course_id, title, content, "order", created_at) VALUES
(c1, 'Basic Plumbing Principles',
 'Water supply systems, drainage systems, pressure, flow, pipe layouts, and common plumbing terminology.',
 1, now()),
(c1, 'Plumbing Installation and Maintenance',
 'Pipes, fittings, fixtures, geysers, showers, toilets, taps, and preventive maintenance routines.',
 2, now()),
(c1, 'Plumbing Tools and Safety',
 'Safe use of plumbing tools, PPE, site safety, handling equipment, and basic OHS awareness.',
 3, now()),
(c1, 'Troubleshooting and Repairs',
 'Diagnosing leaks, blockages, low pressure, faulty fixtures, and common repair workflows.',
 4, now()),
(c1, 'Plumbing Equipment Usage and Maintenance',
 'Proper use, storage, inspection, and basic maintenance of plumbing equipment.',
 5, now()),
(c1, 'Quality Management Control for Plumbing Work',
 'Checklists, workmanship standards, defect prevention, customer handover, and service quality controls.',
 6, now());

-- ══════════════════════════════════════════════════════════════
-- MODULES — Course 2: Cleaning Incubator Programme
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.modules (course_id, title, content, "order", created_at) VALUES
(c2, 'Basic Cleaning and Hygiene Principles',
 'Cleaning standards, hygiene principles, infection prevention, sanitation routines, and worksite preparation.',
 1, now()),
(c2, 'Spillage Removal and Toilet Cleaning',
 'Safe removal of spills, toilet-cleaning procedures, contamination control, and cleaning sequence.',
 2, now()),
(c2, 'Cleaning Chemical Usage',
 'Chemical types, dilution, safe handling, labelling, storage, and risk prevention.',
 3, now()),
(c2, 'Cleaning Equipment Usage and Maintenance',
 'Use and care of mops, vacuum cleaners, scrubbers, PPE, and basic equipment maintenance.',
 4, now()),
(c2, 'Pest Control Fundamentals',
 'Pest inspection, extermination principles, prevention, reporting, and safe escalation.',
 5, now()),
(c2, 'Cleaning Quality Management Control',
 'Cleaning checklists, inspection routines, service-level quality, and customer satisfaction monitoring.',
 6, now());

-- ══════════════════════════════════════════════════════════════
-- MODULES — Course 3: Spill Clean-Up and Environmental Compliance
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.modules (course_id, title, content, "order", created_at) VALUES
(c3, 'Spill Clean-Up Sector Orientation',
 'Hydrocarbon spill-cleanup market, roles, opportunities, risks, and SMME positioning.',
 1, now()),
(c3, 'Needs Assessment and SWOT Analysis',
 'Strengths, weaknesses, opportunities, threats, skills gaps, revenue streams, compliance gaps, and growth aspirations.',
 2, now()),
(c3, 'Spill Site Management and Remediation',
 'Site containment, remediation workflow, incident control, affected-area restoration, and site handover.',
 3, now()),
(c3, 'Environmental Incident Reporting',
 'Reporting under NEMA and National Water Act requirements, including documentation discipline.',
 4, now()),
(c3, 'Occupational Health and Safety for Spill Response',
 'OHS Act requirements, PPE, hazard identification, emergency procedures, and safe work practices.',
 5, now()),
(c3, 'Waste Manifest and Disposal Certification',
 'Waste documentation, disposal certificates, chain of custody, and audit-ready record keeping.',
 6, now()),
(c3, 'Contaminated Water and Hydrocarbon Treatment',
 'Pumping, treatment, handling, disposal, and borehole/trench contamination controls.',
 7, now()),
(c3, 'Excavation, Backfilling and Site Restoration',
 'Excavation of contaminated material, clean backfilling, repair, cleaning and replacement procedures.',
 8, now()),
(c3, 'Biopads and Biosolve Application',
 'Creation and management of biopads, hydrocarbon breakdown methods, and remediation monitoring.',
 9, now()),
(c3, 'Industrial Waste Transportation and Disposal',
 'Transport procedures aligned to SABS Codes 0231 and 0232 and compliant disposal practices.',
 10, now()),
(c3, 'Market Access, Capital Equipment and Productivity',
 'Market linkages, funding pathways, productivity improvement, standards training, and reducing single-client dependency.',
 11, now()),
(c3, 'Beneficiary Exit Strategy',
 'Transition planning, independent operation readiness, and post-programme sustainability.',
 12, now());

-- ══════════════════════════════════════════════════════════════
-- MODULES — Course 4: Maritime Development Programme
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.modules (course_id, title, content, "order", created_at) VALUES
(c4, 'Maritime Industry Orientation',
 'Overview of TNPA operating regions, maritime value chain, compliance environment, and service opportunities.',
 1, now()),
(c4, 'Marine Hull Sand/Water Blasting',
 'Surface preparation, blasting principles, safety, equipment, and quality checks.',
 2, now()),
(c4, 'Marine Valves and Navigation Equipment Repairs',
 'Basic maintenance, fault identification, repair workflow, and documentation.',
 3, now()),
(c4, 'Marine Electrical Repairs',
 'Electrical safety, fault reporting, basic maintenance standards, and escalation.',
 4, now()),
(c4, 'Galley and Garbage Waste Management',
 'Waste-handling procedures, environmental controls, and compliant disposal practices.',
 5, now()),
(c4, 'Hull Cleaning and Marine Pollution Combating',
 'Hull-cleaning methods, pollution prevention, emergency response, and environmental protection.',
 6, now()),
(c4, 'Marine Spray Painting',
 'Surface preparation, paint application, safety, finishing standards, and inspection.',
 7, now()),
(c4, 'Marine Life-Saving Appliances',
 'Servicing requirements, inspection records, compliance, and quality control.',
 8, now()),
(c4, 'Maritime Business Management',
 'Project management, costing, billing, invoicing, people management, and customer service.',
 9, now()),
(c4, 'TNPA Requirements, Compliance and Digital Revolution',
 'Understanding TNPA expectations, compliance obligations, and digital tools for maritime SMMEs.',
 10, now()),
(c4, 'Market Linkages and Exit Strategy',
 'Diversifying clients, building partnerships, and planning graduation from the programme.',
 11, now());

-- ══════════════════════════════════════════════════════════════
-- MODULES — Course 5: Constructor Development Programme
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.modules (course_id, title, content, "order", created_at) VALUES
(c5, 'Construction Project Management',
 'Site operations, scheduling, workforce planning, project timelines, and work breakdown discipline.',
 1, now()),
(c5, 'Construction Cash Flow Management',
 'Cash flow control, progress payments, supplier payments, and sustainable project delivery.',
 2, now()),
(c5, 'Costing, Pricing and Bill of Quantities',
 'Estimating, pricing services, interpreting BOQs, and tender-stage costing.',
 3, now()),
(c5, 'Quality Management on Construction Sites',
 'Workmanship standards, inspections, defect control, and site quality checklists.',
 4, now()),
(c5, 'Compliance, Governance and Safety',
 'Industry regulations, contractual compliance, safety requirements, and Transnet procurement policies.',
 5, now()),
(c5, 'Tender Process and Submission Readiness',
 'Tender stages, mandatory documents, pricing schedule, evaluation criteria, and compliance checks.',
 6, now()),
(c5, 'Construction Business Development',
 'Marketing construction services, client acquisition, relationship building, and sustainability.',
 7, now());

-- ══════════════════════════════════════════════════════════════
-- MODULES — Course 6: Exporter Development Programme
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.modules (course_id, title, content, "order", created_at) VALUES
(c6, 'Export Readiness Needs Assessment',
 'SWOT, export capability, capacity, market presence, training needs, and baseline data.',
 1, now()),
(c6, 'Export Baseline and KPI Development',
 'Export volumes, revenue, market share, product offerings, operations, compliance, and KPIs.',
 2, now()),
(c6, 'Export Procedures and Documentation',
 'Export documents, customs process, compliance requirements, and shipment readiness.',
 3, now()),
(c6, 'Product Development and Quality Control',
 'Product improvement, quality checks, testing, customer requirements, and international expectations.',
 4, now()),
(c6, 'Supply Chain, Logistics and Transportation',
 'Export logistics, freight planning, supplier coordination, and supply chain optimization.',
 5, now()),
(c6, 'Kaizen and Continuous Improvement',
 'Waste reduction, problem solving, process improvement, monitoring, and innovation culture.',
 6, now()),
(c6, 'HS Code Classification',
 'Harmonized System codes, tariff and non-tariff barriers, customs compliance, and documentation.',
 7, now()),
(c6, 'Intellectual Property for Exporters',
 'Patents, trademarks, copyrights, brand protection, licensing, and IP dispute awareness.',
 8, now()),
(c6, 'Advanced Exporter Training',
 'International market research, export marketing, trade agreements, risk management, and mitigation.',
 9, now()),
(c6, 'Market Access and Linkages',
 'International buyers, trade partners, export promotion agencies, trade associations, e-commerce platforms, and feasibility studies.',
 10, now()),
(c6, 'Critical Capital Equipment Funding',
 'DFI and commercial bank funding, equipment upgrades, technology adoption, and capacity expansion.',
 11, now()),
(c6, 'Productivity Improvement',
 'Efficiency, waste reduction, cost control, and product-quality improvement.',
 12, now()),
(c6, 'ISO Standards for Export Sectors',
 'ISO 11612, ISO 11611, ISO 20471, ISO 14065, ISO 14001, ISO 19600, ISO 31000, and ISO 31010.',
 13, now()),
(c6, 'Export Market Plan and Export Missions',
 'Business-specific export market plan, foreign-market promotion, importer pitching, and mission readiness.',
 14, now()),
(c6, 'Exporter Exit Strategy',
 'Independent export operations, alumni networks, monitoring, and growth planning.',
 15, now());

-- ══════════════════════════════════════════════════════════════
-- MODULES — Course 7: Supplier Development: Industrial Maturity Assessment
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.modules (course_id, title, content, "order", created_at) VALUES
(c7, 'Industrial Maturity Assessment Orientation',
 'Supplier maturity concepts, assessment criteria, readiness gaps, and improvement planning.',
 1, now()),
(c7, 'Auditing Techniques',
 'Supply chain audits, generic audits, special process audits, audit preparation, evidence, and reporting.',
 2, now()),
(c7, 'Operational Management and Capacity Assessment',
 'Capacity assessment, method times, workflow analysis, productivity, and operational control.',
 3, now()),
(c7, 'Total Quality Management Systems',
 'QRQC, 8D problem solving, non-conformances, root-cause analysis, and corrective action.',
 4, now()),
(c7, 'PFMEA and Risk Priority Number',
 'Process Failure Mode Effects Analysis, RPN calculation, risk control, and mitigation planning.',
 5, now()),
(c7, 'Lean Manufacturing and Operational Efficiency',
 'Waste reduction, process flow, continuous improvement, standard work, and productivity.',
 6, now()),
(c7, 'Post-Training Support and Improvement Plan',
 'Coaching, action plans, maturity progress tracking, and evidence of improvement.',
 7, now());

-- ══════════════════════════════════════════════════════════════
-- MODULES — Course 8: Supplier Quality Management Programme
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.modules (course_id, title, content, "order", created_at) VALUES
(c8, 'Quality Management Systems: ISO 9001',
 'QMS principles, process approach, customer focus, documentation, internal audits, and certification readiness.',
 1, now()),
(c8, 'Environmental Management Systems: ISO 14001',
 'Environmental aspects, impacts, compliance obligations, waste, energy, and improvement plans.',
 2, now()),
(c8, 'Occupational Health and Safety: ISO 45001',
 'Hazard identification, risk assessment, controls, incident reporting, and worker participation.',
 3, now()),
(c8, 'Food Safety Management Systems: ISO 22000',
 'Food safety hazards, hygiene controls, traceability, monitoring, and corrective actions.',
 4, now()),
(c8, 'Certification Readiness and Accreditation',
 'Gap assessments, document control, implementation evidence, audit preparation, and registration.',
 5, now()),
(c8, 'Product Testing and Standards Compliance',
 'Product testing, national standards, specifications, corrective action, and testing records.',
 6, now()),
(c8, 'Quality System Portfolio of Evidence',
 'Policies, procedures, registers, training records, audits, non-conformances, and closeout evidence.',
 7, now());

-- ══════════════════════════════════════════════════════════════
-- MODULES — Course 9: Business Support Services for SMMEs
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.modules (course_id, title, content, "order", created_at) VALUES
(c9, 'Basic Business Management Skills',
 'Business planning, operations, roles, policies, and daily management discipline.',
 1, now()),
(c9, 'Labour Relations and People Management',
 'Employee relations, workplace conduct, conflict handling, and basic labour compliance.',
 2, now()),
(c9, 'Contract Management and Supplier Relationship Management',
 'Contract basics, SLA awareness, supplier obligations, performance management, and relationship governance.',
 3, now()),
(c9, 'Business Model Development',
 'Value proposition, customer segments, revenue streams, cost structure, and growth model.',
 4, now()),
(c9, 'Financial Management',
 'Invoicing, quoting, bookkeeping basics, pricing logic, and financial controls.',
 5, now()),
(c9, 'Budgeting and Cash Flow Management',
 'Budget preparation, cash flow forecasting, cost control, and working-capital awareness.',
 6, now()),
(c9, 'Marketing and Public Relations',
 'Brand visibility, customer communication, PR basics, and campaign planning.',
 7, now()),
(c9, 'Operational Management Skills',
 'SOPs, workflow, productivity, stock/equipment controls, and service delivery discipline.',
 8, now()),
(c9, 'Social Media Presence and Visibility',
 'Business profiles, content planning, digital credibility, and customer engagement.',
 9, now()),
(c9, 'Sales Leads and B2B Marketing',
 'Lead generation, industry events, networking, pipeline tracking, and conversion.',
 10, now()),
(c9, 'Governance and Compliance',
 'Company compliance, statutory documents, risk controls, ethical conduct, and record keeping.',
 11, now()),
(c9, 'Beneficiary Exit Strategy',
 'Graduation plan, independence readiness, market linkages, post-programme support, and sustainability.',
 12, now());

-- ══════════════════════════════════════════════════════════════
-- MODULES — Course 10: Monitoring, Evaluation and Portfolio of Evidence
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.modules (course_id, title, content, "order", created_at) VALUES
(c10, 'KPI Development and Milestone Tracking',
  'Programme targets, timelines, milestones, evidence, and performance indicators.',
  1, now()),
(c10, 'Progress Reporting',
  'Monthly reports, beneficiary progress, risk reporting, issue logs, and action tracking.',
  2, now()),
(c10, 'Portfolio of Evidence Preparation',
  'Attendance registers, assessment results, certificates, photos, work samples, and signed reports.',
  3, now()),
(c10, 'Closeout Reporting',
  'Final beneficiary outcomes, lessons learned, impact evidence, and recommendations.',
  4, now()),
(c10, 'Steering Committee Readiness',
  'Meeting packs, dashboards, decisions, escalations, and governance cadence.',
  5, now());


-- ══════════════════════════════════════════════════════════════
-- ASSESSMENTS
-- ══════════════════════════════════════════════════════════════

INSERT INTO public.assessments (course_id, type, title, pass_mark, questions, created_at) VALUES

-- Course 1: Plumbing
(c1, 'quiz', 'Plumbing Incubator Programme Assessment', 70,
 '[
   {"id":1,"type":"multiple_choice","question":"Which system is responsible for removing used water from a building?","options":["Water supply system","Drainage system","Pressure system","Flow system"],"correct":1},
   {"id":2,"type":"multiple_choice","question":"What does PPE stand for in a plumbing safety context?","options":["Pipe Pressure Equipment","Personal Protective Equipment","Professional Plumbing Expertise","Preventive Pipe Engineering"],"correct":1},
   {"id":3,"type":"multiple_choice","question":"Which tool is used to join copper pipes using heat?","options":["Pipe wrench","Soldering torch","Hacksaw","Pipe snake"],"correct":1},
   {"id":4,"type":"multiple_choice","question":"What is the first step when diagnosing a blocked drain?","options":["Replace the pipe","Apply chemical cleaner","Inspect for visible blockage or access points","Call a specialist immediately"],"correct":2},
   {"id":5,"type":"multiple_choice","question":"Which quality-control action best reduces rework on a plumbing job?","options":["Working faster","Using a pre-installation checklist","Skipping final inspection","Using cheaper materials"],"correct":1},
   {"id":6,"type":"scenario","question":"A geyser is leaking after installation. List three checks a plumber should perform before escalating the issue to a supervisor.","options":["Pressure valve, pipe joints, and temperature setting","Colour of pipes, brand of geyser, and floor material","Water meter reading, electricity bill, and roof height","None of the above"],"correct":0},
   {"id":7,"type":"multiple_choice","question":"What is the purpose of a P-trap in a plumbing system?","options":["To increase water pressure","To prevent sewer gases from entering the building","To filter drinking water","To reduce pipe noise"],"correct":1},
   {"id":8,"type":"multiple_choice","question":"When storing plumbing equipment after use, which practice is correct?","options":["Leave tools wet to prevent rust","Clean, dry, and store in a designated place","Stack tools in random order","Throw unused materials away"],"correct":1},
   {"id":9,"type":"multiple_choice","question":"Which OHS requirement applies when working in a confined plumbing space?","options":["No special requirement","Wear a hard hat only","Confined space entry permit and adequate ventilation","Sign in at reception"],"correct":2},
   {"id":10,"type":"checklist","question":"Which of the following items must appear on a plumbing job-completion handover checklist?","options":["Customer signature, leak test result, and materials used","Employee birthday and favourite tool","Pipe colour preference and office address","None of the above"],"correct":0}
 ]'::jsonb, now()),

-- Course 2: Cleaning
(c2, 'quiz', 'Cleaning Incubator Programme Assessment', 70,
 '[
   {"id":1,"type":"multiple_choice","question":"Which chemical class requires the most careful dilution control to prevent burns?","options":["Neutral detergents","Alkaline and acid-based cleaners","Air fresheners","Water softeners"],"correct":1},
   {"id":2,"type":"multiple_choice","question":"What is the correct sequence for cleaning a toilet?","options":["Flush, apply cleaner, scrub, wipe exterior, disinfect","Wipe exterior, scrub bowl, flush, apply cleaner","Apply cleaner, wait, scrub bowl, flush, wipe exterior, disinfect","Disinfect floor first, then wipe exterior"],"correct":2},
   {"id":3,"type":"scenario","question":"A large chemical spill occurs on a hard floor. What is the correct initial response?","options":["Mop immediately without PPE","Alert the team, don PPE, contain the spill, then remove using correct procedure","Ignore and let it dry","Pour water over it"],"correct":1},
   {"id":4,"type":"multiple_choice","question":"Which piece of PPE is most critical when handling concentrated cleaning chemicals?","options":["Safety boots only","Gloves and eye protection","Hard hat","High-visibility vest"],"correct":1},
   {"id":5,"type":"multiple_choice","question":"What does a cleaning quality inspection checklist typically verify?","options":["Number of staff on site","Completion of tasks to standard, surface cleanliness, and odour","Supervisor''s lunch break","Client''s carpet colour"],"correct":1},
   {"id":6,"type":"multiple_choice","question":"Which pest-control action should a cleaning SMME escalate to a registered pest-control operator?","options":["Sweeping up dead insects","Blocking entry points","Treating a rat infestation","Removing cobwebs"],"correct":2},
   {"id":7,"type":"multiple_choice","question":"What information must appear on a cleaning chemical label?","options":["Price and supplier name only","Product name, hazard symbols, dilution instructions, and first-aid guidance","Staff member''s name","Cleaning schedule date"],"correct":1},
   {"id":8,"type":"multiple_choice","question":"How often should mop heads typically be sanitised or replaced?","options":["Once a year","After every use or daily","Only when visibly dirty","Never"],"correct":1},
   {"id":9,"type":"multiple_choice","question":"Which action best prevents cross-contamination between areas?","options":["Using the same mop everywhere","Using colour-coded equipment per zone","Cleaning all areas in one pass","Not cleaning between tasks"],"correct":1},
   {"id":10,"type":"checklist","question":"A cleaning service-level quality check should include which of the following?","options":["Surface inspection, odour check, client sign-off, and completed task log","Equipment brand list and staff birthdays","Floor plan sketch and building permit","None of the above"],"correct":0}
 ]'::jsonb, now()),

-- Course 3: Spill Clean-Up
(c3, 'quiz', 'Spill Clean-Up and Environmental Compliance Assessment', 70,
 '[
   {"id":1,"type":"scenario","question":"A hydrocarbon spill occurs near a stormwater drain. What is the correct response sequence?","options":["Contain spill, prevent drain entry, notify responsible person, begin remediation","Dilute with water and wash into drain","Ignore if small","Photograph only and leave site"],"correct":0},
   {"id":2,"type":"multiple_choice","question":"Which South African Act governs the reporting of environmental incidents involving water resources?","options":["Labour Relations Act","National Water Act (NWA)","Companies Act","Consumer Protection Act"],"correct":1},
   {"id":3,"type":"multiple_choice","question":"What document must accompany the transport of hazardous waste?","options":["Invoice only","Waste manifest","Staff roster","Site map"],"correct":1},
   {"id":4,"type":"multiple_choice","question":"What is the purpose of a biopad in spill remediation?","options":["To block stormwater drains","To absorb and biodegrade hydrocarbon contamination","To store clean water","To mark the site boundary"],"correct":1},
   {"id":5,"type":"multiple_choice","question":"Which SABS Code governs the transport of dangerous goods by road?","options":["SABS Code 0231","SABS Code 0101","SABS Code 0450","SABS Code 0010"],"correct":0},
   {"id":6,"type":"multiple_choice","question":"What does NEMA stand for?","options":["National Environmental Management Act","National Energy Management Agency","New Engineering Methodology Act","None of the above"],"correct":0},
   {"id":7,"type":"multiple_choice","question":"Which PPE is mandatory during a hydrocarbon spill response?","options":["Only hard hat","Chemical-resistant gloves, goggles, and protective overalls","Steel-toe boots only","High-visibility vest only"],"correct":1},
   {"id":8,"type":"checklist","question":"A waste disposal certificate must include which of the following?","options":["Waste type, quantity, disposal site, date, and authorised signatory","Staff names and phone numbers only","Client''s personal details","Vehicle registration number only"],"correct":0},
   {"id":9,"type":"multiple_choice","question":"What is the main risk of allowing a hydrocarbon spill to reach a borehole?","options":["It improves water taste","It contaminates groundwater, making it unsafe","It increases water pressure","It has no effect"],"correct":1},
   {"id":10,"type":"scenario","question":"A beneficiary relies entirely on one large client for spill-cleanup contracts. What strategy should they adopt to reduce risk?","options":["Continue with one client for stability","Diversify by approaching multiple industries and clients","Reduce their service offering","Hire fewer staff"],"correct":1}
 ]'::jsonb, now()),

-- Course 4: Maritime
(c4, 'quiz', 'Maritime Development Programme Assessment', 70,
 '[
   {"id":1,"type":"multiple_choice","question":"Which organisation regulates port operations and maritime compliance in South Africa?","options":["SARS","TNPA (Transnet National Ports Authority)","SABS","Department of Labour"],"correct":1},
   {"id":2,"type":"multiple_choice","question":"What is the primary purpose of marine hull blasting?","options":["To paint a decorative finish","To remove rust and old coatings in preparation for repainting","To cool down the vessel","To test hull strength"],"correct":1},
   {"id":3,"type":"scenario","question":"A client complains that a valve repaired by your team is still leaking two days after completion. How should your SMME respond?","options":["Ignore the complaint","Return promptly, inspect the repair, document findings, and rectify at no charge if it was your fault","Blame the client","Send an invoice for extra charges"],"correct":1},
   {"id":4,"type":"multiple_choice","question":"Which pollution-combating control prevents oil spills from spreading in a harbour?","options":["Sand bags","Boom deployment and oil skimmer","Fire hose","Paint roller"],"correct":1},
   {"id":5,"type":"multiple_choice","question":"What does TNPA compliance for a maritime SMME primarily require?","options":["ISO 9001 only","Meeting port access, safety, environmental, and contractual standards","Only paying port fees","Having a website"],"correct":1},
   {"id":6,"type":"multiple_choice","question":"Which document must a life-saving appliance service provider maintain?","options":["Marketing brochure","Inspection and service records with dates, findings, and signatures","Monthly newsletter","Only a receipt"],"correct":1},
   {"id":7,"type":"multiple_choice","question":"What is the correct surface preparation step before marine spray painting?","options":["Apply paint directly","Clean, degrease, and prime the surface","Wet the surface with seawater","Skip preparation if in a hurry"],"correct":1},
   {"id":8,"type":"multiple_choice","question":"Which digital tool would most benefit a maritime SMME managing multiple ship repair jobs?","options":["Social media only","Project management and job-tracking software","A physical diary","None"],"correct":1},
   {"id":9,"type":"multiple_choice","question":"How should galley waste from a vessel be disposed of?","options":["Discharged into the harbour","Sorted and disposed of according to MARPOL and port waste-management procedures","Left on the vessel indefinitely","Burnt on deck"],"correct":1},
   {"id":10,"type":"checklist","question":"A TNPA compliance readiness check for a maritime SMME should include which items?","options":["Valid CIPC registration, safety plan, port access permit, insurance certificate, and trained staff","Colour of company vehicle and staff birthdays","Office lease and personal bank statements","None of the above"],"correct":0}
 ]'::jsonb, now()),

-- Course 5: Constructor
(c5, 'quiz', 'Constructor Development Programme Assessment', 70,
 '[
   {"id":1,"type":"calculation","question":"Your project has a contract value of R500,000. You have spent R200,000 on materials and labour. Your client has paid R150,000 to date. What is your current cash flow shortfall?","options":["R50,000","R300,000","R350,000","R150,000"],"correct":0},
   {"id":2,"type":"multiple_choice","question":"What does BOQ stand for in construction?","options":["Business Operational Query","Bill of Quantities","Budget Oversight Questionnaire","Building Operations Quality"],"correct":1},
   {"id":3,"type":"scenario","question":"Your construction team is two weeks behind schedule due to late material delivery. What is the first corrective action?","options":["Abandon the project","Notify the client, revise the programme, accelerate remaining activities, and document the cause","Ignore the delay","Reduce the workforce"],"correct":1},
   {"id":4,"type":"multiple_choice","question":"Which document in a tender submission sets out the price for each line item of work?","options":["Company profile","Pricing schedule / BOQ","Tax clearance certificate","Health and safety plan"],"correct":1},
   {"id":5,"type":"multiple_choice","question":"What is a construction quality inspection checklist used for?","options":["Recording employee attendance","Verifying that workmanship meets specified standards at each stage","Ordering materials","Calculating profit"],"correct":1},
   {"id":6,"type":"multiple_choice","question":"Which Transnet procurement requirement is most critical for SMMEs entering the supply chain?","options":["Having a Facebook page","Valid B-BBEE certificate, tax compliance, and CIPC registration","Owning a bakkie","None of the above"],"correct":1},
   {"id":7,"type":"multiple_choice","question":"What is the purpose of a work breakdown structure (WBS) in project management?","options":["To list employee benefits","To divide the project into manageable tasks with owners and timelines","To calculate VAT","To write the project report"],"correct":1},
   {"id":8,"type":"multiple_choice","question":"Which cash flow risk is most common for construction SMMEs?","options":["Receiving too much money upfront","Gap between spending on materials and labour before receiving a progress payment","Having too many clients","Using good quality materials"],"correct":1},
   {"id":9,"type":"multiple_choice","question":"What must a construction SMME include in a compliance file on site?","options":["Personal photos","OHS plan, method statements, material certificates, and insurance","Marketing materials","Receipts from a restaurant"],"correct":1},
   {"id":10,"type":"checklist","question":"A tender submission compliance checklist should include which documents?","options":["Tax clearance, B-BBEE certificate, company registration, pricing schedule, and health and safety plan","Only a company profile and bank statement","Staff photos and CVs only","None of the above"],"correct":0}
 ]'::jsonb, now()),

-- Course 6: Exporter
(c6, 'quiz', 'Exporter Development Programme Assessment', 70,
 '[
   {"id":1,"type":"multiple_choice","question":"What does an HS Code classify in international trade?","options":["Company registration number","Product category for customs and tariff purposes","Employee grade","Shipping vessel type"],"correct":1},
   {"id":2,"type":"scenario","question":"Your company has been selected for an export mission to Germany. What are the three most important preparations?","options":["Product samples, pricing in target currency, and compliance documentation","Personal passport, casual clothing, and a social media post","Flight tickets, hotel booking, and tourist map","None of the above"],"correct":0},
   {"id":3,"type":"multiple_choice","question":"Which market-entry strategy is most appropriate for a first-time SMME exporter with limited capital?","options":["Direct foreign investment","Indirect export through an export trading company or agent","Setting up a foreign subsidiary","No strategy needed"],"correct":1},
   {"id":4,"type":"multiple_choice","question":"Which ISO standard applies to personal protective equipment (PPE) for heat and flame resistance?","options":["ISO 9001","ISO 11612","ISO 45001","ISO 22000"],"correct":1},
   {"id":5,"type":"multiple_choice","question":"What is the purpose of a Letter of Credit in export transactions?","options":["To register a company","To guarantee payment from the buyer''s bank upon fulfillment of agreed terms","To book a flight","To apply for a business loan"],"correct":1},
   {"id":6,"type":"multiple_choice","question":"What does Kaizen mean in the context of export production?","options":["A Japanese dish","Continuous incremental improvement of processes and quality","A type of export license","A freight forwarder"],"correct":1},
   {"id":7,"type":"multiple_choice","question":"Which document describes a shipment''s contents, quantity, and value for customs clearance?","options":["Company profile","Commercial invoice and packing list","Business card","Staff list"],"correct":1},
   {"id":8,"type":"multiple_choice","question":"What is a tariff barrier in export trade?","options":["A physical wall at the border","A tax or duty imposed on imported goods","A language barrier","A shipping delay"],"correct":1},
   {"id":9,"type":"multiple_choice","question":"Which DFI in South Africa provides funding support to export-ready SMMEs?","options":["Reserve Bank","ECIC (Export Credit Insurance Corporation) and IDC","Department of Tourism","SASSA"],"correct":1},
   {"id":10,"type":"multiple_choice","question":"An export market plan should include which key elements?","options":["Target market analysis, product positioning, pricing strategy, and compliance requirements","Staff birthdays and office lease","Social media followers and website colour","None of the above"],"correct":0}
 ]'::jsonb, now()),

-- Course 7: Supplier Development
(c7, 'quiz', 'Supplier Development: Industrial Maturity Assessment', 70,
 '[
   {"id":1,"type":"calculation","question":"A process has a Severity of 8, Occurrence of 6, and Detection of 4. What is the Risk Priority Number (RPN)?","options":["18","192","48","72"],"correct":1},
   {"id":2,"type":"multiple_choice","question":"In 8D problem solving, what does D4 refer to?","options":["Define the team","Define root cause(s)","Define the problem","Define corrective actions"],"correct":1},
   {"id":3,"type":"matching","question":"Match each quality tool to its primary function: QRQC / PFMEA / Lean / 8D","options":["QRQC=Quick response quality control; PFMEA=Risk analysis before failure; Lean=Waste elimination; 8D=Structured problem solving","QRQC=Financial reporting; PFMEA=Marketing; Lean=Hiring; 8D=Budgeting","All are the same tool","None of the above"],"correct":0},
   {"id":4,"type":"scenario","question":"A supplier delivers parts with recurring dimensional defects. Which structured approach should be used to permanently resolve this?","options":["Accept the defects and continue","Use 8D problem solving to identify root cause and implement permanent corrective action","Replace the supplier immediately without investigation","Ignore the issue"],"correct":1},
   {"id":5,"type":"multiple_choice","question":"What is the purpose of a special process audit?","options":["To check company branding","To verify that critical manufacturing processes meet defined standards and controls","To assess marketing strategy","To evaluate office cleanliness"],"correct":1},
   {"id":6,"type":"multiple_choice","question":"Which lean waste type refers to producing more than is currently needed?","options":["Waiting","Overproduction","Motion","Defects"],"correct":1},
   {"id":7,"type":"multiple_choice","question":"What does method time measurement involve?","options":["Measuring employee height","Timing tasks to establish standard work durations and identify efficiency improvements","Counting office supplies","Reviewing salary structures"],"correct":1},
   {"id":8,"type":"checklist","question":"An audit-readiness checklist for a supplier should include which items?","options":["Current procedures, training records, equipment calibration certificates, non-conformance log, and corrective actions","Staff photos and personal details","Company colours and logo","None of the above"],"correct":0},
   {"id":9,"type":"multiple_choice","question":"What is the primary purpose of a PFMEA?","options":["To plan a marketing campaign","To proactively identify and mitigate potential process failures before they occur","To calculate employee bonuses","To design a product"],"correct":1},
   {"id":10,"type":"multiple_choice","question":"Which action plan output is expected after an industrial maturity assessment?","options":["A list of company achievements","A prioritised improvement plan with owners, timelines, and evidence milestones","A new company logo","A recruitment plan"],"correct":1}
 ]'::jsonb, now()),

-- Course 8: Supplier Quality Management
(c8, 'quiz', 'Supplier Quality Management Programme Assessment', 70,
 '[
   {"id":1,"type":"multiple_choice","question":"Which ISO standard specifically addresses Quality Management Systems?","options":["ISO 14001","ISO 9001","ISO 45001","ISO 22000"],"correct":1},
   {"id":2,"type":"multiple_choice","question":"Which ISO standard addresses Environmental Management Systems?","options":["ISO 9001","ISO 22000","ISO 14001","ISO 45001"],"correct":2},
   {"id":3,"type":"scenario","question":"An internal audit finds that your company has no documented procedure for handling non-conforming products. What is the correct action?","options":["Ignore it until the next audit","Document the non-conformance, develop and implement a corrective action procedure, and verify effectiveness","Blame the auditor","Close the company"],"correct":1},
   {"id":4,"type":"checklist","question":"A certification readiness checklist for ISO 9001 should include which elements?","options":["Documented quality policy, process maps, internal audit results, management review minutes, and corrective action records","Staff birthdays and company photos","Only the quality policy","None of the above"],"correct":0},
   {"id":5,"type":"multiple_choice","question":"Why does product testing support regulatory compliance?","options":["It is required only for export","It provides objective evidence that products meet defined standards, supporting certification and customer confidence","It replaces the need for a QMS","It is optional for all companies"],"correct":1},
   {"id":6,"type":"multiple_choice","question":"Which ISO standard is specifically relevant to food safety management?","options":["ISO 45001","ISO 9001","ISO 14001","ISO 22000"],"correct":3},
   {"id":7,"type":"multiple_choice","question":"In ISO 45001, what is the primary focus?","options":["Product quality","Environmental management","Occupational health and safety","Food safety"],"correct":2},
   {"id":8,"type":"multiple_choice","question":"What is a gap assessment used for in ISO certification preparation?","options":["To measure physical gaps in a building","To identify where the current management system does not yet meet ISO requirements","To assess marketing gaps","To calculate profit"],"correct":1},
   {"id":9,"type":"multiple_choice","question":"What must a portfolio of evidence for an ISO audit typically contain?","options":["Policies, procedures, training records, audit reports, and non-conformance logs","Only the company registration","Staff photos and social media screenshots","None of the above"],"correct":0},
   {"id":10,"type":"multiple_choice","question":"Which corrective action is most appropriate after a food safety non-conformance is detected?","options":["Continue production and monitor","Stop affected production, investigate root cause, implement corrective action, and verify effectiveness","Reduce product testing frequency","Ignore if the product looks fine"],"correct":1}
 ]'::jsonb, now()),

-- Course 9: Business Support Services
(c9, 'quiz', 'Business Support Services for SMMEs Assessment', 70,
 '[
   {"id":1,"type":"multiple_choice","question":"What is the primary purpose of a business plan?","options":["To impress investors only","To define the business direction, strategy, operations, and financial projections","To satisfy government registration requirements","To list staff names"],"correct":1},
   {"id":2,"type":"multiple_choice","question":"Which document governs the employment relationship between an SMME and its employees?","options":["Company profile","Employment contract and the Basic Conditions of Employment Act","Marketing brochure","Tax return"],"correct":1},
   {"id":3,"type":"multiple_choice","question":"What is a value proposition in a business model?","options":["A financial loan","The unique benefit your business offers to customers that competitors do not","A tax deduction","An employee benefit"],"correct":1},
   {"id":4,"type":"multiple_choice","question":"What is the purpose of cash flow forecasting?","options":["To impress the bank","To predict when money will come in and go out, allowing the business to plan and avoid shortfalls","To calculate share value","To design a marketing campaign"],"correct":1},
   {"id":5,"type":"scenario","question":"Your SMME has not been paid by a client for 60 days. What is the correct escalation process?","options":["Write off the debt immediately","Send a formal reminder, escalate to a demand letter, and consider legal action if unresolved","Stop all operations","Ignore it"],"correct":1},
   {"id":6,"type":"multiple_choice","question":"Which social media platform is most effective for B2B marketing in South Africa?","options":["TikTok only","LinkedIn for professional networking and business visibility","Snapchat","Pinterest"],"correct":1},
   {"id":7,"type":"multiple_choice","question":"What does an SOP (Standard Operating Procedure) help a business achieve?","options":["Higher staff salaries","Consistent, quality-controlled service delivery by all staff","Marketing visibility","Tax savings"],"correct":1},
   {"id":8,"type":"multiple_choice","question":"Which statutory document must a South African SMME maintain for compliance?","options":["Social media profile","CIPC registration, tax clearance, and B-BBEE certificate","Personal ID only","Travel diary"],"correct":1},
   {"id":9,"type":"multiple_choice","question":"What is the main benefit of a beneficiary exit strategy?","options":["To end the business","To ensure the SMME can operate independently and sustainably after programme support ends","To reduce costs","To hire more staff"],"correct":1},
   {"id":10,"type":"checklist","question":"A monthly financial management discipline for an SMME should include which items?","options":["Bank reconciliation, outstanding invoices review, expense tracking, and cash flow forecast update","Staff birthday list and office decor budget","Social media follower count","None of the above"],"correct":0}
 ]'::jsonb, now()),

-- Course 10: M&E and POE
(c10, 'quiz', 'Monitoring, Evaluation and Portfolio of Evidence Assessment', 70,
 '[
   {"id":1,"type":"multiple_choice","question":"What is a KPI?","options":["Key Procurement Invoice","Key Performance Indicator","Knowledge and Progress Index","Known Project Issue"],"correct":1},
   {"id":2,"type":"multiple_choice","question":"What is the primary purpose of a monthly progress report?","options":["To replace the programme manager","To track beneficiary progress, highlight risks, and inform stakeholders","To market the programme","To calculate staff salaries"],"correct":1},
   {"id":3,"type":"multiple_choice","question":"Which document provides physical evidence that a beneficiary attended a training session?","options":["Invoice","Attendance register with signatures","Email newsletter","Social media post"],"correct":1},
   {"id":4,"type":"multiple_choice","question":"What is a closeout report used for?","options":["Closing a bank account","Documenting final programme outcomes, lessons learned, and recommendations","Closing the office","Ending staff contracts"],"correct":1},
   {"id":5,"type":"scenario","question":"A steering committee meeting is in two days and no dashboard has been prepared. What should the programme manager do?","options":["Cancel the meeting","Compile a summary dashboard showing programme progress, risks, decisions required, and beneficiary status","Attend without preparation","Send an email instead"],"correct":1}
 ]'::jsonb, now());

END $$;
