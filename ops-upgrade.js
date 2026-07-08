(() => {
  const OPS_VERSION = "2026-07-09-operational-workflow";
  const ACTION_WORDS = ["예정", "필요", "연계", "확인", "방문", "연락", "신청", "검토", "동행", "의뢰", "지원", "상담", "요청"];
  const RISK_WORDS = ["자살", "자해", "폭력", "학대", "응급", "위험", "실종", "단전", "단수", "퇴거", "노숙", "위기"];
  const WATCH_WORDS = ["통증", "식사", "결식", "우울", "불안", "고립", "외로", "병원", "약", "복용", "체납", "갈등", "어려움", "곤란", "악화", "확인 필요"];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const monthPrefix = () => `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  function safe(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function ready() {
    return typeof state !== "undefined" && Array.isArray(state.clients) && Array.isArray(state.processRecords);
  }

  function boot() {
    if (!ready()) {
      window.setTimeout(boot, 60);
      return;
    }
    if (window.__saryeOpsUpgradeInstalled === OPS_VERSION) {
      renderOpsUpgrade();
      return;
    }
    window.__saryeOpsUpgradeInstalled = OPS_VERSION;
    relabelShell();
    injectDashboardWorkbench();
    injectProcessAssistant();
    injectClientWorkbench();
    injectDocumentWorkbench();
    injectBackupNotice();
    bindOpsEvents();
    patchRenderAll();
    renderOpsUpgrade();
  }

  function relabelShell() {
    const labels = {
      dashboard: ["▣", "오늘 할 일"],
      clients: ["◎", "대상자"],
      process: ["▤", "기록하기"],
      entry: ["＋", "실적 입력"],
      clientStats: ["◫", "통계"],
      programs: ["◇", "사업 설정"],
      import: ["⇅", "백업/자료"]
    };
    $$(".nav-button").forEach((button) => {
      const item = labels[button.dataset.view];
      if (!item) return;
      button.innerHTML = `<span class="icon">${item[0]}</span>${item[1]}`;
    });
    const brandTitle = $(".brand h1");
    const brandSub = $(".brand p");
    if (brandTitle) brandTitle.textContent = "사례관리 업무책상";
    if (brandSub) brandSub.textContent = "오늘 할 일·기록·문서 초안";
  }

  function injectDashboardWorkbench() {
    if ($("#opsDashboardWorkbench")) return;
    const section = $("#dashboardView");
    const anchor = section?.querySelector(".metrics-grid");
    if (!section || !anchor) return;
    const panel = document.createElement("div");
    panel.id = "opsDashboardWorkbench";
    panel.className = "panel ops-panel ops-dashboard-panel";
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>오늘 먼저 볼 대상자</h3>
          <p class="help-text">월별 미확인, 위기·관찰 필요, 장기 미기록 대상자를 한 번에 확인합니다.</p>
        </div>
        <button class="text-button" type="button" data-copy-operational-summary>요약 복사</button>
      </div>
      <div class="ops-metrics" id="opsWorkMetrics"></div>
      <div class="ops-columns">
        <div class="ops-list-card">
          <h4>이번 달 안부확인 미작성</h4>
          <div class="check-list" id="opsMissingClients"></div>
        </div>
        <div class="ops-list-card">
          <h4>주의가 필요한 최근 기록</h4>
          <div class="check-list" id="opsWatchClients"></div>
        </div>
        <div class="ops-list-card">
          <h4>최근 30일 기록 없음</h4>
          <div class="check-list" id="opsStaleClients"></div>
        </div>
      </div>
    `;
    section.insertBefore(panel, anchor);
  }

  function injectProcessAssistant() {
    if ($("#opsProcessAssistant")) return;
    const form = $("#processForm");
    if (!form) return;
    const panel = document.createElement("div");
    panel.id = "opsProcessAssistant";
    panel.className = "panel ops-panel";
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>상담 메모 자동정리</h3>
          <p class="help-text">현장 메모를 붙여넣으면 확인방법, 상태, 특이사항, 후속조치 입력칸에 나눠 담습니다. 저장 전 내용 확인은 필수입니다.</p>
        </div>
      </div>
      <textarea id="opsRawMemo" rows="4" placeholder="예: 7/9 전화. 식사를 잘 못하고 허리 통증이 심하다고 함. 다음 주 방문 후 병원 동행 필요 여부 확인 예정."></textarea>
      <div class="button-row ops-button-row">
        <button class="primary-button" type="button" data-fill-process-from-memo>입력칸에 자동정리</button>
        <button class="ghost-button" type="button" data-fill-good-call>전화 안부 양호</button>
        <button class="ghost-button" type="button" data-fill-no-contact>연락 안 됨</button>
        <button class="text-button" type="button" data-clear-ops-memo>메모 비우기</button>
      </div>
    `;
    form.parentNode.insertBefore(panel, form);
  }

  function injectClientWorkbench() {
    if ($("#opsClientWorkbench")) return;
    const form = $("#clientForm");
    if (!form) return;
    const panel = document.createElement("div");
    panel.id = "opsClientWorkbench";
    panel.className = "panel ops-panel";
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>대상자 업무카드</h3>
          <p class="help-text">대상자 기본정보보다 먼저 최근 기록, 현재 상태, 다음 조치를 확인합니다.</p>
        </div>
        <div class="table-tools">
          <select id="opsClientSelect" aria-label="업무카드 대상자 선택"></select>
          <button class="text-button" type="button" data-copy-client-card>카드 복사</button>
        </div>
      </div>
      <div id="opsClientCard" class="ops-client-card"></div>
    `;
    form.parentNode.insertBefore(panel, form);
  }

  function injectDocumentWorkbench() {
    if ($("#opsDocumentWorkbench")) return;
    const processSection = $("#processView");
    const split = processSection?.querySelector(".split");
    if (!processSection || !split) return;
    const panel = document.createElement("div");
    panel.id = "opsDocumentWorkbench";
    panel.className = "panel ops-panel";
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>문서 초안 만들기</h3>
          <p class="help-text">선택한 대상자의 최근 과정기록을 바탕으로 한글에 붙여넣기 쉬운 사례회의록 초안을 만듭니다.</p>
        </div>
        <button class="primary-button" type="button" data-copy-meeting-draft>사례회의록 초안 복사</button>
      </div>
      <pre id="opsMeetingDraft" class="ops-draft-box"></pre>
    `;
    processSection.insertBefore(panel, split);
  }

  function injectBackupNotice() {
    if ($("#opsBackupNotice")) return;
    const importView = $("#importView");
    const heading = importView?.querySelector(".section-heading");
    if (!importView || !heading) return;
    const panel = document.createElement("div");
    panel.id = "opsBackupNotice";
    panel.className = "panel ops-panel ops-safety-panel";
    panel.innerHTML = `
      <h3>실사용 전 안전 체크</h3>
      <div class="ops-safety-grid">
        <div><strong>저장 위치</strong><span>이 앱은 현재 브라우저의 로컬 저장소에 자료를 보관합니다. 다른 PC에서는 JSON 백업·복원이 필요합니다.</span></div>
        <div><strong>개인정보</strong><span>주민등록번호, 상세주소, 계좌번호는 넣지 않는 방향을 권장합니다. 내보내기 전 개인정보 포함 여부를 확인하세요.</span></div>
        <div><strong>운영 절차</strong><span>월 1회 이상 JSON 백업 파일을 별도 보관하고, 실무 적용 전 가상 대상자 자료로 먼저 테스트하세요.</span></div>
      </div>
    `;
    heading.after(panel);
  }

  function bindOpsEvents() {
    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-open-process], [data-fill-process-from-memo], [data-fill-good-call], [data-fill-no-contact], [data-clear-ops-memo], [data-copy-client-card], [data-copy-meeting-draft], [data-copy-operational-summary]");
      if (!target) return;
      if (target.dataset.openProcess) openProcessForClient(target.dataset.openProcess);
      if (target.hasAttribute("data-fill-process-from-memo")) fillProcessFromRawMemo();
      if (target.hasAttribute("data-fill-good-call")) fillQuickProcess("전화", "양호", "전화 안부확인 결과 특이사항 없음.", "정기 안부확인 지속.");
      if (target.hasAttribute("data-fill-no-contact")) fillQuickProcess("전화", "연락 안 됨", "전화 연락 시도하였으나 연결되지 않음.", "추후 재연락 및 필요 시 방문 확인.");
      if (target.hasAttribute("data-clear-ops-memo")) clearRawMemo();
      if (target.hasAttribute("data-copy-client-card")) copySelectedClientCard();
      if (target.hasAttribute("data-copy-meeting-draft")) copyMeetingDraft();
      if (target.hasAttribute("data-copy-operational-summary")) copyOperationalSummary();
    });

    document.addEventListener("change", (event) => {
      if (event.target?.id === "opsClientSelect") {
        renderClientCard();
        renderMeetingDraft();
      }
    });
  }

  function patchRenderAll() {
    if (window.__saryeOpsRenderPatched) return;
    window.__saryeOpsRenderPatched = true;
    const previousRenderAll = window.renderAll;
    if (typeof previousRenderAll === "function") {
      window.renderAll = function patchedRenderAll(...args) {
        const result = previousRenderAll.apply(this, args);
        window.setTimeout(renderOpsUpgrade, 0);
        return result;
      };
    }
  }

  function renderOpsUpgrade() {
    if (!ready()) return;
    renderDashboardWorkbench();
    renderClientSelect();
    renderClientCard();
    renderMeetingDraft();
  }

  function renderDashboardWorkbench() {
    const clients = state.clients || [];
    const records = state.processRecords || [];
    const checkedThisMonth = new Set(records.filter((record) => String(record.date || "").startsWith(monthPrefix())).map((record) => record.clientId));
    const missing = clients.filter((client) => !checkedThisMonth.has(client.id));
    const watch = clients.map((client) => ({ client, record: latestRecord(client.id) }))
      .filter((item) => item.record && ["위기 징후", "관찰 필요", "연락 안 됨", "추후 확인"].includes(item.record.status));
    const stale = clients.filter((client) => daysSince(latestRecord(client.id)?.date) > 30);
    const followUps = records.filter((record) => record.followUp).length;

    const metrics = $("#opsWorkMetrics");
    if (metrics) {
      metrics.innerHTML = [
        ["이번 달 미확인", missing.length, "명"],
        ["위기·관찰", watch.length, "명"],
        ["30일 이상 미기록", stale.length, "명"],
        ["후속조치 기록", followUps, "건"]
      ].map(([label, value, unit]) => `<article><span>${label}</span><strong>${formatLocal(value)}</strong><small>${unit}</small></article>`).join("");
    }

    renderClientList("#opsMissingClients", missing, (client) => "이번 달 확인 기록 없음");
    renderClientList("#opsWatchClients", watch.slice(0, 8).map((item) => item.client), (client) => {
      const record = latestRecord(client.id);
      return `${record.status} · ${record.date}`;
    });
    renderClientList("#opsStaleClients", stale.slice(0, 8), (client) => {
      const latest = latestRecord(client.id);
      return latest ? `${daysSince(latest.date)}일 전 기록` : "기록 없음";
    });
  }

  function renderClientList(selector, clients, subText) {
    const container = $(selector);
    if (!container) return;
    if (!clients.length) {
      container.innerHTML = `<div class="check-item"><span>해당 대상자가 없습니다.</span><span class="status-chip">0</span></div>`;
      return;
    }
    container.innerHTML = clients.map((client) => `
      <div class="check-item ops-action-item">
        <span><strong class="pii">${safe(client.name || "이름 없음")}</strong><small>${safe(subText(client))}</small></span>
        <button class="text-button" type="button" data-open-process="${safe(client.id)}">기록</button>
      </div>
    `).join("");
  }

  function renderClientSelect() {
    const select = $("#opsClientSelect");
    if (!select) return;
    const previous = select.value;
    select.innerHTML = (state.clients || []).map((client) => `<option value="${safe(client.id)}">${safe(client.name || "이름 없음")}</option>`).join("");
    if (previous && state.clients.some((client) => client.id === previous)) select.value = previous;
    else if (state.clients[0]) select.value = state.clients[0].id;
  }

  function renderClientCard() {
    const container = $("#opsClientCard");
    if (!container) return;
    const client = selectedOpsClient();
    if (!client) {
      container.innerHTML = `<div class="check-item"><span>등록된 대상자가 없습니다.</span><span class="status-chip">0</span></div>`;
      return;
    }
    const latest = latestRecord(client.id);
    const monthCount = state.processRecords.filter((record) => record.clientId === client.id && String(record.date || "").startsWith(monthPrefix())).length;
    const linkedPrograms = state.programs.filter((program) => Array.isArray(program.clientIds) && program.clientIds.includes(client.id));
    const needs = inferNeeds(client, recentRecords(client.id, 5));
    const nextAction = latest?.followUp || (monthCount ? "정기 모니터링 지속" : "이번 달 안부확인 필요");
    container.innerHTML = `
      <div class="ops-card-main">
        <div>
          <strong class="ops-card-name pii">${safe(client.name || "이름 없음")}</strong>
          <p>${safe([client.worker && `담당 ${client.worker}`, client.area, client.economic, client.household].filter(Boolean).join(" · ") || "기본정보 추가 필요")}</p>
        </div>
        <span class="status-chip ${latestStatusLevel(latest?.status)}">${safe(latest?.status || "기록 없음")}</span>
      </div>
      <div class="ops-card-grid">
        <div><span>최근 기록</span><strong>${safe(latest ? `${latest.date} · ${latest.method}` : "없음")}</strong></div>
        <div><span>이번 달 기록</span><strong>${formatLocal(monthCount)}건</strong></div>
        <div><span>연계 사업</span><strong>${formatLocal(linkedPrograms.length)}개</strong></div>
        <div><span>다음 조치</span><strong>${safe(nextAction)}</strong></div>
      </div>
      <div class="ops-card-section">
        <span>주요 욕구 추정</span>
        <p>${safe(needs.length ? needs.join(" · ") : "최근 기록을 더 입력하면 자동으로 정리됩니다.")}</p>
      </div>
      <div class="ops-card-section">
        <span>최근 특이사항</span>
        <p>${safe(latest?.note || "특이사항 기록 없음")}</p>
      </div>
    `;
  }

  function renderMeetingDraft() {
    const box = $("#opsMeetingDraft");
    if (!box) return;
    box.textContent = buildMeetingDraft(selectedProcessClient() || selectedOpsClient());
  }

  function fillProcessFromRawMemo() {
    const memo = $("#opsRawMemo")?.value.trim();
    if (!memo) {
      toast("정리할 메모를 먼저 입력하세요.");
      return;
    }
    const parsed = parseMemo(memo);
    setProcessFields(parsed);
    toast("메모를 입력칸에 나눠 담았습니다. 저장 전 내용을 확인하세요.");
  }

  function fillQuickProcess(method, status, note, followUp) {
    setProcessFields({ date: todayIso(), method, status, note, followUp });
    toast("빠른 기록 양식을 채웠습니다. 저장 버튼을 눌러 확정하세요.");
  }

  function setProcessFields(parsed) {
    if ($("#processDate")) $("#processDate").value = parsed.date || todayIso();
    if ($("#processMethod")) $("#processMethod").value = parsed.method || "전화";
    if ($("#processStatus")) $("#processStatus").value = parsed.status || "양호";
    if ($("#processNote")) $("#processNote").value = parsed.note || "";
    if ($("#processFollowUp")) $("#processFollowUp").value = parsed.followUp || "";
  }

  function parseMemo(memo) {
    const compact = memo.replace(/\s+/g, " ").trim();
    const method = compact.includes("방문") ? "방문"
      : compact.includes("내방") ? "내방"
      : /문자|카톡|메신저/.test(compact) ? "문자/메신저"
      : compact.includes("전화") ? "전화"
      : "전화";
    const status = /연락\s*안|부재|미연결|받지 않|통화 안/.test(compact) ? "연락 안 됨"
      : containsAny(compact, RISK_WORDS) ? "위기 징후"
      : containsAny(compact, WATCH_WORDS) ? "관찰 필요"
      : "양호";
    const date = extractDate(compact);
    const sentences = compact.split(/(?<=[.!?。]|다\.|요\.|함\.|음\.)\s+|\s*;\s*/).map((item) => item.trim()).filter(Boolean);
    const followCandidates = sentences.filter((sentence) => containsAny(sentence, ACTION_WORDS));
    const followUp = followCandidates.join(" ").slice(0, 380);
    const note = compact.slice(0, 580);
    return { date, method, status, note, followUp };
  }

  function extractDate(text) {
    const iso = text.match(/(20\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/);
    if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(iso[3]).padStart(2, "0")}`;
    const short = text.match(/(\d{1,2})\s*[./월]\s*(\d{1,2})/);
    if (short) return `${selectedYear}-${String(short[1]).padStart(2, "0")}-${String(short[2]).padStart(2, "0")}`;
    if (text.includes("어제")) {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date.toISOString().slice(0, 10);
    }
    return todayIso();
  }

  function openProcessForClient(clientId) {
    const nav = document.querySelector('[data-view="process"]');
    nav?.click();
    window.setTimeout(() => {
      if ($("#processClient")) $("#processClient").value = clientId;
      if ($("#processClientFilter")) $("#processClientFilter").value = clientId;
      if ($("#processDate")) $("#processDate").value = todayIso();
      if (typeof renderProcessRecords === "function") renderProcessRecords();
      renderMeetingDraft();
    }, 0);
  }

  function copySelectedClientCard() {
    const client = selectedOpsClient();
    if (!client) return toast("복사할 대상자가 없습니다.");
    copyText(buildClientCardText(client), "대상자 업무카드를 복사했습니다.");
  }

  function copyMeetingDraft() {
    const client = selectedProcessClient() || selectedOpsClient();
    if (!client) return toast("초안을 만들 대상자가 없습니다.");
    copyText(buildMeetingDraft(client), "사례회의록 초안을 복사했습니다. 한글 문서에 붙여넣어 확인하세요.");
  }

  function copyOperationalSummary() {
    const text = buildOperationalSummary();
    copyText(text, "오늘 할 일 요약을 복사했습니다.");
  }

  function clearRawMemo() {
    const memo = $("#opsRawMemo");
    if (memo) memo.value = "";
  }

  function buildOperationalSummary() {
    const missing = state.clients.filter((client) => !state.processRecords.some((record) => record.clientId === client.id && String(record.date || "").startsWith(monthPrefix())));
    const watch = state.clients.map((client) => ({ client, record: latestRecord(client.id) }))
      .filter((item) => item.record && ["위기 징후", "관찰 필요", "연락 안 됨", "추후 확인"].includes(item.record.status));
    const stale = state.clients.filter((client) => daysSince(latestRecord(client.id)?.date) > 30);
    return [
      `[${selectedYear}년 ${selectedMonth}월 사례관리 확인 요약]`,
      `- 이번 달 안부확인 미작성: ${missing.length}명`,
      missing.slice(0, 20).map((client) => `  · ${client.name}${client.worker ? ` / ${client.worker}` : ""}`).join("\n") || "  · 없음",
      `- 주의가 필요한 최근 기록: ${watch.length}명`,
      watch.slice(0, 20).map(({ client, record }) => `  · ${client.name} / ${record.status} / ${record.date}`).join("\n") || "  · 없음",
      `- 최근 30일 기록 없음: ${stale.length}명`,
      stale.slice(0, 20).map((client) => `  · ${client.name}`).join("\n") || "  · 없음"
    ].join("\n");
  }

  function buildClientCardText(client) {
    const latest = latestRecord(client.id);
    const needs = inferNeeds(client, recentRecords(client.id, 5));
    return [
      `[대상자 업무카드]`,
      `대상자: ${client.name || ""}`,
      `담당자: ${client.worker || ""}`,
      `기본사항: ${[client.gender, client.birthYear && `${client.birthYear}년생`, client.area, client.economic, client.household].filter(Boolean).join(" / ")}`,
      `최근 기록: ${latest ? `${latest.date} / ${latest.method} / ${latest.status}` : "없음"}`,
      `주요 욕구 추정: ${needs.length ? needs.join(", ") : "확인 필요"}`,
      `최근 특이사항: ${latest?.note || ""}`,
      `후속조치: ${latest?.followUp || ""}`
    ].join("\n");
  }

  function buildMeetingDraft(client) {
    if (!client) return "대상자를 선택하면 사례회의록 초안이 여기에 표시됩니다.";
    const records = recentRecords(client.id, 6);
    const needs = inferNeeds(client, records);
    const latest = records[0];
    const followUps = records.map((record) => record.followUp).filter(Boolean);
    return [
      `[사례회의록 초안]`,
      `※ 자동 정리 초안입니다. 실제 회의 전 대상자 정보, 표현, 개인정보 포함 여부를 반드시 확인하세요.`,
      ``,
      `1. 대상자 개요`,
      `- 대상자: ${client.name || ""}`,
      `- 담당자: ${client.worker || ""}`,
      `- 기본사항: ${[client.gender, client.birthYear && `${client.birthYear}년생`, client.area, client.housing, client.economic, client.household].filter(Boolean).join(" / ") || "확인 필요"}`,
      `- 가구 구성: ${client.familyMembers || "확인 필요"}`,
      ``,
      `2. 최근 개입 경과`,
      records.length ? records.map((record) => `- ${record.date} / ${record.method} / ${record.status}: ${record.note || "특이사항 없음"}${record.followUp ? ` (후속조치: ${record.followUp})` : ""}`).join("\n") : `- 최근 과정기록 없음`,
      ``,
      `3. 주요 욕구 및 위험요인`,
      needs.length ? needs.map((need) => `- ${need}`).join("\n") : `- 추가 사정 필요`,
      latest && ["위기 징후", "관찰 필요", "연락 안 됨"].includes(latest.status) ? `- 최근 상태: ${latest.status}` : `- 현재까지 중대한 위기 기록은 별도 확인 필요`,
      ``,
      `4. 논의 안건`,
      `- 현재 지원의 적절성 및 추가 서비스 연계 필요 여부`,
      `- 정기 모니터링 주기 및 담당자 후속조치 확인`,
      ``,
      `5. 결정 및 향후 계획 초안`,
      followUps.length ? followUps.slice(0, 4).map((item) => `- ${item}`).join("\n") : `- 정기 안부확인 지속 및 필요 시 방문상담 실시`,
      `- 회의 결과에 따라 서비스계획 및 과정기록 보완`
    ].join("\n");
  }

  function inferNeeds(client, records) {
    const text = `${client.familyMembers || ""} ${records.map((record) => `${record.note || ""} ${record.followUp || ""}`).join(" ")}`;
    const needs = [];
    if (/식사|결식|반찬|도시락|영양|김치|식품/.test(text)) needs.push("식생활 지원");
    if (/병원|통증|약|복용|진료|의료|건강|질환|동행/.test(text)) needs.push("건강·의료 지원");
    if (/우울|불안|외로|고립|정서|말벗/.test(text)) needs.push("정서지원");
    if (/월세|주거|집|수리|퇴거|단전|단수|냉방|난방/.test(text)) needs.push("주거·생활환경");
    if (/체납|부채|소득|경제|긴급|후원|물품/.test(text)) needs.push("경제·후원 연계");
    if (/가족|자녀|배우자|갈등|연락/.test(text)) needs.push("가족관계 확인");
    return Array.from(new Set(needs)).slice(0, 6);
  }

  function selectedOpsClient() {
    const id = $("#opsClientSelect")?.value;
    return state.clients.find((client) => client.id === id) || state.clients[0] || null;
  }

  function selectedProcessClient() {
    const id = $("#processClient")?.value;
    return state.clients.find((client) => client.id === id) || null;
  }

  function latestRecord(clientId) {
    return recentRecords(clientId, 1)[0] || null;
  }

  function recentRecords(clientId, limit = 5) {
    return (state.processRecords || [])
      .filter((record) => record.clientId === clientId)
      .slice()
      .sort((a, b) => new Date(b.date || b.updatedAt || 0) - new Date(a.date || a.updatedAt || 0))
      .slice(0, limit);
  }

  function daysSince(dateText) {
    if (!dateText) return Number.POSITIVE_INFINITY;
    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
    const today = new Date(`${todayIso()}T00:00:00`);
    return Math.floor((today - date) / 86400000);
  }

  function containsAny(text, words) {
    return words.some((word) => text.includes(word));
  }

  function latestStatusLevel(status) {
    if (status === "위기 징후") return "danger";
    if (["관찰 필요", "연락 안 됨", "추후 확인"].includes(status)) return "warn";
    return "";
  }

  function formatLocal(value) {
    return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
  }

  function copyText(text, successMessage) {
    navigator.clipboard?.writeText(text).then(() => toast(successMessage)).catch(() => {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast(successMessage);
    });
  }

  function toast(message) {
    if (typeof showToast === "function") showToast(message);
    else console.log(message);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.setTimeout(boot, 0));
  } else {
    window.setTimeout(boot, 0);
  }
})();
