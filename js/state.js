/**
 * PACE Central State Store
 * Manages reactive application state with LocalStorage persistence and event pub/sub.
 */

import { generateSampleTasks, DEFAULT_STUDENT_SETTINGS } from './sampleData.js';
import { rankTasks } from './priorityEngine.js';
import { generateWeeklyPlan } from './plannerEngine.js';

const STORAGE_KEY_TASKS = "pace_student_tasks_v1";
const STORAGE_KEY_SETTINGS = "pace_student_settings_v1";
const STORAGE_KEY_PLAN = "pace_weekly_plan_v1";

class StateStore {
  constructor() {
    this.listeners = [];
    this.tasks = [];
    this.settings = { ...DEFAULT_STUDENT_SETTINGS };
    this.weeklyPlan = null;
    this.activeFilter = {
      category: "all",
      priority: "all",
      status: "all", // "all", "pending", "completed"
      searchQuery: ""
    };
    this.init();
  }

  init() {
    this.loadFromStorage();
    // If no tasks exist at all on fresh load, populate realistic sample tasks
    if (!this.tasks || this.tasks.length === 0) {
      this.tasks = generateSampleTasks();
      this.saveToStorage();
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(eventType, payload) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, payload, this);
      } catch (err) {
        console.error("State listener error:", err);
      }
    });
  }

  loadFromStorage() {
    try {
      const storedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
      if (storedTasks) {
        this.tasks = JSON.parse(storedTasks);
      }

      const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (storedSettings) {
        this.settings = { ...DEFAULT_STUDENT_SETTINGS, ...JSON.parse(storedSettings) };
      }

      const storedPlan = localStorage.getItem(STORAGE_KEY_PLAN);
      if (storedPlan) {
        this.weeklyPlan = JSON.parse(storedPlan);
      }
    } catch (e) {
      console.warn("Could not read from localStorage, using fallback state:", e);
      this.tasks = generateSampleTasks();
      this.settings = { ...DEFAULT_STUDENT_SETTINGS };
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(this.tasks));
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
      if (this.weeklyPlan) {
        localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(this.weeklyPlan));
      } else {
        localStorage.removeItem(STORAGE_KEY_PLAN);
      }
    } catch (e) {
      console.error("Could not write to localStorage:", e);
    }
  }

  // --- Task Operations (CRUD) ---
  addTask(taskData) {
    const newTask = {
      id: "task_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      title: taskData.title.trim(),
      description: (taskData.description || "").trim(),
      category: taskData.category || "School",
      deadline: taskData.deadline,
      importance: taskData.importance || "Medium",
      estimatedMinutes: parseInt(taskData.estimatedMinutes, 10) || 60,
      preferredSlot: (taskData.preferredSlot || "").trim(),
      completed: false,
      scheduledDate: null,
      createdAt: new Date().toISOString()
    };

    this.tasks.unshift(newTask);
    this.saveToStorage();
    this.notify("TASK_ADDED", newTask);
    return newTask;
  }

  updateTask(id, updatedFields) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    this.tasks[index] = {
      ...this.tasks[index],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    // If task was in the weekly plan, update it there too
    if (this.weeklyPlan && this.weeklyPlan.schedule) {
      this.weeklyPlan.schedule.forEach(day => {
        const pIdx = day.tasks.findIndex(t => t.id === id);
        if (pIdx !== -1) {
          day.tasks[pIdx] = { ...day.tasks[pIdx], ...updatedFields };
        }
      });
    }

    this.saveToStorage();
    this.notify("TASK_UPDATED", this.tasks[index]);
    return this.tasks[index];
  }

  deleteTask(id) {
    const taskToDelete = this.tasks.find(t => t.id === id);
    if (!taskToDelete) return false;

    this.tasks = this.tasks.filter(t => t.id !== id);

    // Remove from weekly plan if present
    if (this.weeklyPlan && this.weeklyPlan.schedule) {
      this.weeklyPlan.schedule.forEach(day => {
        day.tasks = day.tasks.filter(t => t.id !== id);
        day.allocatedMinutes = day.tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 60), 0);
        day.allocatedHours = parseFloat((day.allocatedMinutes / 60).toFixed(1));
      });
    }

    this.saveToStorage();
    this.notify("TASK_DELETED", taskToDelete);
    return true;
  }

  toggleTaskComplete(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;

    // Update in weekly plan as well
    if (this.weeklyPlan && this.weeklyPlan.schedule) {
      this.weeklyPlan.schedule.forEach(day => {
        const found = day.tasks.find(t => t.id === id);
        if (found) {
          found.completed = task.completed;
          found.completedAt = task.completedAt;
        }
      });
    }

    this.saveToStorage();
    this.notify("TASK_TOGGLED", task);
    return task;
  }

  // --- Filtering & Search ---
  setFilter(filterUpdates) {
    this.activeFilter = { ...this.activeFilter, ...filterUpdates };
    this.notify("FILTER_CHANGED", this.activeFilter);
  }

  clearFilters() {
    this.activeFilter = {
      category: "all",
      priority: "all",
      status: "all",
      searchQuery: ""
    };
    this.notify("FILTER_CHANGED", this.activeFilter);
  }

  getFilteredTasks() {
    const now = new Date();
    // Pre-calculate priorities for filtering
    const evaluated = rankTasks(this.tasks, now);

    return evaluated.filter(task => {
      // 1. Category
      if (this.activeFilter.category !== "all" && task.category !== this.activeFilter.category) {
        return false;
      }
      // 2. Priority tier
      if (this.activeFilter.priority !== "all" && task.priorityTier !== this.activeFilter.priority) {
        return false;
      }
      // 3. Completion status
      if (this.activeFilter.status === "pending" && task.completed) return false;
      if (this.activeFilter.status === "completed" && !task.completed) return false;

      // 4. Search query
      if (this.activeFilter.searchQuery) {
        const q = this.activeFilter.searchQuery.toLowerCase();
        const inTitle = task.title.toLowerCase().includes(q);
        const inDesc = (task.description || "").toLowerCase().includes(q);
        const inCat = task.category.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inCat) return false;
      }

      return true;
    });
  }

  // --- Statistics & Workload Overview ---
  getWorkloadStats() {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    const pending = this.tasks.filter(t => !t.completed);

    let overdue = 0;
    let dueToday = 0;
    let totalPendingMinutes = 0;

    pending.forEach(t => {
      const d = new Date(t.deadline);
      totalPendingMinutes += (t.estimatedMinutes || 60);

      if (d.getTime() < now.getTime()) {
        overdue++;
      } else if (d.getTime() < startOfTomorrow.getTime()) {
        dueToday++;
      }
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalPendingHours = parseFloat((totalPendingMinutes / 60).toFixed(1));

    return {
      total,
      completed,
      pendingCount: pending.length,
      overdue,
      dueToday,
      completionRate,
      totalPendingHours
    };
  }

  // --- Plan Operations ---
  generatePlan() {
    const plan = generateWeeklyPlan(this.tasks, this.settings, new Date());
    this.weeklyPlan = plan;
    this.saveToStorage();
    this.notify("PLAN_GENERATED", plan);
    return plan;
  }

  moveTaskInPlan(taskId, targetDateStr) {
    if (!this.weeklyPlan || !this.weeklyPlan.schedule) return false;

    let movedTask = null;

    // Find and remove from origin day
    this.weeklyPlan.schedule.forEach(day => {
      const idx = day.tasks.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        movedTask = day.tasks.splice(idx, 1)[0];
        day.allocatedMinutes = day.tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 60), 0);
        day.allocatedHours = parseFloat((day.allocatedMinutes / 60).toFixed(1));
      }
    });

    // Check unscheduled pool
    if (!movedTask && this.weeklyPlan.unscheduled) {
      const poolIdx = this.weeklyPlan.unscheduled.findIndex(t => t.id === taskId);
      if (poolIdx !== -1) {
        movedTask = this.weeklyPlan.unscheduled.splice(poolIdx, 1)[0];
      }
    }

    if (!movedTask) return false;

    // Insert into destination day
    const targetDay = this.weeklyPlan.schedule.find(d => d.dateStr === targetDateStr);
    if (targetDay) {
      movedTask.scheduledDate = targetDateStr;
      targetDay.tasks.push(movedTask);
      targetDay.allocatedMinutes += (movedTask.estimatedMinutes || 60);
      targetDay.allocatedHours = parseFloat((targetDay.allocatedMinutes / 60).toFixed(1));
    } else {
      // Put into unscheduled pool
      movedTask.scheduledDate = null;
      if (!this.weeklyPlan.unscheduled) this.weeklyPlan.unscheduled = [];
      this.weeklyPlan.unscheduled.push(movedTask);
    }

    this.saveToStorage();
    this.notify("PLAN_UPDATED", this.weeklyPlan);
    return true;
  }

  resetPlan() {
    this.weeklyPlan = null;
    this.saveToStorage();
    this.notify("PLAN_RESET", null);
  }

  // --- Settings & State Controls ---
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveToStorage();
    this.notify("SETTINGS_UPDATED", this.settings);
  }

  loadSampleData() {
    this.tasks = generateSampleTasks();
    this.weeklyPlan = null;
    this.saveToStorage();
    this.notify("SAMPLE_DATA_LOADED", this.tasks);
  }

  clearAllData() {
    this.tasks = [];
    this.weeklyPlan = null;
    this.saveToStorage();
    this.notify("ALL_DATA_CLEARED", null);
  }
}

export const store = new StateStore();
