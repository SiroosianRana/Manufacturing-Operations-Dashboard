/* =====================================================================
   Stellantis Annual Manufacturing Operations Portal — Demo Application
   Vanilla JS, single-file state machine. No backend / no persistence.
   ===================================================================== */

const App = (function () {

  /* ------------------------------------------------------------ STATE */
  const state = {
    role: "Plant IT Coordinator",
    view: "overview",
    params: {},
    init: initState,
    api: apiState,
    costRollover: costRolloverState,
    myOpening: myOpeningState,
    exceptions: exceptionsState,
    approvals: approvalsState,
    auditLog: auditLogState,
    notifications: notificationsState,
    expandedInitPhase: 4,
    expandedApiPhase: 4,
    showInitTech: false,
    notifOpen: false,
    roleMenuOpen: false,
    modal: null,
    drawer: null,
    toasts: [],
    reportFilters: { plant: "", process: "", status: "", user: "", date: "" },
    overviewTimelineKey: "api:KOK",
  };

  /* ------------------------------------------------------------ HELPERS */
  const STATUS_COLOR = {
    "Completed": "green", "Complete": "green", "Approved": "green", "Matched": "green",
    "Passed": "green", "Confirmed": "green", "Resolved": "green", "DATES ALIGNED": "green", "Dates Aligned": "green",
    "In Progress": "blue", "Active": "blue", "Info": "blue", "Processing": "blue",
    "Awaiting Plant Approval": "amber", "Validation Required": "amber", "Warning": "amber",
    "Attention": "amber", "Pending": "amber", "Review": "amber", "ACTION REQUIRED": "amber",
    "Medium": "amber", "Rejected / Returned": "amber",
    "Blocked": "red", "Critical": "red", "Mismatch": "red", "Failed": "red", "Open": "red",
    "High": "red", "DATE MISMATCH": "red", "MISMATCH": "red",
    "Scheduled": "gray", "Not Started": "gray", "Planning": "gray", "Low": "gray",
  };

  function badge(status) {
    const c = STATUS_COLOR[status] || "gray";
    return `<span class="badge badge-${c}"><span class="dot"></span>${status}</span>`;
  }

  function progressBarHtml(pct, colorOverride) {
    let cls = colorOverride || (pct >= 100 ? "green" : "blue");
    return `<span class="progress-track"><span class="progress-fill ${cls}" style="width:${Math.min(pct,100)}%"></span></span><span class="progress-label">${pct}%</span>`;
  }

  function plantName(code) { return PLANTS[code] ? PLANTS[code].name : code; }

  function nowTimeString() {
    return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function shiftDateStr(str, days) {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function toast(msg) {
    const id = "t" + Math.random().toString(36).slice(2);
    state.toasts.push({ id, msg });
    render();
    setTimeout(() => { dismissToast(id); }, 3200);
  }
  function dismissToast(id) {
    state.toasts = state.toasts.filter(t => t.id !== id);
    render();
  }

  function logAudit(plant, process, activity, user, result) {
    state.auditLog.unshift({ time: nowTimeString(), plant, process, activity, user, result });
  }

  /* ---- exception helpers ---- */
  function findException(id) { return state.exceptions.find(e => e.id === id); }
  function addChampsException(plantCode) {
    const id = "EXC-CHAMPS-" + plantCode;
    let e = findException(id);
    if (e) { e.status = "Open"; e.detected = "Just now"; return; }
    state.exceptions.unshift({
      id, severity: "High", plant: plantCode, process: "Initialization",
      title: "CHAMPS Date Mismatch",
      detail: `CHAMPS returned an initialization date that does not match the confirmed plant date for ${plantName(plantCode)}.`,
      impact: `Initialization cannot advance to Validation & Restart for ${plantName(plantCode)} until CHAMPS and the plant agree on the initialization date — the plant remains in its shutdown window.`,
      rootCause: "CHAMPS processed the initialization request against a different calendar date than the one confirmed with the plant, likely due to a timing gap between plant confirmation and CHAMPS batch pickup.",
      blockedPhase: "CHAMPS Synchronization", owner: "CHAMPS Team", detected: "Just now", status: "Open",
      recommendedAction: "Synchronize the CHAMPS initialization date with the plant date to resume processing.",
      history: [{ time: nowTimeString(), user: "System", action: "CHAMPS returned a mismatched initialization date" }],
    });
  }
  function resolveExceptionById(id, who, note) {
    const e = findException(id);
    if (e && e.status === "Open") {
      e.status = "Resolved";
      e.history.push({ time: nowTimeString(), user: who, action: note });
    }
  }

  /* ---- computed status / progress ---- */
  function computeInitProgress(code) {
    const d = state.init[code];
    let score = 0;
    d.phaseStatus.forEach(s => { if (s === "complete") score += 1; else if (s === "in_progress") score += 0.5; });
    return Math.round(score / d.phaseStatus.length * 100);
  }
  function computeApiProgress(code) {
    const d = state.api[code];
    const denom = d.subAssemblyRequired ? d.phaseStatus.length : d.phaseStatus.length - 1;
    let score = 0;
    d.phaseStatus.forEach((s, idx) => {
      if (!d.subAssemblyRequired && idx === 3) return;
      if (s === "complete") score += 1; else if (s === "in_progress") score += 0.5;
    });
    return Math.round(score / denom * 100);
  }
  function initStatus(code) {
    const d = state.init[code];
    if (d.phaseStatus.every(s => s === "complete")) return "Completed";
    if (d.phaseStatus.includes("blocked")) return "Blocked";
    if (d.currentPhase === 4 && (!d.plantApproval.approved || !d.initSupportApproval.approved)) return "Awaiting Plant Approval";
    if (d.currentPhase === 5 && d.champs.mismatch) return "Blocked";
    if (d.phaseStatus[0] === "not_started") return "Scheduled";
    return "In Progress";
  }
  function apiStatus(code) {
    const d = state.api[code];
    if (d.phaseStatus.every(s => s === "complete") && d.review.finalizationApproved) return "Completed";
    if (d.phaseStatus.includes("blocked")) return "Blocked";
    if (d.currentPhase === 4 && !d.review.finalizationApproved) return "Validation Required";
    if (d.phaseStatus[0] === "not_started") return "Scheduled";
    return "In Progress";
  }
  function initNextAction(code) {
    const d = state.init[code];
    const key = INIT_PHASE_DEFS[d.currentPhase].key;
    switch (key) {
      case "planning": return { text: "Confirm plant contact & notify support teams", owner: d.owner };
      case "prevalidation": return { text: "Complete SU99 / CHAMPS date validation", owner: "Application Team" };
      case "lockdown": return { text: "Secure receiving region", owner: "RDC" };
      case "processing": return { text: "Monitor initialization processing", owner: "Application Team" };
      case "buyoff":
        if (!d.plantApproval.approved) return { text: "Obtain plant approval", owner: "Plant MLM" };
        if (!d.initSupportApproval.approved) return { text: "Provide INIT Support buy-off", owner: "Application Team" };
        return { text: "Continue to CHAMPS", owner: "Application Team" };
      case "champs":
        if (d.champs.mismatch) return { text: "Resolve CHAMPS date mismatch", owner: "CHAMPS Team" };
        if (!d.champs.responseReceived) return { text: "Complete CHAMPS synchronization", owner: "CHAMPS Team" };
        return { text: "Continue to Validation & Restart", owner: "Plant IT" };
      case "validation": return { text: "Complete validation & final buy-off", owner: "Plant IT" };
      default: return { text: "None", owner: "—" };
    }
  }
  function apiNextAction(code) {
    const d = state.api[code];
    const key = API_PHASE_DEFS[d.currentPhase].key;
    switch (key) {
      case "freeze_prep": return { text: "Confirm SU16 / SU99 synchronization", owner: "RDC" };
      case "inv_freeze": return { text: "Complete inventory freeze", owner: "Application Team" };
      case "count_processing": return { text: "Complete count processing", owner: "Application Team" };
      case "subassembly": return { text: "Process sub-assembly counts", owner: "Application Team" };
      case "user_validation":
        if (!d.review.opened) return { text: "Review inventory results", owner: "Finance / Business" };
        if (!d.review.exceptionsResolved) return { text: "Resolve count exceptions", owner: "Application Team" };
        return { text: "Approve finalization", owner: "Finance / Business" };
      case "finalization": return { text: "Complete finalization & restart", owner: "RDC" };
      default: return { text: "None", owner: "—" };
    }
  }

  /* ------------------------------------------------------------ KPIs */
  function computeKPIs() {
    let activeProcesses = 0, plantsCompleted = 0, processesAtRisk = 0, progressSum = 0, progressCount = 0;
    PLANT_ORDER.forEach(code => {
      const iStat = initStatus(code), aStat = apiStatus(code);
      const myStat = myOpeningState.plants.find(p => p.code === code).status;
      [iStat, aStat].forEach(s => {
        if (["In Progress", "Awaiting Plant Approval", "Blocked", "Validation Required"].includes(s)) activeProcesses++;
        if (s === "Blocked") processesAtRisk++;
      });
      if (myStat === "Mismatch" || myStat === "Attention") processesAtRisk++;
      if (iStat === "Completed" && aStat === "Completed" && myStat === "Complete") plantsCompleted++;
      progressSum += computeInitProgress(code) + computeApiProgress(code);
      progressCount += 2;
    });
    return {
      activeProcesses,
      plantsCompleted,
      processesAtRisk,
      pendingApprovals: state.approvals.filter(a => a.status === "Pending").length,
      openExceptions: state.exceptions.filter(e => e.status === "Open").length,
      avgCompletion: Math.round(progressSum / progressCount),
    };
  }

  /* ------------------------------------------------------------ NAV */
  function navigate(view, params) {
    state.view = view;
    state.params = params || {};
    state.expandedInitPhase = view === "init" ? 4 : state.expandedInitPhase;
    state.expandedApiPhase = view === "api" ? 4 : state.expandedApiPhase;
    state.showInitTech = false;
    state.notifOpen = false;
    state.roleMenuOpen = false;
    render();
    window.scrollTo(0, 0);
  }
  function goToException(id) {
    state.view = "exceptions"; state.params = {};
    state.modal = { type: "exception", id };
    render();
  }
  function goToApproval(id) {
    state.view = "approvals"; state.params = {};
    state.modal = { type: "approval", id };
    render();
  }
  function setRole(role) { state.role = role; state.roleMenuOpen = false; render(); }
  function toggleNotif() { state.notifOpen = !state.notifOpen; state.roleMenuOpen = false; render(); }
  function toggleRoleMenu() { state.roleMenuOpen = !state.roleMenuOpen; state.notifOpen = false; render(); }
  function openNotification(n) {
    n.read = true;
    state.notifOpen = false;
    navigate(n.link.view, n.link.plant ? { plant: n.link.plant } : {});
  }
  function closeModal() { state.modal = null; render(); }
  function closeDrawer() { state.drawer = null; render(); }

  /* ============================================================
     SHELL
     ============================================================ */
  function shell() {
    return `
      ${topbar()}
      <div class="shell">
        ${sidenav()}
        <div class="main">${pageContent()}</div>
      </div>
      ${state.notifOpen ? notifPanel() : ""}
      ${state.roleMenuOpen ? rolePanel() : ""}
      ${state.modal ? modalOverlay() : ""}
      ${state.drawer ? drawerOverlay() : ""}
      ${toastWrap()}
    `;
  }

  function topbar() {
    const unread = state.notifications.filter(n => !n.read).length;
    const initials = PEOPLE.currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2);
    return `
    <div class="topbar">
      <div class="topbar-left">
        <div class="topbar-brand"><span class="mark">SA</span> Annual Manufacturing Operations</div>
        <div class="topbar-divider"></div>
        <div class="topbar-my">Model Year: <strong>${MODEL_YEAR}</strong></div>
      </div>
      <div class="topbar-right">
        <button class="icon-btn help-btn" title="Help" onclick="App.openHelpDrawer(event)">&#63;<span class="help-btn-label">Help</span></button>
        <button class="icon-btn" title="Notifications" onclick="App.toggleNotif(event)">&#128276;${unread ? '<span class="notif-dot"></span>' : ""}</button>
        <div class="user-block">
          <div class="user-avatar">${initials}</div>
          <div class="user-meta">
            <div class="user-name">${PEOPLE.currentUser.name}</div>
            <div class="user-role-select" onclick="App.toggleRoleMenu(event)">${state.role} &#9662;</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function notifPanel() {
    const items = state.notifications.map(n => `
      <div class="notif-item" onclick='App.openNotificationById("${n.id}")'>
        <span class="notif-dot-inline" style="background:${n.read ? "#c6cedb" : "#2f6fe0"}"></span>
        <div>
          <div class="notif-text">${n.text}</div>
          <div class="notif-time">${n.time}</div>
        </div>
      </div>`).join("");
    return `<div class="dropdown-panel"><div class="dropdown-header"><span>Notifications</span><button class="close-x" onclick="App.toggleNotif(event)">&times;</button></div>${items || '<div class="empty-state">No notifications</div>'}</div>`;
  }
  function rolePanel() {
    const items = ROLES.map(r => `<div class="role-menu-item ${r === state.role ? "active" : ""}" onclick='App.setRole("${r}")'>${r}${r === state.role ? " &#10003;" : ""}</div>`).join("");
    return `<div class="dropdown-panel" style="width:220px;">${items}</div>`;
  }

  function navItem(key, label, icon, sub) {
    const active = state.view === key ? "active" : "";
    return `<div class="nav-item ${sub ? "sub" : ""} ${active}" onclick="App.navigate('${key}')">${!sub ? `<span class="nav-ico">${icon}</span>` : ""}${label}</div>`;
  }

  function sidenav() {
    const pendingApprovals = state.approvals.filter(a => a.status === "Pending").length;
    const openExceptions = state.exceptions.filter(e => e.status === "Open").length;
    return `
    <div class="sidenav">
      ${navItem("overview", "Overview", "&#9635;")}
      <div class="nav-section-label">Annual Processes</div>
      ${navItem("init", "Initialization", "", true)}
      ${navItem("api", "Annual Physical Inventory", "", true)}
      ${navItem("costrollover", "Cost Rollover", "", true)}
      ${navItem("myopening", "Model Year Opening", "", true)}
      <div class="nav-section-label">&nbsp;</div>
      ${navItem("plants", "Plants", "&#9638;")}
      <div class="nav-item ${state.view === "approvals" ? "active" : ""}" onclick="App.navigate('approvals')"><span class="nav-ico">&#10003;</span>Approvals ${pendingApprovals ? `<span class="nav-badge">${pendingApprovals}</span>` : ""}</div>
      <div class="nav-item ${state.view === "exceptions" ? "active" : ""}" onclick="App.navigate('exceptions')"><span class="nav-ico">&#9888;</span>Exceptions ${openExceptions ? `<span class="nav-badge">${openExceptions}</span>` : ""}</div>
      ${navItem("reports", "Reports & Audit", "&#9776;")}
    </div>`;
  }

  function pageContent() {
    switch (state.view) {
      case "overview": return renderOverview();
      case "init": return renderInit();
      case "api": return renderApi();
      case "costrollover": return renderCostRollover();
      case "myopening": return renderMyOpening();
      case "plants": return renderPlants();
      case "approvals": return renderApprovals();
      case "exceptions": return renderExceptions();
      case "reports": return renderReports();
      default: return `<div class="empty-state">Page not found.</div>`;
    }
  }

  /* ============================================================
     OVERVIEW
     ============================================================ */
  const OVERVIEW_ROWS = [
    { plant: "STL", process: "Initialization" },
    { plant: "WRN", process: "Annual Physical Inventory" },
    { plant: "KOK", process: "Annual Physical Inventory" },
    { plant: "TOL", process: "Initialization" },
    { plant: "JNA", process: "Annual Physical Inventory" },
    { plant: "SAL", process: "Initialization" },
  ];

  /* Aggregate hero counts for the Mission Control band — INIT + API are the
     two processes the whole demo is built around, so the hero reflects those. */
  function computeHeroStats() {
    let complete = 0, blocked = 0;
    PLANT_ORDER.forEach(code => {
      const iStat = initStatus(code), aStat = apiStatus(code);
      if (iStat === "Blocked" || aStat === "Blocked") blocked++;
      else if (iStat === "Completed" && aStat === "Completed") complete++;
    });
    const total = PLANT_ORDER.length;
    return { total, complete, blocked, active: total - complete - blocked };
  }

  function opsRowHtml(r) {
    const isInit = r.process === "Initialization";
    const progress = isInit ? computeInitProgress(r.plant) : computeApiProgress(r.plant);
    const status = isInit ? initStatus(r.plant) : apiStatus(r.plant);
    const phaseTitle = isInit ? INIT_PHASE_DEFS[state.init[r.plant].currentPhase].title : API_PHASE_DEFS[state.api[r.plant].currentPhase].title;
    const next = isInit ? initNextAction(r.plant) : apiNextAction(r.plant);
    const stateColor = { Completed: "green", "In Progress": "blue", Blocked: "red", "Awaiting Plant Approval": "amber", "Validation Required": "amber", Scheduled: "gray" }[status] || "gray";
    const barColor = stateColor === "blue" ? "" : stateColor;
    const running = (status === "In Progress" || status === "Awaiting Plant Approval" || status === "Validation Required") ? "running" : "";
    return `<div class="ops-row state-${stateColor}" onclick="App.navigate('${isInit ? "init" : "api"}',{plant:'${r.plant}'})">
      <div class="ops-row-plant"><div class="name">${plantName(r.plant)}</div><div class="proc">${r.process}</div></div>
      <div class="ops-row-bar-wrap">
        <div class="ops-row-bar-track"><div class="ops-row-bar-fill ${barColor} ${running}" style="width:${progress}%"></div></div>
        <div class="ops-row-bar-label">${progress}% &middot; ${phaseTitle}</div>
      </div>
      <div class="ops-row-phase">${badge(status)}</div>
      <div class="ops-row-phase">${next.text}</div>
      <div class="ops-row-owner">Owner<strong>${next.owner}</strong></div>
    </div>`;
  }

  function renderOverview() {
    const k = computeKPIs();
    const hero = computeHeroStats();
    const rows = OVERVIEW_ROWS.map(opsRowHtml).join("");

    return `
    <div class="ops-hero">
      <div class="ops-hero-top">
        <div>
          <div class="ops-hero-title">Annual Manufacturing Operations</div>
          <div class="ops-hero-sub">Model Year ${MODEL_YEAR} &middot; live status across all annual processes</div>
        </div>
        <div class="ops-hero-live"><span class="live-dot"></span> Live</div>
      </div>
      <div class="ops-hero-stats">
        <div class="ops-hero-stat"><div class="n">${hero.total}</div><div class="l">Plants</div></div>
        <div class="ops-hero-stat n-complete"><div class="n">${hero.complete}</div><div class="l">Complete</div></div>
        <div class="ops-hero-stat n-active"><div class="n">${hero.active}</div><div class="l">Active</div></div>
        <div class="ops-hero-stat n-blocked"><div class="n">${hero.blocked}</div><div class="l">Blocked</div></div>
      </div>
    </div>

    <div class="section-eyebrow"><div class="section-title">Plant Operations — Initialization &amp; API</div><span class="muted" style="font-size:12px;color:var(--ink-500);">Click a row for full workflow detail</span></div>
    <div class="ops-rows section">${rows}</div>

    <div class="kpi-strip">
      <div class="kpi-chip"><span class="v accent-red">${k.processesAtRisk}</span><span class="l">At Risk</span></div>
      <div class="kpi-chip"><span class="v accent-amber">${k.pendingApprovals}</span><span class="l">Pending Approvals</span></div>
      <div class="kpi-chip"><span class="v accent-red">${k.openExceptions}</span><span class="l">Open Exceptions</span></div>
      <div class="kpi-chip"><span class="v accent-green">${k.plantsCompleted}</span><span class="l">Plants Fully Complete</span></div>
      <div class="kpi-chip"><span class="v accent-blue">${k.avgCompletion}%</span><span class="l">Avg. Completion</span></div>
    </div>

    <div class="dash-grid">
      <div class="section">
        <div class="card card-pad">
          <div class="card-header" style="margin:-18px -20px 14px;"><h3>Live Process Timeline</h3><span class="muted">Demo clock — illustrative sequencing</span></div>
          ${overviewTimelineSection()}
        </div>
      </div>
      <div class="section">
        <div class="card card-pad">
          <div class="card-header" style="margin:-18px -20px 14px;"><h3>My Actions</h3><span class="muted">${state.role}</span></div>
          ${myActionsList()}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Process Health</div>
      ${processHealthGrid()}
    </div>

    <div class="section">
      <div class="section-title">Attention Required</div>
      ${attentionRequiredGrid()}
    </div>
    `;
  }

  /* ---- Live timeline (Overview + reused by plant drawer) ---- */
  const TIMELINE_CHOICES = [
    { key: "init:STL", view: "init", plant: "STL", label: "Sterling Stamping &middot; Initialization" },
    { key: "init:SAL", view: "init", plant: "SAL", label: "Saltillo Truck &middot; Initialization" },
    { key: "api:KOK", view: "api", plant: "KOK", label: "Kokomo Transmission &middot; API" },
    { key: "api:WRN", view: "api", plant: "WRN", label: "Warren Stamping &middot; API" },
  ];
  function setOverviewTimeline(key) { state.overviewTimelineKey = key; render(); }

  function synthTime(baseHour, idx, stepHours) {
    const total = baseHour + idx * stepHours;
    let h = Math.floor(total) % 24;
    const m = Math.round((total - Math.floor(total)) * 60);
    const period = h >= 12 ? "PM" : "AM";
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }
  function buildTimeline(phaseDefs, phaseStatus, baseHour, stepHours) {
    return phaseDefs.map((p, idx) => {
      const s = phaseStatus[idx];
      const tStatus = s === "complete" ? "complete" : s === "in_progress" ? "running" : s === "blocked" ? "blocked" : "pending";
      const label = { complete: "Completed", running: "Running", blocked: "Blocked", pending: "Pending" }[tStatus];
      return { time: synthTime(baseHour, idx, stepHours), title: p.title, tStatus, label };
    });
  }
  function timelineHtml(items) {
    return `<div class="timeline-wrap">${items.map((it, idx) => `
      <div class="timeline-item">
        <div class="timeline-rail">
          <div class="timeline-dot ${it.tStatus}">${it.tStatus === "complete" ? "&#10003;" : it.tStatus === "blocked" ? "&#10007;" : idx + 1}</div>
          ${idx < items.length - 1 ? `<div class="timeline-connector ${it.tStatus === "complete" ? "complete" : ""}"></div>` : ""}
        </div>
        <div class="timeline-content">
          <div class="timeline-time">${it.time}</div>
          <div class="timeline-label">${it.title}</div>
          <div class="timeline-status ${it.tStatus}">${it.label}</div>
        </div>
      </div>`).join("")}</div>`;
  }
  function overviewTimelineSection() {
    const activeKey = state.overviewTimelineKey || "api:KOK";
    const selector = `<div class="timeline-selector">${TIMELINE_CHOICES.map(c => `<div class="plant-chip ${c.key === activeKey ? "active" : ""}" onclick="App.setOverviewTimeline('${c.key}')">${c.label}</div>`).join("")}</div>`;
    const choice = TIMELINE_CHOICES.find(c => c.key === activeKey) || TIMELINE_CHOICES[0];
    let items;
    if (choice.view === "init") {
      const d = state.init[choice.plant];
      items = buildTimeline(INIT_PHASE_DEFS, d.phaseStatus, 6, 1.15);
    } else {
      const d = state.api[choice.plant];
      items = buildTimeline(API_PHASE_DEFS, d.phaseStatus, 7, 1.5);
    }
    return selector + timelineHtml(items);
  }

  function myActionsList() {
    const actions = MY_ACTIONS[state.role] || [];
    if (!actions.length) return `<div class="empty-state">No actions assigned to this role right now.</div>`;
    return `<ul class="action-list">${actions.map((a, i) => `
      <li>
        <span><span class="action-num">${i + 1}</span> &nbsp;${a.label}</span>
        <button class="btn btn-ghost btn-sm" onclick="App.navigate('${a.link.view}', ${a.link.plant ? `{plant:'${a.link.plant}'}` : "{}"})">Open &rsaquo;</button>
      </li>`).join("")}</ul>`;
  }

  function processHealthGrid() {
    const initCounts = { complete: 0, active: 0, scheduled: 0 };
    const apiCounts = { complete: 0, active: 0, atrisk: 0, scheduled: 0 };
    PLANT_ORDER.forEach(code => {
      const s = initStatus(code);
      if (s === "Completed") initCounts.complete++;
      else if (s === "Scheduled") initCounts.scheduled++;
      else initCounts.active++;
      const a = apiStatus(code);
      if (a === "Completed") apiCounts.complete++;
      else if (a === "Blocked") apiCounts.atrisk++;
      else if (a === "Scheduled") apiCounts.scheduled++;
      else apiCounts.active++;
    });
    const myComplete = myOpeningState.plants.filter(p => p.status === "Complete").length;
    const total = PLANT_ORDER.length;

    function bar(counts, segs) {
      return `<div class="health-bar-track">${segs.map(s => counts[s.key] ? `<span class="health-bar-seg" style="width:${counts[s.key] / total * 100}%;background:${s.color}"></span>` : "").join("")}</div>`;
    }

    return `<div class="health-grid">
      <div class="card health-card" onclick="App.navigate('init')">
        <div class="health-title">Initialization <span class="badge badge-blue">${total} Plants</span></div>
        ${bar(initCounts, [{ key: "complete", color: "var(--green-600)" }, { key: "active", color: "var(--blue-500)" }, { key: "scheduled", color: "var(--ink-300)" }])}
        <div class="health-legend">
          <span><span class="dot" style="background:var(--green-600)"></span>${initCounts.complete} Complete</span>
          <span><span class="dot" style="background:var(--blue-500)"></span>${initCounts.active} Active</span>
          <span><span class="dot" style="background:var(--ink-300)"></span>${initCounts.scheduled} Scheduled</span>
        </div>
      </div>
      <div class="card health-card" onclick="App.navigate('api')">
        <div class="health-title">Annual Physical Inventory <span class="badge badge-blue">${total} Plants</span></div>
        ${bar(apiCounts, [{ key: "complete", color: "var(--green-600)" }, { key: "active", color: "var(--blue-500)" }, { key: "atrisk", color: "var(--red-600)" }, { key: "scheduled", color: "var(--ink-300)" }])}
        <div class="health-legend">
          <span><span class="dot" style="background:var(--green-600)"></span>${apiCounts.complete} Complete</span>
          <span><span class="dot" style="background:var(--blue-500)"></span>${apiCounts.active} Active</span>
          <span><span class="dot" style="background:var(--red-600)"></span>${apiCounts.atrisk} At Risk</span>
          <span><span class="dot" style="background:var(--ink-300)"></span>${apiCounts.scheduled} Scheduled</span>
        </div>
      </div>
      <div class="card health-card" onclick="App.navigate('costrollover')">
        <div class="health-title">Cost Rollover ${badge("Planning")}</div>
        <div class="health-placeholder">Detailed workflow definition pending Finance / Business input.</div>
      </div>
      <div class="card health-card" onclick="App.navigate('myopening')">
        <div class="health-title">Model Year Opening <span class="badge badge-blue">${myComplete} of ${total} Open</span></div>
        ${bar({ complete: myComplete, other: total - myComplete }, [{ key: "complete", color: "var(--green-600)" }, { key: "other", color: "var(--amber-600)" }])}
        <div class="health-legend">
          <span><span class="dot" style="background:var(--green-600)"></span>${myComplete} Complete</span>
          <span><span class="dot" style="background:var(--amber-600)"></span>${total - myComplete} Attention</span>
        </div>
      </div>
    </div>`;
  }

  function attentionRequiredGrid() {
    const kok = state.api.KOK;
    const stl = state.init.STL;
    const wrn = myOpeningState.plants.find(p => p.code === "WRN");
    const cards = [];

    if (findException("EXC-101") && findException("EXC-101").status === "Open") {
      cards.push(`<div class="attn-card critical">
        <div class="attn-kicker critical">Blocked</div>
        <div class="attn-title">${plantName("KOK")} — Annual Physical Inventory</div>
        <div class="attn-body">Count verification mismatch detected.</div>
        <div class="attn-meta">Expected Count: <strong>${kok.review.physicalCount.toLocaleString()}</strong> &nbsp;|&nbsp; Processed Count: <strong>${kok.review.systemCount.toLocaleString()}</strong> &nbsp;|&nbsp; Difference: <strong>${kok.review.variance}</strong></div>
        <div class="attn-meta">Owner: <strong>Application Team</strong></div>
        <button class="btn btn-danger btn-sm" onclick="App.goToException('EXC-101')">Review Exception</button>
      </div>`);
    }
    if (!(stl.plantApproval.approved && stl.initSupportApproval.approved)) {
      cards.push(`<div class="attn-card approval">
        <div class="attn-kicker approval">Approval Required</div>
        <div class="attn-title">${plantName("STL")} — Initialization</div>
        <div class="attn-body">Plant review completed. Awaiting Plant + INIT Support buy-off before CHAMPS processing.</div>
        <div class="attn-meta">Owner: <strong>Application Team</strong></div>
        <button class="btn btn-secondary btn-sm" onclick="App.goToApproval('APR-201')">Review Approval</button>
      </div>`);
    }
    if (wrn.status !== "Complete") {
      cards.push(`<div class="attn-card warning">
        <div class="attn-kicker warning">Warning</div>
        <div class="attn-title">${plantName("WRN")} — Model Year Opening</div>
        <div class="attn-body">Model Year ${MODEL_YEAR} supplier release confirmation pending.</div>
        <div class="attn-meta">Owner: <strong>Supply Chain</strong></div>
        <button class="btn btn-secondary btn-sm" onclick="App.navigate('myopening')">View Details</button>
      </div>`);
    }
    if (!cards.length) return `<div class="card card-pad"><div class="empty-state">Nothing requires attention right now — great work.</div></div>`;
    return `<div class="attn-grid">${cards.join("")}</div>`;
  }

  function render() {
    document.getElementById("app").innerHTML = shell();
  }
  function init() { render(); }

  /* ============================================================
     INITIALIZATION PAGE
     ============================================================ */
  function renderStoryStrip(cfg) {
    return `<div class="story-strip section">
      <div class="story-cell"><div class="k">What</div><div class="v">${cfg.what}</div></div>
      <div class="story-cell"><div class="k">Why</div><div class="v">${cfg.why}</div></div>
      <div class="story-cell"><div class="k">Who Owns It</div><div class="v">${cfg.who}</div></div>
      <div class="story-cell"><div class="k">Blocked By</div><div class="v">${cfg.blocks}</div></div>
      <div class="story-cell"><div class="k">Next</div><div class="v">${cfg.next}</div></div>
      <div class="story-cell"><div class="k">Completion</div><div class="v">${cfg.pct}%</div></div>
    </div>`;
  }
  function initBlockedByText(code) {
    const d = state.init[code];
    if (d.phaseStatus.includes("blocked")) return "Workflow blocked";
    if (d.currentPhase === 4) {
      if (!d.plantApproval.approved) return "Plant buy-off pending";
      if (!d.initSupportApproval.approved) return "INIT Support buy-off pending";
    }
    if (d.currentPhase === 5 && d.champs.mismatch) return "CHAMPS date mismatch";
    return "None";
  }
  function apiBlockedByText(code) {
    const d = state.api[code];
    if (d.phaseStatus.includes("blocked")) return "Count exceptions unresolved";
    if (d.currentPhase === 4 && !d.review.finalizationApproved) return d.review.opened ? "Awaiting finalization approval" : "Business review pending";
    return "None";
  }

  function renderInit() {
    const code = state.params.plant || "STL";
    const d = state.init[code];
    const progress = computeInitProgress(code);
    const status = initStatus(code);
    const elapsed = d.phaseStatus.every(s => s === "complete") ? d.totalDuration : (d.phaseStatus[0] === "not_started" ? "&mdash;" : "In progress");

    const chips = PLANT_ORDER.map(c => `<div class="plant-chip ${c === code ? "active" : ""}" onclick="App.navigate('init',{plant:'${c}'})">${plantName(c)}</div>`).join("");

    const meta = [
      ["Plant", plantName(code)], ["Plant Code", PLANTS[code].plantCode],
      ["Current Model Year", d.currentMY], ["New Model Year", d.newMY],
      ["Initialization Date", d.initDate], ["Planned Start", d.plannedStart],
      ["Current Phase", INIT_PHASE_DEFS[d.currentPhase].title], ["Process Owner", d.owner],
      ["Elapsed Time", elapsed], ["Overall Completion", progress + "%"],
    ].map(([l, v]) => `<div class="meta-item"><div class="meta-label">${l}</div><div class="meta-value">${v}</div></div>`).join("");

    return `
    <div class="breadcrumb"><a onclick="App.navigate('overview')">Overview</a> / Annual Processes / Initialization</div>
    <div class="page-header">
      <div><div class="page-title">Initialization</div><div class="page-subtitle">Annual model-year rollover — plant systems preparation</div></div>
      ${badge(status)}
    </div>
    <div class="plant-selector">${chips}</div>
    <div class="card process-header-card">
      <div class="process-header-top"><div class="process-header-title">Initialization &mdash; ${plantName(code)}</div>
        <button class="btn btn-secondary btn-sm" onclick="App.openSopList('init')">Related Procedures</button>
      </div>
      <div class="meta-grid">${meta}</div>
      <div class="overall-progress-row">${progressBarHtml(progress)}</div>
    </div>

    ${renderStoryStrip({
      what: INIT_PHASE_DEFS[d.currentPhase].title,
      why: `Annual model-year rollover — preparing ${plantName(code)} for Model Year ${d.newMY}`,
      who: d.owner,
      blocks: initBlockedByText(code),
      next: initNextAction(code).text,
      pct: progress,
    })}

    <div class="card card-pad section">
      <div class="card-header" style="margin:-18px -20px 14px;"><h3>Process Timeline</h3><span class="muted">${plantName(code)} &middot; Initialization</span></div>
      ${timelineHtml(buildTimeline(INIT_PHASE_DEFS, d.phaseStatus, 6, 1.15))}
    </div>

    <div class="section-eyebrow"><div class="section-title">Initialization Workflow</div></div>
    <div class="stepper">
      ${INIT_PHASE_DEFS.map((p, idx) => initPhaseCard(code, p, idx)).join("")}
    </div>
    `;
  }

  function initPhaseCard(code, p, idx) {
    const d = state.init[code];
    const status = d.phaseStatus[idx];
    const expanded = state.expandedInitPhase === idx;
    let body = "";

    if (p.tasks) {
      body += `<ul class="task-list">${p.tasks.map(t => `<li><span class="task-mark pass">&#10003;</span>${t}</li>`).join("")}</ul>`;
      if (p.warning) body += `<div class="warning-box"><span>&#9888;</span><span>${p.warning}</span></div>`;
    }
    if (p.groups) {
      body += `<div class="group-grid">${p.groups.map(g => `<div class="group-tile"><div class="group-tile-name">${g.name}</div><div class="group-tile-detail">${g.detail}</div></div>`).join("")}</div>`;
    }
    if (p.hasTechDrawer) {
      body += `<div class="collapsible-toggle" onclick="App.toggleInitTech(event)">${state.showInitTech ? "&#9662;" : "&#9656;"} Technical Execution Details</div>`;
      if (state.showInitTech) {
        const rows = techRows(code);
        body += `<div class="tech-table"><table class="data-table"><thead><tr><th>Step</th><th>System / Job</th><th>Validation</th><th>Status</th><th>Completed By</th><th>Time</th></tr></thead><tbody>
          ${rows.map(r => `<tr><td>${r.step}</td><td>${r.job}</td><td>${r.validation}</td><td>${badge(r.status)}</td><td>${r.by}</td><td>${r.time}</td></tr>`).join("")}
        </tbody></table></div>`;
      }
    }
    if (p.isGate) body += initBuyoffGate(code);
    if (p.isChamps) body += initChampsPanel(code);
    if (p.isComplete) body += initCompleteBlock(code);

    if (INIT_CHECKPOINT_DETAIL[p.key] && !p.isGate && !p.isChamps) {
      body += `<div style="margin-top:10px;"><button class="btn btn-ghost btn-sm" onclick="App.openInitCheckpoint('${code}','${p.key}')">View Checkpoint Details &rsaquo;</button></div>`;
    }

    return `<div class="step-card status-${status} ${expanded ? "expanded" : ""}">
      <div class="step-head" onclick="App.toggleInitPhase(${idx})">
        <div class="step-num">${idx + 1}</div>
        <div class="step-title-block">
          <div class="step-title">${p.title}${currentTag(status)}</div>
          <div class="step-summary">${p.summary}${p.conditional !== undefined ? "" : ""}</div>
        </div>
        ${badge(statusLabel(status))}
        <div class="step-chevron">&#10148;</div>
      </div>
      <div class="step-body">${body}</div>
    </div>`;
  }
  function currentTag(status) {
    // The "current" phase is wherever the workflow is positioned right now —
    // that includes a blocked phase, since a block is exactly what's
    // "happening now" and what's preventing progress.
    if (status === "in_progress") return `<span class="current-tag">CURRENT</span>`;
    if (status === "blocked") return `<span class="current-tag current-tag-blocked">CURRENT &mdash; BLOCKED</span>`;
    return "";
  }

  function statusLabel(s) {
    return { complete: "Complete", in_progress: "In Progress", blocked: "Blocked", not_started: "Not Started" }[s] || s;
  }

  function initBuyoffGate(code) {
    const d = state.init[code];
    const bothApproved = d.plantApproval.approved && d.initSupportApproval.approved;
    return `<div class="gate-block">
      <span class="gate-label">Gate &mdash; Approval Required</span>
      <ul class="gate-requirements">
        <li>&#10003; Initialization reports reviewed</li>
        <li>&#10003; Test part verification complete</li>
        <li>&#10003; Plant confirms results are acceptable</li>
      </ul>
      <div class="approval-row">
        <div><div class="approval-name">Plant Approval</div><div class="approval-status-line">${d.plantApproval.approved ? `Approved &mdash; ${d.plantApproval.approver} &mdash; ${d.plantApproval.time}` : "Pending"}</div></div>
        ${d.plantApproval.approved ? badge("Approved") : `<button class="btn btn-secondary btn-sm" onclick="App.approveInitPlant('${code}')">Simulate Approval</button>`}
      </div>
      <div class="approval-row">
        <div><div class="approval-name">INIT Support Approval</div><div class="approval-status-line">${d.initSupportApproval.approved ? `Approved &mdash; ${d.initSupportApproval.approver} &mdash; ${d.initSupportApproval.time}` : "Pending"}</div></div>
        ${d.initSupportApproval.approved ? badge("Approved") : `<button class="btn btn-secondary btn-sm" onclick="App.approveInitSupport('${code}')">Simulate Approval</button>`}
      </div>
      <button class="btn btn-primary" ${bothApproved ? "" : "disabled"} onclick="App.continueToChamps('${code}')">Approve &amp; Continue to CHAMPS</button>
      ${!bothApproved ? `<div class="attn-meta" style="margin-top:8px;">Both approvals are required before CHAMPS processing can begin.</div>` : ""}
    </div>`;
  }

  function initChampsPanel(code) {
    const d = state.init[code];
    const c = d.champs;
    return `<div class="gate-block">
      <div class="champs-flow">
        <div class="champs-node ${c.filesSent ? "active" : ""}">Plant / CMIS</div><div class="champs-arrow">&#8594;</div>
        <div class="champs-node ${c.processing ? "active" : ""}">CHAMPS</div><div class="champs-arrow">&#8594;</div>
        <div class="champs-node ${c.responseReceived ? "active" : ""}">Response</div><div class="champs-arrow">&#8594;</div>
        <div class="champs-node ${c.responseReceived && !c.mismatch ? "active" : ""}">Plant Processing</div>
      </div>
      <div class="champs-dates">
        <div class="champs-date-tile"><div class="champs-date-label">Plant INIT Date</div><div class="champs-date-value">${c.plantDate}</div></div>
        <div class="champs-date-tile"><div class="champs-date-label">CHAMPS Date</div><div class="champs-date-value">${c.responseReceived ? c.champsDate : "&mdash;"}</div></div>
        <div class="champs-date-tile"><div class="champs-date-label">Synchronization Status</div><div class="champs-date-value">${badge(c.status)}</div></div>
      </div>
      ${c.mismatch ? `<div class="stop-banner"><h2>BLOCKED &mdash; Dates are not aligned</h2><p>CHAMPS returned an initialization date that does not match the plant date. Synchronize before continuing.</p></div>` : ""}
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-700);margin:10px 0;">
        <input type="checkbox" ${c.simulateMismatch ? "checked" : ""} ${c.responseReceived ? "disabled" : ""} onchange="App.toggleChampsSim('${code}')" />
        Simulate CHAMPS Date Mismatch (demo toggle)
      </label>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${!c.filesSent ? `<button class="btn btn-primary" onclick="App.champsSendFiles('${code}')">Send Files to CHAMPS</button>` : ""}
        ${c.filesSent && !c.responseReceived ? `<button class="btn btn-primary" onclick="App.champsCheckResponse('${code}')">Check CHAMPS Response</button>` : ""}
        ${c.mismatch ? `<button class="btn btn-danger" onclick="App.champsSynchronize('${code}')">Synchronize Date</button>` : ""}
        <button class="btn btn-primary" ${c.responseReceived && !c.mismatch ? "" : "disabled"} onclick="App.continueToValidation('${code}')">Continue to Validation &amp; Restart</button>
      </div>
    </div>`;
  }

  function initCompleteBlock(code) {
    const d = state.init[code];
    if (!d.phaseStatus.every(s => s === "complete")) {
      return `<div class="empty-state">Initialization is not yet complete for this plant.</div>`;
    }
    return `<div class="gate-block">
      <div style="font-size:15px;font-weight:700;color:var(--green-600);margin-bottom:10px;">&#10003; Initialization Completed</div>
      <div class="field-row"><span class="field-label">Completion Time</span><span class="field-value">${d.completionTime || "&mdash;"}</span></div>
      <div class="field-row"><span class="field-label">Total Duration</span><span class="field-value">${d.totalDuration || "&mdash;"}</span></div>
      <div class="field-row"><span class="field-label">Plant Approver</span><span class="field-value">${d.plantApproval.approver || "&mdash;"}</span></div>
      <div class="field-row"><span class="field-label">INIT Support Approver</span><span class="field-value">${d.initSupportApproval.approver || "&mdash;"}</span></div>
      <div class="field-row"><span class="field-label">Exceptions Encountered</span><span class="field-value">${d.exceptionsEncountered || 0}</span></div>
      <div class="field-row"><span class="field-label">Audit Reference</span><span class="field-value">${d.auditRef}</span></div>
    </div>`;
  }

  /* ---- INIT actions ---- */
  function toggleInitPhase(idx) { state.expandedInitPhase = state.expandedInitPhase === idx ? null : idx; render(); }
  function toggleInitTech() { state.showInitTech = !state.showInitTech; render(); }
  function approveInitPlant(code) {
    const d = state.init[code];
    d.plantApproval = { approved: true, approver: PEOPLE.mariaLopez.name, time: nowTimeString() };
    logAudit(code, "Initialization", "Plant Buy-Off", PEOPLE.mariaLopez.name, "Approved");
    toast(`Plant buy-off recorded for ${plantName(code)}.`);
    render();
  }
  function approveInitSupport(code) {
    const d = state.init[code];
    d.initSupportApproval = { approved: true, approver: PEOPLE.tomReilly.name, time: nowTimeString() };
    const apr = state.approvals.find(a => a.id === "APR-201");
    if (apr && code === "STL") { apr.status = "Approved"; apr.history.push({ time: nowTimeString(), user: PEOPLE.tomReilly.name, action: "INIT Support buy-off approved" }); }
    resolveExceptionById("EXC-104", PEOPLE.tomReilly.name, "INIT Support buy-off completed");
    logAudit(code, "Initialization", "INIT Support Buy-Off", PEOPLE.tomReilly.name, "Approved");
    toast(`INIT Support buy-off recorded for ${plantName(code)}.`);
    render();
  }
  function continueToChamps(code) {
    const d = state.init[code];
    if (!(d.plantApproval.approved && d.initSupportApproval.approved)) { toast("Both approvals are required before continuing."); return; }
    d.phaseStatus[4] = "complete"; d.currentPhase = 5; d.phaseStatus[5] = "in_progress";
    state.expandedInitPhase = 5;
    logAudit(code, "Initialization", "Advanced to CHAMPS Synchronization", "System", "Info");
    render();
  }
  function toggleChampsSim(code) { const c = state.init[code].champs; c.simulateMismatch = !c.simulateMismatch; render(); }
  function champsSendFiles(code) {
    const c = state.init[code].champs;
    c.filesSent = true; c.processing = true; c.status = "PROCESSING";
    logAudit(code, "Initialization", "Files Sent to CHAMPS", "CHAMPS Team", "In Progress");
    toast("Initialization files sent to CHAMPS.");
    render();
  }
  function champsCheckResponse(code) {
    const c = state.init[code].champs;
    c.processing = false; c.responseReceived = true;
    if (c.simulateMismatch) {
      c.champsDate = shiftDateStr(c.plantDate, 1);
      c.mismatch = true; c.status = "DATE MISMATCH";
      addChampsException(code);
      logAudit(code, "Initialization", "CHAMPS Date Validation", "CHAMPS Team", "Failed");
      toast("CHAMPS returned a date mismatch.");
    } else {
      c.champsDate = c.plantDate; c.mismatch = false; c.status = "DATES ALIGNED";
      logAudit(code, "Initialization", "CHAMPS Date Validation", "CHAMPS Team", "Passed");
      toast("CHAMPS dates aligned.");
    }
    render();
  }
  function champsSynchronize(code) {
    const c = state.init[code].champs;
    c.champsDate = c.plantDate; c.mismatch = false; c.status = "DATES ALIGNED";
    resolveExceptionById("EXC-CHAMPS-" + code, "CHAMPS Team", "Date synchronized with plant");
    logAudit(code, "Initialization", "CHAMPS Date Synchronized", "CHAMPS Team", "Passed");
    toast("CHAMPS date synchronized.");
    render();
  }
  function continueToValidation(code) {
    const c = state.init[code].champs;
    if (!(c.responseReceived && !c.mismatch)) { toast("CHAMPS dates must be aligned before continuing."); return; }
    const d = state.init[code];
    d.phaseStatus[5] = "complete"; d.currentPhase = 6; d.phaseStatus[6] = "in_progress";
    state.expandedInitPhase = 6;
    logAudit(code, "Initialization", "Advanced to Validation & Restart", "System", "Info");
    render();
  }
  function completeInit(code) {
    const d = state.init[code];
    d.phaseStatus[6] = "complete"; d.currentPhase = 7; d.phaseStatus[7] = "complete";
    d.completionTime = "Today &mdash; " + nowTimeString();
    d.totalDuration = "~9h (est.)";
    logAudit(code, "Initialization", "Initialization Completed", "System", "Complete");
    toast(`Initialization completed for ${plantName(code)}.`);
    render();
  }
  function openInitCheckpoint(code, key) {
    state.drawer = { type: "initCheckpoint", code, key };
    render();
  }

  /* ============================================================
     API PAGE
     ============================================================ */
  function renderApi() {
    const code = state.params.plant || "KOK";
    const d = state.api[code];
    const progress = computeApiProgress(code);
    const status = apiStatus(code);
    const chips = PLANT_ORDER.map(c => `<div class="plant-chip ${c === code ? "active" : ""}" onclick="App.navigate('api',{plant:'${c}'})">${plantName(c)}</div>`).join("");

    const meta = [
      ["Plant", plantName(code)], ["Model Year", MODEL_YEAR],
      ["Inventory Type", d.inventoryType], ["Start Date", d.startDate],
      ["Current Phase", API_PHASE_DEFS[d.currentPhase].title], ["Process Owner", d.owner],
      ["Completion", progress + "%"],
    ].map(([l, v]) => `<div class="meta-item"><div class="meta-label">${l}</div><div class="meta-value">${v}</div></div>`).join("");

    return `
    <div class="breadcrumb"><a onclick="App.navigate('overview')">Overview</a> / Annual Processes / Annual Physical Inventory</div>
    <div class="page-header">
      <div><div class="page-title">Annual Physical Inventory</div><div class="page-subtitle">Freeze, count, validate, and finalize plant inventory</div></div>
      ${badge(status)}
    </div>
    <div class="plant-selector">${chips}</div>
    <div class="card process-header-card">
      <div class="process-header-top"><div class="process-header-title">Annual Physical Inventory &mdash; ${plantName(code)}</div>
        <button class="btn btn-secondary btn-sm" onclick="App.openSopList('api')">Related Procedures</button>
      </div>
      <div class="meta-grid">${meta}</div>
      <div class="overall-progress-row">${progressBarHtml(progress)}</div>
    </div>

    ${renderStoryStrip({
      what: API_PHASE_DEFS[d.currentPhase].title,
      why: `Annual physical inventory — freezing, counting, and reconciling stock for Model Year ${MODEL_YEAR}`,
      who: d.owner,
      blocks: apiBlockedByText(code),
      next: apiNextAction(code).text,
      pct: progress,
    })}

    ${apiReconciliationVisual(code)}

    <div class="card card-pad section">
      <div class="card-header" style="margin:-18px -20px 14px;"><h3>Process Timeline</h3><span class="muted">${plantName(code)} &middot; Annual Physical Inventory</span></div>
      ${timelineHtml(buildTimeline(API_PHASE_DEFS, d.phaseStatus, 7, 1.5))}
    </div>

    <div class="section">
      <div class="section-title">Control Gates</div>
      <div class="card card-pad"><div class="control-gates-row">${API_CONTROL_GATES.map(g => controlGatePill(code, g)).join("")}</div></div>
    </div>

    <div class="section-eyebrow"><div class="section-title">API Workflow</div></div>
    <div class="stepper">
      ${API_PHASE_DEFS.map((p, idx) => apiPhaseCard(code, p, idx)).join("")}
    </div>
    `;
  }

  /* Big-number + segmented-bar reconciliation visual — the API page should
     read as an inventory health check at a glance, not a wall of tables.
     The detailed table still lives in the Inventory Review modal. */
  function apiReconciliationVisual(code) {
    const d = state.api[code];
    const r = d.review;
    if (r.systemCount === undefined) {
      return `<div class="card section" style="padding:20px 22px;"><div class="empty-state">Reconciliation data will appear here once count processing completes for this plant.</div></div>`;
    }
    const matchedCount = r.categories.filter(c => c.status === "Matched").length;
    const reviewCount = r.categories.filter(c => c.status === "Review").length;
    const totalCats = r.categories.length;
    const matchedPct = Math.round((matchedCount / totalCats) * 100);
    const reviewPct = 100 - matchedPct;
    const varianceIsZero = r.variance === 0;
    return `<div class="card section">
      <div class="recon-wrap">
        <div class="recon-numbers">
          <div class="recon-num-block"><div class="n">${r.physicalCount.toLocaleString()}</div><div class="l">Expected Inventory</div></div>
          <div class="recon-num-block"><div class="n">${r.systemCount.toLocaleString()}</div><div class="l">Actual Inventory</div></div>
          <div class="recon-num-block variance ${varianceIsZero ? "zero" : ""}"><div class="n">${r.variance > 0 ? "+" : ""}${r.variance}</div><div class="l">Variance</div></div>
          <div class="recon-num-block"><div class="n">${r.accuracy}</div><div class="l">Accuracy</div></div>
        </div>
        <div class="recon-bar-track">
          <div class="recon-bar-seg matched" style="width:${matchedPct}%"></div>
          ${reviewCount ? `<div class="recon-bar-seg review" style="width:${reviewPct}%"></div>` : ""}
        </div>
        <div class="recon-legend">
          <span><span class="dot" style="background:var(--green-600)"></span>${matchedCount} of ${totalCats} categories matched</span>
          ${reviewCount ? `<span><span class="dot" style="background:var(--amber-600)"></span>${reviewCount} ${reviewCount > 1 ? "categories" : "category"} flagged for review</span>` : `<span><span class="dot" style="background:var(--green-600)"></span>All categories reconciled</span>`}
        </div>
      </div>
    </div>`;
  }

  function controlGatePill(code, gateName) {
    const d = state.api[code];
    let s = "not_started";
    const idx = { "File Validation": 1, "PPR Review": 1, "PMR Review": 1, "CNT Verification": 2, "User / Business Approval": 4, "Grief Report Review": 5, "Controlled Restart": 5 }[gateName];
    if (gateName === "User / Business Approval") {
      if (d.review.finalizationApproved) s = "complete";
      else if (d.phaseStatus[4] === "blocked") s = "blocked";
      else if (d.review.opened) s = "in_progress";
    } else if (gateName === "Grief Report Review" || gateName === "Controlled Restart") {
      s = d.phaseStatus[5] === "complete" ? "complete" : (d.currentPhase >= 5 ? "in_progress" : "not_started");
    } else {
      s = d.phaseStatus[idx] === "complete" ? "complete" : (d.phaseStatus[idx] === "blocked" ? "blocked" : (d.phaseStatus[idx] === "in_progress" || d.currentPhase > idx ? "complete" : "not_started"));
    }
    const icon = { complete: "&#10003;", in_progress: "&#8635;", blocked: "&#10007;", not_started: "&#9675;" }[s];
    const color = { complete: "var(--green-600)", in_progress: "var(--blue-500)", blocked: "var(--red-600)", not_started: "var(--ink-300)" }[s];
    return `<div class="control-gate-pill"><span style="color:${color}">${icon}</span>${gateName}</div>`;
  }

  function apiPhaseCard(code, p, idx) {
    const d = state.api[code];
    const status = d.phaseStatus[idx];
    const expanded = state.expandedApiPhase === idx;
    let body = "";

    if (p.conditional) {
      body += `<div class="attn-meta" style="margin-bottom:8px;">Required for this plant: <strong>${d.subAssemblyRequired ? "YES" : "NO"}</strong></div>`;
      if (!d.subAssemblyRequired) body += `<div class="empty-state">Sub-assembly processing does not apply to this plant.</div>`;
    }
    if (p.tasks && (!p.conditional || d.subAssemblyRequired)) {
      body += `<ul class="task-list">${p.tasks.map(t => `<li><span class="task-mark pass">&#10003;</span>${t}</li>`).join("")}</ul>`;
    }
    if (p.isGate) body += apiUserValidationGate(code);
    if (p.isFinalGate) body += apiFinalizationBlock(code);

    if (API_CHECKPOINT_DETAIL[p.key] && !p.isGate) {
      body += `<div style="margin-top:10px;"><button class="btn btn-ghost btn-sm" onclick="App.openApiCheckpoint('${code}','${p.key}')">View Checkpoint Details &rsaquo;</button></div>`;
    }

    return `<div class="step-card status-${status} ${expanded ? "expanded" : ""}">
      <div class="step-head" onclick="App.toggleApiPhase(${idx})">
        <div class="step-num">${idx + 1}</div>
        <div class="step-title-block">
          <div class="step-title">${p.title}${currentTag(status)}</div>
          <div class="step-summary">${p.summary}</div>
        </div>
        ${badge(statusLabel(status))}
        <div class="step-chevron">&#10148;</div>
      </div>
      <div class="step-body">${body}</div>
    </div>`;
  }

  function apiUserValidationGate(code) {
    const d = state.api[code];
    if (d.phaseStatus[4] === "not_started") return `<div class="empty-state">This plant has not yet reached the User Validation gate.</div>`;
    return `<div class="stop-banner">
      <h2>PROCESS PAUSED &mdash; USER VALIDATION REQUIRED</h2>
      <p>Inventory reports must be reviewed before finalization can begin.</p>
    </div>
    <ul class="gate-requirements">
      <li>&#10003; Count processing complete</li>
      <li>&#10003; CNT validation passed</li>
      <li>&#10003; Reports generated</li>
      <li>${d.review.opened ? "&#10003;" : "&#9888;"} Business review ${d.review.opened ? "complete" : "pending"}</li>
    </ul>
    <button class="btn btn-primary" onclick="App.openApiReview('${code}')">Review Inventory Results</button>`;
  }

  function apiFinalizationBlock(code) {
    const d = state.api[code];
    if (d.currentPhase < 5) return `<div class="empty-state">Finalization begins once the User Validation gate is cleared.</div>`;
    if (d.phaseStatus[5] === "complete") {
      return `<div class="gate-block">
        <div style="font-size:15px;font-weight:700;color:var(--green-600);margin-bottom:10px;">&#10003; API Finalization Complete</div>
        <div class="field-row"><span class="field-label">Completion Time</span><span class="field-value">${d.completionTime || "&mdash;"}</span></div>
        <div class="field-row"><span class="field-label">Total Duration</span><span class="field-value">${d.totalDuration || "&mdash;"}</span></div>
        <div class="field-row"><span class="field-label">Final Accuracy</span><span class="field-value">${d.review.accuracy}</span></div>
      </div>`;
    }
    return `<div class="gate-block">
      <div class="attn-meta" style="margin-bottom:10px;">All required validations complete. Ready to finalize and return the plant to normal operations.</div>
      <button class="btn btn-primary" onclick="App.completeApi('${code}')">Run Final Adjustment &amp; Restart</button>
    </div>`;
  }

  /* ---- API actions ---- */
  function toggleApiPhase(idx) { state.expandedApiPhase = state.expandedApiPhase === idx ? null : idx; render(); }
  function openApiReview(code) {
    state.api[code].review.opened = true;
    state.modal = { type: "apiReview", code };
    render();
  }
  function resolveApiExceptions(code) {
    const d = state.api[code];
    d.review.categories.forEach(c => { if (c.status === "Review") { c.status = "Matched"; } });
    d.review.exceptionsResolved = true;
    if (d.phaseStatus[4] === "blocked") d.phaseStatus[4] = "in_progress";
    if (code === "KOK") resolveExceptionById("EXC-101", PEOPLE.priyaNair.name, "Variance categories reviewed and reconciled");
    logAudit(code, "Annual Physical Inventory", "Count Exceptions Resolved", PEOPLE.priyaNair.name, "Resolved");
    toast("Inventory exceptions resolved.");
    render();
  }
  function approveApiFinalization(code) {
    const d = state.api[code];
    if (!d.review.exceptionsResolved) { toast("Resolve all exceptions before approving finalization."); return; }
    d.review.finalizationApproved = true;
    d.phaseStatus[4] = "complete"; d.currentPhase = 5; d.phaseStatus[5] = "in_progress";
    if (code === "KOK") {
      const apr = state.approvals.find(a => a.id === "APR-202");
      if (apr) { apr.status = "Approved"; apr.history.push({ time: nowTimeString(), user: PEOPLE.sandraWu.name, action: "Finalization approved" }); }
    }
    logAudit(code, "Annual Physical Inventory", "Finalization Approved", PEOPLE.sandraWu.name, "Approved");
    toast("API finalization approved.");
    state.modal = null;
    render();
  }
  function completeApi(code) {
    const d = state.api[code];
    d.phaseStatus[5] = "complete";
    d.completionTime = "Today &mdash; " + nowTimeString();
    d.totalDuration = "~10h (est.)";
    logAudit(code, "Annual Physical Inventory", "API Finalization Completed", "System", "Complete");
    toast(`API finalization complete for ${plantName(code)}.`);
    render();
  }
  function openApiCheckpoint(code, key) {
    state.drawer = { type: "apiCheckpoint", code, key };
    render();
  }

  /* ============================================================
     COST ROLLOVER PAGE
     ============================================================ */
  function renderCostRollover() {
    return `
    <div class="breadcrumb"><a onclick="App.navigate('overview')">Overview</a> / Annual Processes / Cost Rollover</div>
    <div class="page-header">
      <div><div class="page-title">Cost Rollover</div><div class="page-subtitle">Annual process associated with the model-year transition</div></div>
      ${badge(costRolloverState.status)}
    </div>
    <div class="card card-pad">
      <div class="attn-meta" style="margin-bottom:14px;">${costRolloverState.note}</div>
      <div class="section-title">Potential High-Level Stages</div>
      <div class="pipeline-row">
        ${costRolloverState.stages.map((s, i) => `${i > 0 ? '<span class="pipeline-arrow">&#8594;</span>' : ""}<div class="pipeline-stage">${s}</div>`).join("")}
      </div>
      <div class="section-title" style="margin-top:20px;">The Future Workflow Can Support</div>
      <div class="req-grid">
        ${costRolloverState.capabilities.map(c => `<div class="req-item"><span class="ico">&#10003;</span><span>${c}</span></div>`).join("")}
      </div>
    </div>
    `;
  }

  /* ============================================================
     MODEL YEAR OPENING PAGE
     ============================================================ */
  function renderMyOpening() {
    const rows = myOpeningState.plants.map(p => `
      <tr onclick="App.navigate('plants')">
        <td><strong>${plantName(p.code)}</strong></td>
        <td>${p.newMY}</td>
        <td><span class="badge badge-green"><span class="dot"></span>${p.plantStatus}</span></td>
        <td>${badge(p.supplierRelease)}</td>
        <td>${p.owner}</td>
        <td>${badge(p.status)}</td>
      </tr>`).join("");

    const wrn = myOpeningState.plants.find(p => p.code === "WRN");
    const sal = myOpeningState.plants.find(p => p.code === "SAL");

    return `
    <div class="breadcrumb"><a onclick="App.navigate('overview')">Overview</a> / Annual Processes / Model Year Opening</div>
    <div class="page-header">
      <div><div class="page-title">Model Year Opening &mdash; MY${MODEL_YEAR}</div><div class="page-subtitle">High-level plant opening &amp; supplier release status</div></div>
    </div>
    <div class="card" style="margin-bottom:18px;">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Plant</th><th>New MY</th><th>Plant Status</th><th>Supplier Release</th><th>Owner</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>

    ${wrn.status !== "Complete" ? `
    <div class="section">
      <div class="section-title">Supplier Release Exception</div>
      <div class="card card-pad" style="border-left:4px solid var(--amber-600);">
        <div class="attn-body">Model Year ${MODEL_YEAR} is open at ${plantName("WRN")}, but supplier release confirmation has not been received.</div>
        <div class="field-row"><span class="field-label">Owner</span><span class="field-value">Supply Chain</span></div>
        <div class="field-row"><span class="field-label">Status</span><span class="field-value">${badge("ACTION REQUIRED")}</span></div>
        <div style="margin-top:12px;"><button class="btn btn-primary" onclick="App.confirmSupplierRelease('WRN')">Resolve / Confirm Release</button></div>
      </div>
    </div>` : ""}

    ${sal.status !== "Complete" ? `
    <div class="section">
      <div class="section-title">Model Year Release Exception</div>
      <div class="card card-pad" style="border-left:4px solid var(--red-600);">
        <div class="attn-body">${plantName("SAL")} is open on Model Year ${sal.newMY}, but the supplier release is still showing Model Year ${sal.supplierReleaseMY}.</div>
        <div class="field-row"><span class="field-label">Plant MY</span><span class="field-value">${sal.newMY}</span></div>
        <div class="field-row"><span class="field-label">Supplier Release MY</span><span class="field-value">${sal.supplierReleaseMY}</span></div>
        <div class="field-row"><span class="field-label">Status</span><span class="field-value">${badge("MISMATCH")}</span></div>
        <div style="margin-top:12px;"><button class="btn btn-danger" onclick="App.confirmModelYearRelease('SAL')">Confirm / Update Release</button></div>
        <div class="attn-meta" style="margin-top:8px;">This is a prototype illustration only — the portal is not performing a real production-system update.</div>
      </div>
    </div>` : ""}
    `;
  }

  function confirmSupplierRelease(code) {
    const p = myOpeningState.plants.find(x => x.code === code);
    p.supplierRelease = "Confirmed"; p.supplierReleaseMY = MODEL_YEAR; p.status = "Complete";
    resolveExceptionById("EXC-102", PEOPLE.marcusWebb.name, "Supplier release confirmed");
    logAudit(code, "Model Year Opening", "Supplier Release Confirmed", PEOPLE.marcusWebb.name, "Approved");
    toast(`Supplier release confirmed for ${plantName(code)}.`);
    render();
  }
  function confirmModelYearRelease(code) {
    const p = myOpeningState.plants.find(x => x.code === code);
    p.supplierRelease = "Confirmed"; p.supplierReleaseMY = MODEL_YEAR; p.status = "Complete";
    resolveExceptionById("EXC-103", PEOPLE.marcusWebb.name, "Release model year corrected and confirmed");
    const apr = state.approvals.find(a => a.id === "APR-203");
    if (apr) { apr.status = "Approved"; apr.history.push({ time: nowTimeString(), user: PEOPLE.marcusWebb.name, action: "Release model year corrected" }); }
    logAudit(code, "Model Year Opening", "Model Year Release Corrected", PEOPLE.marcusWebb.name, "Approved");
    toast(`Model year release corrected for ${plantName(code)}.`);
    render();
  }

  /* ============================================================
     PLANTS PAGE
     ============================================================ */
  function plantOverallHealth(code) {
    const iStat = initStatus(code), aStat = apiStatus(code);
    const my = myOpeningState.plants.find(p => p.code === code);
    const statuses = [iStat, aStat, my.status];
    let overall;
    if (statuses.some(s => s === "Blocked" || s === "Mismatch")) overall = "red";
    else if (statuses.some(s => ["Awaiting Plant Approval", "Validation Required", "Attention"].includes(s))) overall = "amber";
    else if (statuses.some(s => s === "In Progress")) overall = "blue";
    else if (statuses.every(s => s === "Completed" || s === "Complete")) overall = "green";
    else overall = "gray";
    const label = { green: "Healthy", blue: "In Progress", amber: "Attention", red: "At Risk", gray: "Scheduled" }[overall];
    return { color: overall, label, iStat, aStat, myStat: my.status };
  }

  function plantMapSvg() {
    const dots = PLANT_ORDER.map(code => {
      const h = plantOverallHealth(code);
      const { x, y } = PLANTS[code].map;
      return `<g class="map-dot status-${h.color}" onclick="App.openPlantDrawer('${code}')">
        <circle class="pulse" cx="${x}" cy="${y}" r="8" fill="var(--${h.color === "gray" ? "ink-300" : h.color + "-600"})" opacity="0.35"></circle>
        <circle cx="${x}" cy="${y}" r="7" fill="var(--${h.color === "gray" ? "ink-300" : h.color + "-600"})" stroke="#fff" stroke-width="2"></circle>
        <text x="${x + 12}" y="${y + 4}">${plantName(code)}</text>
      </g>`;
    }).join("");
    return `<div class="card section map-panel">
      <div class="card-header" style="margin:-16px -18px 10px;"><h3>Plant Operations Map</h3><span class="muted">Click a plant for full readiness detail</span></div>
      <div class="map-svg-wrap">
        <svg viewBox="0 0 1000 560" width="100%" height="360" preserveAspectRatio="xMidYMid meet">
          <path d="M120,90 C260,40 430,55 560,50 C700,45 830,80 900,150 C940,210 920,260 880,290 C860,330 840,380 800,410 C760,450 700,430 660,460 C630,490 600,540 540,540 C480,540 470,470 430,460 C380,450 340,470 300,440 C260,410 260,360 220,330 C170,300 130,290 110,240 C90,190 90,140 120,90 Z"
                fill="#e9eef5" stroke="#d5deea" stroke-width="2"></path>
          ${dots}
        </svg>
      </div>
      <div class="map-legend">
        <span><span class="dot" style="background:var(--green-600)"></span>Healthy</span>
        <span><span class="dot" style="background:var(--blue-500)"></span>In Progress</span>
        <span><span class="dot" style="background:var(--amber-600)"></span>Attention</span>
        <span><span class="dot" style="background:var(--red-600)"></span>At Risk</span>
        <span><span class="dot" style="background:var(--ink-300)"></span>Scheduled</span>
      </div>
    </div>`;
  }

  function renderPlants() {
    const rows = PLANT_ORDER.map(code => {
      const h = plantOverallHealth(code);
      const crStat = "Planning";
      return `<tr onclick="App.openPlantDrawer('${code}')">
        <td><strong>${plantName(code)}</strong><div class="attn-meta">${PLANTS[code].type} &middot; ${PLANTS[code].plantCode}</div></td>
        <td>${badge(h.iStat)}</td>
        <td>${badge(h.aStat)}</td>
        <td>${badge(crStat)}</td>
        <td>${badge(h.myStat)}</td>
        <td><span class="badge badge-${h.color}"><span class="dot"></span>${h.label}</span></td>
      </tr>`;
    }).join("");

    return `
    <div class="page-header"><div><div class="page-title">Plants</div><div class="page-subtitle">Plant-centric readiness across all four annual processes</div></div></div>
    ${plantMapSvg()}
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Plant</th><th>INIT</th><th>API</th><th>Cost Rollover</th><th>MY Opening</th><th>Overall Health</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>
    `;
  }

  function openPlantDrawer(code) { state.drawer = { type: "plantReadiness", code }; render(); }

  /* ============================================================
     APPROVAL CENTER
     ============================================================ */
  function renderApprovals() {
    const rows = state.approvals.map(a => `
      <tr onclick="App.openApprovalModalById('${a.id}')">
        <td>${a.process}</td>
        <td>${plantName(a.plant)}</td>
        <td>${a.gate}</td>
        <td>${a.requestedBy}</td>
        <td>${a.waiting}</td>
        <td>${badge(a.status)}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();App.openApprovalModalById('${a.id}')">Review</button></td>
      </tr>`).join("");
    return `
    <div class="page-header"><div><div class="page-title">Approval Center</div><div class="page-subtitle">Governance gates awaiting a decision</div></div></div>
    <div class="card">
      <div class="card-header"><h3>My Pending Approvals</h3><span class="muted">${state.approvals.filter(a => a.status === "Pending").length} pending</span></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Process</th><th>Plant</th><th>Gate</th><th>Requested By</th><th>Waiting</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>
    `;
  }

  function openApprovalModalById(id) { state.modal = { type: "approval", id }; render(); }
  function approveApproval(id) {
    const a = state.approvals.find(x => x.id === id);
    if (!a) return;
    if (id === "APR-201") { approveInitSupport("STL"); }
    else if (id === "APR-202") {
      if (!state.api.KOK.review.exceptionsResolved) { toast("Cannot approve — count exceptions are still unresolved."); return; }
      approveApiFinalization("KOK");
    } else if (id === "APR-203") { confirmModelYearRelease("SAL"); }
    else { a.status = "Approved"; a.history.push({ time: nowTimeString(), user: PEOPLE.jamesFoster.name, action: "Approved" }); }
    state.modal = null;
    render();
  }
  function rejectApproval(id) {
    const a = state.approvals.find(x => x.id === id);
    if (!a) return;
    a.status = "Rejected / Returned";
    a.history.push({ time: nowTimeString(), user: PEOPLE.jamesFoster.name, action: "Returned for corrections" });
    logAudit(a.plant, a.process, a.gate + " Returned", PEOPLE.jamesFoster.name, "Rejected / Returned");
    toast("Approval returned for corrections.");
    state.modal = null;
    render();
  }
  function requestClarification(id) {
    const a = state.approvals.find(x => x.id === id);
    if (!a) return;
    a.history.push({ time: nowTimeString(), user: PEOPLE.jamesFoster.name, action: "Requested clarification" });
    toast("Clarification requested.");
    render();
  }

  /* ============================================================
     EXCEPTIONS CENTER
     ============================================================ */
  const OWNER_OPTIONS = ["Application Team", "RDC", "Plant IT", "Finance / Business", "Supply Chain", "CHAMPS Team", "Plant MLM"];
  function renderExceptions() {
    const rows = state.exceptions.map(e => `
      <tr onclick="App.openExceptionModalById('${e.id}')">
        <td>${badge(e.severity)}</td>
        <td>${plantName(e.plant)}</td>
        <td>${e.process}</td>
        <td>${e.title}</td>
        <td>${e.owner}</td>
        <td>${e.detected}</td>
        <td>${badge(e.status)}</td>
      </tr>`).join("");
    return `
    <div class="page-header"><div><div class="page-title">Exceptions Center</div><div class="page-subtitle">Every problem across all plants and processes, in one place</div></div></div>
    <div class="card">
      <div class="card-header"><h3>All Exceptions</h3><span class="muted">${state.exceptions.filter(e => e.status === "Open").length} open</span></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Severity</th><th>Plant</th><th>Process</th><th>Exception</th><th>Owner</th><th>Age</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>
    `;
  }
  function openExceptionModalById(id) { state.modal = { type: "exception", id }; render(); }
  function assignExceptionOwner(id, owner) {
    const e = findException(id);
    if (!e) return;
    e.owner = owner;
    e.history.push({ time: nowTimeString(), user: PEOPLE.currentUser.name, action: `Owner reassigned to ${owner}` });
    logAudit(e.plant, e.process, "Exception Owner Reassigned", PEOPLE.currentUser.name, "Info");
    toast(`Exception ${id} reassigned to ${owner}.`);
    render();
  }

  /* ============================================================
     REPORTS & AUDIT
     ============================================================ */
  function renderReports() {
    const f = state.reportFilters;
    const plants = [...new Set(state.auditLog.map(r => r.plant))];
    const processes = [...new Set(state.auditLog.map(r => r.process))];
    const results = [...new Set(state.auditLog.map(r => r.result))];
    const users = [...new Set(state.auditLog.map(r => r.user))];

    const filtered = state.auditLog.filter(r =>
      (!f.plant || r.plant === f.plant) &&
      (!f.process || r.process === f.process) &&
      (!f.status || r.result === f.status) &&
      (!f.user || r.user === f.user) &&
      (!f.date || r.time.toLowerCase().includes(f.date.toLowerCase()))
    );

    const rows = filtered.map(r => `<tr>
      <td>${r.time}</td><td>${plantName(r.plant)}</td><td>${r.process}</td><td>${r.activity}</td><td>${r.user}</td><td>${badge(r.result)}</td>
    </tr>`).join("");

    function opts(arr, selected) { return `<option value="">All</option>` + arr.map(v => `<option value="${v}" ${v === selected ? "selected" : ""}>${v}</option>`).join(""); }

    return `
    <div class="page-header"><div><div class="page-title">Reports &amp; Audit</div><div class="page-subtitle">Full activity trail across every plant and process</div></div></div>
    <div class="card card-pad" style="margin-bottom:14px;">
      <div class="filters-bar">
        <select onchange="App.setReportFilter('plant', this.value)">${opts(plants, f.plant)}</select>
        <select onchange="App.setReportFilter('process', this.value)">${opts(processes, f.process)}</select>
        <select onchange="App.setReportFilter('status', this.value)">${opts(results, f.status)}</select>
        <select onchange="App.setReportFilter('user', this.value)">${opts(users, f.user)}</select>
        <input type="text" placeholder="Filter by date/time text&hellip;" value="${f.date}" oninput="App.setReportFilter('date', this.value)" />
        <button class="btn btn-secondary btn-sm" onclick="App.clearReportFilters()">Clear Filters</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Activity Log</h3><span class="muted">${filtered.length} of ${state.auditLog.length} entries</span></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Time</th><th>Plant</th><th>Process</th><th>Activity</th><th>User</th><th>Result</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6"><div class="empty-state">No matching activity.</div></td></tr>`}</tbody>
      </table></div>
    </div>
    `;
  }
  function setReportFilter(key, val) { state.reportFilters[key] = val; render(); }
  function clearReportFilters() { state.reportFilters = { plant: "", process: "", status: "", user: "", date: "" }; render(); }

  /* ============================================================
     DRAWERS
     ============================================================ */
  function drawerOverlay() {
    const dr = state.drawer;
    let title = "", body = "";
    if (dr.type === "initCheckpoint") {
      const det = INIT_CHECKPOINT_DETAIL[dr.key];
      const phaseTitle = INIT_PHASE_DEFS.find(p => p.key === dr.key).title;
      title = phaseTitle + " — " + plantName(dr.code);
      body = checkpointBody(det);
    } else if (dr.type === "apiCheckpoint") {
      const det = API_CHECKPOINT_DETAIL[dr.key];
      const phaseTitle = API_PHASE_DEFS.find(p => p.key === dr.key).title;
      title = phaseTitle + " — " + plantName(dr.code);
      body = checkpointBody(det);
    } else if (dr.type === "plantReadiness") {
      title = "Plant Annual Readiness — " + plantName(dr.code);
      body = plantReadinessBody(dr.code);
    } else if (dr.type === "help") {
      title = "Portal Guide";
      body = helpDrawerBody();
    }
    return `<div class="overlay" onclick="if(event.target===this) App.closeDrawer()">
      <div class="drawer">
        <div class="drawer-header"><h3>${title}</h3><button class="close-x" onclick="App.closeDrawer()">&times;</button></div>
        <div class="drawer-body">${body}</div>
      </div>
    </div>`;
  }

  function openHelpDrawer() { state.drawer = { type: "help" }; render(); }

  function helpDrawerBody() {
    const statusRows = [
      { color: "var(--green-600)", label: "Completed / Passed" },
      { color: "var(--blue-badge-600)", label: "In Progress" },
      { color: "var(--amber-600)", label: "Waiting / Action Required" },
      { color: "var(--red-600)", label: "Blocked / Failed" },
      { color: "var(--gray-600)", label: "Not Started" },
    ];
    const keyAreas = [
      ["Overview", "Monitor annual operations across plants."],
      ["Initialization", "Manage model-year initialization workflow and CHAMPS coordination."],
      ["Annual Physical Inventory", "Manage inventory freeze, count validation, reconciliation and finalization."],
      ["Plants", "View annual operational readiness by plant."],
      ["Approvals", "Review pending workflow approvals and buy-offs."],
      ["Exceptions", "Investigate issues blocking process progression."],
      ["Reports & Audit", "Review historical actions and process traceability."],
    ];
    return `
      <div class="help-subtitle">Annual Manufacturing Operations</div>
      <p class="help-intro">This portal provides a centralized workspace for monitoring and managing Stellantis annual manufacturing operations across plants.</p>

      <div class="help-section-label">How to Use the Portal</div>
      <ol class="help-steps">
        <li>Select a plant or active process.</li>
        <li>Review the current workflow phase.</li>
        <li>Complete required validations.</li>
        <li>Resolve any blocking exceptions.</li>
        <li>Complete required approval gates.</li>
        <li>Continue the workflow through completion.</li>
      </ol>

      <div class="help-section-label">Status Guide</div>
      <div class="help-status-guide">
        ${statusRows.map(r => `<div class="help-status-row"><span class="dot" style="background:${r.color}"></span>${r.label}</div>`).join("")}
      </div>

      <div class="help-section-label">Key Areas</div>
      <div class="help-key-areas">
        ${keyAreas.map(([name, desc]) => `<div class="help-key-area"><div class="k">${name}</div><div class="v">${desc}</div></div>`).join("")}
      </div>

      <div class="help-footnote">Prototype concept &mdash; workflow and integration details are subject to validation with Stellantis stakeholders.</div>
    `;
  }

  function checkpointBody(det) {
    if (!det) return `<div class="empty-state">No additional detail for this checkpoint.</div>`;
    const taskIcon = { pass: '<span class="task-mark pass">&#10003;</span>', warn: '<span class="task-mark warn">&#9888;</span>', progress: '<span class="task-mark progress">&#8635;</span>', pending: '<span class="task-mark pending">&#9675;</span>' };
    return `
      <div class="detail-block"><h4>Checkpoint Information</h4>
        <div class="field-row"><span class="field-label">Description</span><span class="field-value" style="max-width:60%;text-align:right;">${det.description}</span></div>
        <div class="field-row"><span class="field-label">Owner</span><span class="field-value">${det.owner}</span></div>
        <div class="field-row"><span class="field-label">Responsible Team</span><span class="field-value">${det.team}</span></div>
        <div class="field-row"><span class="field-label">Required Before</span><span class="field-value">${det.requiredBefore}</span></div>
        <div class="field-row"><span class="field-label">Validation Method</span><span class="field-value" style="max-width:60%;text-align:right;">${det.validationMethod}</span></div>
      </div>
      <div class="detail-block"><h4>Tasks</h4>
        <ul class="task-list">${det.tasks.map(t => `<li>${taskIcon[t.status]}${t.label}</li>`).join("")}</ul>
      </div>
    `;
  }

  function plantPrimaryProcess(code) {
    const iStat = initStatus(code), aStat = apiStatus(code);
    const active = ["In Progress", "Blocked", "Awaiting Plant Approval", "Validation Required"];
    if (active.includes(iStat)) return { type: "init", status: iStat };
    if (active.includes(aStat)) return { type: "api", status: aStat };
    if (iStat !== "Completed") return { type: "init", status: iStat };
    return { type: "api", status: aStat };
  }

  function plantReadinessBody(code) {
    const iProg = computeInitProgress(code), iStat = initStatus(code);
    const aStat = apiStatus(code);
    const my = myOpeningState.plants.find(p => p.code === code);
    const exCount = state.exceptions.filter(e => e.plant === code && e.status === "Open").length;
    const aprCount = state.approvals.filter(a => a.plant === code && a.status === "Pending").length;
    const health = plantOverallHealth(code);
    const contactMap = {
      STL: [PEOPLE.mariaLopez, PEOPLE.alexChen], WRN: [PEOPLE.karenSilva], KOK: [PEOPLE.elenaVasquez],
      TOL: [PEOPLE.benWhitfield], JNA: [PEOPLE.linaOsei], SAL: [PEOPLE.carlosDuarte],
    };
    const contacts = contactMap[code] || [];

    const primary = plantPrimaryProcess(code);
    const isInitPrimary = primary.type === "init";
    const pd = isInitPrimary ? state.init[code] : state.api[code];
    const defs = isInitPrimary ? INIT_PHASE_DEFS : API_PHASE_DEFS;
    const owner = pd.owner;
    const elapsed = pd.phaseStatus.every(s => s === "complete") ? (pd.totalDuration || "&mdash;") : (pd.phaseStatus[0] === "not_started" ? "&mdash;" : "In progress");
    const running = defs.filter((p, i) => pd.phaseStatus[i] === "in_progress" || pd.phaseStatus[i] === "blocked");
    const completed = defs.filter((p, i) => pd.phaseStatus[i] === "complete");
    const upcoming = defs.filter((p, i) => i > pd.currentPhase && pd.phaseStatus[i] === "not_started");
    const baseHour = isInitPrimary ? 6 : 7, stepHours = isInitPrimary ? 1.15 : 1.5;

    return `
      <div class="detail-block">
        <div class="field-row"><span class="field-label">Plant Health</span><span class="field-value"><span class="badge badge-${health.color}"><span class="dot"></span>${health.label}</span></span></div>
        <div class="field-row"><span class="field-label">Primary Process</span><span class="field-value">${isInitPrimary ? "Initialization" : "Annual Physical Inventory"}</span></div>
        <div class="field-row"><span class="field-label">Current Phase</span><span class="field-value">${defs[pd.currentPhase].title}</span></div>
        <div class="field-row"><span class="field-label">Current Owner</span><span class="field-value">${owner}</span></div>
        <div class="field-row"><span class="field-label">Elapsed Time</span><span class="field-value">${elapsed}</span></div>
        <div class="field-row"><span class="field-label">Open Exceptions</span><span class="field-value">${exCount}</span></div>
        <div class="field-row"><span class="field-label">Pending Approvals</span><span class="field-value">${aprCount}</span></div>
      </div>

      <div class="detail-block">
        <div class="field-row"><span class="field-label">Initialization</span><span class="field-value">${iProg}% &nbsp;${badge(iStat)}</span></div>
        <div class="field-row"><span class="field-label">API</span><span class="field-value">${badge(aStat)}</span></div>
        <div class="field-row"><span class="field-label">Cost Rollover</span><span class="field-value">${badge("Planning")}</span></div>
        <div class="field-row"><span class="field-label">Model Year Opening</span><span class="field-value">${badge(my.status)}</span></div>
      </div>

      <div class="detail-block"><h4>Running Activities</h4>
        ${running.length ? `<ul class="task-list">${running.map(p => `<li><span class="task-mark progress">&#8635;</span>${p.title}</li>`).join("")}</ul>` : `<div class="empty-state" style="padding:8px 0;">Nothing currently running.</div>`}
      </div>
      <div class="detail-block"><h4>Completed Activities</h4>
        ${completed.length ? `<ul class="task-list">${completed.map(p => `<li><span class="task-mark pass">&#10003;</span>${p.title}</li>`).join("")}</ul>` : `<div class="empty-state" style="padding:8px 0;">Nothing completed yet.</div>`}
      </div>
      <div class="detail-block"><h4>Upcoming Steps</h4>
        ${upcoming.length ? `<ul class="task-list">${upcoming.map(p => `<li><span class="task-mark pending">&#9675;</span>${p.title}</li>`).join("")}</ul>` : `<div class="empty-state" style="padding:8px 0;">No upcoming steps — process complete.</div>`}
      </div>

      <div class="detail-block"><h4>Timeline &mdash; ${isInitPrimary ? "Initialization" : "Annual Physical Inventory"}</h4>
        ${timelineHtml(buildTimeline(defs, pd.phaseStatus, baseHour, stepHours))}
      </div>

      <div class="detail-block"><h4>Key Contacts</h4>
        <div class="contact-grid">${contacts.map(c => `<div class="contact-card"><div class="contact-name">${c.name}</div><div class="contact-role">${c.title}</div></div>`).join("")}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary btn-sm" onclick="App.navigate('init',{plant:'${code}'})">Open Initialization</button>
        <button class="btn btn-secondary btn-sm" onclick="App.navigate('api',{plant:'${code}'})">Open API</button>
      </div>
    `;
  }

  /* ============================================================
     MODALS
     ============================================================ */
  function modalOverlay() {
    const m = state.modal;
    let title = "", body = "", footer = "";
    if (m.type === "apiReview") { const r = apiReviewModal(m.code); title = r.title; body = r.body; footer = r.footer; }
    else if (m.type === "approval") { const r = approvalModal(m.id); title = r.title; body = r.body; footer = r.footer; }
    else if (m.type === "exception") { const r = exceptionModal(m.id); title = r.title; body = r.body; footer = r.footer; }
    else if (m.type === "sopList") { const r = sopListModal(m.process); title = r.title; body = r.body; footer = r.footer; }
    else if (m.type === "sopPreview") { const r = sopPreviewModal(m.name, m.process); title = r.title; body = r.body; footer = r.footer; }

    const wide = m.type === "apiReview" ? " wide" : "";
    return `<div class="overlay center" onclick="if(event.target===this) App.closeModal()">
      <div class="modal-box${wide}">
        <div class="modal-header"><h3>${title}</h3><button class="close-x" onclick="App.closeModal()">&times;</button></div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ""}
      </div>
    </div>`;
  }

  function apiReviewModal(code) {
    const d = state.api[code];
    const r = d.review;
    const catRows = r.categories.map(c => `<tr>
      <td>${c.category}</td><td class="num-cell">${c.system.toLocaleString()}</td><td class="num-cell">${c.physical.toLocaleString()}</td>
      <td class="num-cell">${c.variance > 0 ? "+" + c.variance : c.variance}</td><td>${badge(c.status)}</td>
    </tr>`).join("");
    const openCount = r.categories.filter(c => c.status === "Review").length;
    let footer = "";
    if (openCount > 0) {
      footer = `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button><button class="btn btn-danger" onclick="App.resolveApiExceptions('${code}')">Resolve Exceptions</button>`;
    } else if (!r.finalizationApproved) {
      footer = `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button><button class="btn btn-primary" onclick="App.approveApiFinalization('${code}')">Approve Finalization</button>`;
    } else {
      footer = `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button>`;
    }
    return {
      title: `Inventory Review — ${plantName(code)}`,
      body: `
        <div class="kpi-tile-row">
          <div class="kpi-tile"><div class="kpi-tile-label">System Count</div><div class="kpi-tile-value">${r.systemCount.toLocaleString()}</div></div>
          <div class="kpi-tile"><div class="kpi-tile-label">Physical Count</div><div class="kpi-tile-value">${r.physicalCount.toLocaleString()}</div></div>
          <div class="kpi-tile"><div class="kpi-tile-label">Variance</div><div class="kpi-tile-value">${r.variance > 0 ? "+" : ""}${r.variance}</div></div>
          <div class="kpi-tile"><div class="kpi-tile-label">Accuracy</div><div class="kpi-tile-value">${r.accuracy}</div></div>
        </div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Category</th><th>System Count</th><th>Physical Count</th><th>Variance</th><th>Status</th></tr></thead>
          <tbody>${catRows}</tbody>
        </table></div>
        ${openCount > 0 ? `<div class="warning-box" style="margin-top:14px;"><span>&#9888;</span><span>${openCount} Exceptions Require Resolution</span></div>` : `<div class="warning-box" style="margin-top:14px;background:var(--green-100);border-color:#bfe3cc;color:#155c33;"><span>&#10003;</span><span>ALL REQUIRED VALIDATIONS COMPLETE</span></div>`}
      `,
      footer,
    };
  }

  function approvalModal(id) {
    const a = state.approvals.find(x => x.id === id);
    if (!a) return { title: "Approval", body: "Not found.", footer: "" };
    const prereqs = a.prerequisites.map(p => `<li>${p.met ? '<span class="task-mark pass">&#10003;</span>' : '<span class="task-mark warn">&#9888;</span>'} ${p.label}</li>`).join("");
    const hist = a.history.map(h => `<div class="history-item"><strong>${h.time}</strong> — ${h.user}: ${h.action}</div>`).join("");
    const allMet = a.prerequisites.every(p => p.met);
    const footer = a.status === "Pending"
      ? `<button class="btn btn-secondary" onclick="App.requestClarification('${id}')">Request Clarification</button>
         <button class="btn btn-danger" onclick="App.rejectApproval('${id}')">Reject / Return</button>
         <button class="btn btn-primary" ${allMet ? "" : "disabled"} onclick="App.approveApproval('${id}')">Approve</button>`
      : `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button>`;
    return {
      title: `${a.gate} — ${plantName(a.plant)}`,
      body: `
        <div class="detail-block"><h4>Prerequisite Validations</h4><ul class="gate-requirements">${prereqs}</ul></div>
        <div class="detail-block"><h4>Evidence</h4><div class="attn-body">${a.evidence}</div></div>
        <div class="detail-block"><h4>Notes</h4><div class="attn-body">${a.notes}</div></div>
        <div class="detail-block"><h4>Approval History</h4>${hist || '<div class="empty-state">No history yet.</div>'}</div>
        ${!allMet ? `<div class="warning-box"><span>&#9888;</span><span>Not all prerequisites are met — approving may not be possible until resolved.</span></div>` : ""}
      `,
      footer,
    };
  }

  function goToExceptionWorkflow(id) {
    const e = findException(id);
    if (!e) return;
    state.modal = null;
    if (e.process === "Initialization") navigate("init", { plant: e.plant });
    else if (e.process === "Annual Physical Inventory") navigate("api", { plant: e.plant });
    else if (e.process === "Model Year Opening") navigate("myopening", {});
    else navigate("exceptions", {});
  }
  function addExceptionComment(id) {
    const el = document.getElementById("commentInput_" + id);
    if (!el || !el.value.trim()) return;
    const e = findException(id);
    if (!e) return;
    e.history.push({ time: nowTimeString(), user: PEOPLE.currentUser.name, action: el.value.trim() });
    render();
  }

  /* Exception detail — deliberately framed like an incident-management
     record (Issue Summary / Impact / Root Cause / Resolution / Timeline)
     rather than a plain field list, so investigating a problem here feels
     like working an incident, not reading a database row. */
  function exceptionModal(id) {
    const e = findException(id);
    if (!e) return { title: "Exception", body: "Not found.", footer: "" };
    const hist = e.history.map(h => `<div class="history-item"><strong>${h.time}</strong> — ${h.user}: ${h.action}</div>`).join("");
    const ownerOpts = OWNER_OPTIONS.map(o => `<option value="${o}" ${o === e.owner ? "selected" : ""}>${o}</option>`).join("");
    const severityIcon = { Critical: "&#9679;", High: "&#9679;", Medium: "&#9679;" }[e.severity] || "&#9679;";
    return {
      title: `${e.title} — ${plantName(e.plant)}`,
      body: `
        <div class="incident-grid">
          <div class="incident-field"><div class="k">Severity</div><div class="v">${badge(e.severity)}</div></div>
          <div class="incident-field"><div class="k">Current Status</div><div class="v">${badge(e.status)}</div></div>
          <div class="incident-field"><div class="k">Impacted Process</div><div class="v">${e.process}</div></div>
          <div class="incident-field"><div class="k">Blocking Phase</div><div class="v">${e.blockedPhase}</div></div>
          <div class="incident-field"><div class="k">Time Detected</div><div class="v">${e.detected}</div></div>
          <div class="incident-field"><div class="k">Assigned Team</div><div class="v">${e.owner}</div></div>
        </div>

        <div class="incident-section"><h4>&#128269; Issue Summary</h4><div class="body-text">${e.detail}</div></div>
        <div class="incident-section"><h4>&#9889; Impact</h4><div class="body-text">${e.impact || "Impact assessment pending."}</div></div>
        <div class="incident-section"><h4>&#128300; Root Cause</h4><div class="incident-rootcause">${e.rootCause || "Root cause analysis in progress."}</div></div>
        <div class="incident-section"><h4>&#9989; Recommended Resolution</h4><div class="body-text">${e.recommendedAction}</div></div>

        <div class="incident-section"><h4>Reassign Owner</h4>
          <div style="display:flex;gap:8px;">
            <select id="ownerSelect_${e.id}">${ownerOpts}</select>
            <button class="btn btn-secondary btn-sm" onclick="App.assignExceptionOwner('${e.id}', document.getElementById('ownerSelect_${e.id}').value)">Assign Owner</button>
          </div>
        </div>

        <div class="incident-section"><h4>&#128337; Activity Timeline &amp; Comments</h4>${hist}
          <div style="display:flex;gap:8px;margin-top:10px;">
            <input type="text" id="commentInput_${e.id}" placeholder="Add a comment&hellip;" style="flex:1;padding:7px 10px;border-radius:6px;border:1px solid var(--line-strong);font-size:12.5px;" />
            <button class="btn btn-secondary btn-sm" onclick="App.addExceptionComment('${e.id}')">Add</button>
          </div>
        </div>
      `,
      footer: `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button><button class="btn btn-primary" onclick="App.goToExceptionWorkflow('${e.id}')">Go to Workflow</button>`,
    };
  }

  function openSopList(process) { state.modal = { type: "sopList", process }; render(); }
  function sopListModal(process) {
    const list = RELATED_SOPS[process] || [];
    return {
      title: "Related Procedures",
      body: `<ul class="action-list">${list.map(name => `<li>${name}<button class="btn btn-secondary btn-sm" onclick="App.viewSop('${name.replace(/'/g, "\\'")}','${process}')">View SOP</button></li>`).join("")}</ul>`,
      footer: `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button>`,
    };
  }
  function viewSop(name, process) { state.modal = { type: "sopPreview", name, process }; render(); }
  function sopPreviewModal(name, process) {
    return {
      title: name,
      body: `<div class="empty-state">Document preview would be integrated here.</div>`,
      footer: `<button class="btn btn-secondary" onclick="App.openSopList('${process}')">Back</button><button class="btn btn-primary" onclick="App.closeModal()">Close</button>`,
    };
  }

  /* ============================================================
     TOASTS
     ============================================================ */
  function toastWrap() {
    if (!state.toasts.length) return "";
    return `<div class="toast-wrap">${state.toasts.map(t => `<div class="toast">${t.msg}</div>`).join("")}</div>`;
  }

  function openNotificationById(id) {
    const n = state.notifications.find(x => x.id === id);
    if (n) openNotification(n);
  }

  /* ============================================================
     EXPORT
     ============================================================ */
  return {
    init, navigate, goToException, goToApproval, setRole, toggleNotif, toggleRoleMenu,
    closeModal, closeDrawer, dismissToast, openNotificationById,
    toggleInitPhase, toggleInitTech, approveInitPlant, approveInitSupport, continueToChamps,
    toggleChampsSim, champsSendFiles, champsCheckResponse, champsSynchronize, continueToValidation,
    completeInit, openInitCheckpoint,
    toggleApiPhase, openApiReview, resolveApiExceptions, approveApiFinalization, completeApi, openApiCheckpoint,
    confirmSupplierRelease, confirmModelYearRelease,
    openPlantDrawer,
    openApprovalModalById, approveApproval, rejectApproval, requestClarification,
    openExceptionModalById, assignExceptionOwner,
    setReportFilter, clearReportFilters,
    openSopList, viewSop,
    setOverviewTimeline, goToExceptionWorkflow, addExceptionComment,
    openHelpDrawer,
  };

})();

document.addEventListener("DOMContentLoaded", function () { App.init(); });

