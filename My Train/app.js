// متغيرات حالة التطبيق المحدثة
let currentStartStation = "";
let currentEndStation = "";
let selectedTrainId = null;
let activeStationId = "shebeen_qanater"; // المحطة الافتراضية
let activeTimeFilter = "all"; // all, morning, afternoon, evening
let favorites = [];

// متغيرات المنبه (Alarm variables)
let activeAlarmTimeout = null;
let alarmTrainId = null;
let alarmTimeStr = null;
let alarmAudioContext = null;
let alarmIntervalId = null;

// عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initStationsDropdowns();
  loadFavorites();
  initStationBoard();
  initMobileTabs();
  setupEventListeners();
  
  // تحديث تلقائي للمواعيد والساعة كل دقيقة
  setInterval(updateLiveTimes, 60000);
  updateHeaderClock();
});

// ==================== 1. إدارة المظهر (Theme Management) ====================
function initTheme() {
  let savedTheme = "light";
  try {
    savedTheme = localStorage.getItem("theme") || "light";
  } catch (e) {
    console.warn("localStorage not accessible:", e);
  }
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  try {
    localStorage.setItem("theme", newTheme);
  } catch (e) {
    console.warn("localStorage not accessible:", e);
  }
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const iconPath = document.getElementById("theme-icon-path");
  if (iconPath) {
    if (theme === "dark") {
      iconPath.setAttribute("d", "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z");
    } else {
      iconPath.setAttribute("d", "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z");
    }
  }
}

// ==================== 2. تهيئة تبويبات الموبايل (Mobile Tabs) ====================
function initMobileTabs() {
  const tabButtons = document.querySelectorAll(".mobile-nav-item");
  const panels = document.querySelectorAll(".tab-panel");
  
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const targetPanelId = btn.dataset.tab;
      
      panels.forEach(panel => {
        if (panel.id === targetPanelId) {
          panel.classList.add("active");
        } else {
          panel.classList.remove("active");
        }
      });
      
      if (targetPanelId === "favorites-section") {
        renderFavoritesMobile();
      }
    });
  });
}

// ==================== 3. تهيئة القوائم المنسدلة ومستمعي الأحداث ====================
function initStationsDropdowns() {
  const startSelect = document.getElementById("start-station");
  const endSelect = document.getElementById("end-station");

  if (!startSelect || !endSelect) return;

  startSelect.innerHTML = '<option value="" disabled>اختر محطة المغادرة...</option>';
  endSelect.innerHTML = '<option value="" disabled selected>اختر محطة الوصول...</option>';

  if (typeof STATIONS !== 'undefined') {
    STATIONS.forEach(station => {
      const optStart = document.createElement("option");
      optStart.value = station.name;
      optStart.textContent = station.name;
      startSelect.appendChild(optStart);

      const optEnd = document.createElement("option");
      optEnd.value = station.name;
      optEnd.textContent = station.name;
      endSelect.appendChild(optEnd);
    });
  }

  const defaultStation = "أبو زعبل البلد";
  startSelect.value = defaultStation;
  currentStartStation = defaultStation;
}

function setupEventListeners() {
  const startStationEl = document.getElementById("start-station");
  const endStationEl = document.getElementById("end-station");
  const swapBtn = document.getElementById("swap-stations-btn");
  const upcomingCheckbox = document.getElementById("upcoming-only-checkbox");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const stationSearch = document.getElementById("station-search");
  const saveRouteBtn = document.getElementById("save-route-btn");
  const topBtn = document.getElementById("back-to-top-btn");

  if (startStationEl) {
    startStationEl.addEventListener("change", (e) => {
      currentStartStation = e.target.value;
      onSearchCriteriaChanged();
    });
  }
  
  if (endStationEl) {
    endStationEl.addEventListener("change", (e) => {
      currentEndStation = e.target.value;
      onSearchCriteriaChanged();
    });
  }
  
  if (swapBtn) {
    swapBtn.addEventListener("click", () => {
      if (currentStartStation || currentEndStation) {
        const temp = currentStartStation;
        currentStartStation = currentEndStation;
        currentEndStation = temp;
        
        if (startStationEl) startStationEl.value = currentStartStation || "";
        if (endStationEl) endStationEl.value = currentEndStation || "";
        
        onSearchCriteriaChanged();
      }
    });
  }

  if (upcomingCheckbox) {
    upcomingCheckbox.addEventListener("change", () => {
      renderSearchResults();
    });
  }

  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterButtons.forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      activeTimeFilter = e.target.dataset.filter;
      renderSearchResults();
    });
  });

  if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);

  if (stationSearch) {
    stationSearch.addEventListener("input", (e) => {
      filterStationsList(e.target.value);
    });
  }

  if (saveRouteBtn) saveRouteBtn.addEventListener("click", toggleFavoriteRoute);

  if (topBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        topBtn.classList.add("show");
      } else {
        topBtn.classList.remove("show");
      }
    });
    topBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const cancelAlarmBtn = document.getElementById("cancel-alarm-btn");
  const confirmAlarmBtn = document.getElementById("confirm-alarm-btn");
  const stopAlarmBtn = document.getElementById("stop-alarm-btn");

  if (cancelAlarmBtn) cancelAlarmBtn.addEventListener("click", closeAlarmModal);
  if (confirmAlarmBtn) confirmAlarmBtn.addEventListener("click", setAlarmTime);
  if (stopAlarmBtn) stopAlarmBtn.addEventListener("click", stopAlarmRing);
}

// ==================== 4. منطق البحث والنتائج وتصفية المواعيد القادمة ====================
function onSearchCriteriaChanged() {
  const saveBtn = document.getElementById("save-route-btn");
  
  if (currentStartStation && currentEndStation) {
    if (currentStartStation === currentEndStation) {
      alert("عذراً، لا يمكن اختيار نفس المحطة للمغادرة والوصول.");
      currentEndStation = "";
      const endStationEl = document.getElementById("end-station");
      if (endStationEl) endStationEl.value = "";
      if (saveBtn) saveBtn.style.display = "none";
      return;
    }
    
    if (saveBtn) {
      saveBtn.style.display = "flex";
      updateSaveButtonState();
    }
    renderSearchResults();
  } else {
    if (saveBtn) saveBtn.style.display = "none";
  }
}

function getAvailableTrips(ignoreUpcoming = false) {
  if (!currentStartStation || !currentEndStation) return [];
  
  const results = [];
  const currentTime = getCurrentLocalTimeString();
  const upcomingCheckbox = document.getElementById("upcoming-only-checkbox");
  const showUpcomingOnly = ignoreUpcoming ? false : (upcomingCheckbox ? upcomingCheckbox.checked : false);
  
  if (typeof TRAINS === 'undefined' || typeof DIRECTIONS === 'undefined') return [];

  TRAINS.forEach(train => {
    if (!train.direction || !train.times) return;
    
    const dirKey = train.direction.toLowerCase();
    const dir = DIRECTIONS[dirKey] || DIRECTIONS[train.direction.toUpperCase()] || DIRECTIONS["to_shebeen"] || DIRECTIONS["TO_SHEBEEN"];
    
    if (!dir || !dir.stationOrder) return;

    // دعم مرن ومزدوج للبحث بالاسم أو بالـ ID لضمان التوافق مع بنية ملف السير
    let startIndex = dir.stationOrder.indexOf(currentStartStation);
    if (startIndex === -1 && typeof STATIONS !== 'undefined') {
      const startObj = STATIONS.find(s => s.name === currentStartStation);
      if (startObj) startIndex = dir.stationOrder.indexOf(startObj.id);
    }
    
    let endIndex = dir.stationOrder.indexOf(currentEndStation);
    if (endIndex === -1 && typeof STATIONS !== 'undefined') {
      const endObj = STATIONS.find(s => s.name === currentEndStation);
      if (endObj) endIndex = dir.stationOrder.indexOf(endObj.id);
    }
    
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      const depTime = train.times[startIndex];
      const arrTime = train.times[endIndex];
      
      if (!depTime || !arrTime) return;
      
      const durationMin = calculateDuration(depTime, arrTime);
      
      const tripItem = {
        trainId: train.id,
        direction: train.direction,
        depTime: depTime,
        arrTime: arrTime,
        duration: durationMin,
        startIndex: startIndex,
        endIndex: endIndex,
        fullTimes: train.times,
        stationOrder: dir.stationOrder
      };
      
      if (showUpcomingOnly) {
        const isPastDepTime = compareTimes(depTime, currentTime) < 0;
        if (!isPastDepTime) {
          results.push(tripItem);
        }
      } else {
        results.push(tripItem);
      }
    }
  });
  
  return results.sort((a, b) => compareTimes(a.depTime, b.depTime));
}

function renderSearchResults() {
  const container = document.getElementById("search-results-container");
  const viewTitle = document.getElementById("results-view-title");
  
  if (!container) return;
  
  if (!currentStartStation || !currentEndStation) {
    if (viewTitle) viewTitle.textContent = "ابحث عن رحلتك";
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="background-color: var(--primary-glow); color: var(--primary-color);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 10l5 5-5 5M4 4v7a4 4 0 0 0 4 4h12"/></svg>
        </div>
        <div class="empty-text">
          <h3>خطط رحلتك الآن</h3>
          <p>اختر محطة المغادرة ومحطة الوصول لعرض جميع الرحلات وجداول المواعيد المتاحة حالياً.</p>
        </div>
      </div>
    `;
    return;
  }
  
  if (viewTitle) viewTitle.textContent = `رحلات من ${currentStartStation} إلى ${currentEndStation}`;
  
  const currentTime = getCurrentLocalTimeString();
  const upcomingCheckbox = document.getElementById("upcoming-only-checkbox");
  const isUpcomingFiltered = upcomingCheckbox ? upcomingCheckbox.checked : false;
  
  let trips = getAvailableTrips();
  let showFallbackBanner = false;
  
  if (trips.length === 0 && isUpcomingFiltered) {
    trips = getAvailableTrips(true);
    if (trips.length > 0) {
      showFallbackBanner = true;
    }
  }
  
  if (activeTimeFilter !== "all") {
    trips = trips.filter(trip => {
      const hour = parseInt(trip.depTime.split(":")[0]);
      if (activeTimeFilter === "morning") return hour < 12;
      if (activeTimeFilter === "afternoon") return hour >= 12 && hour < 17;
      if (activeTimeFilter === "evening") return hour >= 17;
      return true;
    });
  }
  
  if (trips.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="background-color: var(--accent-glow); color: var(--accent-color);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <div class="empty-text">
          <h3>لا توجد قطارات متاحة حالياً</h3>
          <p>${isUpcomingFiltered ? 'انتهت جميع قطارات هذا المسار اليوم. يمكنك إلغاء تحديد "عرض المواعيد القادمة فقط" لمشاهدة الجدول الكامل.' : 'لا توجد قطارات تطابق فلتر الفرز الحالي.'}</p>
        </div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = "";
  
  if (showFallbackBanner) {
    const banner = document.createElement("div");
    banner.className = "fallback-warning-banner";
    banner.innerHTML = `
      <div class="fallback-warning-icon">⚠️</div>
      <div class="fallback-warning-text">
        <strong>انتهت رحلات هذا اليوم المتبقية.</strong> تم عرض الجدول الكامل للرحلات السابقة لليوم أدناه لتتمكن من تصفح المواعيد.
      </div>
    `;
    container.appendChild(banner);
  }
  
  const grid = document.createElement("div");
  grid.className = "schedule-grid";
  
  trips.forEach(trip => {
    const isPast = compareTimes(trip.depTime, currentTime) < 0;
    const card = document.createElement("div");
    card.className = `schedule-card ${selectedTrainId === trip.trainId ? 'selected' : ''} ${isPast ? 'past-trip' : ''}`;
    card.dataset.trainId = trip.trainId;
    
    const { text: countdownText, isImminent, isStarted } = getCountdownText(trip.depTime, trip.arrTime);
    const isLive = isTrainLive(trip.depTime, trip.arrTime);
    const formattedDuration = formatDuration(trip.duration);
    
    const stationCount = Math.abs(trip.endIndex - trip.startIndex);
    const ticketPrice = calculateTicketPrice(stationCount);
    
    const firstStationName = trip.stationOrder[0];
    const lastStationName = trip.stationOrder[trip.stationOrder.length - 1];
 
    card.innerHTML = `
      <div class="card-header-info">
        <span class="train-number-badge">قطار رقم ${trip.trainId}</span>
        ${isLive ? `
          <div class="live-train-indicator">
            <span class="pulse-dot"></span>
            <span>يتحرك الآن</span>
          </div>
        ` : ''}
      </div>
      
      <div class="route-trip-visual">
        <div class="visual-node start">
          <span class="node-time">${formatTo12Hour(trip.depTime)}</span>
          <span class="node-station">${currentStartStation}</span>
        </div>
        
        <div class="visual-line-container">
          <span class="duration-label">${formattedDuration}</span>
          <div class="visual-line"></div>
        </div>
        
        <div class="visual-node end">
          <span class="node-time">${formatTo12Hour(trip.arrTime)}</span>
          <span class="node-station">${currentEndStation}</span>
        </div>
      </div>
      
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span class="fare-badge">سعر التذكرة: ${ticketPrice} جنيه</span>
        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">عدد المحطات: ${stationCount}</span>
      </div>
 
      <div class="card-footer-info">
        <span style="font-size:0.75rem;">اتجاه الخط: ${firstStationName} ⇆ ${lastStationName}</span>
        <span class="countdown-timer ${isImminent ? 'imminent' : ''} ${isStarted ? 'started' : ''} ${isPast ? 'past' : ''}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline; vertical-align:middle; margin-left:4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${countdownText}
        </span>
      </div>
 
      <div class="action-row">
        <button class="action-btn-secondary share-btn" data-train-id="${trip.trainId}" data-dep="${trip.depTime}" data-arr="${trip.arrTime}" data-price="${ticketPrice}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left:4px;"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          مشاركة
        </button>
        
        ${!isPast ? `
          <button class="action-btn-secondary alarm-btn" data-train-id="${trip.trainId}" data-time="${trip.depTime}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left:4px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            منبه
          </button>
        ` : ''}
      </div>
    `;
    
    card.addEventListener("click", (e) => {
      if (e.target.closest(".action-btn-secondary")) return;
      
      selectTrain(trip);
      document.querySelectorAll(".schedule-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      
      const timelineWrapper = document.getElementById("timeline-panel-wrapper");
      if (window.innerWidth <= 992 && timelineWrapper) {
        timelineWrapper.scrollIntoView({ behavior: "smooth" });
      }
    });
    
    grid.appendChild(card);
  });
  
  container.appendChild(grid);
  setupDynamicActionListeners();

  if (selectedTrainId) {
    const activeTrip = trips.find(t => t.trainId === selectedTrainId);
    if (activeTrip) {
      renderTrainTimeline(activeTrip);
    }
  }
}

// ==================== 5. ميزات المشاركة والمنبه (Dynamic Actions) ====================
function setupDynamicActionListeners() {
  document.querySelectorAll(".share-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      shareTripDetails(btn.dataset.trainId, btn.dataset.dep, btn.dataset.arr, btn.dataset.price);
    });
  });

  document.querySelectorAll(".alarm-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openAlarmModal(btn.dataset.trainId, btn.dataset.time);
    });
  });
}

function shareTripDetails(trainId, depTime, arrTime, ticketPrice) {
  const message = `🚂 *دليل قطارات القليوبية* 🚂\n\nرحلة قطار من *${currentStartStation}* إلى *${currentEndStation}*\n- 🔢 قطار رقم: *${trainId}*\n- 🛫 موعد المغادرة: *${formatTo12Hour(depTime)}*\n- 🛬 موعد الوصول: *${formatTo12Hour(arrTime)}*\n- 💰 سعر التذكرة: *${ticketPrice} جنيه*\n\nتمنياتنا لكم برحلة سعيدة! 🌹`;
  
  if (navigator.share) {
    navigator.share({ title: 'مشاركة الرحلة', text: message }).catch(() => copyShareToClipboard(message));
  } else {
    copyShareToClipboard(message);
  }
}

function copyShareToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert("تم نسخ تفاصيل الرحلة بنجاح!");
  }).catch(() => {
    alert(text);
  });
}

function openAlarmModal(trainId, timeStr) {
  alarmTrainId = trainId;
  alarmTimeStr = timeStr;
  const modal = document.getElementById("alarm-modal");
  if (modal) modal.classList.add("show");
}

function closeAlarmModal() {
  const modal = document.getElementById("alarm-modal");
  if (modal) modal.classList.remove("show");
}

function setAlarmTime() {
  const leadInput = document.getElementById("alarm-lead-time");
  const leadMinutes = leadInput ? parseInt(leadInput.value) : 10;
  const currentTime = getCurrentLocalTimeString();
  
  const [trainH, trainM] = alarmTimeStr.split(":").map(Number);
  let targetTotalMin = trainH * 60 + trainM - leadMinutes;
  
  const [currH, currM] = currentTime.split(":").map(Number);
  const currTotalMin = currH * 60 + currM;
  
  if (targetTotalMin <= currTotalMin) {
    alert(`موعد التنبيه قد مر بالفعل. سيتم تنبيهك بعد 5 ثوانٍ كإشعار فوري.`);
    if (activeAlarmTimeout) clearTimeout(activeAlarmTimeout);
    activeAlarmTimeout = setTimeout(() => { triggerAlarmRing(alarmTrainId, alarmTimeStr); }, 5000);
    closeAlarmModal();
    return;
  }
  
  const delayMs = (targetTotalMin - currTotalMin) * 60 * 1000;
  if (activeAlarmTimeout) clearTimeout(activeAlarmTimeout);
  
  activeAlarmTimeout = setTimeout(() => { triggerAlarmRing(alarmTrainId, alarmTimeStr); }, delayMs);
  
  const targetH = String(Math.floor(targetTotalMin / 60)).padStart(2, '0');
  const targetM = String(targetTotalMin % 60).padStart(2, '0');
  
  alert(`🔔 تم ضبط المنبه الساعة ${formatTo12Hour(`${targetH}:${targetM}`)}.`);
  closeAlarmModal();
}

function triggerAlarmRing(trainId, timeStr) {
  const ringText = `انتبه! قطار رقم ${trainId} سوف يغادر في تمام الساعة ${formatTo12Hour(timeStr)}.`;
  const textEl = document.getElementById("alarm-ring-text");
  const modal = document.getElementById("alarm-ring-modal");
  
  if (textEl) textEl.textContent = ringText;
  if (modal) modal.classList.add("show");
  playAlarmBeep();
}

// تشغيل النغمة بدون ملف خارجي عبر الويب أوديو API
function playAlarmBeep() {
  if (alarmAudioContext) return;
  try {
    alarmAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    alarmIntervalId = setInterval(() => {
      if (!alarmAudioContext) return;
      const osc = alarmAudioContext.createOscillator();
      const gain = alarmAudioContext.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, alarmAudioContext.currentTime);
      gain.gain.setValueAtTime(0.25, alarmAudioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, alarmAudioContext.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(alarmAudioContext.destination);
      osc.start();
      osc.stop(alarmAudioContext.currentTime + 0.45);
    }, 800);
  } catch(e) {}
}

function stopAlarmRing() {
  const modal = document.getElementById("alarm-ring-modal");
  if (modal) modal.classList.remove("show");
  stopAlarmBeep();
}

function stopAlarmBeep() {
  if (alarmIntervalId) { clearInterval(alarmIntervalId); alarmIntervalId = null; }
  if (alarmAudioContext) { alarmAudioContext.close(); alarmAudioContext = null; }
}

function calculateTicketPrice(stationCount) {
  if (stationCount <= 5) return 5;
  if (stationCount <= 9) return 7;
  return 10;
}

// ==================== 6. عرض خط سير القطار التفصيلي ====================
function selectTrain(trip) {
  selectedTrainId = trip.trainId;
  renderTrainTimeline(trip);
}

function renderTrainTimeline(trip) {
  const wrapper = document.getElementById("timeline-panel-wrapper");
  if (!wrapper) return;
  
  const currentTime = getCurrentLocalTimeString();
  let timelineNodesHtml = "";
  
  trip.stationOrder.forEach((stationIdOrName, idx) => {
    const stationTime = trip.fullTimes[idx];
    let nodeClass = "upcoming";
    const hasPassed = compareTimes(stationTime, currentTime) < 0;
    
    const stationObj = typeof STATIONS !== 'undefined' ? STATIONS.find(s => s.id === stationIdOrName || s.name === stationIdOrName) : null;
    const stationRealName = stationObj ? stationObj.name : stationIdOrName;

    const isStartNode = stationRealName === currentStartStation;
    const isEndNode = stationRealName === currentEndStation;
    
    if (hasPassed) nodeClass = "passed";
    
    const isCurrentLocation = checkIfTrainAtStation(trip, idx, currentTime);
    if (isCurrentLocation) nodeClass = "current";
    
    let highlightStyle = "";
    if (isStartNode) highlightStyle = "border-right: 3px solid var(--primary-light); background-color: var(--primary-glow); padding-right: 8px;";
    if (isEndNode) highlightStyle = "border-right: 3px solid var(--accent-color); background-color: var(--accent-glow); padding-right: 8px;";
    
    timelineNodesHtml += `
      <div class="timeline-station-node ${nodeClass}" style="${highlightStyle}">
        <span class="timeline-station-name">
          ${stationRealName}
          ${isStartNode ? ' <span style="font-size:0.75rem; color:var(--primary-color); font-weight:bold;">(ركوب)</span>' : ''}
          ${isEndNode ? ' <span style="font-size:0.75rem; color:var(--accent-color); font-weight:bold;">(وصول)</span>' : ''}
        </span>
        <span class="timeline-station-time">${formatTo12Hour(stationTime)}</span>
      </div>
    `;
  });
  
  const lineStartName = trip.stationOrder[0];
  const lineEndName = trip.stationOrder[trip.stationOrder.length - 1];

  wrapper.innerHTML = `
    <div class="timeline-card">
      <div class="timeline-header">
        <div class="timeline-title">
          <h3>مسار قطار رقم ${trip.trainId}</h3>
          <span>من ${lineStartName} إلى ${lineEndName}</span>
        </div>
        <span class="train-number-badge" style="background-color: var(--accent-color);">${trip.fullTimes.length} محطات</span>
      </div>
      <div class="vertical-timeline">
        ${timelineNodesHtml}
      </div>
    </div>
  `;
}

function checkIfTrainAtStation(trip, idx, currentTime) {
  const trainDepTime = trip.fullTimes[0];
  const trainArrTime = trip.fullTimes[trip.fullTimes.length - 1];
  
  if (compareTimes(currentTime, trainDepTime) < 0) return false;
  if (compareTimes(currentTime, trainArrTime) > 0) return false;
  
  const currentStationTime = trip.fullTimes[idx];
  if (currentTime === currentStationTime) return true;
  
  if (idx < trip.fullTimes.length - 1) {
    const nextStationTime = trip.fullTimes[idx + 1];
    return compareTimes(currentTime, currentStationTime) >= 0 && compareTimes(currentTime, nextStationTime) < 0;
  }
  return false;
}

// ==================== 7. لوحة استعراض المحطات والخرائط الجغرافية ====================
function initStationBoard() {
  renderStationsList();
  selectStationBoard(activeStationId);
}

function renderStationsList() {
  const listContainer = document.getElementById("stations-quick-list");
  if (!listContainer || typeof STATIONS === 'undefined') return;
  
  listContainer.innerHTML = "";
  
  STATIONS.forEach(station => {
    const details = (typeof STATION_DETAILS !== 'undefined' && STATION_DETAILS[station.id]) ? STATION_DETAILS[station.id] : { type: "فرعية" };
    let typeClass = "sub";
    let typeText = "فرعية";
    
    if (details.type === "رئيسية") { typeClass = "main"; typeText = "رئيسية"; }
    else if (details.type === "متوسطة") { typeClass = "medium"; typeText = "متوسطة"; }
    
    const div = document.createElement("div");
    div.className = `station-item ${station.id === activeStationId ? 'active' : ''}`;
    div.dataset.stationId = station.id;
    
    div.innerHTML = `
      <span>${station.name}</span>
      <span class="station-type-badge ${typeClass}">${typeText}</span>
    `;
    
    div.addEventListener("click", () => {
      document.querySelectorAll(".station-item").forEach(item => item.classList.remove("active"));
      div.classList.add("active");
      selectStationBoard(station.id);
      
      const boardWrapper = document.getElementById("station-board-details-wrapper");
      if (window.innerWidth <= 992 && boardWrapper) {
        boardWrapper.scrollIntoView({ behavior: "smooth" });
      }
    });
    
    listContainer.appendChild(div);
  });
}

function filterStationsList(query) {
  const items = document.querySelectorAll(".station-item");
  query = query.trim().toLowerCase();
  
  items.forEach(item => {
    const span = item.querySelector("span");
    if (!span) return;
    const name = span.textContent.toLowerCase();
    if (name.includes(query)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

function selectStationBoard(stationId) {
  activeStationId = stationId;
  if (typeof STATIONS === 'undefined') return;
  
  const station = STATIONS.find(s => s.id === stationId);
  const details = (typeof STATION_DETAILS !== 'undefined' && STATION_DETAILS[stationId]) ? STATION_DETAILS[stationId] : { desc: "", facilities: [], type: "فرعية" };
  const boardContainer = document.getElementById("station-board-details-wrapper");
  
  if (!station || !boardContainer) return;
  
  const currentTime = getCurrentLocalTimeString();
  const passingTrains = [];
  
  if (typeof TRAINS !== 'undefined' && typeof DIRECTIONS !== 'undefined') {
    TRAINS.forEach(train => {
      const dirKey = train.direction ? train.direction.toLowerCase() : "";
      const dir = DIRECTIONS[dirKey] || DIRECTIONS[train.direction.toUpperCase()] || DIRECTIONS["to_shebeen"] || DIRECTIONS["TO_SHEBEEN"];
      
      if (!dir || !dir.stationOrder) return;
      
      let idx = dir.stationOrder.indexOf(station.name);
      if (idx === -1) idx = dir.stationOrder.indexOf(station.id);
      
      if (idx !== -1) {
        const stopTime = train.times[idx];
        const isLastStop = idx === train.times.length - 1;
        const destIdOrName = dir.stationOrder[dir.stationOrder.length - 1];
        const destObj = STATIONS.find(s => s.id === destIdOrName || s.name === destIdOrName);
        const destination = destObj ? destObj.name : destIdOrName;
        
        passingTrains.push({
          trainId: train.id,
          direction: train.direction,
          stopTime: stopTime,
          destination: destination,
          isLastStop: isLastStop,
          fullTimes: train.times,
          stationOrder: dir.stationOrder,
          stopIndex: idx
        });
      }
    });
  }
  
  passingTrains.sort((a, b) => compareTimes(a.stopTime, b.stopTime));
  
  let trainsHtml = "";
  if (passingTrains.length === 0) {
    trainsHtml = `<p style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:12px;">لا توجد رحلات مجدولة لهذه المحطة.</p>`;
  } else {
    passingTrains.forEach(pt => {
      const isPast = compareTimes(pt.stopTime, currentTime) < 0;
      const { text: countdownText, isImminent } = getCountdownText(pt.stopTime, pt.fullTimes[pt.fullTimes.length - 1]);
      
      let badgeStyle = "background-color: var(--primary-glow); color: var(--primary-color);";
      if (pt.direction && pt.direction.toLowerCase() === "to_july") {
        badgeStyle = "background-color: var(--accent-glow); color: var(--accent-color);";
      }
      
      trainsHtml += `
        <div class="station-item" style="cursor:default; margin-bottom:6px; background-color: ${isPast ? 'rgba(0,0,0,0.02)' : 'var(--bg-tertiary)'}; opacity: ${isPast ? 0.6 : 1};">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="train-number-badge" style="font-size:0.75rem; padding:2px 6px; ${badgeStyle}">قطار ${pt.trainId}</span>
              <span style="font-size:0.85rem; font-weight:700;">إلى ${pt.destination}</span>
            </div>
            <span style="font-size:0.75rem; color:var(--text-muted);">${pt.isLastStop ? 'نهاية الخط' : 'يمر بالمحطة'}</span>
          </div>
          <div style="text-align:left; display:flex; flex-direction:column; align-items:flex-end;">
            <span style="font-size:1.1rem; font-weight:800; color:var(--text-primary);">${formatTo12Hour(pt.stopTime)}</span>
            <span style="font-size:0.75rem; font-weight:700; color:${isPast ? 'var(--text-muted)' : isImminent ? 'var(--danger-color)' : 'var(--warning-color)'}">
              ${isPast ? 'انطلق' : countdownText}
            </span>
          </div>
        </div>
      `;
    });
  }
  
  let facilitiesHtml = "";
  if (details.facilities) {
    details.facilities.forEach(fac => {
      facilitiesHtml += `<span class="facility-badge">${fac}</span>`;
    });
  }
  
  const mapLinkUrl = station.coords ? `https://www.google.com/maps?q=${station.coords.lat},${station.coords.lng}` : '#';
  
  boardContainer.innerHTML = `
    <div class="active-station-card">
      <div class="station-details-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h3>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 3v18M15 3v18M4 9h16M4 15h16"/></svg>
          محطة ${station.name}
        </h3>
        ${station.coords ? `
        <a href="${mapLinkUrl}" target="_blank" rel="noopener noreferrer" class="maps-link-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
          موقع المحطة
        </a>` : ''}
      </div>
      <p class="station-desc">${details.desc || ''}</p>
      
      <div class="station-facilities">
        ${facilitiesHtml}
      </div>
      
      <h4 class="card-title" style="font-size:1rem; margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-left:4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        جدول مغادرة المحطة اليوم
      </h4>
      <div style="max-height:350px; overflow-y:auto; padding-left:2px;">
        ${trainsHtml}
      </div>
    </div>
  `;
}

// ==================== 8. إدارة المسارات المفضلة (Favorites) ====================
function loadFavorites() {
  let stored = null;
  try {
    stored = localStorage.getItem("favorite_routes");
  } catch (e) {
    console.warn("localStorage not accessible:", e);
  }
  if (stored) { try { favorites = JSON.parse(stored); } catch(e) {} }
  renderFavorites();
  renderFavoritesMobile();
}

function renderFavorites() {
  const container = document.getElementById("fav-chips-container");
  if (!container) return;
  container.innerHTML = "";
  
  if (favorites.length === 0) {
    container.innerHTML = `<span class="no-favs">لا توجد مسارات محفوظة حالياً.</span>`;
    return;
  }
  
  favorites.forEach((fav, index) => {
    const chip = document.createElement("div");
    chip.className = "fav-chip";
    chip.innerHTML = `
      <span class="route-link">${fav.start} ⇆ ${fav.end}</span>
      <span class="remove-fav" data-index="${index}">×</span>
    `;
    chip.querySelector(".route-link").addEventListener("click", () => { loadSelectedFavorite(fav.start, fav.end); });
    chip.querySelector(".remove-fav").addEventListener("click", (e) => { e.stopPropagation(); removeFavoriteByIndex(parseInt(e.target.dataset.index)); });
    container.appendChild(chip);
  });
}

function renderFavoritesMobile() {
  const container = document.getElementById("fav-list-mobile");
  if (!container) return;
  container.innerHTML = "";
  
  if (favorites.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:24px 12px; border:none; background:none;"><p style="font-size:0.85rem; color:var(--text-muted);">لا توجد مسارات محفوظة حالياً.</p></div>`;
    return;
  }
  
  favorites.forEach((fav, index) => {
    const item = document.createElement("div");
    item.className = "fav-list-item";
    item.innerHTML = `
      <div class="route-link" style="display:flex; align-items:center; gap:8px; flex:1;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8l4 4-4 4M8 12h8"/></svg>
        <span style="font-weight:700; font-size:0.9rem;">من ${fav.start} إلى ${fav.end}</span>
      </div>
      <button class="remove-fav" data-index="${index}" style="background:none; border:none; color:var(--danger-color); font-size:1.4rem; padding: 0 8px; cursor:pointer;">×</button>
    `;
    item.querySelector(".route-link").addEventListener("click", () => {
      loadSelectedFavorite(fav.start, fav.end);
      const tripsTabBtn = document.querySelector('[data-tab="trips-section"]');
      if (tripsTabBtn) tripsTabBtn.click();
    });
    item.querySelector(".remove-fav").addEventListener("click", (e) => { e.stopPropagation(); removeFavoriteByIndex(parseInt(e.target.dataset.index)); });
    container.appendChild(item);
  });
}

function loadSelectedFavorite(start, end) {
  currentStartStation = start; currentEndStation = end;
  const startSelect = document.getElementById("start-station");
  const endSelect = document.getElementById("end-station");
  if (startSelect) startSelect.value = start;
  if (endSelect) endSelect.value = end;
  onSearchCriteriaChanged();
}

function removeFavoriteByIndex(idx) {
  favorites.splice(idx, 1);
  try {
    localStorage.setItem("favorite_routes", JSON.stringify(favorites));
  } catch (e) {
    console.warn("localStorage not accessible:", e);
  }
  loadFavorites();
  updateSaveButtonState();
}

function toggleFavoriteRoute() {
  if (!currentStartStation || !currentEndStation) return;
  const existingIdx = favorites.findIndex(f => f.start === currentStartStation && f.end === currentEndStation);
  
  if (existingIdx !== -1) { favorites.splice(existingIdx, 1); }
  else {
    if (favorites.length >= 5) { alert("يمكنك حفظ حتى 5 مسارات كحد أقصى."); return; }
    favorites.push({ start: currentStartStation, end: currentEndStation });
  }
  try {
    localStorage.setItem("favorite_routes", JSON.stringify(favorites));
  } catch (e) {
    console.warn("localStorage not accessible:", e);
  }
  loadFavorites();
  updateSaveButtonState();
}

function updateSaveButtonState() {
  const saveBtn = document.getElementById("save-route-btn");
  if (!saveBtn) return;
  const isSaved = favorites.some(f => f.start === currentStartStation && f.end === currentEndStation);
  if (isSaved) {
    saveBtn.className = "save-route-btn saved";
    saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873z"/></svg> محفوظ في المفضلة`;
  } else {
    saveBtn.className = "save-route-btn";
    saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873z"/></svg> حفظ هذا المسار`;
  }
}

// ==================== 9. دوال الوقت والمساعدين الجانبية ====================
function updateLiveTimes() {
  if (activeStationId) selectStationBoard(activeStationId);
  if (currentStartStation && currentEndStation) renderSearchResults();
  updateHeaderClock();
}

// تحديث الساعة الرقمية العلوية
function updateHeaderClock() {
  const clockEl = document.getElementById("current-time-val");
  if (clockEl) {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? "م" : "ص";
    hours = hours % 12;
    hours = hours ? hours : 12;
    clockEl.textContent = `${hours}:${minutes} ${ampm}`;
  }
}

function formatTo12Hour(time24) {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let hours = parseInt(hStr);
  const ampm = hours >= 12 ? "م" : "ص";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${mStr} ${ampm}`;
}

function getCurrentLocalTimeString() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function compareTimes(t1, t2) {
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  if (h1 !== h2) return h1 - h2;
  return m1 - m2;
}

function calculateDuration(depTime, arrTime) {
  const [depH, depM] = depTime.split(":").map(Number);
  const [arrH, arrM] = arrTime.split(":").map(Number);
  let depTotal = depH * 60 + depM;
  let arrTotal = arrH * 60 + arrM;
  if (arrTotal < depTotal) arrTotal += 24 * 60;
  return arrTotal - depTotal;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  let result = hours === 1 ? "ساعة" : hours === 2 ? "ساعتين" : hours > 2 && hours < 11 ? `${hours} ساعات` : `${hours} ساعة`;
  if (mins > 0) result += ` و ${mins} دقيقة`;
  return result;
}

function isTrainLive(depTime, arrTime) {
  const current = getCurrentLocalTimeString();
  return compareTimes(current, depTime) >= 0 && compareTimes(current, arrTime) <= 0;
}

function getCountdownText(depTime, arrTime) {
  const current = getCurrentLocalTimeString();
  
  if (compareTimes(current, depTime) > 0) {
    if (compareTimes(current, arrTime) <= 0) { return { text: "قيد التشغيل حالياً", isImminent: false, isStarted: true }; }
    else { return { text: "انطلق", isImminent: false, isStarted: false }; }
  }
  
  const [currH, currM] = current.split(":").map(Number);
  const [depH, depM] = depTime.split(":").map(Number);
  const diffMinutes = (depH * 60 + depM) - (currH * 60 + currM);
  
  if (diffMinutes <= 5) return { text: "مغادرة وشيكة (5 دقايق أو أقل!)", isImminent: true, isStarted: false };
  if (diffMinutes < 60) return { text: `متبقي ${diffMinutes} دقيقة`, isImminent: false, isStarted: false };
  
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  let hoursText = hours === 1 ? "ساعة" : hours === 2 ? "ساعتين" : hours > 2 && hours < 11 ? `${hours} ساعات` : `${hours} ساعة`;
  return { text: `متبقي ${hoursText}${mins > 0 ? ` و ${mins} دقيقة` : ""}`, isImminent: false, isStarted: false };
}



