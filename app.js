const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const STORAGE_KEY = "welfareMonthlyPerformance.v2";
const OLD_STORAGE_KEY = "welfareMonthlyPerformance.v1";

const now = new Date();
const nowYear = now.getFullYear();
let selectedYear = nowYear;
let selectedMonth = now.getMonth() + 1;
let state = loadState();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {};

function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultState() {
  const programs = [
    programSeed("사례관리 상담", "사례관리", "김사회", "건", 480),
    programSeed("서비스 연계", "자원연계", "이복지", "건", 240),
    programSeed("사례회의", "사례관리", "김사회", "회", 72),
    programSeed("후원물품 지원", "후원", "박나눔", "명", 360)
  ];
  const clients = [
    {
      id: uid(),
      name: "홍길동",
      code: "",
      birthYear: 1978,
      gender: "남",
      area: "○○동",
      housing: "월세",
      economic: "기초생활수급",
      household: "1인가구",
      consentDate: `${nowYear}-01-02`,
      worker: "김사회",
      familyMembers: "배우자 / 75세 / 동거 / 건강관리 필요\n장녀 / 48세 / 비동거 / 월 1회 연락",
      genogramFile: null,
      ecomapFile: null,
      sensitive: true
    }
  ];
  programs.forEach((program) => {
    program.clientIds = clients.map((client) => client.id);
  });
  const entries = [
    ["사례관리 상담", 1, 42], ["사례관리 상담", 2, 36], ["사례관리 상담", 3, 44],
    ["서비스 연계", 1, 18], ["서비스 연계", 2, 20], ["서비스 연계", 3, 22],
    ["사례회의", 1, 6], ["사례회의", 2, 5], ["사례회의", 3, 7],
    ["후원물품 지원", 1, 31], ["후원물품 지원", 2, 28], ["후원물품 지원", 3, 34]
  ].map(([programName, month, actual]) => {
    const program = programs.find((item) => item.name === programName);
    return entrySeed(program.id, month, actual, clients[0].id);
  });
  return {
    programs,
    clients,
    entries,
    processRecords: [],
    audit: [],
    settings: {
      passwordHash: "",
      maskPersonal: true
    }
  };
}

function programSeed(name, category, manager, unit, goal) {
  return {
    id: uid(),
    name,
    category,
    manager,
    unit: unit || "",
    goal: Number(goal || 0),
    monthlyGoals: MONTHS.map(() => 0),
    clientIds: []
  };
}

function entrySeed(programId, month, actual, clientId) {
  return {
    id: uid(),
    programId,
    clientId,
    year: nowYear,
    month,
    actual,
    memo: "",
    reportNote: "",
    sensitive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return normalizeState(JSON.parse(raw));
  const old = localStorage.getItem(OLD_STORAGE_KEY);
  if (old) return migrateV1(JSON.parse(old));
  return defaultState();
}

function migrateV1(old) {
  const migrated = defaultState();
  migrated.programs = (old.programs || []).map((program) => ({
    id: program.id || uid(),
    name: program.name || "",
    category: program.category || "미분류",
    manager: "",
    unit: program.unit || "건",
    goal: Number(program.goal || 0),
    monthlyGoals: MONTHS.map(() => 0),
    clientIds: []
  }));
  migrated.clients = [];
  migrated.entries = (old.entries || []).map((entry) => ({
    id: entry.id || uid(),
    programId: entry.programId,
    clientId: "",
    year: Number(entry.year || nowYear),
    month: Number(entry.month || 1),
    actual: Number(entry.actual || 0),
    memo: entry.memo || "",
    reportNote: "",
    sensitive: false,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.createdAt || new Date().toISOString()
  }));
  migrated.audit = [{ at: new Date().toISOString(), action: "마이그레이션", detail: "v1 자료를 v2 구조로 변환" }];
  return migrated;
}

function normalizeState(input) {
  const base = defaultState();
  return {
    programs: Array.isArray(input.programs) ? input.programs.map(normalizeProgram) : base.programs,
    clients: Array.isArray(input.clients) ? input.clients.map(normalizeClient) : [],
    entries: Array.isArray(input.entries) ? input.entries.map(normalizeEntry) : [],
    processRecords: Array.isArray(input.processRecords) ? input.processRecords.map(normalizeProcessRecord) : [],
    audit: Array.isArray(input.audit) ? input.audit : [],
    settings: {
      ...base.settings,
      ...(input.settings || {}),
    }
  };
}

function normalizeProgram(program) {
  const goal = Number(program.goal || 0);
  return {
    id: program.id || uid(),
    name: program.name || "",
    category: program.category || "미분류",
    manager: program.manager || "",
    unit: program.unit || "건",
    goal,
    monthlyGoals: MONTHS.map((_, index) => Number(program.monthlyGoals?.[index] ?? 0)),
    clientIds: Array.isArray(program.clientIds) ? program.clientIds : []
  };
}

function normalizeClient(client) {
  return {
    id: client.id || uid(),
    name: client.name || "",
    code: client.code || "",
    birthYear: client.birthYear || "",
    gender: client.gender || "",
    area: client.area || "",
    housing: client.housing || "",
    economic: client.economic || "",
    household: client.household || "",
    consentDate: client.consentDate || "",
    worker: client.worker || "",
    familyMembers: client.familyMembers || "",
    genogramFile: client.genogramFile || null,
    ecomapFile: client.ecomapFile || null,
    sensitive: Boolean(client.sensitive)
  };
}

function normalizeEntry(entry) {
  return {
    id: entry.id || uid(),
    programId: entry.programId || "",
    clientId: entry.clientId || "",
    year: Number(entry.year || nowYear),
    month: Number(entry.month || 1),
    actual: Number(entry.actual || 0),
    memo: entry.memo || "",
    reportNote: entry.reportNote || "",
    sensitive: Boolean(entry.sensitive),
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
  };
}

function normalizeProcessRecord(record) {
  return {
    id: record.id || uid(),
    clientId: record.clientId || "",
    date: record.date || new Date().toISOString().slice(0, 10),
    method: record.method || "전화",
    status: record.status || "양호",
    note: record.note || "",
    followUp: record.followUp || "",
    sensitive: Boolean(record.sensitive),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || record.createdAt || new Date().toISOString()
  };
}

function saveState(action, detail) {
  if (action) addAudit(action, detail);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addAudit(action, detail) {
  state.audit.unshift({ at: new Date().toISOString(), action, detail });
  state.audit = state.audit.slice(0, 500);
}

function initElementMap() {
  [
    "yearSelect", "monthSelect", "managerFilter", "categoryFilter",
    "totalActual", "goalRate", "monthGoalRate", "missingProgramCount", "monthlyChart", "missingList",
    "summaryHead", "summaryBody", "searchInput", "entryForm", "entryProgram", "entryMonth", "entryClient",
    "entryActual", "entryMemo", "entryOverwrite", "entryRows",
    "selectAllEntries", "clientForm", "clientId", "clientName", "clientBirthYear", "clientGender",
    "clientArea", "clientHousing", "clientEconomic", "clientHousehold", "clientConsentDate",
    "clientWorker", "clientFamilyMembers", "clientGenogramFile", "clientEcomapFile", "clientAttachmentPreview",
    "clientRows", "clientSearch",
    "clientStatsWorkerFilter", "clientStatsTotal", "clientStatsFamily", "clientStatsMissing",
    "genderStats", "ageStats", "areaStats", "economicStats", "housingStats", "householdStats", "clientStatsRows",
    "processForm", "processId", "processClient", "processDate", "processMethod", "processStatus", "processNote",
    "processFollowUp", "processClientFilter", "processMethodFilter", "processTimeline",
    "processMonthlyStatus", "processRows", "selectAllProcessRecords",
    "programForm", "programId", "programName", "programCategory", "programManager",
    "programList",
    "csvFile", "excelPaste", "googleSheetPaste", "includePersonalExport", "restoreJsonFile",
    "toast"
  ].forEach((id) => { elements[id] = $(`#${id}`); });
}

async function init() {
  initElementMap();
  selectedMonth = Math.min(12, Math.max(1, selectedMonth));
  bindEvents();
  fillStaticControls();
  applySettings();
  disableBrowserLock();
  simplifyOperationalUi();
  renderAll();
}

function simplifyOperationalUi() {
  if (!document.querySelector("#programClientIds")) {
    const label = document.createElement("label");
    label.className = "full-span";
    label.innerHTML = `해당 대상자<select id="programClientIds" multiple size="8"></select>`;
    elements.programForm.insertBefore(label, elements.programForm.querySelector(".form-actions"));
    elements.programClientIds = label.querySelector("select");
  }
  const importHelp = document.querySelector("#csvFile")?.previousElementSibling;
  if (importHelp) {
    importHelp.textContent = "열 이름: 사업명, 분류, 담당자, 연도, 월, 실적, 대상자명, 출생연도, 성별, 거주지역, 주거형태, 경제상황, 가구유형, 가구구성원, 메모";
  }
}

function bindEvents() {
  $$(".nav-button").forEach((button) => button.addEventListener("click", () => activateView(button.dataset.view)));
  $("#printReport").addEventListener("click", () => window.print());
  $("#toggleMask").addEventListener("click", toggleMask);

  elements.yearSelect.addEventListener("change", () => { selectedYear = Number(elements.yearSelect.value); renderAll(); });
  elements.monthSelect.addEventListener("change", () => { selectedMonth = Number(elements.monthSelect.value); renderAll(); });
  elements.managerFilter.addEventListener("change", renderDashboard);
  elements.categoryFilter.addEventListener("change", renderDashboard);
  elements.searchInput.addEventListener("input", renderDashboard);

  elements.entryForm.addEventListener("submit", saveEntry);
  $("#clearEntry").addEventListener("click", () => elements.entryForm.reset());
  elements.selectAllEntries.addEventListener("change", () => $$(".entry-check").forEach((check) => { check.checked = elements.selectAllEntries.checked; }));
  $("#deleteSelectedEntries").addEventListener("click", deleteSelectedEntries);

  elements.clientForm.addEventListener("submit", saveClient);
  $("#resetClientForm").addEventListener("click", resetClientForm);
  elements.clientSearch.addEventListener("input", renderClients);
  elements.clientStatsWorkerFilter.addEventListener("change", renderClientStats);
  elements.clientGenogramFile.addEventListener("change", renderPendingAttachmentPreview);
  elements.clientEcomapFile.addEventListener("change", renderPendingAttachmentPreview);

  elements.processForm.addEventListener("submit", saveProcessRecord);
  $("#resetProcessForm").addEventListener("click", resetProcessForm);
  elements.processClientFilter.addEventListener("change", renderProcessRecords);
  elements.processMethodFilter.addEventListener("change", renderProcessRecords);
  elements.selectAllProcessRecords.addEventListener("change", () => $$(".process-check").forEach((check) => { check.checked = elements.selectAllProcessRecords.checked; }));
  $("#deleteSelectedProcessRecords").addEventListener("click", deleteSelectedProcessRecords);
  $("#exportProcessCsv").addEventListener("click", exportProcessCsv);
  $("#copyProcessMissing").addEventListener("click", copyProcessMissing);

  elements.programForm.addEventListener("submit", saveProgram);
  $("#resetProgramForm").addEventListener("click", resetProgramForm);

  $("#copyMonthlySummary").addEventListener("click", copyMonthlySummary);
  $("#copyMissingList").addEventListener("click", copyMissingList);
  $("#exportSummaryCsv").addEventListener("click", () => exportSummary("csv"));
  $("#exportSummaryExcel").addEventListener("click", () => exportSummary("excel"));

  $("#copyClientStats").addEventListener("click", copyClientStats);
  $("#exportClientStatsCsv").addEventListener("click", () => exportClientStats("csv"));
  $("#exportClientStatsExcel").addEventListener("click", () => exportClientStats("excel"));
  $("#downloadTemplate").addEventListener("click", downloadTemplate);
  $("#importCsv").addEventListener("click", importCsv);
  $("#importPastedExcel").addEventListener("click", importPastedExcel);
  $("#importGoogleSheetClients").addEventListener("click", importGoogleSheetClients);
  $("#exportJson").addEventListener("click", exportJson);
  $("#restoreJsonButton").addEventListener("click", () => elements.restoreJsonFile.click());
  elements.restoreJsonFile.addEventListener("change", restoreJson);
  $("#exportAllCsv").addEventListener("click", () => exportAll("csv"));
  $("#exportAllExcel").addEventListener("click", () => exportAll("excel"));
  $("#resetAll").addEventListener("click", resetAll);
}

function fillStaticControls() {
  elements.entryMonth.innerHTML = MONTHS.map((month) => `<option value="${month}">${month}월</option>`).join("");
  elements.monthSelect.innerHTML = MONTHS.map((month) => `<option value="${month}">${month}월</option>`).join("");
  elements.entryMonth.value = selectedMonth;
  elements.monthSelect.value = selectedMonth;
}

function applySettings() {
  document.body.classList.toggle("masked", Boolean(state.settings.maskPersonal));
  $("#toggleMask").textContent = state.settings.maskPersonal ? "마스킹 해제" : "개인정보 마스킹";
}

function activateView(viewName) {
  $$(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  $$(".view").forEach((view) => view.classList.remove("active"));
  $(`#${viewName}View`).classList.add("active");
}

function renderAll() {
  fillYearSelect();
  renderFilters();
  renderClientStatsFilter();
  renderProgramOptions();
  renderClientOptions();
  renderProcessOptions();
  renderDashboard();
  renderEntries();
  renderClients();
  renderProcessRecords();
  renderClientStats();
  renderPrograms();
}

function fillYearSelect() {
  const years = new Set([nowYear, selectedYear]);
  state.entries.forEach((entry) => years.add(Number(entry.year)));
  elements.yearSelect.innerHTML = Array.from(years).sort((a, b) => b - a).map((year) => `<option value="${year}">${year}년</option>`).join("");
  elements.yearSelect.value = selectedYear;
  elements.monthSelect.value = selectedMonth;
}

function renderFilters() {
  const managers = Array.from(new Set(state.programs.map((program) => program.manager).filter(Boolean))).sort();
  const categories = Array.from(new Set(state.programs.map((program) => program.category).filter(Boolean))).sort();
  const currentManager = elements.managerFilter.value || "all";
  const currentCategory = elements.categoryFilter.value || "all";
  elements.managerFilter.innerHTML = `<option value="all">전체</option>${managers.map((item) => `<option>${escapeHtml(item)}</option>`).join("")}`;
  elements.categoryFilter.innerHTML = `<option value="all">전체</option>${categories.map((item) => `<option>${escapeHtml(item)}</option>`).join("")}`;
  elements.managerFilter.value = managers.includes(currentManager) ? currentManager : "all";
  elements.categoryFilter.value = categories.includes(currentCategory) ? currentCategory : "all";
}

function renderClientStatsFilter() {
  const workers = Array.from(new Set(state.clients.map((client) => client.worker).filter(Boolean))).sort();
  const current = elements.clientStatsWorkerFilter.value || "all";
  elements.clientStatsWorkerFilter.innerHTML = `<option value="all">전체</option>${workers.map((worker) => `<option>${escapeHtml(worker)}</option>`).join("")}`;
  elements.clientStatsWorkerFilter.value = workers.includes(current) ? current : "all";
}

function renderProgramOptions() {
  elements.entryProgram.innerHTML = state.programs.map((program) => `<option value="${program.id}">${escapeHtml(program.name)}</option>`).join("");
}

function renderClientOptions() {
  elements.entryClient.innerHTML = `<option value="">대상자 없음/집계만</option>${state.clients.map((client) => `
    <option value="${client.id}">${escapeHtml(client.name)}</option>
  `).join("")}`;
  renderProgramClientOptions();
}

function renderProgramClientOptions() {
  if (!elements.programClientIds) return;
  const selected = new Set(Array.from(elements.programClientIds.selectedOptions || []).map((option) => option.value));
  elements.programClientIds.innerHTML = state.clients
    .map((client) => `<option value="${client.id}">${escapeHtml(client.name)}${client.gender ? ` (${escapeHtml(client.gender)})` : ""}</option>`)
    .join("");
  setSelectedProgramClientIds(Array.from(selected));
}

function selectedProgramClientIds() {
  return Array.from(elements.programClientIds?.selectedOptions || []).map((option) => option.value);
}

function setSelectedProgramClientIds(ids) {
  if (!elements.programClientIds) return;
  const selected = new Set(ids || []);
  Array.from(elements.programClientIds.options).forEach((option) => {
    option.selected = selected.has(option.value);
  });
}

function renderProcessOptions() {
  const options = state.clients.map((client) => `<option value="${client.id}">${escapeHtml(clientLabel(client))}</option>`).join("");
  elements.processClient.innerHTML = options;
  const current = elements.processClientFilter.value || "all";
  elements.processClientFilter.innerHTML = `<option value="all">전체 대상자</option>${options}`;
  elements.processClientFilter.value = current === "all" || state.clients.some((client) => client.id === current) ? current : "all";
  if (!elements.processDate.value) elements.processDate.value = new Date().toISOString().slice(0, 10);
}

function entriesForYear() {
  return state.entries.filter((entry) => Number(entry.year) === selectedYear);
}

function filteredPrograms() {
  const manager = elements.managerFilter.value;
  const category = elements.categoryFilter.value;
  const query = elements.searchInput.value.trim().toLowerCase();
  return state.programs.filter((program) => {
    const managerMatch = manager === "all" || program.manager === manager;
    const categoryMatch = category === "all" || program.category === category;
    const queryMatch = !query || program.name.toLowerCase().includes(query);
    return managerMatch && categoryMatch && queryMatch;
  });
}

function renderDashboard() {
  relabelDashboard();
  const programs = filteredPrograms();
  const rows = programStatsRows(programs);
  const totals = rows.reduce((sum, row) => ({
    real: sum.real + row.real,
    annual: sum.annual + row.annual,
    male: sum.male + row.male,
    female: sum.female + row.female
  }), { real: 0, annual: 0, male: 0, female: 0 });

  elements.totalActual.textContent = formatNumber(totals.real);
  elements.goalRate.textContent = formatNumber(totals.annual);
  elements.monthGoalRate.textContent = formatNumber(totals.male);
  elements.missingProgramCount.textContent = formatNumber(totals.female);
  renderProgramPeopleChart(rows);
  renderGenderSummary(rows);
  renderProgramStatsTable(rows);
}

function relabelDashboard() {
  $("#dashboardTitle").textContent = "사업별 대상자 통계 대시보드";
  $("#dashboardTitle").nextElementSibling.textContent = "사업별 해당 대상자를 기준으로 실인원, 연인원, 남/여 현황을 집계합니다.";
  const metricLabels = Array.from(document.querySelectorAll("#dashboardView .metric span"));
  ["실인원", "연인원", "남", "여"].forEach((label, index) => {
    if (metricLabels[index]) metricLabels[index].textContent = label;
  });
  const panelTitles = Array.from(document.querySelectorAll("#dashboardView .panel h3"));
  if (panelTitles[0]) panelTitles[0].textContent = "사업별 실인원";
  if (panelTitles[1]) panelTitles[1].textContent = "성별 요약";
  if (panelTitles[2]) panelTitles[2].textContent = "사업별 대상자 통계표";
  $("#copyMonthlySummary").textContent = "표 복사";
  $("#copyMissingList").textContent = "요약 복사";
  $("#exportSummaryCsv").textContent = "CSV";
  $("#exportSummaryExcel").textContent = "Excel";
}

function missingPrograms(programs, entries) {
  return programs.filter((program) => !entries.some((entry) => entry.programId === program.id && Number(entry.month) === selectedMonth));
}

function programStatsRows(programs) {
  const entries = entriesForYear();
  return programs.map((program) => {
    const clients = programClients(program);
    const male = clients.filter((client) => isMale(client.gender)).length;
    const female = clients.filter((client) => isFemale(client.gender)).length;
    const annual = entries
      .filter((entry) => entry.programId === program.id)
      .reduce((sum, entry) => sum + Number(entry.actual || 0), 0);
    return { program, clients, real: clients.length, annual, male, female };
  });
}

function programClients(program) {
  const ids = new Set(program.clientIds || []);
  return state.clients.filter((client) => ids.has(client.id));
}

function isMale(gender) {
  return String(gender || "").startsWith("남");
}

function isFemale(gender) {
  return String(gender || "").startsWith("여");
}

function renderProgramPeopleChart(rows) {
  const max = Math.max(...rows.map((row) => row.real), 1);
  elements.monthlyChart.innerHTML = rows.map((row) => {
    const height = Math.max(4, Math.round((row.real / max) * 150));
    return `<div class="bar-cell"><div class="bar" style="height:${height}px"></div><span class="bar-value">${formatNumber(row.real)}</span><span>${escapeHtml(row.program.name)}</span></div>`;
  }).join("") || `<div class="check-item"><span>등록된 사업이 없습니다.</span></div>`;
}

function renderGenderSummary(rows) {
  elements.missingList.innerHTML = rows.map((row) => `
    <div class="check-item">
      <span>${escapeHtml(row.program.name)}</span>
      <span>남 ${formatNumber(row.male)} · 여 ${formatNumber(row.female)}</span>
    </div>
  `).join("") || `<div class="check-item"><span>표시할 성별 통계가 없습니다.</span></div>`;
}

function renderProgramStatsTable(rows) {
  elements.summaryHead.innerHTML = ["사업명", "담당자", "분류", "실인원", "연인원", "남", "여", "해당 대상자"].map((title) => `<th>${title}</th>`).join("");
  elements.summaryBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.program.name)}</td>
      <td>${escapeHtml(row.program.manager || "")}</td>
      <td>${escapeHtml(row.program.category)}</td>
      <td><strong>${formatNumber(row.real)}</strong></td>
      <td>${formatNumber(row.annual)}</td>
      <td>${formatNumber(row.male)}</td>
      <td>${formatNumber(row.female)}</td>
      <td><span class="pii">${escapeHtml(row.clients.map((client) => client.name).join(", "))}</span></td>
    </tr>
  `).join("") || `<tr><td colspan="8">표시할 사업이 없습니다.</td></tr>`;
}

function monthlyTotals(programId, entries) {
  return MONTHS.map((month) => entries.filter((entry) => entry.programId === programId && Number(entry.month) === month).reduce((sum, entry) => sum + Number(entry.actual || 0), 0));
}

function renderEntries() {
  const rows = entriesForYear().slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  if (!rows.length) {
    elements.entryRows.innerHTML = `<tr><td colspan="8">아직 입력된 실적이 없습니다.</td></tr>`;
    return;
  }
  elements.entryRows.innerHTML = rows.map((entry) => {
    const program = findProgram(entry.programId);
    const client = findClient(entry.clientId);
    return `
      <tr>
        <td><input class="entry-check" type="checkbox" value="${entry.id}" aria-label="선택"></td>
        <td>${escapeHtml(program?.name || "삭제된 사업")}</td>
        <td>${entry.month}월</td>
        <td><span class="pii">${escapeHtml(clientLabel(client))}</span></td>
        <td>${formatNumber(entry.actual)}</td>
        <td>${escapeHtml(entry.memo)}</td>
        <td>${new Date(entry.updatedAt).toLocaleDateString("ko-KR")}</td>
      </tr>
    `;
  }).join("");
}

function renderClients() {
  const query = elements.clientSearch.value.trim().toLowerCase();
  const clients = state.clients.filter((client) => !query || `${client.name} ${client.worker}`.toLowerCase().includes(query));
  if (!clients.length) {
    elements.clientRows.innerHTML = `<tr><td colspan="10">등록된 대상자가 없습니다.</td></tr>`;
    return;
  }
  elements.clientRows.innerHTML = clients.map((client) => {
    return `
      <tr>
        <td><span class="pii">${escapeHtml(client.name)}</span></td>
        <td>${escapeHtml(client.gender || "")}</td>
        <td>${escapeHtml(client.area || "")}</td>
        <td>${escapeHtml(client.economic || "")}</td>
        <td>${escapeHtml(client.household || "")}</td>
        <td><div class="family-text">${escapeHtml(clipText(client.familyMembers, 90))}</div></td>
        <td>${attachmentBadges(client)}</td>
        <td>${escapeHtml(client.worker || "")}</td>
        <td>
          <button class="text-button" data-edit-client="${client.id}" type="button">수정</button>
          <button class="text-button danger" data-delete-client="${client.id}" type="button">삭제</button>
        </td>
      </tr>
    `;
  }).join("");
  $$("[data-edit-client]").forEach((button) => button.addEventListener("click", () => editClient(button.dataset.editClient)));
  $$("[data-delete-client]").forEach((button) => button.addEventListener("click", () => deleteClient(button.dataset.deleteClient)));
}

function filteredProcessRecords() {
  const clientId = elements.processClientFilter.value || "all";
  const method = elements.processMethodFilter.value || "all";
  return state.processRecords
    .filter((record) => clientId === "all" || record.clientId === clientId)
    .filter((record) => method === "all" || record.method === method)
    .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.updatedAt) - new Date(a.updatedAt));
}

function renderProcessRecords() {
  renderProcessTimeline();
  renderProcessMonthlyStatus();
  renderProcessTable();
}

function renderProcessTimeline() {
  const records = filteredProcessRecords();
  if (!records.length) {
    elements.processTimeline.innerHTML = `<div class="check-item"><span>표시할 과정기록이 없습니다.</span><span class="status-chip">0</span></div>`;
    return;
  }
  elements.processTimeline.innerHTML = records.map((record) => {
    const client = findClient(record.clientId);
    const level = record.status === "위기 징후" ? "danger" : record.status === "관찰 필요" || record.status === "연락 안 됨" ? "warn" : "";
    return `
      <article class="process-card ${level}">
        <div class="process-meta">
          <strong class="pii">${escapeHtml(clientLabel(client))}</strong>
          <span>${escapeHtml(record.date)}</span>
          <span class="status-chip">${escapeHtml(record.method)}</span>
          <span class="status-chip ${level}">${escapeHtml(record.status)}</span>
        </div>
        <p class="process-note">${escapeHtml(record.note || "특이사항 없음")}</p>
        ${record.followUp ? `<p class="process-follow">후속조치: ${escapeHtml(record.followUp)}</p>` : ""}
      </article>
    `;
  }).join("");
}

function renderProcessMonthlyStatus() {
  const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  const checked = new Set(state.processRecords.filter((record) => record.date.startsWith(monthPrefix)).map((record) => record.clientId));
  const missing = state.clients.filter((client) => !checked.has(client.id));
  if (!state.clients.length) {
    elements.processMonthlyStatus.innerHTML = `<div class="check-item"><span>등록된 대상자가 없습니다.</span><span class="status-chip">0</span></div>`;
    return;
  }
  elements.processMonthlyStatus.innerHTML = `
    <div class="check-item"><span>${selectedYear}년 ${selectedMonth}월 확인 완료</span><span class="status-chip">${formatNumber(checked.size)}명</span></div>
    <div class="check-item"><span>${selectedYear}년 ${selectedMonth}월 미확인</span><span class="status-chip ${missing.length ? "warn" : ""}">${formatNumber(missing.length)}명</span></div>
    ${missing.slice(0, 12).map((client) => `<div class="check-item"><span class="pii">${escapeHtml(clientLabel(client))}</span><span>${escapeHtml(client.worker || "")}</span></div>`).join("")}
  `;
}

function renderProcessTable() {
  const records = filteredProcessRecords().slice(0, 120);
  if (!records.length) {
    elements.processRows.innerHTML = `<tr><td colspan="8">과정기록이 없습니다.</td></tr>`;
    return;
  }
  elements.processRows.innerHTML = records.map((record) => {
    const client = findClient(record.clientId);
    return `
      <tr>
        <td><input class="process-check" type="checkbox" value="${record.id}" aria-label="선택"></td>
        <td><span class="pii">${escapeHtml(clientLabel(client))}</span></td>
        <td>${escapeHtml(record.date)}</td>
        <td>${escapeHtml(record.method)}</td>
        <td>${escapeHtml(record.status)}</td>
        <td>${escapeHtml(clipText(record.note, 46))}</td>
        <td>${escapeHtml(clipText(record.followUp, 34))}</td>
        <td><button class="text-button" data-edit-process="${record.id}" type="button">수정</button></td>
      </tr>
    `;
  }).join("");
  $$("[data-edit-process]").forEach((button) => button.addEventListener("click", () => editProcessRecord(button.dataset.editProcess)));
}

function clientStatsClients() {
  const worker = elements.clientStatsWorkerFilter.value || "all";
  return state.clients.filter((client) => worker === "all" || client.worker === worker);
}

function renderClientStats() {
  const clients = clientStatsClients();
  const total = clients.length;
  const familyRecorded = clients.filter((client) => client.familyMembers).length;
  const missingFields = clients.reduce((sum, client) => {
    return sum + ["gender", "area", "housing", "economic", "household"].filter((key) => !client[key]).length;
  }, 0);

  elements.clientStatsTotal.textContent = formatNumber(total);
  elements.clientStatsFamily.textContent = formatNumber(familyRecorded);
  elements.clientStatsMissing.textContent = formatNumber(missingFields);

  const groups = clientStatsGroups(clients);
  renderStatBars(elements.genderStats, groups.gender, total);
  renderStatBars(elements.ageStats, groups.age, total);
  renderStatBars(elements.areaStats, groups.area, total);
  renderStatBars(elements.economicStats, groups.economic, total);
  renderStatBars(elements.housingStats, groups.housing, total);
  renderStatBars(elements.householdStats, groups.household, total);
  renderClientStatsRows(groups, total);
}

function clientStatsGroups(clients) {
  return {
    gender: countBy(clients, (client) => client.gender || "미입력"),
    age: countBy(clients, (client) => ageBand(client.birthYear)),
    area: countBy(clients, (client) => client.area || "미입력"),
    economic: countBy(clients, (client) => client.economic || "미입력"),
    housing: countBy(clients, (client) => client.housing || "미입력"),
    household: countBy(clients, (client) => client.household || "미입력")
  };
}

function countBy(items, pick) {
  const result = new Map();
  items.forEach((item) => {
    const key = pick(item);
    result.set(key, (result.get(key) || 0) + 1);
  });
  return Array.from(result.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko-KR"));
}

function ageBand(birthYear) {
  const year = Number(birthYear);
  if (!year) return "미입력";
  const age = nowYear - year;
  if (age < 20) return "10대 이하";
  if (age < 30) return "20대";
  if (age < 40) return "30대";
  if (age < 50) return "40대";
  if (age < 60) return "50대";
  if (age < 70) return "60대";
  if (age < 80) return "70대";
  return "80대 이상";
}

function renderStatBars(container, rows, total) {
  if (!rows.length) {
    container.innerHTML = `<div class="check-item"><span>집계할 자료가 없습니다.</span><span class="status-chip">0</span></div>`;
    return;
  }
  container.innerHTML = rows.map((row) => {
    const rate = percent(row.count, total);
    return `
      <div class="stat-row">
        <span class="stat-label" title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</span>
        <span class="stat-track"><span class="stat-fill" style="width:${Math.max(rate, 2)}%"></span></span>
        <span class="stat-value">${formatNumber(row.count)}명 · ${rate}%</span>
      </div>
    `;
  }).join("");
}

function renderClientStatsRows(groups, total) {
  const labels = {
    gender: "성별",
    age: "연령대",
    area: "거주지역",
    economic: "경제상황",
    housing: "주거형태",
    household: "가구유형"
  };
  const rows = Object.entries(groups).flatMap(([group, items]) => items.map((item) => [labels[group], item.label, item.count, `${percent(item.count, total)}%`]));
  elements.clientStatsRows.innerHTML = rows.length
    ? rows.map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${formatNumber(row[2])}</td><td>${escapeHtml(row[3])}</td></tr>`).join("")
    : `<tr><td colspan="4">집계할 대상자 자료가 없습니다.</td></tr>`;
}

function renderPrograms() {
  if (!state.programs.length) {
    elements.programList.innerHTML = `<div class="panel">등록된 사업이 없습니다.</div>`;
    return;
  }
  elements.programList.innerHTML = state.programs.map((program) => `
    <article class="program-card">
      <div>
        <h3>${escapeHtml(program.name)}</h3>
        <div class="program-meta">
          <span>${escapeHtml(program.category)}</span>
          <span>${escapeHtml(program.manager || "담당자 미지정")}</span>
          <span>해당 대상자 ${formatNumber(programClients(program).length)}명</span>
        </div>
      </div>
      <div class="program-actions">
        <button class="ghost-button" type="button" data-edit-program="${program.id}">수정</button>
        <button class="text-button danger" type="button" data-delete-program="${program.id}">삭제</button>
      </div>
    </article>
  `).join("");
  $$("[data-edit-program]").forEach((button) => button.addEventListener("click", () => editProgram(button.dataset.editProgram)));
  $$("[data-delete-program]").forEach((button) => button.addEventListener("click", () => deleteProgram(button.dataset.deleteProgram)));
}

function saveEntry(event) {
  event.preventDefault();
  const month = Number(elements.entryMonth.value);
  const programId = elements.entryProgram.value;
  const clientId = elements.entryClient.value;
  const duplicate = state.entries.filter((entry) => entry.programId === programId && entry.clientId === clientId && Number(entry.year) === selectedYear && Number(entry.month) === month);
  if (duplicate.length && !elements.entryOverwrite.checked) {
    showToast("같은 사업·월·대상자 실적이 있습니다. 덮어쓰기를 선택하거나 기존 항목을 삭제하세요.");
    return;
  }
  if (duplicate.length && elements.entryOverwrite.checked) {
    state.entries = state.entries.filter((entry) => !duplicate.includes(entry));
  }
  const entry = {
    id: uid(),
    programId,
    clientId,
    year: selectedYear,
    month,
    actual: Number(elements.entryActual.value),
    memo: elements.entryMemo.value.trim(),
    reportNote: "",
    sensitive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.entries.push(entry);
  saveState("실적 저장", `${programName(programId)} ${selectedYear}-${month} ${entry.actual}`);
  elements.entryForm.reset();
  elements.entryMonth.value = selectedMonth;
  renderAll();
  showToast("실적을 저장했습니다.");
}

function deleteSelectedEntries() {
  const ids = new Set($$(".entry-check:checked").map((check) => check.value));
  if (!ids.size) {
    showToast("삭제할 항목을 선택하세요.");
    return;
  }
  state.entries = state.entries.filter((entry) => !ids.has(entry.id));
  saveState("실적 삭제", `${ids.size}개 항목 삭제`);
  renderAll();
  showToast(`${ids.size}개 항목을 삭제했습니다.`);
}

async function saveClient(event) {
  event.preventDefault();
  const id = elements.clientId.value || uid();
  const previous = state.clients.find((item) => item.id === id);
  const client = {
    id,
    name: elements.clientName.value.trim(),
    code: previous?.code || "",
    birthYear: elements.clientBirthYear.value,
    gender: elements.clientGender.value,
    area: elements.clientArea.value.trim(),
    housing: elements.clientHousing.value,
    economic: elements.clientEconomic.value,
    household: elements.clientHousehold.value,
    consentDate: elements.clientConsentDate.value,
    worker: elements.clientWorker.value.trim(),
    familyMembers: elements.clientFamilyMembers.value.trim(),
    genogramFile: await fileInputToAttachment(elements.clientGenogramFile, previous?.genogramFile || null),
    ecomapFile: await fileInputToAttachment(elements.clientEcomapFile, previous?.ecomapFile || null),
    sensitive: false
  };
  const index = state.clients.findIndex((item) => item.id === id);
  if (index >= 0) state.clients[index] = client;
  else state.clients.push(client);
  saveState("대상자 저장", `${client.name} 저장`);
  resetClientForm();
  renderAll();
  showToast("대상자 정보를 저장했습니다.");
}

function editClient(id) {
  const client = findClient(id);
  if (!client) return;
  elements.clientId.value = client.id;
  elements.clientName.value = client.name;
  elements.clientBirthYear.value = client.birthYear;
  elements.clientGender.value = client.gender;
  elements.clientArea.value = client.area;
  elements.clientHousing.value = client.housing;
  elements.clientEconomic.value = client.economic;
  elements.clientHousehold.value = client.household;
  elements.clientConsentDate.value = client.consentDate;
  elements.clientWorker.value = client.worker;
  elements.clientFamilyMembers.value = client.familyMembers;
  elements.clientGenogramFile.value = "";
  elements.clientEcomapFile.value = "";
  renderClientAttachmentPreview(client);
  activateView("clients");
}

function deleteClient(id) {
  const client = findClient(id);
  if (!client) return;
  const ok = confirm(`"${client.name}" 대상자 정보와 연결 실적/과정기록의 대상자 연결을 삭제할까요? 실적 집계값과 과정기록 내용은 남습니다.`);
  if (!ok) return;
  state.clients = state.clients.filter((item) => item.id !== id);
  state.entries = state.entries.map((entry) => entry.clientId === id ? { ...entry, clientId: "" } : entry);
  state.processRecords = state.processRecords.map((record) => record.clientId === id ? { ...record, clientId: "" } : record);
  saveState("대상자 삭제/파기", `${client.name} 삭제`);
  renderAll();
  showToast("대상자 정보를 삭제했습니다.");
}

function resetClientForm() {
  elements.clientForm.reset();
  elements.clientId.value = "";
  elements.clientAttachmentPreview.innerHTML = "";
}

async function fileInputToAttachment(input, existing) {
  const file = input.files?.[0];
  if (!file) return existing;
  return {
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    dataUrl: await readFileAsDataUrl(file),
    updatedAt: new Date().toISOString()
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function renderPendingAttachmentPreview() {
  const cards = [];
  if (elements.clientGenogramFile.files?.[0]) cards.push(`<div class="attachment-card"><strong>가계도</strong><span>${escapeHtml(elements.clientGenogramFile.files[0].name)}</span><span>저장하면 미리보기에 반영됩니다.</span></div>`);
  if (elements.clientEcomapFile.files?.[0]) cards.push(`<div class="attachment-card"><strong>생태도</strong><span>${escapeHtml(elements.clientEcomapFile.files[0].name)}</span><span>저장하면 미리보기에 반영됩니다.</span></div>`);
  if (cards.length) elements.clientAttachmentPreview.innerHTML = cards.join("");
}

function renderClientAttachmentPreview(client) {
  elements.clientAttachmentPreview.innerHTML = attachmentCard("가계도", client.genogramFile) + attachmentCard("생태도", client.ecomapFile);
}

function attachmentCard(title, file) {
  if (!file?.dataUrl) return `<div class="attachment-card"><strong>${title}</strong><span>첨부 없음</span></div>`;
  const content = file.type?.startsWith("image/")
    ? `<img src="${file.dataUrl}" alt="${escapeHtml(title)} 미리보기">`
    : `<a href="${file.dataUrl}" target="_blank" rel="noopener">${escapeHtml(file.name || title)} 열기</a>`;
  return `<div class="attachment-card"><strong>${title}</strong>${content}<span>${escapeHtml(file.name || "")}</span></div>`;
}

function attachmentBadges(client) {
  const badges = [];
  if (client.genogramFile?.dataUrl) badges.push(`<span class="status-chip">가계도</span>`);
  if (client.ecomapFile?.dataUrl) badges.push(`<span class="status-chip">생태도</span>`);
  return badges.length ? badges.join(" ") : `<span class="status-chip warn">없음</span>`;
}

function saveProcessRecord(event) {
  event.preventDefault();
  const id = elements.processId.value || uid();
  const previous = state.processRecords.find((record) => record.id === id);
  const record = {
    id,
    clientId: elements.processClient.value,
    date: elements.processDate.value,
    method: elements.processMethod.value,
    status: elements.processStatus.value,
    note: elements.processNote.value.trim(),
    followUp: elements.processFollowUp.value.trim(),
    sensitive: false,
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const index = state.processRecords.findIndex((item) => item.id === id);
  if (index >= 0) state.processRecords[index] = record;
  else state.processRecords.push(record);
  saveState("과정기록 저장", `${clientLabel(findClient(record.clientId))} ${record.date} ${record.method}`);
  resetProcessForm();
  renderAll();
  activateView("process");
  showToast("과정기록을 저장했습니다.");
}

function editProcessRecord(id) {
  const record = state.processRecords.find((item) => item.id === id);
  if (!record) return;
  elements.processId.value = record.id;
  elements.processClient.value = record.clientId;
  elements.processDate.value = record.date;
  elements.processMethod.value = record.method;
  elements.processStatus.value = record.status;
  elements.processNote.value = record.note;
  elements.processFollowUp.value = record.followUp;
  activateView("process");
  elements.processNote.focus();
}

function resetProcessForm() {
  elements.processForm.reset();
  elements.processId.value = "";
  elements.processDate.value = new Date().toISOString().slice(0, 10);
}

function deleteSelectedProcessRecords() {
  const ids = new Set($$(".process-check:checked").map((check) => check.value));
  if (!ids.size) {
    showToast("삭제할 과정기록을 선택하세요.");
    return;
  }
  const ok = confirm(`${ids.size}개 과정기록을 삭제할까요?`);
  if (!ok) return;
  state.processRecords = state.processRecords.filter((record) => !ids.has(record.id));
  saveState("과정기록 삭제", `${ids.size}개 삭제`);
  renderAll();
  showToast("선택한 과정기록을 삭제했습니다.");
}

function saveProgram(event) {
  event.preventDefault();
  const id = elements.programId.value || uid();
  const program = {
    id,
    name: elements.programName.value.trim(),
    category: elements.programCategory.value.trim(),
    manager: elements.programManager.value.trim(),
    unit: "",
    goal: 0,
    monthlyGoals: MONTHS.map(() => 0),
    clientIds: selectedProgramClientIds()
  };
  const index = state.programs.findIndex((item) => item.id === id);
  if (index >= 0) state.programs[index] = program;
  else state.programs.push(program);
  saveState("사업 저장", `${program.name} 저장`);
  resetProgramForm();
  renderAll();
  showToast("사업 정보를 저장했습니다.");
}

function editProgram(id) {
  const program = findProgram(id);
  if (!program) return;
  elements.programId.value = program.id;
  elements.programName.value = program.name;
  elements.programCategory.value = program.category;
  elements.programManager.value = program.manager;
  setSelectedProgramClientIds(program.clientIds || []);
  activateView("programs");
}

function deleteProgram(id) {
  const program = findProgram(id);
  if (!program) return;
  const ok = confirm(`"${program.name}" 사업과 연결 실적을 함께 삭제할까요?`);
  if (!ok) return;
  state.programs = state.programs.filter((item) => item.id !== id);
  state.entries = state.entries.filter((entry) => entry.programId !== id);
  saveState("사업 삭제", `${program.name} 삭제`);
  renderAll();
  showToast("사업을 삭제했습니다.");
}

function resetProgramForm() {
  elements.programForm.reset();
  elements.programId.value = "";
  setSelectedProgramClientIds([]);
}

function disableBrowserLock() {
  if (!state.settings.passwordHash) return;
  state.settings.passwordHash = "";
  saveState("브라우저 잠금 비활성화", "저장된 잠금 비밀번호 초기화");
}

function toggleMask() {
  state.settings.maskPersonal = !state.settings.maskPersonal;
  saveState("마스킹 변경", state.settings.maskPersonal ? "마스킹 켬" : "마스킹 끔");
  applySettings();
}

function buildSummaryRows() {
  return programStatsRows(filteredPrograms()).map((row) => [
    row.program.name,
    row.program.manager,
    row.program.category,
    row.real,
    row.annual,
    row.male,
    row.female,
    row.clients.map((client) => client.name).join(", ")
  ]);
}

function exportSummary(type) {
  const header = ["사업명", "담당자", "분류", "실인원", "연인원", "남", "여", "해당 대상자"];
  const rows = [header, ...buildSummaryRows()];
  if (type === "excel") downloadExcel(`사업별_월별_집계_${selectedYear}.xls`, rows);
  else downloadCsv(`사업별_월별_집계_${selectedYear}.csv`, rows);
  saveState("보고서 내보내기", `요약 ${type}`);
}

function copyMonthlySummary() {
  const header = ["사업명", "담당자", "분류", "실인원", "연인원", "남", "여", "해당 대상자"];
  copyText([header, ...buildSummaryRows()].map((row) => row.join("\t")).join("\n"));
}

function copyMissingList() {
  const rows = programStatsRows(filteredPrograms());
  const text = rows.map((row) => `${row.program.name}\t실인원 ${row.real}\t연인원 ${row.annual}\t남 ${row.male}\t여 ${row.female}`).join("\n") || "표시할 사업 없음";
  copyText(text);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("클립보드에 복사했습니다.");
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.append(area);
    area.focus();
    area.select();
    document.execCommand("copy");
    area.remove();
    showToast("복사했습니다.");
  }
}

function downloadTemplate() {
  const rows = [
    ["사업명", "분류", "담당자", "연도", "월", "실적", "대상자명", "출생연도", "성별", "거주지역", "주거형태", "경제상황", "가구유형", "가구구성원", "메모"],
    ["사례관리 상담", "사례관리", "김사회", selectedYear, "1", "42", "홍길동", "1978", "남", "○○동", "월세", "기초생활수급", "1인가구", "배우자 / 75세 / 동거 / 건강관리 필요", "초기상담 포함"]
  ];
  downloadCsv("월별실적_가져오기_양식.csv", rows);
}

function importCsv() {
  const file = elements.csvFile.files[0];
  if (!file) {
    showToast("CSV 또는 TSV 파일을 선택하세요.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const delimiter = file.name.toLowerCase().endsWith(".tsv") ? "\t" : ",";
    importRows(parseDelimited(String(reader.result || ""), delimiter));
  };
  reader.readAsText(file, "utf-8");
}

function importPastedExcel() {
  const text = elements.excelPaste.value.trim();
  if (!text) {
    showToast("붙여넣은 표가 없습니다.");
    return;
  }
  importRows(parseDelimited(text, "\t"));
  elements.excelPaste.value = "";
}

function importGoogleSheetClients() {
  const text = elements.googleSheetPaste.value.trim();
  if (!text) {
    showToast("Google 시트에서 복사한 대상자 표를 붙여넣으세요.");
    return;
  }

  const rows = parseDelimited(text, "\t");
  const headerRowIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeSheetHeader);
    return headers.includes("순번") && headers.includes("이름") && headers.includes("성별");
  });
  if (headerRowIndex < 0) {
    showToast("순번, 이름, 성별 열이 있는 제목 행을 찾지 못했습니다.");
    return;
  }

  const headers = rows[headerRowIndex].map(normalizeSheetHeader);
  const columnIndex = (name) => headers.indexOf(name);
  const valueAt = (row, name) => {
    const index = columnIndex(name);
    return index >= 0 ? String(row[index] || "").trim() : "";
  };

  let added = 0;
  let updated = 0;
  let currentClient = null;

  rows.slice(headerRowIndex + 1).forEach((row) => {
    const sequence = valueAt(row, "순번");
    const familyName = valueAt(row, "가구원");
    const relation = valueAt(row, "관계");

    if (!sequence) {
      if (!currentClient || !familyName || relation === "본인") return;
      const familyLine = [
        familyName,
        valueAt(row, "성별"),
        relation,
        valueAt(row, "연령") ? `${valueAt(row, "연령")}세` : ""
      ].filter(Boolean).join(" / ");
      const members = currentClient.familyMembers
        ? currentClient.familyMembers.split("\n")
        : [];
      if (familyLine && !members.includes(familyLine)) {
        currentClient.familyMembers = [...members, familyLine].join("\n");
      }
      return;
    }

    const name = valueAt(row, "이름") || familyName;
    if (!name) {
      currentClient = null;
      return;
    }

    const birthDate = valueAt(row, "생년월일");
    const birthYear = birthDate.match(/^\d{4}/)?.[0] || "";
    const sourceCode = `google-sheet-${sequence}`;
    let client = state.clients.find((item) => item.code === sourceCode)
      || state.clients.find((item) => item.name === name && (!birthYear || item.birthYear === birthYear));

    const sheetValues = {
      name,
      code: sourceCode,
      birthYear,
      gender: valueAt(row, "성별"),
      area: valueAt(row, "구역"),
      housing: normalizeSheetHousing(valueAt(row, "주거형태")),
      economic: normalizeSheetEconomic(valueAt(row, "경제사항")),
      household: normalizeSheetHousehold(valueAt(row, "세대유형")),
      sensitive: true
    };

    if (client) {
      Object.entries(sheetValues).forEach(([key, value]) => {
        if (value !== "") client[key] = value;
      });
      updated += 1;
    } else {
      client = normalizeClient({
        ...sheetValues,
        consentDate: "",
        worker: "",
        familyMembers: "",
        genogramFile: null,
        ecomapFile: null
      });
      state.clients.push(client);
      added += 1;
    }
    currentClient = client;
  });

  if (!added && !updated) {
    showToast("가져올 대상자 행을 찾지 못했습니다.");
    return;
  }

  saveState("Google 시트 대상자 가져오기", `추가 ${added}명, 갱신 ${updated}명`);
  elements.googleSheetPaste.value = "";
  renderAll();
  showToast(`대상자 ${added}명을 추가하고 ${updated}명을 갱신했습니다.`);
}

function normalizeSheetHeader(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeSheetHousing(value) {
  if (!value) return "";
  if (value.includes("영구")) return "영구임대";
  if (value.includes("임대")) return "공공임대";
  if (value.includes("전세")) return "전세";
  if (value.includes("월세")) return "월세";
  if (value.includes("자가")) return "자가";
  return "기타";
}

function normalizeSheetEconomic(value) {
  if (!value) return "";
  if (value.includes("수급")) return "기초생활수급";
  if (value.includes("차상위")) return "차상위";
  if (value.includes("50%")) return "중위소득 50% 이하";
  if (value.includes("부채") || value.includes("체납")) return "부채/체납";
  if (value.includes("소득 없음")) return "소득 없음";
  if (value.includes("저소득")) return "저소득";
  return "확인 필요";
}

function normalizeSheetHousehold(value) {
  if (!value) return "";
  if (value.includes("독거")) return "1인가구";
  if (value.includes("한부모")) return "한부모";
  if (value.includes("조손")) return "조손가구";
  if (value.includes("장애")) return "장애인가구";
  if (value.includes("노인") || value.includes("부부")) return "노인가구";
  if (value.includes("다문화")) return "다문화가구";
  return "일반가구";
}

function importRows(rows) {
  if (rows.length < 2) {
    showToast("가져올 행이 없습니다.");
    return;
  }
  const headers = rows[0].map((cell) => cell.trim());
  const required = ["사업명", "분류", "연도", "월", "실적"];
  const missing = required.filter((name) => !headers.includes(name));
  if (missing.length) {
    showToast(`필수 열이 없습니다: ${missing.join(", ")}`);
    return;
  }
  let count = 0;
  rows.slice(1).forEach((row) => {
    const item = Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]));
    if (!item["사업명"]) return;
    let program = state.programs.find((programItem) => programItem.name === item["사업명"]);
    if (!program) {
      program = {
        id: uid(),
        name: item["사업명"],
        category: item["분류"] || "미분류",
        manager: item["담당자"] || "",
        unit: "",
        goal: 0,
        monthlyGoals: MONTHS.map(() => 0),
        clientIds: []
      };
      state.programs.push(program);
    }
    let clientId = "";
    if (item["대상자명"]) {
      let client = state.clients.find((clientItem) => clientItem.name === item["대상자명"]);
      if (!client) {
        client = {
          id: uid(),
          name: item["대상자명"] || "미기재",
          code: "",
          birthYear: item["출생연도"] || "",
          gender: item["성별"] || "",
          area: item["거주지역"] || "",
          housing: item["주거형태"] || "",
          economic: item["경제상황"] || "",
          household: item["가구유형"] || "",
          consentDate: "",
          worker: item["담당자"] || "",
          familyMembers: item["가구구성원"] || "",
          genogramFile: null,
          ecomapFile: null,
          sensitive: false
        };
        state.clients.push(client);
      } else {
        client.name = item["대상자명"] || client.name;
        client.birthYear = item["출생연도"] || client.birthYear;
        client.gender = item["성별"] || client.gender;
        client.area = item["거주지역"] || client.area;
        client.housing = item["주거형태"] || client.housing;
        client.economic = item["경제상황"] || client.economic;
        client.household = item["가구유형"] || client.household;
        client.familyMembers = item["가구구성원"] || client.familyMembers;
        client.worker = item["담당자"] || client.worker;
      }
      clientId = client.id;
      program.clientIds = program.clientIds || [];
      if (!program.clientIds.includes(clientId)) program.clientIds.push(clientId);
    }
    const year = Number(item["연도"] || selectedYear);
    const month = Number(item["월"] || 1);
    state.entries.push({
      id: uid(),
      programId: program.id,
      clientId,
      year,
      month,
      actual: Number(item["실적"] || 0),
      memo: item["메모"] || "",
      reportNote: "",
      sensitive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    count += 1;
  });
  saveState("자료 가져오기", `${count}개 행 가져오기`);
  renderAll();
  showToast(`${count}개 행을 가져왔습니다.`);
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(`월별실적_백업_${selectedYear}.json`, blob);
  saveState("백업", "JSON 백업 내보내기");
}

function restoreJson() {
  const file = elements.restoreJsonFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const ok = confirm("현재 자료를 백업 파일 내용으로 교체할까요?");
    if (!ok) return;
    state = normalizeState(JSON.parse(String(reader.result || "{}")));
    saveState("복원", file.name);
    applySettings();
    renderAll();
    showToast("백업 파일을 복원했습니다.");
  };
  reader.readAsText(file, "utf-8");
}

function exportAll(type) {
  const includePersonal = elements.includePersonalExport.checked;
  if (includePersonal && !confirm("개인정보가 포함될 수 있습니다. 기관 승인 저장소에만 보관하세요.")) return;
  const rows = buildAllRows(includePersonal);
  if (type === "excel") downloadExcel("월별실적_전체.xls", rows);
  else downloadCsv("월별실적_전체.csv", rows);
  saveState("전체 내보내기", `${type}, 개인정보 포함=${includePersonal}`);
}

function buildAllRows(includePersonal) {
  const header = ["사업명", "분류", "담당자", "연도", "월", "실적", "메모"];
  if (includePersonal) header.push("대상자명", "출생연도", "성별");
  header.push("거주지역", "주거형태", "경제상황", "가구유형", "가구구성원", "가계도첨부", "생태도첨부");
  const rows = [header];
  state.entries.forEach((entry) => {
    const program = findProgram(entry.programId);
    const client = findClient(entry.clientId);
    const row = [
      program?.name || "삭제된 사업",
      program?.category || "",
      program?.manager || "",
      entry.year,
      entry.month,
      entry.actual,
      entry.memo
    ];
    if (includePersonal) row.push(client?.name || "", client?.birthYear || "", client?.gender || "");
    row.push(client?.area || "", client?.housing || "", client?.economic || "", client?.household || "", client?.familyMembers || "", client?.genogramFile?.name || "", client?.ecomapFile?.name || "");
    rows.push(row);
  });
  return rows;
}

function exportProcessCsv() {
  const rows = [["대상자명", "확인일", "확인방법", "안부상태", "특이사항", "후속조치"]];
  filteredProcessRecords().forEach((record) => {
    const client = findClient(record.clientId);
    rows.push([
      client?.name || "",
      record.date,
      record.method,
      record.status,
      record.note,
      record.followUp
    ]);
  });
  downloadCsv(`과정기록지_${selectedYear}_${selectedMonth}.csv`, rows);
  saveState("과정기록 내보내기", "CSV");
}

function copyProcessMissing() {
  const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  const checked = new Set(state.processRecords.filter((record) => record.date.startsWith(monthPrefix)).map((record) => record.clientId));
  const missing = state.clients.filter((client) => !checked.has(client.id));
  const text = missing.map((client) => `${client.name}\t${client.worker || ""}`).join("\n") || "미확인 대상자 없음";
  copyText(text);
}

function clientStatsRows() {
  const groups = clientStatsGroups(clientStatsClients());
  const total = clientStatsClients().length;
  const labels = {
    gender: "성별",
    age: "연령대",
    area: "거주지역",
    economic: "경제상황",
    housing: "주거형태",
    household: "가구유형"
  };
  return Object.entries(groups).flatMap(([group, items]) => {
    return items.map((item) => [labels[group], item.label, item.count, `${percent(item.count, total)}%`]);
  });
}

function copyClientStats() {
  const header = ["구분", "항목", "인원", "비율"];
  copyText([header, ...clientStatsRows()].map((row) => row.join("\t")).join("\n"));
}

function exportClientStats(type) {
  const rows = [["구분", "항목", "인원", "비율"], ...clientStatsRows()];
  if (type === "excel") downloadExcel(`대상자_통계_${selectedYear}.xls`, rows);
  else downloadCsv(`대상자_통계_${selectedYear}.csv`, rows);
  saveState("대상자 통계 내보내기", type);
}

function resetAll() {
  const ok = confirm("모든 사업, 대상자, 실적, 감사 로그를 초기화할까요? 먼저 JSON 백업을 권장합니다.");
  if (!ok) return;
  state = { programs: [], clients: [], entries: [], processRecords: [], audit: [], settings: state.settings };
  saveState("전체 초기화", "자료 초기화");
  renderAll();
  showToast("전체 자료를 초기화했습니다.");
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  downloadBlob(filename, new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
}

function downloadExcel(filename, rows) {
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="utf-8"></head><body><table>
    ${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
    </table></body></html>`;
  downloadBlob(filename, new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }));
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function findProgram(id) {
  return state.programs.find((program) => program.id === id);
}

function findClient(id) {
  return state.clients.find((client) => client.id === id);
}

function programName(id) {
  return findProgram(id)?.name || "삭제된 사업";
}

function clientLabel(client) {
  if (!client) return "";
  return client.name;
}

function clipText(text, maxLength) {
  const value = String(text || "");
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function percent(value, total) {
  return total ? Math.round((Number(value || 0) / Number(total)) * 100) : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 2300);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
