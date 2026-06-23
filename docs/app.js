const products = window.FOOD_PRODUCTS.map((item) => ({
  id: item["제품 번호"],
  name: item["제품 이름"],
  maker: item["제조사"],
  category: item["식품 분류"],
  calories: Number(item["총 열량"]) || 0,
  sugar: Number(item["총 당류"]) || 0,
  sweetenerText: item["감미료 정보"] || "정보 없음",
  serving: item["g당"],
}));

const sweetenerInfos = window.SWEETENER_INFO.map((item) => ({
  name: item["대체감미료"],
  good: item["장점"],
  risk: item["부작용"],
}));

const approvedSweeteners = [
  "감초추출물",
  "글리실리진산이나트륨",
  "네오탐",
  "락티톨",
  "D-리보오스",
  "만니톨",
  "D-말티톨",
  "말티톨시럽",
  "사카린나트륨",
  "D-소비톨",
  "D-소비톨액",
  "D-소르비톨액",
  "수크랄로스",
  "스테비올배당체",
  "아세설팜칼륨",
  "아세설팔칼륨",
  "아스파탐",
  "에리스리톨",
  "이소말트",
  "D-자일로오스",
  "자일리톨",
  "토마틴",
  "폴리글리시톨시럽",
  "폴리글리시톨 시럽",
  "효소처리스테비아",
  "효소처리스테이바",
  "알룰로스",
  "말티톨",
  "비정제원당",
  "나한과 추출물",
  "당알콜",
];

const state = {
  search: "",
  category: "",
  sweetener: "",
  sort: "name",
  selected: products[0],
};

const el = {
  productCount: document.querySelector("#productCount"),
  categoryCount: document.querySelector("#categoryCount"),
  sweetenerCount: document.querySelector("#sweetenerCount"),
  productSearch: document.querySelector("#productSearch"),
  clearSearch: document.querySelector("#clearSearch"),
  suggestion: document.querySelector("#suggestion"),
  categoryFilters: document.querySelector("#categoryFilters"),
  sweetenerFilter: document.querySelector("#sweetenerFilter"),
  sortButtons: document.querySelectorAll("[data-sort]"),
  selectedName: document.querySelector("#selectedName"),
  selectedBadge: document.querySelector("#selectedBadge"),
  maker: document.querySelector("#maker"),
  category: document.querySelector("#category"),
  serving: document.querySelector("#serving"),
  sweeteners: document.querySelector("#sweeteners"),
  calorieValue: document.querySelector("#calorieValue"),
  sugarValue: document.querySelector("#sugarValue"),
  productList: document.querySelector("#productList"),
  resultCount: document.querySelector("#resultCount"),
  sweetenerSearch: document.querySelector("#sweetenerSearch"),
  sweetenerInfo: document.querySelector("#sweetenerInfo"),
};

function normalize(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function splitSweeteners(value) {
  const found = approvedSweeteners.filter((name) => value.includes(name));
  if (found.length) return [...new Set(found)];
  return value
    .split(/[,/·]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function getSweetenerCounts() {
  const counts = {};
  products.forEach((product) => {
    splitSweeteners(product.sweetenerText).forEach((name) => {
      counts[name] = (counts[name] || 0) + 1;
    });
  });
  return counts;
}

function similarity(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  const matrix = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  const distance = matrix[left.length][right.length];
  return 1 - distance / Math.max(left.length, right.length);
}

function closestProduct(term) {
  return products
    .map((product) => ({ product, score: similarity(product.name, term) }))
    .sort((a, b) => b.score - a.score)[0]?.product;
}

function getFilteredProducts() {
  let result = [...products];
  const term = normalize(state.search);
  if (term) {
    result = result.filter((product) => normalize(product.name).includes(term));
  }
  if (state.category) {
    result = result.filter((product) => product.category === state.category);
  }
  if (state.sweetener) {
    result = result.filter((product) => product.sweetenerText.includes(state.sweetener));
  }
  result.sort((a, b) => {
    if (state.sort === "calorie") return b.calories - a.calories;
    if (state.sort === "sugar") return b.sugar - a.sugar;
    return a.name.localeCompare(b.name, "ko");
  });
  return result;
}

function resizeCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawEmpty(canvas, text) {
  const { ctx, width, height } = resizeCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#657084";
  ctx.textAlign = "center";
  ctx.font = "14px sans-serif";
  ctx.fillText(text, width / 2, height / 2);
}

function drawBarChart(canvas, labels, values, colors) {
  const { ctx, width, height } = resizeCanvas(canvas);
  const padding = { left: 46, right: 18, top: 18, bottom: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...values, 1);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#d9dee8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();

  values.forEach((value, index) => {
    const barWidth = chartWidth / values.length - 26;
    const x = padding.left + index * (chartWidth / values.length) + 13;
    const barHeight = (value / max) * (chartHeight - 18);
    const y = padding.top + chartHeight - barHeight;
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "#1d2433";
    ctx.textAlign = "center";
    ctx.font = "700 13px sans-serif";
    ctx.fillText(String(value), x + barWidth / 2, y - 8);
    ctx.fillStyle = "#657084";
    ctx.font = "12px sans-serif";
    ctx.fillText(labels[index], x + barWidth / 2, padding.top + chartHeight + 25);
  });
}

function drawHorizontalChart(canvas, entries, color) {
  const { ctx, width, height } = resizeCanvas(canvas);
  const top = 16;
  const left = 122;
  const rowHeight = Math.max(24, (height - top * 2) / Math.max(entries.length, 1));
  const max = Math.max(...entries.map((entry) => entry[1]), 1);
  ctx.clearRect(0, 0, width, height);
  entries.forEach(([label, value], index) => {
    const y = top + index * rowHeight + 4;
    const barWidth = ((width - left - 42) * value) / max;
    ctx.fillStyle = "#657084";
    ctx.textAlign = "right";
    ctx.font = "12px sans-serif";
    const shortLabel = label.length > 12 ? `${label.slice(0, 11)}…` : label;
    ctx.fillText(shortLabel, left - 12, y + 14);
    ctx.fillStyle = color;
    ctx.fillRect(left, y, barWidth, 15);
    ctx.fillStyle = "#1d2433";
    ctx.textAlign = "left";
    ctx.font = "700 12px sans-serif";
    ctx.fillText(value, left + barWidth + 7, y + 13);
  });
}

function drawRing(canvas, value, total, color) {
  const { ctx, width, height } = resizeCanvas(canvas);
  const size = Math.min(width, height);
  const radius = size / 2 - 12;
  const centerX = width / 2;
  const centerY = height / 2;
  const ratio = Math.max(0, Math.min(1, value / total));
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#e8ebef";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
  ctx.stroke();
  ctx.fillStyle = "#1d2433";
  ctx.textAlign = "center";
  ctx.font = "800 16px sans-serif";
  ctx.fillText(`${Math.round(ratio * 100)}%`, centerX, centerY + 6);
}

function selectProduct(product) {
  state.selected = product;
  el.selectedName.textContent = product.name;
  el.selectedBadge.textContent = product.category;
  el.maker.textContent = product.maker || "-";
  el.category.textContent = product.category || "-";
  el.serving.textContent = `${product.serving} g당`;
  el.sweeteners.textContent = product.sweetenerText || "-";
  el.calorieValue.textContent = product.calories.toLocaleString("ko-KR");
  el.sugarValue.textContent = product.sugar.toLocaleString("ko-KR");
  drawBarChart(document.querySelector("#barChart"), ["총 열량(kcal)", "총 당류(g)"], [product.calories, product.sugar], ["#3169a9", "#d75f45"]);
  drawRing(document.querySelector("#calorieRing"), product.calories, 2000, "#3169a9");
  drawRing(document.querySelector("#sugarRing"), product.sugar, 100, "#d75f45");
  document.querySelectorAll(".product-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.id === product.id);
  });
}

function renderFilters() {
  const categories = [...new Set(products.map((product) => product.category))].sort((a, b) => a.localeCompare(b, "ko"));
  el.categoryFilters.innerHTML = "";
  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.textContent = "전체";
  allButton.className = state.category ? "" : "active";
  allButton.addEventListener("click", () => {
    state.category = "";
    render();
  });
  el.categoryFilters.append(allButton);
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = category;
    button.className = state.category === category ? "active" : "";
    button.addEventListener("click", () => {
      state.category = category;
      render();
    });
    el.categoryFilters.append(button);
  });

  const sweeteners = Object.keys(getSweetenerCounts()).sort((a, b) => a.localeCompare(b, "ko"));
  el.sweetenerFilter.innerHTML = '<option value="">전체 감미료</option>';
  sweeteners.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    el.sweetenerFilter.append(option);
  });
  el.sweetenerFilter.value = state.sweetener;
}

function renderList() {
  const result = getFilteredProducts();
  el.resultCount.textContent = `${result.length}개`;
  el.productList.innerHTML = "";
  if (!result.length) {
    const closest = closestProduct(state.search);
    el.productList.innerHTML = '<div class="product-item"><strong>검색 결과가 없습니다</strong><span>필터를 바꾸거나 추천 제품을 선택해보세요.</span></div>';
    el.suggestion.innerHTML = closest ? `가장 유사한 제품: <button type="button">${closest.name}</button>` : "";
    el.suggestion.querySelector("button")?.addEventListener("click", () => {
      el.productSearch.value = closest.name;
      state.search = closest.name;
      selectProduct(closest);
      render();
    });
    return;
  }

  el.suggestion.textContent = "";
  result.slice(0, 80).forEach((product) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `product-item${state.selected?.id === product.id ? " active" : ""}`;
    button.dataset.id = product.id;
    button.innerHTML = `<strong>${product.name}</strong><span>${product.category} · ${product.calories} kcal · 당류 ${product.sugar} g</span>`;
    button.addEventListener("click", () => selectProduct(product));
    el.productList.append(button);
  });

  if (!result.some((product) => product.id === state.selected?.id)) {
    selectProduct(result[0]);
  }
}

function renderSweetenerInfo() {
  const term = normalize(el.sweetenerSearch.value);
  const infos = sweetenerInfos.filter((info) => !term || normalize(info.name).includes(term));
  el.sweetenerInfo.innerHTML = "";
  infos.forEach((info) => {
    const item = document.createElement("article");
    item.className = "info-item";
    item.innerHTML = `<strong>${info.name}</strong><p class="good">장점: ${info.good}</p><p class="risk">주의점: ${info.risk}</p>`;
    el.sweetenerInfo.append(item);
  });
}

function renderOverviewCharts() {
  const categoryEntries = Object.entries(countBy(products, (product) => product.category)).sort((a, b) => b[1] - a[1]);
  const sweetenerEntries = Object.entries(getSweetenerCounts()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  drawHorizontalChart(document.querySelector("#categoryChart"), categoryEntries, "#2f7d57");
  drawHorizontalChart(document.querySelector("#sweetenerChart"), sweetenerEntries, "#c5922a");
}

function render() {
  renderFilters();
  renderList();
  renderSweetenerInfo();
  renderOverviewCharts();
}

function init() {
  const categoryCount = new Set(products.map((product) => product.category)).size;
  const sweetenerCount = Object.keys(getSweetenerCounts()).length;
  el.productCount.textContent = products.length.toLocaleString("ko-KR");
  el.categoryCount.textContent = categoryCount.toLocaleString("ko-KR");
  el.sweetenerCount.textContent = sweetenerCount.toLocaleString("ko-KR");

  el.productSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderList();
  });
  el.clearSearch.addEventListener("click", () => {
    el.productSearch.value = "";
    state.search = "";
    renderList();
  });
  el.sweetenerFilter.addEventListener("change", (event) => {
    state.sweetener = event.target.value;
    renderList();
  });
  el.sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.sort = button.dataset.sort;
      el.sortButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderList();
    });
  });
  el.sweetenerSearch.addEventListener("input", renderSweetenerInfo);
  window.addEventListener("resize", () => {
    selectProduct(state.selected);
    renderOverviewCharts();
  });

  render();
  selectProduct(state.selected);
}

init();
