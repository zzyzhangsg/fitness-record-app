const STORAGE_KEY = "fitness-records-v1";
const CUSTOM_EXERCISES_KEY = "fitness-custom-exercises-v1";
const QUICK_TEMPLATES_KEY = "fitness-quick-templates-v1";
const DEFAULT_REST_MINUTES = 2;
const REST_MET = 1.5;

const templates = {
  push: ["杠铃卧推", "杠铃上斜卧推", "蝴蝶机夹胸", "蝴蝶机反向飞鸟", "绳索面拉", "哑铃侧平举", "杠铃肩推"],
  pull: ["引体向上", "引体向上（负重10kg）", "高位下拉", "v把划船", "绳索直臂下拉", "牧师凳杠铃弯举", "绳索臂屈伸"],
  legs: ["硬拉", "深蹲", "史密斯机深蹲", "坐姿腿弯举", "坐姿腿屈伸", "坐姿髋内收", "坐姿髋外展"],
  cardio: ["快走", "慢跑"]
};

const catalog = [
  "快走", "杠铃卧推", "引体向上", "自由深蹲", "哑铃卧推", "引体向上（负重10kg）",
  "史密斯机深蹲", "杠铃上斜卧推", "中距对握高位下拉", "坐姿腿弯举", "蝴蝶机夹胸",
  "绳索v把坐姿划船", "蝴蝶机反向飞鸟（练后束）", "双手哑铃弯举", "绳索面拉（练后束）",
  "双手哑铃锤式弯举", "坐姿髋内收", "哑铃侧平举", "牧师凳双手杠铃弯举", "坐姿髋外展",
  "左右单手臂屈伸", "双手臂屈伸", "坐姿腿屈伸", "绳索左右手交替侧平举", "硬拉",
  "坐姿俯身哑铃反向飞鸟（练后束）", "直杆绳索下压", "悍马机正手下拉", "绳索面拉",
  "蝴蝶机反向飞鸟", "对握高位下拉", "v把划船", "哑铃弯举", "绳索臂屈伸", "牧师凳杠铃弯举",
  "牧师凳哑铃弯举", "坐姿哑铃臂屈伸", "绳索臂弯举", "绳索单手臂屈伸", "高位下拉",
  "深蹲", "绳索过头臂屈伸", "哑铃肩推", "跪姿单侧下拉", "绳索直臂下拉", "杠铃肩推"
];

const state = {
  records: {},
  customExercises: [],
  quickTemplates: cloneTemplates(templates),
  activeDate: todayKey(),
  activeTemplate: "push",
  editingQuickActions: false,
  saveTimer: null,
  calendarMonth: todayKey().slice(0, 7),
  deferredInstall: null
};

const els = {
  saveState: document.querySelector("#saveState"),
  recordDate: document.querySelector("#recordDate"),
  weekdayLabel: document.querySelector("#weekdayLabel"),
  calendarPopover: document.querySelector("#calendarPopover"),
  sessionType: document.querySelector("#sessionType"),
  bodyWeight: document.querySelector("#bodyWeight"),
  dailyVolume: document.querySelector("#dailyVolume"),
  totalVolume: document.querySelector("#totalVolume"),
  totalDistance: document.querySelector("#totalDistance"),
  totalCardioTime: document.querySelector("#totalCardioTime"),
  totalCalories: document.querySelector("#totalCalories"),
  quickExercises: document.querySelector("#quickExercises"),
  exerciseList: document.querySelector("#exerciseList"),
  emptyState: document.querySelector("#emptyState"),
  sessionNotes: document.querySelector("#sessionNotes"),
  historyList: document.querySelector("#historyList"),
  editQuickActions: document.querySelector("#editQuickActions"),
  addCustomExercise: document.querySelector("#addCustomExercise"),
  clearDay: document.querySelector("#clearDay"),
  exportCsv: document.querySelector("#exportCsv"),
  exportJson: document.querySelector("#exportJson"),
  installButton: document.querySelector("#installButton"),
  customExerciseModal: document.querySelector("#customExerciseModal"),
  customExerciseForm: document.querySelector("#customExerciseForm"),
  customExerciseName: document.querySelector("#customExerciseName"),
  customExerciseTemplate: document.querySelector("#customExerciseTemplate"),
  cancelCustomExercise: document.querySelector("#cancelCustomExercise"),
  exerciseModalTitle: document.querySelector("#exerciseModalTitle"),
  exerciseTemplate: document.querySelector("#exerciseTemplate"),
  setTemplate: document.querySelector("#setTemplate")
};

init();

function init() {
  loadRecords();
  loadQuickTemplates();
  loadCustomExercises();
  els.recordDate.value = state.activeDate;
  ensureRecord(state.activeDate);
  bindEvents();
  renderAll();
  registerServiceWorker();
}

function bindEvents() {
  els.recordDate.addEventListener("click", () => {
    state.calendarMonth = state.activeDate.slice(0, 7);
    renderCalendar();
    els.calendarPopover.hidden = false;
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".date-row")) {
      els.calendarPopover.hidden = true;
    }
  });

  els.sessionType.addEventListener("change", () => updateCurrent({ type: els.sessionType.value }));
  els.bodyWeight.addEventListener("input", () => {
    updateCurrent({ bodyWeight: els.bodyWeight.value });
    renderTotals();
  });
  els.sessionNotes.addEventListener("input", () => updateCurrent({ notes: els.sessionNotes.value }));

  document.querySelectorAll(".template-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTemplate = button.dataset.template;
      renderQuickActions();
    });
  });

  els.addCustomExercise.addEventListener("click", () => {
    openExerciseModal();
  });

  els.editQuickActions.addEventListener("click", () => {
    state.editingQuickActions = !state.editingQuickActions;
    renderQuickActions();
  });

  els.cancelCustomExercise.addEventListener("click", closeCustomExerciseModal);

  els.customExerciseModal.addEventListener("click", (event) => {
    if (event.target === els.customExerciseModal) closeCustomExerciseModal();
  });

  els.customExerciseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = els.customExerciseName.value.trim();
    if (!name) {
      els.customExerciseName.focus();
      return;
    }
    const template = selectedCustomTemplate();
    const multiplier = template === "cardio" ? 1 : selectedExerciseMultiplier();
    saveCustomExercise({ name, template, multiplier });
    addExercise(name, multiplier, template);
    closeCustomExerciseModal();
  });

  els.customExerciseName.addEventListener("input", () => {
    updateCustomExerciseMode();
  });

  els.customExerciseTemplate.addEventListener("change", updateCustomExerciseMode);

  els.clearDay.addEventListener("click", () => {
    if (!confirm("清空当天记录？")) return;
    state.records[state.activeDate] = blankRecord(state.activeDate);
    saveRecords();
    renderAll();
  });

  els.exportCsv.addEventListener("click", exportCurrentCsv);
  els.exportJson.addEventListener("click", exportAllJson);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstall = event;
    els.installButton.hidden = false;
  });

  els.installButton.addEventListener("click", async () => {
    if (!state.deferredInstall) return;
    state.deferredInstall.prompt();
    await state.deferredInstall.userChoice;
    state.deferredInstall = null;
    els.installButton.hidden = true;
  });
}

function openExerciseModal(name = "") {
  els.exerciseModalTitle.textContent = name ? "确认动作" : "自定义动作";
  els.customExerciseName.value = name;
  els.customExerciseTemplate.value = state.activeTemplate;
  setSelectedExerciseMultiplier(defaultMultiplierForName(name));
  updateCustomExerciseMode();
  els.customExerciseModal.hidden = false;
  requestAnimationFrame(() => {
    els.customExerciseName.focus();
    if (name) els.customExerciseName.select();
  });
}

function closeCustomExerciseModal() {
  els.customExerciseModal.hidden = true;
}

function selectedExerciseMultiplier() {
  const checked = els.customExerciseForm.querySelector('input[name="exerciseMultiplier"]:checked');
  return checked ? Number(checked.value) : 1;
}

function selectedCustomTemplate() {
  return els.customExerciseTemplate.value || state.activeTemplate;
}

function updateCustomExerciseMode() {
  const cardio = selectedCustomTemplate() === "cardio" || isCardioExercise(els.customExerciseName.value);
  els.customExerciseForm.classList.toggle("cardio-mode", cardio);
}

function setSelectedExerciseMultiplier(multiplier) {
  const value = String(multiplier === 2 ? 2 : 1);
  const input = els.customExerciseForm.querySelector(`input[name="exerciseMultiplier"][value="${value}"]`);
  if (input) input.checked = true;
}

function renderAll() {
  const record = currentRecord();
  els.recordDate.value = formatDateForDisplay(state.activeDate);
  els.weekdayLabel.textContent = weekdayText(state.activeDate);
  els.sessionType.value = record.type || "胸肩";
  els.bodyWeight.value = record.bodyWeight || "";
  els.sessionNotes.value = record.notes || "";
  renderQuickActions();
  renderExercises();
  renderTotals();
  renderHistory();
}

function renderCalendar() {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const monthLabel = `${year}年${String(month).padStart(2, "0")}月`;
  const days = [];

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = dateKey(date);
    const inMonth = date.getMonth() === month - 1;
    const selected = key === state.activeDate;
    const hasRecord = recordHasContent(state.records[key]);
    days.push(`
      <button class="calendar-day ${inMonth ? "" : "muted"} ${selected ? "selected" : ""}" data-date="${key}" type="button">
        <span>${date.getDate()}</span>
        ${hasRecord ? '<i aria-hidden="true"></i>' : ""}
      </button>
    `);
  }

  els.calendarPopover.innerHTML = `
    <div class="calendar-head">
      <button type="button" data-calendar-nav="-1">‹</button>
      <strong>${monthLabel}</strong>
      <button type="button" data-calendar-nav="1">›</button>
    </div>
    <div class="calendar-weekdays">
      <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
    </div>
    <div class="calendar-days">${days.join("")}</div>
  `;

  els.calendarPopover.querySelectorAll("[data-calendar-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = new Date(year, month - 1 + Number(button.dataset.calendarNav), 1);
      state.calendarMonth = dateKey(next).slice(0, 7);
      renderCalendar();
    });
  });

  els.calendarPopover.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeDate = button.dataset.date;
      ensureRecord(state.activeDate);
      els.calendarPopover.hidden = true;
      renderAll();
    });
  });
}

function renderQuickActions() {
  document.querySelectorAll(".template-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.template === state.activeTemplate);
  });
  els.editQuickActions.textContent = state.editingQuickActions ? "完成" : "编辑";

  els.quickExercises.innerHTML = "";
  const quickItems = state.quickTemplates[state.activeTemplate].map((name, index) => ({
    name,
    template: state.activeTemplate,
    multiplier: defaultMultiplierForName(name),
    source: "template",
    index
  }));
  state.customExercises.forEach((exercise) => {
    if (exercise.template !== state.activeTemplate) return;
    if (!quickItems.some((item) => item.name === exercise.name)) quickItems.push(exercise);
  });

  quickItems.forEach((item) => {
    if (state.editingQuickActions) {
      const input = document.createElement("input");
      input.className = "quick-edit-input";
      input.value = item.name;
      input.setAttribute("aria-label", "快捷动作名称");
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") input.blur();
      });
      input.addEventListener("blur", () => renameQuickItem(item, input.value));
      els.quickExercises.append(input);
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.name;
    button.addEventListener("click", () => addExercise(item.name, item.multiplier, item.template));
    els.quickExercises.append(button);
  });
}

function renameQuickItem(item, value) {
  const nextName = String(value || "").trim();
  if (!nextName || nextName === item.name) {
    renderQuickActions();
    return;
  }

  if (item.source === "template") {
    state.quickTemplates[item.template][item.index] = nextName;
    saveQuickTemplates();
  } else {
    const custom = state.customExercises.find((exercise) => (
      exercise.template === item.template && exercise.name === item.name
    ));
    if (custom) {
      custom.name = nextName;
      localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(state.customExercises));
    }
  }

  renderQuickActions();
}

function loadQuickTemplates() {
  try {
    const saved = JSON.parse(localStorage.getItem(QUICK_TEMPLATES_KEY) || "null");
    state.quickTemplates = mergeTemplates(saved);
  } catch {
    state.quickTemplates = cloneTemplates(templates);
  }
}

function saveQuickTemplates() {
  localStorage.setItem(QUICK_TEMPLATES_KEY, JSON.stringify(state.quickTemplates));
}

function cloneTemplates(source) {
  return Object.fromEntries(Object.entries(source).map(([key, names]) => [key, [...names]]));
}

function mergeTemplates(saved) {
  const merged = cloneTemplates(templates);
  if (!saved || typeof saved !== "object") return merged;
  Object.keys(merged).forEach((key) => {
    if (Array.isArray(saved[key]) && saved[key].length) {
      merged[key] = saved[key].map((name) => String(name || "").trim()).filter(Boolean);
    }
  });
  return merged;
}

function loadCustomExercises() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_EXERCISES_KEY) || "[]");
    state.customExercises = Array.isArray(saved) ? saved.map(normalizeCustomExercise).filter(Boolean) : [];
  } catch {
    state.customExercises = [];
  }
  state.customExercises = state.customExercises.filter((exercise) => exercise.name !== "哑铃弯举");
  localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(state.customExercises));
}

function normalizeCustomExercise(value) {
  if (!value) return null;
  if (typeof value === "string") {
    return { name: value, template: state.activeTemplate, multiplier: defaultMultiplierForName(value) };
  }
  const name = String(value.name || "").trim();
  if (!name) return null;
  const template = ["push", "pull", "legs", "cardio"].includes(value.template) ? value.template : state.activeTemplate;
  const multiplier = template === "cardio" ? 1 : Number(value.multiplier) === 2 ? 2 : defaultMultiplierForName(name);
  return { name, template, multiplier };
}

function saveCustomExercise(exercise) {
  if (!exercise.name) return;
  const existing = state.customExercises.find((item) => item.name === exercise.name);
  if (existing) {
    existing.template = exercise.template;
    existing.multiplier = exercise.multiplier;
  } else {
    state.customExercises.push(exercise);
  }
  localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(state.customExercises));
}

function renderExercises() {
  const record = currentRecord();
  els.exerciseList.innerHTML = "";
  els.emptyState.hidden = record.exercises.length > 0;

  record.exercises.forEach((exercise, exerciseIndex) => {
    const node = els.exerciseTemplate.content.firstElementChild.cloneNode(true);
    const nameInput = node.querySelector(".exercise-name");
    const setsNode = node.querySelector(".sets");
    const labels = node.querySelectorAll(".set-labels span");
    const cardio = isCardioExercise(exercise);

    node.classList.toggle("cardio-exercise", cardio);
    labels[0].textContent = cardio ? "速度 km/h" : "重量 kg";
    labels[1].textContent = cardio ? "距离 km" : "次数";
    labels[2].textContent = cardio ? "时长 min" : "组数";
    labels[3].textContent = cardio ? "" : "总量";
    nameInput.value = exercise.name;
    nameInput.addEventListener("input", () => {
      exercise.name = nameInput.value;
      saveRecords();
      renderHistory();
    });
    nameInput.addEventListener("blur", renderAll);

    node.querySelector(".remove-exercise").addEventListener("click", () => {
      record.exercises.splice(exerciseIndex, 1);
      saveRecords();
      renderAll();
    });

    node.querySelector(".add-set").addEventListener("click", () => {
      exercise.sets.push(blankSet());
      saveRecords();
      renderExercises();
      renderTotals();
    });

    exercise.sets.forEach((set, setIndex) => {
      setsNode.append(renderSetRow(exercise, set, setIndex));
    });

    els.exerciseList.append(node);
  });
}

function renderSetRow(exercise, set, setIndex) {
  const row = els.setTemplate.content.firstElementChild.cloneNode(true);
  const weight = row.querySelector(".set-weight");
  const reps = row.querySelector(".set-reps");
  const count = row.querySelector(".set-count");
  const volume = row.querySelector(".set-volume");
  const cardio = isCardioExercise(exercise);

  weight.value = set.weight || "";
  reps.value = set.reps || "";
  count.value = set.count || "";
  volume.value = formatNumber(setVolume(set, exercise));
  volume.title = !cardio && exerciseMultiplier(exercise) === 2 ? "单手重量，已按左右两侧计算" : "";
  weight.placeholder = cardio ? "km/h" : "kg";
  reps.placeholder = cardio ? "km" : "次";
  count.placeholder = cardio ? "min" : "组";

  const updateSet = () => {
    set.weight = weight.value;
    set.reps = reps.value;
    set.count = count.value;
    volume.value = formatNumber(setVolume(set, exercise));
    saveRecords();
    renderTotals();
    renderHistory();
  };

  [weight, reps, count].forEach((input) => input.addEventListener("input", updateSet));

  row.querySelector(".remove-set").addEventListener("click", () => {
    exercise.sets.splice(setIndex, 1);
    if (exercise.sets.length === 0) exercise.sets.push(blankSet());
    saveRecords();
    renderExercises();
    renderTotals();
  });

  return row;
}

function renderTotals() {
  const totals = recordTotals(currentRecord());
  els.dailyVolume.textContent = formatNumber(totals.volume);
  els.totalVolume.textContent = formatNumber(totals.volume);
  els.totalDistance.textContent = formatNumber(totals.distance);
  els.totalCardioTime.textContent = formatNumber(totals.cardioTime);
  els.totalCalories.textContent = formatCalories(totals.calories);
}

function renderHistory() {
  const entries = Object.values(state.records)
    .filter(recordHasContent)
    .sort((a, b) => b.date.localeCompare(a.date));

  els.historyList.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "history-meta";
    empty.textContent = "还没有历史记录。";
    els.historyList.append(empty);
    return;
  }

  entries.forEach((record) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <button class="history-open" type="button">
        <strong>${escapeHtml(record.date)} ${escapeHtml(record.type || "")}</strong>
        <span class="history-meta">${record.exercises.length} 个动作</span>
      </button>
      <span class="history-volume">${formatNumber(recordVolume(record))}</span>
      <button class="icon-button tiny history-delete" type="button" title="删除这天历史">×</button>
    `;
    item.querySelector(".history-open").addEventListener("click", () => {
      state.activeDate = record.date;
      renderAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    item.querySelector(".history-delete").addEventListener("click", () => {
      if (!confirm(`删除 ${record.date} 的历史记录？`)) return;
      delete state.records[record.date];
      saveRecords();
      if (state.activeDate === record.date) ensureRecord(state.activeDate);
      renderAll();
    });
    els.historyList.append(item);
  });
}

function addExercise(name, multiplier = 1, template = state.activeTemplate) {
  const record = currentRecord();
  record.exercises.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name,
    template,
    multiplier: isCardioExercise({ name, template }) ? 1 : multiplier === 2 ? 2 : 1,
    sets: [blankSet()]
  });
  saveRecords();
  renderAll();
}

function updateCurrent(patch) {
  Object.assign(currentRecord(), patch);
  saveRecords();
  renderHistory();
}

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.records = saved && typeof saved === "object" ? saved : {};
  } catch {
    state.records = {};
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
  els.saveState.textContent = "正在保存...";
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    els.saveState.textContent = "已自动保存";
  }, 350);
}

function ensureRecord(date) {
  if (!state.records[date]) state.records[date] = blankRecord(date);
}

function currentRecord() {
  ensureRecord(state.activeDate);
  return state.records[state.activeDate];
}

function blankRecord(date) {
  return {
    date,
    type: "胸肩",
    bodyWeight: "72",
    notes: "",
    exercises: []
  };
}

function blankSet() {
  return { weight: "", reps: "", count: "" };
}

function setVolume(set, exercise = "") {
  if (isCardioExercise(exercise)) return 0;
  const weight = numberFrom(set.weight);
  const reps = numberFrom(set.reps);
  const count = numberFrom(set.count);
  if ([weight, reps, count].some((value) => Number.isNaN(value))) return 0;
  return weight * reps * count * exerciseMultiplier(exercise);
}

function recordVolume(record) {
  return recordTotals(record).volume;
}

function recordTotals(record) {
  const bodyWeight = numberOrZero(record.bodyWeight);
  const totals = record.exercises.reduce((total, exercise) => {
    let exerciseSetCount = 0;

    exercise.sets.forEach((set) => {
      if (isCardioExercise(exercise)) {
        total.distance += numberOrZero(set.reps);
        total.cardioTime += numberOrZero(set.count);
        total.calories += cardioCalories(set, exercise, bodyWeight);
      } else {
        const volume = setVolume(set, exercise);
        const setCount = numberOrZero(set.count);
        exerciseSetCount += setCount;
        total.volume += volume;
        total.calories += strengthCalories(volume, bodyWeight);
      }
    });

    if (!isCardioExercise(exercise) && exerciseSetCount > 0) {
      total.strengthExerciseCount += 1;
      total.strengthSetCount += exerciseSetCount;
    }

    return total;
  }, { volume: 0, distance: 0, cardioTime: 0, calories: 0, strengthExerciseCount: 0, strengthSetCount: 0 });

  const restMinutes = strengthRestMinutes(totals.strengthSetCount, totals.strengthExerciseCount);
  totals.calories += restCalories(restMinutes, bodyWeight);
  return totals;
}

function strengthCalories(volume, bodyWeight) {
  if (!bodyWeight || !volume) return 0;
  return volume * 0.01 * (bodyWeight / 72);
}

function strengthRestMinutes(setCount, exerciseCount) {
  const betweenSets = Math.max(0, setCount - exerciseCount);
  const betweenExercises = Math.max(0, exerciseCount - 1);
  return (betweenSets + betweenExercises) * DEFAULT_REST_MINUTES;
}

function restCalories(minutes, bodyWeight) {
  if (!minutes || !bodyWeight) return 0;
  return REST_MET * 3.5 * bodyWeight / 200 * minutes;
}

function cardioCalories(set, exercise, bodyWeight) {
  if (!bodyWeight) return 0;
  const speed = numberOrZero(set.weight);
  const distance = numberOrZero(set.reps);
  let minutes = numberOrZero(set.count);
  const inferredSpeed = speed || (distance && minutes ? distance / (minutes / 60) : 0);

  if (!minutes && speed && distance) {
    minutes = distance / speed * 60;
  }

  if (!minutes) return 0;
  const met = cardioMet(inferredSpeed, exercise.name);
  return met * 3.5 * bodyWeight / 200 * minutes;
}

function cardioMet(speed, name) {
  if (String(name || "").includes("慢跑") || speed >= 6.4) {
    if (speed >= 11.3) return 11.8;
    if (speed >= 9.7) return 9.8;
    if (speed >= 8) return 8.3;
    return 7;
  }
  if (speed >= 5.6) return 4.3;
  if (speed >= 4.8) return 3.5;
  return 2.8;
}

function exerciseMultiplier(exercise) {
  if (exercise && typeof exercise === "object" && Number(exercise.multiplier)) {
    return Number(exercise.multiplier) === 2 ? 2 : 1;
  }
  const name = typeof exercise === "object" ? exercise.name : exercise;
  return defaultMultiplierForName(name);
}

function defaultMultiplierForName(name) {
  return /哑铃|单手|左右手/.test(String(name || "")) ? 2 : 1;
}

function isCardioExercise(exercise) {
  const name = typeof exercise === "object" ? exercise.name : exercise;
  const template = typeof exercise === "object" ? exercise.template : "";
  return template === "cardio" || ["快走", "慢跑"].includes(String(name || "").trim());
}

function numberFrom(value) {
  const match = String(value || "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

function numberOrZero(value) {
  const number = numberFrom(value);
  return Number.isNaN(number) ? 0 : number;
}

function formatNumber(value) {
  if (!value) return "0";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 }).format(value);
}

function formatCalories(value) {
  if (!value) return "0";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value);
}

function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function dateKey(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDateForDisplay(dateText) {
  return dateText ? dateText.replaceAll("-", "/") : "";
}

function weekdayText(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
}

function recordHasContent(record) {
  if (!record) return false;
  return Boolean(record.exercises?.length || String(record.notes || "").trim());
}

function exportCurrentCsv() {
  const record = currentRecord();
  const rows = [["日期", "训练类型", "体重", "动作", "重量/速度", "次数/距离", "组数/时长", "总量"]];

  record.exercises.forEach((exercise) => {
    exercise.sets.forEach((set) => {
      rows.push([
        record.date,
        record.type || "",
        record.bodyWeight || "",
        exercise.name || "",
        set.weight || "",
        set.reps || "",
        set.count || "",
        isCardioExercise(exercise) ? "" : formatNumber(setVolume(set, exercise))
      ]);
    });
  });

  downloadText(`${record.date}-健身记录.csv`, rows.map(toCsvRow).join("\n"), "text/csv;charset=utf-8");
}

function exportAllJson() {
  downloadText(`健身记录备份-${todayKey()}.json`, JSON.stringify(state.records, null, 2), "application/json;charset=utf-8");
}

function toCsvRow(row) {
  return row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",");
}

function downloadText(filename, text, type) {
  const blob = new Blob(["\ufeff", text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
