# PACE — Student Workload Management & Prioritisation

> **"Find your focus. Make your time count."**

PACE is a modern, responsive workload management and prioritization web application designed specifically for Class 9–12 students and competitive examination aspirants (IPMAT, Boards, JEE/NEET, SAT).

Unlike traditional to-do lists or generic school dashboards that simply record tasks, PACE acts as an intelligent decision copilot: evaluating academic urgency, importance, study effort, and available study slots to help students understand **what to tackle next** and **how to structure their week realistically**.

---

## 🚀 Key Features

### 1. Unified Task Dashboard
- **Personalized Header**: Dynamic salutation based on time of day, student name, current date, and completion rate.
- **Workload Overview**: Metrics for **Pending Tasks**, **Due Today**, **Overdue**, and **Completed**.
- **Comprehensive Task Schema**: Title, description, category (`School`, `Competitive Exams`, `Extracurricular`, `Personal`, `Other`), deadline (date & time), importance (`Low`, `Medium`, `High`), estimated duration (in minutes/hours), and preferred study slot.
- **Task Management (CRUD)**: Add, edit, delete (with safety confirmation modal), and complete tasks.
- **Search & Multi-parameter Filters**: Real-time keyword search, category filter, priority filter, and status filter with one-click filter reset.

### 2. Smart Priority Engine
A rule-based, transparent scoring algorithm that ranks responsibilities based on three core dimensions:

1. **Deadline Urgency (0–45 points)**:
   - Overdue: `45 pts` (Automatically tagged as Critical)
   - Due $\le 12$ hours: `42 pts` (Imminent)
   - Due $12 - 24$ hours: `36 pts`
   - Due $24 - 48$ hours: `28 pts`
   - Due $48 - 72$ hours: `22 pts`
   - Due $3 - 7$ days: `14 pts`
   - Due $> 7$ days: `6 pts`

2. **Importance Level (0–35 points)**:
   - High: `35 pts`
   - Medium: `22 pts`
   - Low: `10 pts`

3. **Effort Pressure & Time Fit (0–20 points)**:
   - Evaluates the ratio between estimated duration and remaining time window: $\text{Ratio} = \frac{\text{Duration}}{\max(\text{Remaining Hours}, 0.5)}$
   - Bottleneck ratio $\ge 0.35$: `+18 pts`
   - Moderate ratio $\ge 0.20$: `+14 pts`
   - Comfortable ratio $\ge 0.08$: `+10 pts`
   - Low ratio: `+5 pts`
   - Chunkiness Risk Modifier: Tasks requiring $\ge 2.5\text{ hours}$ due within 48 hours receive an additional `+3 pts` (max 20) to guard against last-minute study fatigue.

#### Priority Tiers:
- **Critical**: Score $\ge 75$ or Overdue
- **High**: Score $55 - 74$
- **Medium**: Score $35 - 54$
- **Low**: Score $< 35$

#### Transparent "Why this priority?" Explanations
For every task, PACE builds a natural-language diagnostic explanation explaining:
- Deadline proximity and remaining hours/days
- Importance weight
- Estimated effort requirement
- Concrete action recommendation (e.g. *“Due tomorrow at 5:00 PM with High importance. Needs ~2.5 hours to complete. Tackling this today prevents study bottlenecks.”*)

### 3. Adaptive Weekly Planner
- **7-Day Dynamic Calendar**: Automatically calculates dates starting from today.
- **Study Capacity Allocator**: Compares daily workloads against the student's study capacity (default: Weekdays 3.5h, Weekends 6.0h).
- **Burnout & Workload Warning**: If total workload exceeds weekly capacity, an alert banner computes the exact deficit in hours and highlights lower-priority tasks to defer.
- **Interactive Rescheduling**:
  - Drag-and-drop tasks directly between day columns.
  - Dropdown **"Move to..."** selector for quick scheduling.
  - **"Reschedule Past Tasks"**: Automatically rolls forward any unfinished tasks from past days into today.
  - **"Save Plan"** and **"Reset Plan"** controls.

### 4. Settings & Data Management
- Configurable student name and target exam.
- Customizable daily weekday and weekend study hour limits.
- **Export Data**: Download complete state as JSON backup.
- **Import Data**: Restore state from any previously exported JSON.
- **Load Sample Student Tasks**: Pre-loads realistic Class 11-12 & competitive exam tasks (IPMAT, Accountancy, Economics, Physics).
- **Reset All Data**: Cleans localStorage.

---

## 🛠️ Architecture & Project Structure

```
Hustle/
├── index.html                   # Root redirection to PACE
├── pace/
│   ├── index.html               # Main SPA shell
│   ├── css/
│   │   ├── reset.css            # CSS reset, dark navy/charcoal tokens, typography
│   │   ├── components.css       # Modals, form controls, badges, buttons, toasts
│   │   ├── main.css             # Layout, header, sidebar navigation, task cards
│   │   └── planner.css          # Weekly planner grid, capacity bars, alert banners
│   ├── js/
│   │   ├── sampleData.js        # Dynamic relative sample tasks for students
│   │   ├── priorityEngine.js    # Rule-based priority algorithm & explainability engine
│   │   ├── plannerEngine.js     # Weekly capacity distributor & roll-forward engine
│   │   ├── state.js             # Reactive State Store with localStorage persistence
│   │   ├── ui.js                # DOM rendering, modals, toasts, form validation
│   │   └── app.js               # Event wiring, routing, drag-and-drop, app bootstrap
│   ├── test_engine.py           # Priority engine test script
│   ├── test_planner.py          # Planner engine capacity test script
│   └── verify_dom.py            # DOM element and file integrity verifier
```

---

## 💻 How to Run the Application

PACE is a zero-dependency, pure client-side web application. It runs locally without needing any build steps or npm installations.

### Method 1: Using Python (Recommended)
From the project root:
```bash
python3 -m http.server 4173 --directory pace
```
Then open your browser to:
```
http://localhost:4173
```

Or run directly from the workspace root:
```bash
python3 -m http.server 3000
```
Then open:
```
http://localhost:3000
```
*(The root `index.html` automatically forwards you to the application).*

### Method 2: Direct File Open
You can also open `pace/index.html` directly in any modern web browser (Google Chrome, Safari, Firefox, Edge).
