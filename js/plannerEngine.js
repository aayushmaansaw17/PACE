/**
 * PACE Adaptive Weekly Planner Engine
 * Realistic workload allocation & capacity balancer for students.
 */

import { rankTasks } from './priorityEngine.js';

export function getWeekDays(startDate = new Date()) {
  const days = [];
  const base = new Date(startDate);
  base.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const fullDateText = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const isWeekend = d.getDay() === 0 || d.getDay() === 6; // Sunday or Saturday
    const isToday = i === 0;

    days.push({
      dateStr,
      dayName,
      fullDateText,
      isWeekend,
      isToday,
      dayIndex: d.getDay()
    });
  }
  return days;
}

/**
 * Generates an adaptive weekly plan distributing tasks based on priority,
 * deadline deadlines, estimated durations, and student study capacities.
 */
export function generateWeeklyPlan(tasks, settings, startDate = new Date()) {
  const days = getWeekDays(startDate);
  const weekdayCap = parseFloat(settings.weekdayStudyHours) || 3.5;
  const weekendCap = parseFloat(settings.weekendStudyHours) || 6.0;

  // Initialise day buckets
  const schedule = days.map(d => ({
    ...d,
    capacityHours: d.isWeekend ? weekendCap : weekdayCap,
    allocatedMinutes: 0,
    allocatedHours: 0,
    tasks: []
  }));

  // Only plan for incomplete tasks
  const pendingTasks = tasks.filter(t => !t.completed);
  const rankedTasks = rankTasks(pendingTasks, startDate);

  const unscheduled = [];
  let totalWorkloadMinutes = 0;

  rankedTasks.forEach(task => {
    const durationMins = task.estimatedMinutes || 60;
    totalWorkloadMinutes += durationMins;
    const taskHours = durationMins / 60;
    const deadlineDate = new Date(task.deadline);
    const deadlineDateStr = deadlineDate.toISOString().slice(0, 10);
    const nowStr = days[0].dateStr;

    // Determine deadline index among the 7 days (or -1 if before today, 999 if beyond week)
    let deadlineDayIdx = -1;
    if (deadlineDateStr < nowStr) {
      deadlineDayIdx = 0; // Overdue tasks must be targeted for today
    } else {
      const foundIdx = schedule.findIndex(d => d.dateStr === deadlineDateStr);
      deadlineDayIdx = foundIdx !== -1 ? foundIdx : (deadlineDateStr > schedule[6].dateStr ? 6 : 0);
    }

    // Try to find a day from day 0 to deadlineDayIdx with capacity
    let assignedDay = null;

    for (let i = 0; i <= deadlineDayIdx && i < schedule.length; i++) {
      const day = schedule[i];
      if ((day.allocatedMinutes + durationMins) <= (day.capacityHours * 60)) {
        assignedDay = day;
        break;
      }
    }

    // If no day before deadline has free space, assign to the day with minimum overflow before deadline
    if (!assignedDay) {
      let candidateDay = schedule[0];
      let minLoad = Infinity;
      const searchLimit = Math.min(deadlineDayIdx, schedule.length - 1);

      for (let i = 0; i <= searchLimit; i++) {
        if (schedule[i].allocatedMinutes < minLoad) {
          minLoad = schedule[i].allocatedMinutes;
          candidateDay = schedule[i];
        }
      }
      assignedDay = candidateDay;
    }

    if (assignedDay) {
      assignedDay.tasks.push({
        ...task,
        scheduledDate: assignedDay.dateStr
      });
      assignedDay.allocatedMinutes += durationMins;
      assignedDay.allocatedHours = parseFloat((assignedDay.allocatedMinutes / 60).toFixed(1));
    } else {
      unscheduled.push(task);
    }
  });

  // Calculate weekly capacity metrics
  const totalWeeklyCapacityHours = schedule.reduce((sum, d) => sum + d.capacityHours, 0);
  const totalWorkloadHours = parseFloat((totalWorkloadMinutes / 60).toFixed(1));
  const isOverloaded = totalWorkloadHours > totalWeeklyCapacityHours;
  const deficitHours = isOverloaded ? parseFloat((totalWorkloadHours - totalWeeklyCapacityHours).toFixed(1)) : 0;

  // Identify lower priority tasks that can be postponed if overloaded
  const suggestedPostponements = [];
  if (isOverloaded) {
    const lowAndMedium = rankedTasks.filter(t => t.priorityTier === "Low" || t.priorityTier === "Medium");
    let accumulatedMins = 0;
    for (const t of lowAndMedium.reverse()) { // Lowest priority first
      suggestedPostponements.push(t);
      accumulatedMins += (t.estimatedMinutes || 60);
      if ((accumulatedMins / 60) >= deficitHours) break;
    }
  }

  return {
    schedule,
    unscheduled,
    totalWeeklyCapacityHours,
    totalWorkloadHours,
    isOverloaded,
    deficitHours,
    suggestedPostponements,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Reschedules unfinished tasks: rolls forward any tasks scheduled on past dates to Today
 */
export function rollForwardUnfinished(currentPlan, todayDateStr) {
  if (!currentPlan || !currentPlan.schedule) return currentPlan;

  const todayIndex = currentPlan.schedule.findIndex(d => d.dateStr === todayDateStr);
  if (todayIndex <= 0) return currentPlan; // Today is already first or not in range

  const tasksToRoll = [];

  // Collect incomplete tasks from days before today
  for (let i = 0; i < todayIndex; i++) {
    const day = currentPlan.schedule[i];
    const incomplete = day.tasks.filter(t => !t.completed);
    tasksToRoll.push(...incomplete);
    day.tasks = day.tasks.filter(t => t.completed); // keep completed ones for history
    day.allocatedMinutes = day.tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 60), 0);
    day.allocatedHours = parseFloat((day.allocatedMinutes / 60).toFixed(1));
  }

  // Place rolled tasks into Today
  const todayDay = currentPlan.schedule[todayIndex];
  tasksToRoll.forEach(task => {
    todayDay.tasks.push({
      ...task,
      scheduledDate: todayDay.dateStr
    });
    todayDay.allocatedMinutes += (task.estimatedMinutes || 60);
  });
  todayDay.allocatedHours = parseFloat((todayDay.allocatedMinutes / 60).toFixed(1));

  return currentPlan;
}
