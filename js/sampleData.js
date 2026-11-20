/**
 * Sample realistic data for Class 11-12 and competitive examination aspirants (IPMAT, Boards, JEE/NEET, etc.)
 * Generates tasks with timestamps relative to the current time so test scenarios are always realistic.
 */

function getRelativeDate(daysOffset, hours = 18, minutes = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
}

export const DEFAULT_STUDENT_SETTINGS = {
  studentName: "Aayushmaan",
  targetExam: "Class 11 / IPMAT Aspirant",
  weekdayStudyHours: 3.5,
  weekendStudyHours: 6.0,
  defaultCategory: "School"
};

export function generateSampleTasks() {
  const now = new Date();

  return [
    {
      id: "task_1",
      title: "Accountancy Project & Ledger Submissions",
      description: "Complete final trial balance, adjustment entries and balance sheet formulation for Grade 11 term review.",
      category: "School",
      deadline: getRelativeDate(-1, 23, 59), // Yesterday (Overdue)
      importance: "High",
      estimatedMinutes: 120, // 2 hours
      preferredSlot: "Evening 7:00 - 9:00 PM",
      completed: false,
      scheduledDate: null,
      createdAt: new Date(now.getTime() - 86400000 * 3).toISOString()
    },
    {
      id: "task_2",
      title: "Quantitative Ability: IPMAT Cheat Sheet Review",
      description: "Revise Speed-Time-Distance, Permutations & Combinations, and Logarithms formulae from QA cheat sheet.",
      category: "Competitive Exams",
      deadline: getRelativeDate(0, 21, 0), // Today evening
      importance: "High",
      estimatedMinutes: 90, // 1.5 hours
      preferredSlot: "Late Night 9:00 - 10:30 PM",
      completed: false,
      scheduledDate: null,
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString()
    },
    {
      id: "task_3",
      title: "Economics: Macro Market Structures Analysis",
      description: "Write 3-page comparative study on Oligopoly vs Monopolistic Competition with Indian market examples.",
      category: "School",
      deadline: getRelativeDate(1, 16, 0), // Tomorrow afternoon
      importance: "High",
      estimatedMinutes: 150, // 2.5 hours
      preferredSlot: "Afternoon 3:00 - 5:30 PM",
      completed: false,
      scheduledDate: null,
      createdAt: new Date(now.getTime() - 86400000 * 1).toISOString()
    },
    {
      id: "task_4",
      title: "HCGCC Competitive Team Report & Strategy Deck",
      description: "Refine slide deck on market expansion and strategic growth framework for competition pitch.",
      category: "Extracurricular",
      deadline: getRelativeDate(2, 20, 0), // In 2 days
      importance: "Medium",
      estimatedMinutes: 120, // 2 hours
      preferredSlot: "Evening 6:00 - 8:00 PM",
      completed: false,
      scheduledDate: null,
      createdAt: new Date().toISOString()
    },
    {
      id: "task_5",
      title: "Verbal Ability: Reading Comprehension Practice (5 Passages)",
      description: "Solve 5 high-difficulty philosophy & business economy RC passages with timed accuracy tracking.",
      category: "Competitive Exams",
      deadline: getRelativeDate(3, 19, 0), // In 3 days
      importance: "Medium",
      estimatedMinutes: 75, // 1.25 hours
      preferredSlot: "Morning 6:30 - 7:45 AM",
      completed: false,
      scheduledDate: null,
      createdAt: new Date().toISOString()
    },
    {
      id: "task_6",
      title: "Mathematics: Calculus & Derivatives Practice Drill",
      description: "Solve 25 advanced NCERT Exemplar problems on tangents, normals and maxima-minima.",
      category: "School",
      deadline: getRelativeDate(4, 22, 0), // In 4 days
      importance: "High",
      estimatedMinutes: 180, // 3 hours
      preferredSlot: "Evening 7:00 - 10:00 PM",
      completed: false,
      scheduledDate: null,
      createdAt: new Date().toISOString()
    },
    {
      id: "task_7",
      title: "Organize Study Drive & Clean Desk Workspace",
      description: "Sort downloaded mock test answer keys and organize physical textbook shelves.",
      category: "Personal",
      deadline: getRelativeDate(6, 18, 0), // In 6 days
      importance: "Low",
      estimatedMinutes: 45, // 45 mins
      preferredSlot: "Weekend Morning",
      completed: false,
      scheduledDate: null,
      createdAt: new Date().toISOString()
    },
    {
      id: "task_8",
      title: "English Core: Speech Writing Submission",
      description: "Draft 200-word formal speech on 'Youth in Financial Literacy' for English internal assessment.",
      category: "School",
      deadline: getRelativeDate(-2, 14, 0), // 2 days ago
      importance: "Medium",
      estimatedMinutes: 60,
      preferredSlot: "Afternoon",
      completed: true, // Marked complete
      scheduledDate: null,
      createdAt: new Date(now.getTime() - 86400000 * 4).toISOString()
    }
  ];
}
