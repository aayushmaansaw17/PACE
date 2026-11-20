/**
 * PACE Application Coordinator & Entrypoint
 * Wire up routing, global event handlers, drag-and-drop, and UI actions.
 */

import { store } from './state.js';
import { 
  renderDashboardStats, 
  renderTaskList, 
  renderPriorityView, 
  renderPlannerView, 
  renderSettingsView,
  openTaskModal,
  closeTaskModal,
  openDeleteConfirmModal,
  closeDeleteConfirmModal,
  confirmDeleteExecution,
  handleTaskFormSubmit,
  showToast
} from './ui.js';

let activeView = "dashboard"; // "dashboard", "tasks", "priorities", "planner", "settings"
let draggedTaskId = null;

// Switch View Function
function switchView(viewName) {
  activeView = viewName;

  // Update navigation styling
  document.querySelectorAll(".nav-item").forEach(item => {
    if (item.dataset.view === viewName) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Switch panels
  document.querySelectorAll(".view-panel").forEach(panel => {
    panel.classList.remove("active");
  });

  const targetPanel = document.getElementById(`view-${viewName}`);
  if (targetPanel) {
    targetPanel.classList.add("active");
  }

  // Update Page Header Title
  const titleMap = {
    dashboard: { title: "Overview", sub: "Personal academic dashboard and active commitments" },
    tasks: { title: "My Tasks", sub: "All school, competitive exam and personal responsibilities" },
    priorities: { title: "Priority Engine", sub: "Explainable multi-factor priority recommendations" },
    planner: { title: "Weekly Planner", sub: "Realistic workload scheduling and capacity balancing" },
    settings: { title: "Settings", sub: "Personalize your study capacities and preferences" }
  };

  const info = titleMap[viewName] || titleMap.dashboard;
  const pageTitle = document.getElementById("page-title-text");
  const pageSub = document.getElementById("page-subtitle-text");
  if (pageTitle) pageTitle.textContent = info.title;
  if (pageSub) pageSub.textContent = info.sub;

  // Close mobile sidebar if open
  document.querySelector(".app-sidebar")?.classList.remove("open");

  // Re-render target view
  renderCurrentView();
}

function renderCurrentView() {
  renderDashboardStats();

  if (activeView === "dashboard") {
    renderTaskList("dashboard-recent-tasks", true);
  } else if (activeView === "tasks") {
    renderTaskList("all-tasks-container", false);
  } else if (activeView === "priorities") {
    renderPriorityView();
  } else if (activeView === "planner") {
    renderPlannerView();
  } else if (activeView === "settings") {
    renderSettingsView();
  }
}

// Global Event Listeners Setup
function setupEventListeners() {
  // Navigation Clicks
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const view = item.dataset.view;
      if (view) switchView(view);
    });
  });

  // Mobile menu toggle
  const mobileToggle = document.getElementById("mobile-menu-toggle");
  const sidebar = document.querySelector(".app-sidebar");
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // Task Form Submit
  const taskForm = document.getElementById("task-form");
  if (taskForm) {
    taskForm.addEventListener("submit", handleTaskFormSubmit);
  }

  // Task Search Input
  const searchInput = document.getElementById("task-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      store.setFilter({ searchQuery: e.target.value.trim() });
    });
  }

  // Filters: Category & Priority & Status
  const filterCat = document.getElementById("filter-category");
  const filterPri = document.getElementById("filter-priority");
  const filterStat = document.getElementById("filter-status");

  if (filterCat) {
    filterCat.addEventListener("change", (e) => {
      store.setFilter({ category: e.target.value });
    });
  }
  if (filterPri) {
    filterPri.addEventListener("change", (e) => {
      store.setFilter({ priority: e.target.value });
    });
  }
  if (filterStat) {
    filterStat.addEventListener("change", (e) => {
      store.setFilter({ status: e.target.value });
    });
  }

  // Settings Form Submit
  const settingsForm = document.getElementById("settings-form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const studentName = document.getElementById("setting-student-name").value.trim();
      const targetExam = document.getElementById("setting-target-exam").value.trim();
      const weekdayStudyHours = parseFloat(document.getElementById("setting-weekday-hours").value) || 3.5;
      const weekendStudyHours = parseFloat(document.getElementById("setting-weekend-hours").value) || 6.0;

      store.updateSettings({
        studentName,
        targetExam,
        weekdayStudyHours,
        weekendStudyHours
      });

      // Regenerate plan with updated capacities
      store.generatePlan();
      showToast("Settings and study capacities updated!", "success");
      renderCurrentView();
    });
  }

  // Export Data as JSON
  const btnExport = document.getElementById("btn-export-data");
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        tasks: store.tasks,
        settings: store.settings,
        weeklyPlan: store.weeklyPlan,
        exportedAt: new Date().toISOString()
      }, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `pace_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Data exported successfully", "info");
    });
  }

  // Import Data from JSON
  const fileInput = document.getElementById("file-import-data");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (imported.tasks && Array.isArray(imported.tasks)) {
            store.tasks = imported.tasks;
            if (imported.settings) store.settings = imported.settings;
            if (imported.weeklyPlan) store.weeklyPlan = imported.weeklyPlan;
            store.saveToStorage();
            showToast("Backup restored successfully!", "success");
            renderCurrentView();
          } else {
            showToast("Invalid JSON file format", "error");
          }
        } catch (err) {
          showToast("Failed to parse file", "error");
        }
      };
      reader.readAsText(file);
    });
  }

  // Keyboard shortcut: ESC closes open modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeTaskModal();
      closeDeleteConfirmModal();
    }
  });

  // Close modals on clicking outside container
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeTaskModal();
        closeDeleteConfirmModal();
      }
    });
  });
}

// Subscribe Store Updates
store.subscribe((eventType) => {
  renderCurrentView();
});

// Expose PACE Global API on window for inline event triggers
window.PACE = {
  openTaskModal,
  closeTaskModal,
  editTask: (id) => openTaskModal(id),
  confirmDeleteTask: (id) => openDeleteConfirmModal(id),
  closeDeleteConfirmModal,
  confirmDeleteExecution,
  toggleTask: (id) => {
    const updated = store.toggleTaskComplete(id);
    if (updated) {
      showToast(updated.completed ? "Task completed! Great progress! 🎉" : "Task marked pending", "success");
    }
  },
  clearFilters: () => {
    store.clearFilters();
    const sc = document.getElementById("task-search-input");
    const fc = document.getElementById("filter-category");
    const fp = document.getElementById("filter-priority");
    const fs = document.getElementById("filter-status");
    if (sc) sc.value = "";
    if (fc) fc.value = "all";
    if (fp) fp.value = "all";
    if (fs) fs.value = "all";
    showToast("Filters reset", "info");
  },
  loadSampleData: () => {
    store.loadSampleData();
    showToast("Loaded realistic student tasks!", "success");
    renderCurrentView();
  },
  clearAllData: () => {
    if (confirm("Are you sure you want to clear all tasks and reset PACE?")) {
      store.clearAllData();
      showToast("All data cleared", "info");
      renderCurrentView();
    }
  },
  analyzePriorities: () => {
    switchView("priorities");
    showToast("Priority engine refreshed with latest urgency and effort weights!", "info");
  },
  generatePlan: () => {
    store.generatePlan();
    showToast("Adaptive weekly plan generated based on your deadlines & study hours!", "success");
    renderPlannerView();
  },
  savePlan: () => {
    store.saveToStorage();
    showToast("Weekly plan saved to local storage!", "success");
  },
  resetPlan: () => {
    if (confirm("Reset current weekly schedule? Tasks will remain safe in My Tasks.")) {
      store.resetPlan();
      showToast("Weekly plan reset", "info");
      renderPlannerView();
    }
  },
  rescheduleUnfinished: () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (store.weeklyPlan) {
      store.weeklyPlan = rollForwardUnfinished(store.weeklyPlan, todayStr);
      store.saveToStorage();
      showToast("Rolled unfinished past tasks forward into today's schedule!", "info");
      renderPlannerView();
    }
  },
  scheduleTaskForToday: (taskId) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!store.weeklyPlan) {
      store.generatePlan();
    }
    store.moveTaskInPlan(taskId, todayStr);
    showToast("Task scheduled for Today!", "success");
    switchView("planner");
  },
  moveTaskToDay: (taskId, targetDateStr) => {
    store.moveTaskInPlan(taskId, targetDateStr);
    showToast("Task moved to selected day", "info");
    renderPlannerView();
  },
  // Drag and drop handlers
  handleDragStart: (e, taskId) => {
    draggedTaskId = taskId;
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  },
  handleDragOver: (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.currentTarget.classList.add("drag-over");
  },
  handleDragLeave: (e) => {
    e.currentTarget.classList.remove("drag-over");
  },
  handleDrop: (e, targetDateStr) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (taskId && targetDateStr) {
      store.moveTaskInPlan(taskId, targetDateStr);
      showToast("Task rescheduled", "info");
      renderPlannerView();
    }
  },
  switchView
};

// Initial App Boot
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  switchView("dashboard");
});
