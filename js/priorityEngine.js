/**
 * PACE Smart Priority Engine
 * A transparent, rule-based academic prioritisation algorithm.
 * 
 * Evaluates:
 * 1. Deadline Urgency (0 - 45 points)
 * 2. Importance Level (0 - 35 points)
 * 3. Effort Pressure & Time Bottleneck (0 - 20 points)
 * 
 * Total Score Range: 0 to 100 points
 */

export const PRIORITY_TIERS = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low"
};

/**
 * Calculates priority score, factors breakdown, tier, and generates a natural-language explanation.
 * @param {Object} task 
 * @param {Date} referenceTime - Defaults to current time
 * @returns {Object} enriched task with priority details
 */
export function evaluateTaskPriority(task, referenceTime = new Date()) {
  const now = new Date(referenceTime);
  const deadline = new Date(task.deadline);
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const durationHours = (task.estimatedMinutes || 60) / 60;

  // --- 1. Deadline Urgency (Max 45 points) ---
  let urgencyScore = 0;
  let urgencyLabel = "";
  const isOverdue = diffHours < 0;

  if (isOverdue) {
    urgencyScore = 45;
    const overdueHours = Math.abs(diffHours);
    if (overdueHours < 24) {
      urgencyLabel = `Overdue by ${Math.round(overdueHours)} hr${Math.round(overdueHours) === 1 ? '' : 's'}`;
    } else {
      const days = Math.floor(overdueHours / 24);
      urgencyLabel = `Overdue by ${days} day${days === 1 ? '' : 's'}`;
    }
  } else if (diffHours <= 12) {
    urgencyScore = 42;
    urgencyLabel = `Due in ${Math.round(diffHours)} hrs (imminent)`;
  } else if (diffHours <= 24) {
    urgencyScore = 36;
    urgencyLabel = `Due within 24 hrs`;
  } else if (diffHours <= 48) {
    urgencyScore = 28;
    urgencyLabel = `Due in ~${Math.round(diffHours / 24)} days`;
  } else if (diffHours <= 72) {
    urgencyScore = 22;
    urgencyLabel = `Due in 3 days`;
  } else if (diffHours <= 168) {
    urgencyScore = 14;
    urgencyLabel = `Due in ${Math.round(diffHours / 24)} days`;
  } else {
    urgencyScore = 6;
    urgencyLabel = `Due in > 1 week`;
  }

  // --- 2. Importance Level (Max 35 points) ---
  let importanceScore = 0;
  const imp = (task.importance || "Medium").toLowerCase();
  if (imp === "high") {
    importanceScore = 35;
  } else if (imp === "medium") {
    importanceScore = 22;
  } else {
    importanceScore = 10;
  }

  // --- 3. Effort Pressure & Time Fit (Max 20 points) ---
  let effortScore = 0;
  let effortLabel = "";

  if (isOverdue) {
    effortScore = 20;
    effortLabel = "Backlog intervention needed";
  } else {
    const timeRatio = durationHours / Math.max(diffHours, 0.5);
    if (timeRatio >= 0.35) {
      effortScore = 18;
      effortLabel = "High effort pressure (takes >35% of remaining window)";
    } else if (timeRatio >= 0.20) {
      effortScore = 14;
      effortLabel = "Moderate effort pressure";
    } else if (timeRatio >= 0.08) {
      effortScore = 10;
      effortLabel = "Comfortable effort window";
    } else {
      effortScore = 5;
      effortLabel = "Low effort requirement";
    }

    // Heavy task bonus (tasks requiring 2.5h+ need early start to prevent cramming)
    if (durationHours >= 2.5 && diffHours <= 48) {
      effortScore = Math.min(20, effortScore + 3);
    }
  }

  // --- Total Composite Score (0 - 100) ---
  const totalScore = Math.min(100, urgencyScore + importanceScore + effortScore);

  // --- Determine Tier ---
  let priorityTier = PRIORITY_TIERS.LOW;
  if (isOverdue) {
    priorityTier = PRIORITY_TIERS.CRITICAL;
  } else if (totalScore >= 75) {
    priorityTier = PRIORITY_TIERS.CRITICAL;
  } else if (totalScore >= 55) {
    priorityTier = PRIORITY_TIERS.HIGH;
  } else if (totalScore >= 35) {
    priorityTier = PRIORITY_TIERS.MEDIUM;
  } else {
    priorityTier = PRIORITY_TIERS.LOW;
  }

  // --- Generate Explainable Natural Language Reason ---
  const explanation = generatePriorityExplanation({
    title: task.title,
    category: task.category,
    tier: priorityTier,
    totalScore,
    diffHours,
    durationHours,
    importance: task.importance,
    isOverdue,
    urgencyLabel
  });

  return {
    ...task,
    priorityTier,
    priorityScore: totalScore,
    isOverdue,
    diffHours,
    factors: {
      urgencyScore,
      importanceScore,
      effortScore,
      urgencyLabel,
      effortLabel,
      durationHours
    },
    priorityExplanation: explanation
  };
}

/**
 * Natural language explanation builder
 */
function generatePriorityExplanation(params) {
  const { title, tier, totalScore, diffHours, durationHours, importance, isOverdue } = params;
  const durText = durationHours >= 1 
    ? `${durationHours % 1 === 0 ? durationHours : durationHours.toFixed(1)} hour${durationHours === 1 ? '' : 's'}`
    : `${Math.round(durationHours * 60)} minutes`;

  if (isOverdue) {
    const overdueHours = Math.abs(Math.round(diffHours));
    const timeUnit = overdueHours < 24 ? `${overdueHours}h ago` : `${Math.floor(overdueHours / 24)} day(s) ago`;
    return `Critical Priority — Overdue by ${timeUnit}. Requires ~${durText}. Resolving this immediately clears cognitive stress and prevents compounding study backlog.`;
  }

  if (tier === PRIORITY_TIERS.CRITICAL) {
    if (diffHours <= 12) {
      return `Critical Priority — Due within ${Math.round(diffHours)} hours with ${importance} importance. Needs ~${durText}. Immediate focus required today to meet this imminent deadline.`;
    }
    return `Critical Priority — Due in ${Math.round(diffHours / 24)} days with ${importance} importance. Because it demands ~${durText}, starting now prevents study bottlenecks.`;
  }

  if (tier === PRIORITY_TIERS.HIGH) {
    if (diffHours <= 24) {
      return `High Priority — Due tomorrow with ${importance} importance. Requires ~${durText}. Completing it today eliminates last-minute cramming and study fatigue.`;
    }
    if (diffHours <= 48) {
      return `High Priority — Due in 2 days. Rated ${importance} importance and needs ~${durText}. Scheduling a focused study session today ensures quality output.`;
    }
    return `High Priority — High importance task requiring ~${durText}. Due in ${Math.round(diffHours / 24)} days. Planning it early protects your weekend schedule.`;
  }

  if (tier === PRIORITY_TIERS.MEDIUM) {
    if (diffHours <= 48) {
      return `Medium Priority — Due in 2 days with ${importance} importance. Takes ~${durText}. Fits smoothly into an open study slot after higher-priority tasks.`;
    }
    return `Medium Priority — Due in ${Math.round(diffHours / 24)} days with ${importance} importance. Estimated duration is ~${durText}. Can be comfortably paced across mid-week.`;
  }

  // Low Priority
  return `Low Priority — Due in ${Math.round(diffHours / 24)} days with ${importance} importance (~${durText}). Can wait until urgent academic and competitive exam deadlines are resolved.`;
}

/**
 * Sorts tasks by smart priority score descending, with secondary tie-breakers
 * @param {Array} tasks 
 * @returns {Array} ranked tasks
 */
export function rankTasks(tasks, referenceTime = new Date()) {
  const evaluated = tasks.map(t => evaluateTaskPriority(t, referenceTime));

  return evaluated.sort((a, b) => {
    // 1. Incomplete tasks come first
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // 2. Overdue tasks always top
    if (a.isOverdue !== b.isOverdue) {
      return a.isOverdue ? -1 : 1;
    }
    // 3. Higher priority score first
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    // 4. Secondary tie-breaker: closer deadline
    const aDead = new Date(a.deadline).getTime();
    const bDead = new Date(b.deadline).getTime();
    if (aDead !== bDead) {
      return aDead - bDead;
    }
    // 5. Tertiary: higher duration first
    return (b.estimatedMinutes || 0) - (a.estimatedMinutes || 0);
  });
}
