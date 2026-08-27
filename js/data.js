/* =====================================================================
   Stellantis Annual Manufacturing Operations Portal — Demo Data Model
   ---------------------------------------------------------------------
   All data below is FICTIONAL DEMO DATA constructed for a UI/UX
   prototype. Plant names are illustrative examples only and do not
   represent real current operational status. Employee names are
   fictional. No production system, mainframe, CHAMPS, or AWS
   integration exists — this file is the entire "backend" of the demo.
   ===================================================================== */

const MODEL_YEAR = 2027;
const PRIOR_MODEL_YEAR = 2026;

/* ---------------------------------------------------------------------
   PEOPLE (fictional demo personas)
   --------------------------------------------------------------------- */
const PEOPLE = {
  currentUser: { name: "R. Siroosian", role: "Plant IT Coordinator" },
  mariaLopez:   { name: "Maria Lopez",    title: "Plant MLM — Sterling Stamping" },
  alexChen:     { name: "Alex Chen",      title: "Plant IT — Sterling Stamping" },
  priyaNair:    { name: "Priya Nair",     title: "Application Team Lead" },
  tomReilly:    { name: "Tom Reilly",     title: "INIT Support Programmer" },
  janetKim:     { name: "Janet Kim",      title: "CHAMPS Team" },
  davidOrtiz:   { name: "David Ortiz",    title: "RDC Coordinator" },
  sandraWu:     { name: "Sandra Wu",      title: "Finance / Business Analyst" },
  marcusWebb:   { name: "Marcus Webb",    title: "Supply Chain Manager" },
  karenSilva:   { name: "Karen Silva",    title: "Plant MLM — Warren Stamping" },
  elenaVasquez: { name: "Elena Vasquez",  title: "Plant MLM — Kokomo Transmission" },
  jamesFoster:  { name: "James Foster",   title: "Approver / Manager" },
  linaOsei:     { name: "Lina Osei",      title: "Plant MLM — Jefferson North" },
  carlosDuarte: { name: "Carlos Duarte",  title: "Plant MLM — Saltillo Truck" },
  benWhitfield: { name: "Ben Whitfield",  title: "Plant MLM — Toledo Assembly" },
};

/* ---------------------------------------------------------------------
   ROLES — simulated role switcher
   --------------------------------------------------------------------- */
const ROLES = [
  "Plant MLM",
  "Plant IT Coordinator",
  "Application Team",
  "RDC",
  "Finance / Business",
  "CHAMPS Team",
  "Approver / Manager",
];

/* My Actions per role — shown on Overview dashboard */
const MY_ACTIONS = {
  "Plant MLM": [
    { label: "Approve Plant Buy-Off — Sterling Stamping Initialization", link: { view: "init", plant: "STL" } },
    { label: "Review Supplier Release Exception — Warren Stamping", link: { view: "myopening" } },
    { label: "Confirm Business Validation — Jefferson North API", link: { view: "api", plant: "JNA" } },
  ],
  "Plant IT Coordinator": [
    { label: "Verify Receiving Region Lockdown — Sterling Stamping", link: { view: "init", plant: "STL" } },
    { label: "Confirm SU99 Configuration — Sterling Stamping", link: { view: "init", plant: "STL" } },
    { label: "Review Initialization Test Parts — Sterling Stamping", link: { view: "init", plant: "STL" } },
  ],
  "Application Team": [
    { label: "Review API Count Exception — Kokomo Transmission", link: { view: "api", plant: "KOK" } },
    { label: "Provide INIT Support Buy-Off — Sterling Stamping", link: { view: "init", plant: "STL" } },
    { label: "Verify PMR / PPR Tables — Warren Stamping API", link: { view: "api", plant: "WRN" } },
  ],
  "RDC": [
    { label: "Confirm Receiving Region Restart — Kokomo Transmission", link: { view: "api", plant: "KOK" } },
    { label: "Verify Batch Hold Status — Saltillo Truck Initialization", link: { view: "init", plant: "SAL" } },
    { label: "Announce Region Up — Warren Stamping API", link: { view: "api", plant: "WRN" } },
  ],
  "Finance / Business": [
    { label: "Review API Variance — Kokomo Transmission", link: { view: "api", plant: "KOK" } },
    { label: "Approve API Finalization — Jefferson North", link: { view: "api", plant: "JNA" } },
    { label: "Review Cost Rollover Readiness", link: { view: "costrollover" } },
  ],
  "CHAMPS Team": [
    { label: "Validate CHAMPS Initialization Date — Sterling Stamping", link: { view: "init", plant: "STL" } },
    { label: "Confirm CHAMPS File Receipt — Jefferson North", link: { view: "init", plant: "JNA" } },
    { label: "Monitor CHAMPS Queue — Multi-Plant Initialization", link: { view: "init", plant: "SAL" } },
  ],
  "Approver / Manager": [
    { label: "Review Pending Approvals (3)", link: { view: "approvals" } },
    { label: "Review Open Exceptions", link: { view: "exceptions" } },
    { label: "Approve Model Year Release — Saltillo Truck", link: { view: "myopening" } },
  ],
};

/* ---------------------------------------------------------------------
   PLANTS
   --------------------------------------------------------------------- */
const PLANTS = {
  STL: { code: "STL", plantCode: "06215", name: "Sterling Stamping", type: "Stamping", region: "Michigan", map: { x: 655, y: 172 } },
  WRN: { code: "WRN", plantCode: "06203", name: "Warren Stamping", type: "Stamping", region: "Michigan", map: { x: 693, y: 160 } },
  KOK: { code: "KOK", plantCode: "05111", name: "Kokomo Transmission", type: "Powertrain", region: "Indiana", map: { x: 588, y: 236 } },
  TOL: { code: "TOL", plantCode: "06612", name: "Toledo Assembly", type: "Assembly", region: "Ohio", map: { x: 652, y: 250 } },
  JNA: { code: "JNA", plantCode: "06844", name: "Jefferson North", type: "Assembly", region: "Michigan", map: { x: 673, y: 202 } },
  SAL: { code: "SAL", plantCode: "08474", name: "Saltillo Truck", type: "Assembly", region: "Coahuila, Mexico", map: { x: 418, y: 468 } },
};
const PLANT_ORDER = ["STL", "WRN", "KOK", "TOL", "JNA", "SAL"];

/* ---------------------------------------------------------------------
   INITIALIZATION — phase template (shared structure across plants)
   Source: Init Operations Document, INIT Checklist Manual, CMIS User Guide
   --------------------------------------------------------------------- */
const INIT_PHASE_DEFS = [
  {
    key: "planning",
    title: "Planning & Preparation",
    summary: "Initialization date confirmed and all support teams notified.",
    tasks: [
      "Initialization date confirmed via Initialization Date Control system",
      "Plant contact and outside phone number confirmed",
      "Support teams notified (CSDS, CHAMPS, CHEIRS, MGA, MQ Series Group)",
      "Change controls prepared for the initialization window",
      "Production calendar checked for conflicting month-end / prod-day runs",
      "Required system access identified for plant + application teams",
      "Initialization bulletin / documentation reviewed",
    ],
  },
  {
    key: "prevalidation",
    title: "Pre-Initialization Validation",
    summary: "Model year, series, and CHAMPS date parameters validated.",
    tasks: [
      "Model Year validation — SU99 Page 1 / Page 2",
      "Series validation — SU99 Page 1 / Page 2",
      "SU99 configuration confirmed (Cut-off release, URL number, Run Option)",
      "SU70 cost rollover switch and Model Year confirmed",
      "Release configuration checked against latest J*SS001 release report",
      "Stable CSDS flag validation — flag OFF through initialization window",
      "Test parts prepared for post-initialization verification",
      "CHAMPS Initialization Date validated (PHA5400T)",
      "Security lockdown preparation confirmed",
    ],
  },
  {
    key: "lockdown",
    title: "Plant Lockdown & Batch Preparation",
    summary: "Receiving region secured and daily/weekly/monthly batch validated.",
    warning: "Receipts or shipments processed during the initialization window can cause downstream data inconsistencies between the plant and CHAMPS.",
    tasks: [
      "Receiving region secured — SU16 / SU99 verified in sync",
      "Shipping transactions controlled (SH01, SH03, SH04 disabled via CEDA)",
      "Last receiving batch validated before shutdown",
      "Jobs placed on hold (J*IN720Z and related inventory jobs)",
      "Daily / weekly / monthly processing validated as complete",
    ],
  },
  {
    key: "processing",
    title: "Initialization Processing",
    summary: "Core initialization job stream executes — inventory prep through report generation.",
    hasTechDrawer: true,
    groups: [
      { name: "Inventory Preparation", detail: "Backup and freeze inventory files ahead of new model year processing." },
      { name: "New Series Processing", detail: "Series transition jobs run when the plant is changing single / dual / triple series." },
      { name: "Inventory Initialization", detail: "Inventory files created, initialized, and reloaded for the new model year." },
      { name: "Model-Year Parameter Updates", detail: "Series code and model year values updated across plant parameter files." },
      { name: "Batch Processing", detail: "In-system counts and offline counts processed and reconciled." },
      { name: "Report Generation", detail: "Validation reports generated for plant and application team review." },
    ],
  },
  {
    key: "buyoff",
    title: "Plant Review & Buy-Off",
    summary: "Governance gate — both plant and INIT Support must buy off before CHAMPS processing.",
    isGate: true,
  },
  {
    key: "champs",
    title: "CHAMPS Synchronization",
    summary: "Plant initialization data exchanged with CHAMPS and dates reconciled.",
    isChamps: true,
  },
  {
    key: "validation",
    title: "Validation & Restart",
    summary: "New model year confirmed operational and plant access restored.",
    tasks: [
      "New model year verified across plant screens (SI99, SI70)",
      "New series verified against stock status explode job",
      "User access restored",
      "Shipper transactions enabled (SH01 / SH03 / SH04) — SH09 shipper numbers updated",
      "Receiving region brought back to operational status",
      "Downstream files validated (VBOM, CHEIRS release)",
      "Plant final buy-off recorded",
    ],
  },
  {
    key: "complete",
    title: "Complete",
    summary: "Initialization closed out with full audit trail.",
    isComplete: true,
  },
];

/* Sample technical execution rows for the Phase 4 "Technical Execution Details" drawer */
function techRows(plantCode) {
  return [
    { step: "1", job: "J*IN705Z", validation: "Backup inventory packs", status: "Complete", by: "Application Team", time: "01:12" },
    { step: "2", job: "J*IN710Z", validation: "Backup inventory files used in processing", status: "Complete", by: "Application Team", time: "01:18" },
    { step: "3", job: "J*IN715Z", validation: "Freeze stock status", status: "Complete", by: "Application Team", time: "01:26" },
    { step: "4", job: "J*IN720Z", validation: "Create / initialize inventory files", status: "Complete", by: "Application Team", time: "01:34" },
    { step: "5", job: "J*IN725Z", validation: "Load RVMINVF file", status: "Complete", by: "Application Team", time: "01:41" },
    { step: "6", job: "J*IN760Z / J*IN761Z", validation: "Generate in-system file / data file", status: "Complete", by: "Application Team", time: "01:52" },
    { step: "7", job: "J*IN730I / J*IN735Z", validation: "Process in-system counts — CNT table check", status: "In Progress", by: "Application Team", time: "—" },
    { step: "8", job: "J*IN805Z", validation: "Series code update report — prior/current MY", status: "Not Started", by: "—", time: "—" },
    { step: "9", job: "J*IN840Z / 845Q / 846Q / 847Q", validation: "New series explode (series-dependent, mutually exclusive)", status: "Not Started", by: "—", time: "—" },
    { step: "10", job: "J*IN891Z", validation: "Send MY records to CHAMPS (hold point — dual buy-off required)", status: "Not Started", by: "—", time: "—" },
  ];
}

/* Checkpoint drawer detail content per phase key, used by the right-side drawer */
const INIT_CHECKPOINT_DETAIL = {
  planning: {
    description: "Confirms the initialization date, plant contact, and notifies all supporting teams (CSDS, CHAMPS, CHEIRS) ahead of the initialization window.",
    owner: PEOPLE.alexChen.name,
    team: "Plant IT",
    requiredBefore: "Pre-Initialization Validation",
    validationMethod: "Initialization Date Control system confirmation + email acknowledgement",
    tasks: [
      { label: "Initialization date confirmed", status: "pass" },
      { label: "Plant contact confirmed", status: "pass" },
      { label: "CSDS / CHAMPS / CHEIRS notified", status: "pass" },
      { label: "Change controls prepared", status: "pass" },
    ],
  },
  prevalidation: {
    description: "Validates SU99 model year, series, and CHAMPS initialization date parameters before any processing begins.",
    owner: PEOPLE.priyaNair.name,
    team: "Application Team",
    requiredBefore: "Plant Lockdown & Batch Preparation",
    validationMethod: "SU99 screen review + PHA5400T CHAMPS date comparison",
    tasks: [
      { label: "Verify SU99 Model Year", status: "pass" },
      { label: "Verify SU99 Series", status: "pass" },
      { label: "Confirm Book/Physical setting", status: "pass" },
      { label: "Confirm Run Option", status: "pass" },
      { label: "Validate CHAMPS Initialization Date", status: "warn" },
    ],
  },
  lockdown: {
    description: "Secures the receiving region and confirms no in-flight transactions before initialization jobs begin.",
    owner: PEOPLE.davidOrtiz.name,
    team: "RDC",
    requiredBefore: "Initialization Processing",
    validationMethod: "CEDA transaction status check + shift log entry",
    tasks: [
      { label: "Receiving region secured", status: "pass" },
      { label: "Shipping transactions disabled", status: "pass" },
      { label: "Last receiving batch validated", status: "pass" },
    ],
  },
  processing: {
    description: "Executes the core initialization job stream: inventory preparation, series processing, and report generation.",
    owner: PEOPLE.priyaNair.name,
    team: "Application Team",
    requiredBefore: "Plant Review & Buy-Off",
    validationMethod: "Job completion + PPR / PMR / CNT table verification",
    tasks: [
      { label: "Inventory preparation jobs complete", status: "pass" },
      { label: "In-system counts processed", status: "progress" },
      { label: "Reports generated for plant review", status: "pending" },
    ],
  },
  validation: {
    description: "Confirms the new model year is fully operational and restores plant access before initialization is closed out.",
    owner: PEOPLE.alexChen.name,
    team: "Plant IT",
    requiredBefore: "Complete",
    validationMethod: "Screen verification (SI99, SI70) + plant final buy-off",
    tasks: [
      { label: "New model year verified", status: "pending" },
      { label: "User access restored", status: "pending" },
      { label: "Shipper transactions enabled", status: "pending" },
      { label: "Plant final buy-off", status: "pending" },
    ],
  },
};

/* ---------------------------------------------------------------------
   Per-plant INIT state
   --------------------------------------------------------------------- */
const initState = {
  STL: {
    plantCode: "STL",
    currentMY: PRIOR_MODEL_YEAR,
    newMY: MODEL_YEAR,
    initDate: "Aug 22, 2026",
    plannedStart: "6:00 AM ET",
    owner: PEOPLE.alexChen.name,
    elapsedStart: Date.parse("2026-08-22T06:00:00"),
    currentPhase: 4, // index into INIT_PHASE_DEFS — Plant Review & Buy-Off (gate)
    phaseStatus: ["complete", "complete", "complete", "complete", "in_progress", "not_started", "not_started", "not_started"],
    plantApproval: { approved: true, approver: PEOPLE.mariaLopez.name, time: "2:42 PM" },
    initSupportApproval: { approved: false, approver: "", time: "" },
    champs: {
      plantDate: "Aug 22, 2026",
      champsDate: "Aug 22, 2026",
      mismatch: false,
      filesSent: false,
      processing: false,
      responseReceived: false,
      status: "NOT STARTED",
    },
    exceptionsEncountered: 0,
    auditRef: "INIT-STL-2027-001",
  },
  WRN: {
    plantCode: "WRN",
    currentMY: PRIOR_MODEL_YEAR,
    newMY: MODEL_YEAR,
    initDate: "Sep 12, 2026",
    plannedStart: "6:00 AM ET",
    owner: PEOPLE.karenSilva.name,
    currentPhase: 0,
    phaseStatus: ["not_started", "not_started", "not_started", "not_started", "not_started", "not_started", "not_started", "not_started"],
    plantApproval: { approved: false, approver: "", time: "" },
    initSupportApproval: { approved: false, approver: "", time: "" },
    champs: { plantDate: "Sep 12, 2026", champsDate: "Sep 12, 2026", mismatch: false, filesSent: false, processing: false, responseReceived: false, status: "NOT STARTED" },
    exceptionsEncountered: 0,
    auditRef: "INIT-WRN-2027-001",
  },
  KOK: {
    plantCode: "KOK",
    currentMY: PRIOR_MODEL_YEAR,
    newMY: MODEL_YEAR,
    initDate: "Jul 18, 2026",
    plannedStart: "5:00 AM ET",
    owner: PEOPLE.elenaVasquez.name,
    currentPhase: 7,
    phaseStatus: Array(8).fill("complete"),
    plantApproval: { approved: true, approver: PEOPLE.elenaVasquez.name, time: "11:04 AM" },
    initSupportApproval: { approved: true, approver: PEOPLE.tomReilly.name, time: "11:22 AM" },
    champs: { plantDate: "Jul 18, 2026", champsDate: "Jul 18, 2026", mismatch: false, filesSent: true, processing: true, responseReceived: true, status: "DATES ALIGNED" },
    completionTime: "Jul 18, 2026 — 3:47 PM",
    totalDuration: "9h 47m",
    exceptionsEncountered: 0,
    auditRef: "INIT-KOK-2027-001",
  },
  TOL: {
    plantCode: "TOL",
    currentMY: PRIOR_MODEL_YEAR,
    newMY: MODEL_YEAR,
    initDate: "Jul 11, 2026",
    plannedStart: "6:00 AM ET",
    owner: PEOPLE.benWhitfield.name,
    currentPhase: 7,
    phaseStatus: Array(8).fill("complete"),
    plantApproval: { approved: true, approver: PEOPLE.benWhitfield.name, time: "1:15 PM" },
    initSupportApproval: { approved: true, approver: PEOPLE.tomReilly.name, time: "1:30 PM" },
    champs: { plantDate: "Jul 11, 2026", champsDate: "Jul 11, 2026", mismatch: false, filesSent: true, processing: true, responseReceived: true, status: "DATES ALIGNED" },
    completionTime: "Jul 11, 2026 — 2:58 PM",
    totalDuration: "8h 58m",
    exceptionsEncountered: 0,
    auditRef: "INIT-TOL-2027-001",
  },
  JNA: {
    plantCode: "JNA",
    currentMY: PRIOR_MODEL_YEAR,
    newMY: MODEL_YEAR,
    initDate: "Jul 25, 2026",
    plannedStart: "6:00 AM ET",
    owner: PEOPLE.linaOsei.name,
    currentPhase: 7,
    phaseStatus: Array(8).fill("complete"),
    plantApproval: { approved: true, approver: PEOPLE.linaOsei.name, time: "12:05 PM" },
    initSupportApproval: { approved: true, approver: PEOPLE.tomReilly.name, time: "12:20 PM" },
    champs: { plantDate: "Jul 25, 2026", champsDate: "Jul 25, 2026", mismatch: false, filesSent: true, processing: true, responseReceived: true, status: "DATES ALIGNED" },
    completionTime: "Jul 25, 2026 — 4:10 PM",
    totalDuration: "10h 10m",
    exceptionsEncountered: 0,
    auditRef: "INIT-JNA-2027-001",
  },
  SAL: {
    plantCode: "SAL",
    currentMY: PRIOR_MODEL_YEAR,
    newMY: MODEL_YEAR,
    initDate: "Sep 26, 2026",
    plannedStart: "5:00 AM ET",
    owner: PEOPLE.carlosDuarte.name,
    currentPhase: 0,
    phaseStatus: ["not_started", "not_started", "not_started", "not_started", "not_started", "not_started", "not_started", "not_started"],
    plantApproval: { approved: false, approver: "", time: "" },
    initSupportApproval: { approved: false, approver: "", time: "" },
    champs: { plantDate: "Sep 26, 2026", champsDate: "Sep 26, 2026", mismatch: false, filesSent: false, processing: false, responseReceived: false, status: "NOT STARTED" },
    exceptionsEncountered: 0,
    auditRef: "INIT-SAL-2027-001",
  },
};

/* ---------------------------------------------------------------------
   API — phase template
   Source: API document.docx, API_Executive_Two_Slide_Deck.pptx,
   Initialization and Physical Inventory Manual (CMIS User Guide)
   --------------------------------------------------------------------- */
const API_PHASE_DEFS = [
  {
    key: "freeze_prep",
    title: "Freeze & Preparation",
    summary: "Application and plant confirm systems are synchronized before the freeze begins.",
    tasks: [
      "SU16 / SU99 synchronization verified between application and plant",
      "Required job holds confirmed (J*IN720Z and related)",
      "Transaction state validated (CEDA disable/enable list confirmed)",
      "Receiving region prepared for shutdown",
    ],
  },
  {
    key: "inv_freeze",
    title: "Inventory Freeze",
    summary: "Inventory files are frozen and backed up ahead of count processing.",
    tasks: [
      "API date created (J*IN690Z)",
      "PPR table validated",
      "Inventory files backed up (J*IN705Z / J*IN710Z)",
      "Stock status frozen (J*IN715Z)",
      "Inventory files initialized (J*IN720Z)",
      "PMR table validated",
      "Files-frozen confirmation issued to plant contact and support team",
    ],
  },
  {
    key: "count_processing",
    title: "Count Processing",
    summary: "In-system and offline physical counts are generated, loaded, and validated.",
    tasks: [
      "In-system file generation (J*IN760Z / J*IN761Z)",
      "Count processing executed (J*IN730I / J*IN735Z)",
      "CNT table validation",
      "Offline counts loaded (J*IN722Z)",
      "Receiving region restored for required inventory activity",
    ],
  },
  {
    key: "subassembly",
    title: "Sub-Assembly Processing",
    summary: "Conditional phase — only required for plants with sub-assembly inventory.",
    conditional: true,
    tasks: [
      "Sub-assembly parts exploded for inventory processing (J*IN755Z)",
      "Sub-assembly data file generated (J*IN757Z)",
      "Sub-assembly counts processed (J*IN730S / J*IN735Z)",
    ],
  },
  {
    key: "user_validation",
    title: "User Validation",
    summary: "STOP gate — inventory reports must be reviewed before finalization can begin.",
    isGate: true,
    stopGate: true,
  },
  {
    key: "finalization",
    title: "Finalization",
    summary: "Adjustments applied, stock status updated, and plant returned to normal operations.",
    tasks: [
      "Final adjustment process run (SU99 Run Option changed AUDIT → ADJST)",
      "SI99 verification (J*IN801Z)",
      "Stock status update confirmed",
      "Grief Report validated",
      "ODDC transfer completed (J*IN794Z)",
      "Receiving region restarted (C*RCSTRT)",
      "Controlled return to normal operations",
    ],
    isFinalGate: true,
  },
];

const API_CHECKPOINT_DETAIL = {
  freeze_prep: {
    description: "Confirms application and plant systems are synchronized and required job holds are in place before the freeze begins.",
    owner: PEOPLE.davidOrtiz.name,
    team: "RDC",
    requiredBefore: "Inventory Freeze",
    validationMethod: "SU16 / SU99 sync check + CEDA transaction review",
    tasks: [
      { label: "SU16 / SU99 in sync", status: "pass" },
      { label: "Required holds confirmed", status: "pass" },
      { label: "Transaction state validated", status: "pass" },
    ],
  },
  inv_freeze: {
    description: "Freezes stock status and inventory files, backing up all data needed for count processing.",
    owner: PEOPLE.priyaNair.name,
    team: "Application Team",
    requiredBefore: "Count Processing",
    validationMethod: "PPR / PMR table review + files-frozen confirmation",
    tasks: [
      { label: "PPR table validated", status: "pass" },
      { label: "Stock status frozen", status: "pass" },
      { label: "PMR table validated", status: "pass" },
    ],
  },
  count_processing: {
    description: "Generates in-system counts and loads offline physical counts for reconciliation.",
    owner: PEOPLE.priyaNair.name,
    team: "Application Team",
    requiredBefore: "User Validation",
    validationMethod: "CNT table validation",
    tasks: [
      { label: "In-system file generated", status: "pass" },
      { label: "CNT validation passed", status: "pass" },
      { label: "Offline counts loaded", status: "pass" },
    ],
  },
  user_validation: {
    description: "A mandatory STOP point. Business users must review inventory variance reports before the finalization run can proceed.",
    owner: PEOPLE.sandraWu.name,
    team: "Finance / Business",
    requiredBefore: "Finalization",
    validationMethod: "Business review of variance / exception report",
    tasks: [
      { label: "Count processing complete", status: "pass" },
      { label: "CNT validation passed", status: "pass" },
      { label: "Reports generated", status: "pass" },
      { label: "Business review pending", status: "warn" },
    ],
  },
};

/* Inventory review category table used by the API review panel */
function inventoryCategories(hasException) {
  return [
    { category: "Engine Components", system: 42110, physical: 42110, variance: 0, status: "Matched" },
    { category: "Transmission Parts", system: 38921, physical: 39105, variance: 184, status: hasException ? "Review" : "Matched" },
    { category: "Fasteners", system: 51100, physical: 51100, variance: 0, status: "Matched" },
    { category: "Sub Assemblies", system: 15834, physical: 16005, variance: 171, status: hasException ? "Review" : "Matched" },
  ];
}

const apiState = {
  STL: {
    plantCode: "STL",
    inventoryType: "Full Physical",
    startDate: "Scheduled — Sep 5, 2026",
    owner: PEOPLE.alexChen.name,
    currentPhase: 0,
    phaseStatus: Array(6).fill("not_started"),
    subAssemblyRequired: false,
    review: { opened: false, exceptionsResolved: false, finalizationApproved: false },
  },
  WRN: {
    plantCode: "WRN",
    inventoryType: "Full Physical",
    startDate: "Aug 29, 2026",
    owner: PEOPLE.karenSilva.name,
    currentPhase: 2,
    phaseStatus: ["complete", "complete", "in_progress", "not_started", "not_started", "not_started"],
    subAssemblyRequired: false,
    review: { opened: false, exceptionsResolved: false, finalizationApproved: false },
  },
  KOK: {
    plantCode: "KOK",
    inventoryType: "Full Physical",
    startDate: "Jul 18, 2026",
    owner: PEOPLE.elenaVasquez.name,
    currentPhase: 4,
    phaseStatus: ["complete", "complete", "complete", "complete", "blocked", "not_started"],
    subAssemblyRequired: true,
    review: {
      opened: false,
      exceptionsResolved: false,
      finalizationApproved: false,
      systemCount: 147965,
      physicalCount: 148320,
      variance: 355,
      accuracy: "99.76%",
      categories: inventoryCategories(true),
    },
  },
  TOL: {
    plantCode: "TOL",
    inventoryType: "Full Physical",
    startDate: "Jul 11, 2026",
    owner: PEOPLE.benWhitfield.name,
    currentPhase: 5,
    phaseStatus: Array(6).fill("complete"),
    subAssemblyRequired: false,
    review: {
      opened: true,
      exceptionsResolved: true,
      finalizationApproved: true,
      systemCount: 61220,
      physicalCount: 61220,
      variance: 0,
      accuracy: "100.00%",
      categories: inventoryCategories(false),
    },
    completionTime: "Jul 11, 2026 — 8:40 PM",
    totalDuration: "11h 20m",
  },
  JNA: {
    plantCode: "JNA",
    inventoryType: "Full Physical",
    startDate: "Jul 25, 2026",
    owner: PEOPLE.linaOsei.name,
    currentPhase: 4,
    phaseStatus: ["complete", "complete", "complete", "complete", "in_progress", "not_started"],
    subAssemblyRequired: true,
    review: {
      opened: false,
      exceptionsResolved: false,
      finalizationApproved: false,
      systemCount: 88410,
      physicalCount: 88467,
      variance: 57,
      accuracy: "99.94%",
      categories: inventoryCategories(false),
    },
  },
  SAL: {
    plantCode: "SAL",
    inventoryType: "Full Physical",
    startDate: "Scheduled — Sep 19, 2026",
    owner: PEOPLE.carlosDuarte.name,
    currentPhase: 0,
    phaseStatus: Array(6).fill("not_started"),
    subAssemblyRequired: false,
    review: { opened: false, exceptionsResolved: false, finalizationApproved: false },
  },
};

/* Control gates shown on the API page — derived visually from phase progress */
const API_CONTROL_GATES = ["File Validation", "PPR Review", "PMR Review", "CNT Verification", "User / Business Approval", "Grief Report Review", "Controlled Restart"];

/* ---------------------------------------------------------------------
   COST ROLLOVER — placeholder concept only (no detailed source doc)
   --------------------------------------------------------------------- */
const costRolloverState = {
  status: "Process Definition Pending",
  stages: ["Preparation", "Validation", "Rollover", "Business Validation", "Complete"],
  note: "Workflow details to be validated with Stellantis Finance / Business stakeholders.",
  capabilities: [
    "Prerequisites — confirm INIT and API are complete for the plant before rollover begins",
    "Ownership — assign Finance / Business as the accountable owner for each plant's rollover",
    "Validation — system and business validation checkpoints prior to close-out",
    "Approval gates — Finance sign-off required before costs post to the new model year",
    "Dependencies — visibility into which plants are ready based on INIT / API status",
    "Audit trail — full timestamped history of every rollover action, matching the governance model used for INIT and API",
  ],
};

/* ---------------------------------------------------------------------
   MODEL YEAR OPENING — high-level concept, Supply Chain pain point
   --------------------------------------------------------------------- */
const myOpeningState = {
  plants: [
    { code: "STL", newMY: MODEL_YEAR, plantStatus: "Open", supplierRelease: "Confirmed", supplierReleaseMY: MODEL_YEAR, owner: "Supply Chain", status: "Complete" },
    { code: "WRN", newMY: MODEL_YEAR, plantStatus: "Open", supplierRelease: "Pending", supplierReleaseMY: null, owner: "Supply Chain", status: "Attention" },
    { code: "KOK", newMY: MODEL_YEAR, plantStatus: "Open", supplierRelease: "Confirmed", supplierReleaseMY: MODEL_YEAR, owner: "Supply Chain", status: "Complete" },
    { code: "TOL", newMY: MODEL_YEAR, plantStatus: "Open", supplierRelease: "Confirmed", supplierReleaseMY: MODEL_YEAR, owner: "Plant MLM", status: "Complete" },
    { code: "JNA", newMY: MODEL_YEAR, plantStatus: "Open", supplierRelease: "Confirmed", supplierReleaseMY: MODEL_YEAR, owner: "Plant MLM", status: "Complete" },
    { code: "SAL", newMY: MODEL_YEAR, plantStatus: "Open", supplierRelease: "Mismatch", supplierReleaseMY: PRIOR_MODEL_YEAR, owner: "Supply Chain", status: "Mismatch" },
  ],
};

/* ---------------------------------------------------------------------
   EXCEPTIONS CENTER — seeded exceptions (id, severity, plant, process...)
   --------------------------------------------------------------------- */
let EXCEPTION_SEQ = 100;
const exceptionsState = [
  {
    id: "EXC-101",
    severity: "Critical",
    plant: "KOK",
    process: "Annual Physical Inventory",
    title: "API Count Mismatch",
    detail: "Count verification found a 355-unit variance between the system count (147,965) and the physical count (148,320) for Transmission Parts and Sub Assemblies.",
    impact: "Finalization is blocked plant-wide — Kokomo Transmission cannot return to normal operations until the variance is cleared. Downstream stock status and Grief Report processing are paused.",
    rootCause: "Preliminary analysis points to two offline physical counts (Transmission Parts, Sub Assemblies) logged after the in-system CNT file was generated, producing a positive variance against the frozen system count.",
    blockedPhase: "User Validation",
    owner: "Application Team",
    detected: "42 min ago",
    status: "Open",
    recommendedAction: "Review the variance by category, confirm with the plant, and resolve both flagged categories before finalization can proceed.",
    history: [{ time: "08:14", user: "System", action: "Exception auto-detected during CNT verification" }],
  },
  {
    id: "EXC-102",
    severity: "Medium",
    plant: "WRN",
    process: "Model Year Opening",
    title: "Supplier Release Pending",
    detail: "Model Year 2027 is open at the plant, but supplier release confirmation has not been received from Supply Chain.",
    impact: "Stamping suppliers may continue building to the prior model year specification, risking a downstream parts mismatch once Warren Stamping begins MY2027 production.",
    rootCause: "The automated release transmission to the supplier network did not receive a confirmation acknowledgement within the standard SLA window.",
    blockedPhase: "Supplier Release Confirmation",
    owner: "Supply Chain",
    detected: "3 hr ago",
    status: "Open",
    recommendedAction: "Contact Supply Chain to confirm the stamping supplier release transmission and close the confirmation loop.",
    history: [{ time: "Yesterday 4:05 PM", user: "System", action: "Exception raised — release confirmation not received within SLA" }],
  },
  {
    id: "EXC-103",
    severity: "Medium",
    plant: "SAL",
    process: "Model Year Opening",
    title: "Model Year Release Mismatch",
    detail: "The plant is open on Model Year 2027, but the supplier release is still showing Model Year 2026.",
    impact: "Incoming stamped components may still reflect Model Year 2026 tooling and specifications, creating a mismatch risk against Saltillo Truck's MY2027 build schedule.",
    rootCause: "The plant-opening transaction advanced to Model Year 2027 before the corresponding supplier release record was updated, leaving the two systems out of sync.",
    blockedPhase: "Supplier Release Confirmation",
    owner: "Supply Chain",
    detected: "1 day ago",
    status: "Open",
    recommendedAction: "Confirm the correct release Model Year with Supply Chain and update the release record.",
    history: [{ time: "2 days ago", user: "System", action: "Mismatch detected between plant MY and supplier release MY" }],
  },
  {
    id: "EXC-104",
    severity: "Medium",
    plant: "STL",
    process: "Initialization",
    title: "Required Approval Overdue",
    detail: "INIT Support Buy-Off has been pending for over 15 minutes, holding up CHAMPS processing.",
    impact: "Sterling Stamping's initialization cannot advance to CHAMPS synchronization, pushing back the plant's return to normal production readiness.",
    rootCause: "Plant buy-off was recorded on schedule, but the INIT Support acknowledgement has not yet been logged against the same initialization run.",
    blockedPhase: "Plant Review & Buy-Off",
    owner: "Application Team",
    detected: "18 min ago",
    status: "Open",
    recommendedAction: "Follow up with INIT Support to complete the buy-off so CHAMPS synchronization can begin.",
    history: [{ time: "18 min ago", user: "System", action: "Plant buy-off recorded; INIT Support buy-off still pending" }],
  },
];

/* ---------------------------------------------------------------------
   APPROVAL CENTER — seeded pending approvals
   --------------------------------------------------------------------- */
const approvalsState = [
  {
    id: "APR-201",
    process: "Initialization",
    plant: "STL",
    gate: "INIT Support Buy-Off",
    requestedBy: "Application Team",
    waiting: "18 min",
    status: "Pending",
    prerequisites: [
      { label: "Initialization reports reviewed", met: true },
      { label: "Test part verification complete", met: true },
      { label: "Plant confirms results are acceptable", met: true },
    ],
    evidence: "Initialization report package — Sterling Stamping, Aug 22 2026 run",
    notes: "Plant buy-off recorded by Maria Lopez at 2:42 PM. Awaiting INIT Support confirmation before CHAMPS processing begins.",
    history: [{ time: "2:42 PM", user: PEOPLE.mariaLopez.name, action: "Plant buy-off approved" }],
  },
  {
    id: "APR-202",
    process: "Annual Physical Inventory",
    plant: "KOK",
    gate: "Business Validation",
    requestedBy: "Plant MLM",
    waiting: "31 min",
    status: "Pending",
    prerequisites: [
      { label: "Count processing complete", met: true },
      { label: "CNT validation passed", met: true },
      { label: "Count exceptions resolved", met: false },
    ],
    evidence: "Inventory variance report — Kokomo Transmission, 355-unit variance flagged",
    notes: "Two categories (Transmission Parts, Sub Assemblies) remain flagged for review. Resolve exceptions before requesting this approval.",
    history: [{ time: "31 min ago", user: "System", action: "Business validation requested" }],
  },
  {
    id: "APR-203",
    process: "Model Year Opening",
    plant: "SAL",
    gate: "Supplier Release Confirmation",
    requestedBy: "Supply Chain",
    waiting: "2 hr",
    status: "Pending",
    prerequisites: [
      { label: "Plant Model Year opened", met: true },
      { label: "Supplier release Model Year confirmed", met: false },
    ],
    evidence: "Supplier release transmission log — Saltillo Truck",
    notes: "Supplier release is still showing MY2026. Confirm the corrected release before approving.",
    history: [{ time: "2 hr ago", user: "System", action: "Release confirmation requested from Supply Chain" }],
  },
];

/* ---------------------------------------------------------------------
   AUDIT LOG / ACTIVITY — Reports & Audit page
   --------------------------------------------------------------------- */
const auditLogState = [
  { time: "05:58", plant: "KOK", process: "Initialization", activity: "Initialization Started", user: "System", result: "Info" },
  { time: "06:14", plant: "KOK", process: "Initialization", activity: "SU99 Model Year Validation", user: "Application Team", result: "Passed" },
  { time: "07:40", plant: "KOK", process: "Initialization", activity: "Plant Buy-Off", user: PEOPLE.elenaVasquez.name, result: "Approved" },
  { time: "07:52", plant: "KOK", process: "Initialization", activity: "INIT Support Buy-Off", user: PEOPLE.tomReilly.name, result: "Approved" },
  { time: "08:10", plant: "KOK", process: "Initialization", activity: "CHAMPS Synchronization", user: "CHAMPS Team", result: "Dates Aligned" },
  { time: "15:47", plant: "KOK", process: "Initialization", activity: "Initialization Completed", user: "System", result: "Complete" },
  { time: "08:14", plant: "KOK", process: "Annual Physical Inventory", activity: "CNT Verification", user: "Application Team", result: "Failed" },
  { time: "08:20", plant: "KOK", process: "Annual Physical Inventory", activity: "Exception Raised — Count Mismatch", user: "System", result: "Blocked" },
  { time: "06:00", plant: "STL", process: "Initialization", activity: "Initialization Started", user: "System", result: "Info" },
  { time: "07:10", plant: "STL", process: "Initialization", activity: "SU99 Model Year Validation", user: PEOPLE.priyaNair.name, result: "Passed" },
  { time: "08:05", plant: "STL", process: "Initialization", activity: "Receiving Region Lockdown", user: PEOPLE.davidOrtiz.name, result: "Passed" },
  { time: "14:18", plant: "STL", process: "Initialization", activity: "PMR Validation", user: "Application Team", result: "Passed" },
  { time: "14:32", plant: "STL", process: "Initialization", activity: "Plant Buy-Off", user: PEOPLE.mariaLopez.name, result: "Approved" },
  { time: "09:02", plant: "WRN", process: "Annual Physical Inventory", activity: "Inventory Freeze", user: "Application Team", result: "Passed" },
  { time: "10:15", plant: "WRN", process: "Annual Physical Inventory", activity: "PPR Table Validation", user: "Application Team", result: "Passed" },
  { time: "11:30", plant: "WRN", process: "Annual Physical Inventory", activity: "Count Processing Started", user: "System", result: "In Progress" },
  { time: "Yesterday 16:05", plant: "WRN", process: "Model Year Opening", activity: "Supplier Release Confirmation Requested", user: "System", result: "Pending" },
  { time: "13:00", plant: "TOL", process: "Annual Physical Inventory", activity: "Business Validation", user: PEOPLE.benWhitfield.name, result: "Approved" },
  { time: "20:40", plant: "TOL", process: "Annual Physical Inventory", activity: "API Finalization", user: PEOPLE.sandraWu.name, result: "Approved" },
  { time: "10:00", plant: "JNA", process: "Annual Physical Inventory", activity: "Sub-Assembly Processing", user: "Application Team", result: "Passed" },
  { time: "12:20", plant: "JNA", process: "Initialization", activity: "CHAMPS Synchronization", user: "CHAMPS Team", result: "Dates Aligned" },
  { time: "2 days ago", plant: "SAL", process: "Model Year Opening", activity: "Model Year Mismatch Detected", user: "System", result: "Blocked" },
  { time: "09:15", plant: "SAL", process: "Initialization", activity: "Initialization Scheduled", user: PEOPLE.carlosDuarte.name, result: "Info" },
];

/* ---------------------------------------------------------------------
   NOTIFICATIONS — top bar bell
   --------------------------------------------------------------------- */
const notificationsState = [
  { id: "N1", text: "API Count Validation failed — Kokomo Transmission", link: { view: "api", plant: "KOK" }, read: false, time: "42 min ago" },
  { id: "N2", text: "INIT approval required — Sterling Stamping", link: { view: "init", plant: "STL" }, read: false, time: "18 min ago" },
  { id: "N3", text: "CHAMPS initialization complete — Jefferson North", link: { view: "init", plant: "JNA" }, read: false, time: "2 hr ago" },
  { id: "N4", text: "Supplier release confirmation pending — Warren Stamping", link: { view: "myopening" }, read: false, time: "3 hr ago" },
];

/* ---------------------------------------------------------------------
   RELATED PROCEDURES — SOP links (modal placeholder only)
   --------------------------------------------------------------------- */
const RELATED_SOPS = {
  init: ["Initialization SOP", "Plant Checklist — Day Before INIT", "CHAMPS Synchronization Procedure"],
  api: ["API Operations Procedure", "Physical Inventory Ticket Reconciliation Guide", "Plant Checklist"],
};
