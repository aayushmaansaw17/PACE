/**
 * PACE UI Controller & Renderers
 * Handles DOM rendering, interactive modals, toasts, form validation, and drag-and-drop.
 */

import { store } from './state.js';
import { rankTasks, PRIORITY_TIERS } from './priorityEngine.js';
import { getWeekDays, rollForwardUnfinished } from './plannerEngine.js';

// --- Toast System ---
export function showToast(message, type = "info", duration = 3500) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || iconMap.info}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --- Date & Time Formatters ---
export function formatDateTime(isoString) {
  if (!isoString) return "No deadline";
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;

  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${timeStr}`;
}

export function formatDuration(minutes) {
  if (!minutes) return "0 min";
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// Category Helper
function getCategoryBadge(category) {
  const catKey = (category || "Other").toLowerCase().replace(/\s+/g, '-');
  return `<span class="badge badge-cat-${catKey}">${category}</span>`;
}

// Priority Helper
function getPriorityBadge(tier) {
  const t = (tier || "Medium").toLowerCase();
  return `<span class="badge badge-${t}"><span class="dot"></span>${tier}</span>`;
}

// --- Render Workload Stats ---
export function renderDashboardStats() {
  const stats = store.getWorkloadStats();

  const elPending = document.getElementById("stat-pending-count");
  const elDueToday = document.getElementById("stat-today-count");
  const elOverdue = document.getElementById("stat-overdue-count");
  const elCompleted = document.getElementById("stat-completed-count");
  const elHours = document.getElementById("stat-pending-hours");
  const elCompletionRate = document.getElementById("greeting-completion-rate");
  const elStudentName = document.getElementById("greeting-student-name");
  const elCurrentDate = document.getElementById("greeting-current-date");

  if (elPending) elPending.textContent = stats.pendingCount;
  if (elDueToday) elDueToday.textContent = stats.dueToday;
  if (elOverdue) elOverdue.textContent = stats.overdue;
  if (elCompleted) elCompleted.textContent = stats.completed;
  if (elHours) elHours.textContent = `${stats.totalPendingHours}h`;
  if (elCompletionRate) elCompletionRate.textContent = `${stats.completionRate}% Done`;

  if (elStudentName) {
    const hour = new Date().getHours();
    let salutation = "Good morning";
    if (hour >= 12 && hour < 17) salutation = "Good afternoon";
    else if (hour >= 17) salutation = "Good evening";
    elStudentName.textContent = `${salutation}, ${store.settings.studentName || "Student"}`;
  }

  if (elCurrentDate) {
    elCurrentDate.textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  // Update badge counts in sidebar
  const countDashboard = document.getElementById("nav-count-dashboard");
  const countTasks = document.getElementById("nav-count-tasks");
  const countPriorities = document.getElementById("nav-count-priorities");

  if (countDashboard) countDashboard.textContent = stats.pendingCount;
  if (countTasks) countTasks.textContent = stats.total;
  if (countPriorities) countPriorities.textContent = stats.overdue > 0 ? `${stats.overdue} urgent` : stats.pendingCount;
}

// --- Render Task List (Dashboard & My Tasks Views) ---
export function renderTaskList(containerId, isCompact = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const tasks = store.getFilteredTasks();

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </div>
        <h3 class="empty-state-title">No tasks found</h3>
        <p class="empty-state-desc">
          ${store.tasks.length === 0 
            ? "Your task slate is completely clear! Click '+ Add Task' to plan your assignments, or load sample student tasks to see PACE in action."
            : "No tasks match your active filter criteria. Try adjusting or clearing your filters."}
        </p>
        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="window.PACE.openTaskModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            + Add Task
          </button>
          ${store.tasks.length === 0 
            ? `<button class="btn btn-secondary" onclick="window.PACE.loadSampleData()">Load Sample Student Tasks</button>`
            : `<button class="btn btn-secondary" onclick="window.PACE.clearFilters()">Clear Filters</button>`}
        </div>
      </div>
    `;
    return;
  }

  // If compact (Dashboard recent view), show top 5 tasks
  const displayTasks = isCompact ? tasks.slice(0, 5) : tasks;

  container.innerHTML = displayTasks.map(task => {
    const isCompleted = task.completed;
    const isOverdue = task.isOverdue && !isCompleted;
    const isDueToday = !isOverdue && !isCompleted && task.diffHours <= 24 && task.diffHours >= 0;

    let deadlineClass = "";
    if (isOverdue) deadlineClass = "overdue";
    else if (isDueToday) deadlineClass = "due-today";

    return `
      <div class="task-card ${isCompleted ? 'is-completed' : ''}" data-task-id="${task.id}">
        <div class="task-checkbox-wrap">
          <button class="task-check-btn" title="${isCompleted ? 'Mark Pending' : 'Mark Completed'}" onclick="window.PACE.toggleTask('${task.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>

        <div class="task-details">
          <div class="task-top-meta">
            ${getCategoryBadge(task.category)}
            ${getPriorityBadge(task.priorityTier)}
            <span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-muted); border: 1px solid var(--border-subtle);">
              ${task.importance} Importance
            </span>
          </div>

          <h4 class="task-title" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</h4>
          ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}

          <div class="task-bottom-meta">
            <span class="meta-item ${deadlineClass}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${isOverdue ? `⚠️ Overdue (${formatDateTime(task.deadline)})` : formatDateTime(task.deadline)}
            </span>
            <span class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Est: ${formatDuration(task.estimatedMinutes)}
            </span>
            ${task.preferredSlot ? `
              <span class="meta-item" title="Preferred Slot">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                ${escapeHtml(task.preferredSlot)}
              </span>
            ` : ''}
          </div>
        </div>

        <div class="task-actions">
          <button class="btn btn-ghost btn-sm btn-icon" title="Edit Task" onclick="window.PACE.editTask('${task.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-ghost btn-sm btn-icon" title="Delete Task" onclick="window.PACE.confirmDeleteTask('${task.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// --- Render Smart Priority Engine View ---
export function renderPriorityView() {
  const container = document.getElementById("priority-list-container");
  if (!container) return;

  const pendingTasks = store.tasks.filter(t => !t.completed);
  const ranked = rankTasks(pendingTasks, new Date());

  if (ranked.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" style="color: var(--accent-emerald);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 class="empty-state-title">No pending responsibilities!</h3>
        <p class="empty-state-desc">You're completely caught up on your academic and competitive exam tasks. Add new tasks to run the priority engine.</p>
        <button class="btn btn-primary" onclick="window.PACE.openTaskModal()">+ Add New Task</button>
      </div>
    `;
    return;
  }

  // Summary counts for priority banner
  const criticalCount = ranked.filter(t => t.priorityTier === PRIORITY_TIERS.CRITICAL).length;
  const highCount = ranked.filter(t => t.priorityTier === PRIORITY_TIERS.HIGH).length;
  const overdueCount = ranked.filter(t => t.isOverdue).length;

  const headerNotice = document.getElementById("priority-analysis-summary");
  if (headerNotice) {
    headerNotice.innerHTML = `
      <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center;">
        <span style="font-size: 0.85rem; color: var(--text-secondary);">
          Engine analyzed <strong>${ranked.length}</strong> active responsibilities:
        </span>
        ${overdueCount > 0 ? `<span class="badge badge-critical">⚠️ ${overdueCount} Overdue</span>` : ''}
        <span class="badge badge-critical">${criticalCount} Critical</span>
        <span class="badge badge-high">${highCount} High Priority</span>
        <span style="margin-left: auto; font-size: 0.75rem; color: var(--text-muted);">
          Rule-based multi-factor weighted scoring (Urgency 45% + Importance 35% + Effort 20%)
        </span>
      </div>
    `;
  }

  container.innerHTML = ranked.map((task, index) => {
    const factors = task.factors || {};
    const rankNum = index + 1;
    const isOverdue = task.isOverdue;

    return `
      <div class="task-card" style="border-left: 4px solid ${
        task.priorityTier === 'Critical' ? '#f43f5e' :
        task.priorityTier === 'High' ? '#f59e0b' :
        task.priorityTier === 'Medium' ? '#6366f1' : '#6b7280'
      };">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div class="priority-rank-badge" title="Priority Rank #${rankNum}">#${rankNum}</div>
          <button class="task-check-btn" title="Mark Completed" onclick="window.PACE.toggleTask('${task.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>

        <div class="task-details">
          <div class="task-top-meta">
            ${getPriorityBadge(task.priorityTier)}
            ${getCategoryBadge(task.category)}
            <span class="priority-score-badge" style="background: rgba(255,255,255,0.06); color: var(--accent-cyan);">
              Score: ${task.priorityScore}/100
            </span>
            ${isOverdue ? `<span class="badge badge-critical">⚠️ OVERDUE</span>` : ''}
          </div>

          <h4 class="task-title">${escapeHtml(task.title)}</h4>
          ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}

          <!-- Transparent Rule Explanation -->
          <div class="priority-explanation-box">
            <strong>Why this priority?</strong><br>
            ${escapeHtml(task.priorityExplanation)}
          </div>

          <!-- Mathematical Factor Breakdown -->
          <div class="priority-factors-meter">
            <div class="factor-chip" title="Deadline Urgency Score (Max 45)">
              <span>Urgency:</span> <strong>${factors.urgencyScore || 0}/45</strong>
              <small>(${factors.urgencyLabel || ''})</small>
            </div>
            <div class="factor-chip" title="Academic Importance Score (Max 35)">
              <span>Importance:</span> <strong>${factors.importanceScore || 0}/35</strong>
              <small>(${task.importance})</small>
            </div>
            <div class="factor-chip" title="Effort Pressure (Max 20)">
              <span>Effort Pressure:</span> <strong>${factors.effortScore || 0}/20</strong>
              <small>(${formatDuration(task.estimatedMinutes)})</small>
            </div>
          </div>
        </div>

        <div class="task-actions" style="flex-direction: column; align-items: flex-end; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="window.PACE.scheduleTaskForToday('${task.id}')" title="Schedule for Today">
            Plan for Today
          </button>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-ghost btn-sm btn-icon" title="Edit" onclick="window.PACE.editTask('${task.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" title="Delete" onclick="window.PACE.confirmDeleteTask('${task.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// --- Render Adaptive Weekly Planner View ---
export function renderPlannerView() {
  const gridContainer = document.getElementById("planner-grid-container");
  const banner = document.getElementById("planner-warning-banner");
  const statWorkload = document.getElementById("planner-stat-workload");
  const statCapacity = document.getElementById("planner-stat-capacity");
  const statBalance = document.getElementById("planner-stat-balance");

  if (!gridContainer) return;

  // If no plan generated yet, automatically generate an initial plan
  if (!store.weeklyPlan) {
    store.generatePlan();
  }

  const plan = store.weeklyPlan;
  if (!plan || !plan.schedule) return;

  // Workload Warning Banner
  if (banner) {
    if (plan.isOverloaded) {
      banner.classList.add("visible");
      banner.innerHTML = `
        <svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div class="warning-content">
          <h4 class="warning-title">Workload Exceeds Available Time</h4>
          <p class="warning-text">
            Your pending responsibilities require <strong>${plan.totalWorkloadHours} hours</strong>, which exceeds your weekly study budget of <strong>${plan.totalWeeklyCapacityHours} hours</strong> (by ~${plan.deficitHours} hrs). 
            Consider postponing lower-priority tasks (e.g. ${plan.suggestedPostponements.map(t => `<em>"${escapeHtml(t.title)}"</em>`).join(", ") || "Low Priority items"}) or extending weekend study capacity in Settings.
          </p>
        </div>
      `;
    } else {
      banner.classList.remove("visible");
    }
  }

  // Update Summary Pills
  if (statWorkload) statWorkload.textContent = `${plan.totalWorkloadHours} hrs`;
  if (statCapacity) statCapacity.textContent = `${plan.totalWeeklyCapacityHours} hrs`;
  if (statBalance) {
    const diff = plan.totalWeeklyCapacityHours - plan.totalWorkloadHours;
    statBalance.textContent = diff >= 0 ? `+${diff.toFixed(1)} hrs free` : `-${Math.abs(diff).toFixed(1)} hrs deficit`;
    statBalance.style.color = diff >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)";
  }

  // Render 7-Day Grid
  gridContainer.innerHTML = plan.schedule.map(day => {
    const isExceeded = day.allocatedHours > day.capacityHours;
    const fillPercent = Math.min(100, Math.round((day.allocatedHours / day.capacityHours) * 100));

    let fillStatusClass = "optimal";
    if (fillPercent >= 100) fillStatusClass = isExceeded ? "exceeded" : "warning";
    else if (fillPercent >= 75) fillStatusClass = "warning";

    return `
      <div class="planner-day-col ${day.isToday ? 'is-today' : ''}" data-day-date="${day.dateStr}">
        <div class="day-header">
          <div class="day-title-row">
            <div>
              <span class="day-name">${day.dayName}</span>
              <span class="day-date">${day.fullDateText}</span>
            </div>
            ${day.isToday ? `<span class="day-today-tag">TODAY</span>` : ''}
          </div>

          <div class="capacity-meter-wrap">
            <div class="capacity-info">
              <span class="capacity-label">${day.tasks.length} task${day.tasks.length === 1 ? '' : 's'}</span>
              <span class="capacity-ratio" style="color: ${isExceeded ? 'var(--accent-rose)' : 'inherit'};">
                ${day.allocatedHours}h / ${day.capacityHours}h
              </span>
            </div>
            <div class="capacity-bar">
              <div class="capacity-fill ${fillStatusClass}" style="width: ${fillPercent}%;"></div>
            </div>
          </div>
        </div>

        <div class="day-tasks-dropzone" 
             ondragover="window.PACE.handleDragOver(event)" 
             ondragleave="window.PACE.handleDragLeave(event)" 
             ondrop="window.PACE.handleDrop(event, '${day.dateStr}')">
          
          ${day.tasks.length === 0 ? `
            <div style="text-align: center; color: var(--text-muted); font-size: 0.75rem; padding: 2rem 0.5rem;">
              No tasks scheduled
            </div>
          ` : day.tasks.map(t => {
            return `
              <div class="planner-task-card ${t.completed ? 'is-completed' : ''}" 
                   draggable="true" 
                   ondragstart="window.PACE.handleDragStart(event, '${t.id}')">
                
                <div class="card-top">
                  <span class="card-title">${escapeHtml(t.title)}</span>
                  <span class="card-time-badge">${formatDuration(t.estimatedMinutes)}</span>
                </div>

                <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
                  ${getPriorityBadge(t.priorityTier || 'Medium')}
                  ${getCategoryBadge(t.category)}
                </div>

                <div class="card-footer">
                  <button class="btn btn-ghost btn-sm" style="padding: 0.15rem 0.4rem; font-size: 0.72rem;" onclick="window.PACE.toggleTask('${t.id}')">
                    ${t.completed ? '✓ Completed' : '○ Mark Done'}
                  </button>

                  <select class="card-move-select" onchange="window.PACE.moveTaskToDay('${t.id}', this.value)" title="Move to Day">
                    <option value="" disabled selected>Move to...</option>
                    ${plan.schedule.map(d => `
                      <option value="${d.dateStr}" ${d.dateStr === day.dateStr ? 'disabled' : ''}>
                        ${d.dayName} (${d.fullDateText})
                      </option>
                    `).join("")}
                  </select>
                </div>
              </div>
            `;
          }).join("")}

        </div>
      </div>
    `;
  }).join("");
}

// --- Render Settings Form ---
export function renderSettingsView() {
  const nameInput = document.getElementById("setting-student-name");
  const examInput = document.getElementById("setting-target-exam");
  const weekdayInput = document.getElementById("setting-weekday-hours");
  const weekendInput = document.getElementById("setting-weekend-hours");

  if (nameInput) nameInput.value = store.settings.studentName || "";
  if (examInput) examInput.value = store.settings.targetExam || "";
  if (weekdayInput) weekdayInput.value = store.settings.weekdayStudyHours || 3.5;
  if (weekendInput) weekendInput.value = store.settings.weekendStudyHours || 6.0;

  // Update profile snippet on sidebar
  const userAvatar = document.querySelector(".user-avatar");
  const userName = document.querySelector(".user-name");
  const userTarget = document.querySelector(".user-target");

  if (userAvatar) {
    const initial = (store.settings.studentName || "S").trim().charAt(0).toUpperCase();
    userAvatar.textContent = initial;
  }
  if (userName) userName.textContent = store.settings.studentName || "Student";
  if (userTarget) userTarget.textContent = store.settings.targetExam || "Student";
}

// --- Modal Controllers ---
let activeEditingTaskId = null;
let taskToDeleteId = null;

export function openTaskModal(taskIdToEdit = null) {
  const modal = document.getElementById("task-modal");
  const form = document.getElementById("task-form");
  const title = document.getElementById("task-modal-title");
  const errorEl = document.getElementById("task-form-error");

  if (!modal || !form) return;

  activeEditingTaskId = taskIdToEdit;
  errorEl.classList.remove("visible");
  form.reset();

  if (taskIdToEdit) {
    const task = store.tasks.find(t => t.id === taskIdToEdit);
    if (!task) return;

    title.textContent = "Edit Task";
    document.getElementById("task-input-title").value = task.title || "";
    document.getElementById("task-input-desc").value = task.description || "";
    document.getElementById("task-input-category").value = task.category || "School";
    document.getElementById("task-input-deadline").value = task.deadline || "";
    
    // Set importance radio
    const impRadio = form.querySelector(`input[name="importance"][value="${task.importance || 'Medium'}"]`);
    if (impRadio) impRadio.checked = true;

    document.getElementById("task-input-duration").value = task.estimatedMinutes || 60;
    document.getElementById("task-input-slot").value = task.preferredSlot || "";
  } else {
    title.textContent = "Add New Task";
    // Set default deadline to tomorrow 6:00 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    document.getElementById("task-input-deadline").value = tomorrow.toISOString().slice(0, 16);
    document.getElementById("task-input-duration").value = 60;
    
    const defaultImp = form.querySelector(`input[name="importance"][value="Medium"]`);
    if (defaultImp) defaultImp.checked = true;
  }

  modal.classList.add("active");
}

export function closeTaskModal() {
  const modal = document.getElementById("task-modal");
  if (modal) modal.classList.remove("active");
  activeEditingTaskId = null;
}

export function openDeleteConfirmModal(taskId) {
  taskToDeleteId = taskId;
  const task = store.tasks.find(t => t.id === taskId);
  const modal = document.getElementById("delete-modal");
  const desc = document.getElementById("delete-task-name");

  if (desc && task) desc.textContent = `"${task.title}"`;
  if (modal) modal.classList.add("active");
}

export function closeDeleteConfirmModal() {
  const modal = document.getElementById("delete-modal");
  if (modal) modal.classList.remove("active");
  taskToDeleteId = null;
}

export function confirmDeleteExecution() {
  if (taskToDeleteId) {
    const success = store.deleteTask(taskToDeleteId);
    if (success) {
      showToast("Task deleted successfully", "info");
    }
    closeDeleteConfirmModal();
  }
}

// Form Submission Handler
export function handleTaskFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById("task-form-error");

  const title = document.getElementById("task-input-title").value.trim();
  const description = document.getElementById("task-input-desc").value.trim();
  const category = document.getElementById("task-input-category").value;
  const deadline = document.getElementById("task-input-deadline").value;
  const importance = form.querySelector('input[name="importance"]:checked')?.value || "Medium";
  const duration = parseInt(document.getElementById("task-input-duration").value, 10);
  const preferredSlot = document.getElementById("task-input-slot").value.trim();

  // Validation
  if (!title) {
    errorEl.textContent = "Task title is required.";
    errorEl.classList.add("visible");
    return;
  }
  if (!deadline) {
    errorEl.textContent = "Please select a valid deadline date and time.";
    errorEl.classList.add("visible");
    return;
  }
  if (isNaN(duration) || duration <= 0) {
    errorEl.textContent = "Estimated duration must be at least 5 minutes.";
    errorEl.classList.add("visible");
    return;
  }

  const taskPayload = {
    title,
    description,
    category,
    deadline,
    importance,
    estimatedMinutes: duration,
    preferredSlot
  };

  if (activeEditingTaskId) {
    store.updateTask(activeEditingTaskId, taskPayload);
    showToast("Task updated successfully", "success");
  } else {
    store.addTask(taskPayload);
    showToast("Task added successfully", "success");
  }

  closeTaskModal();
}

// Utility: Escape HTML strings to prevent XSS
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
