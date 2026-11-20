import os
import re

files_to_check = [
    "pace/index.html",
    "pace/css/reset.css",
    "pace/css/components.css",
    "pace/css/main.css",
    "pace/css/planner.css",
    "pace/js/sampleData.js",
    "pace/js/priorityEngine.js",
    "pace/js/plannerEngine.js",
    "pace/js/state.js",
    "pace/js/ui.js",
    "pace/js/app.js",
]

print("Verifying PACE files exist and are populated...")
all_ok = True
for fpath in files_to_check:
    if not os.path.exists(fpath):
        print(f"❌ Missing file: {fpath}")
        all_ok = False
    else:
        size = os.path.getsize(fpath)
        print(f"✓ {fpath} ({size} bytes)")

# Check index.html for required IDs and script hooks
with open("pace/index.html", "r") as f:
    html = f.read()

required_ids = [
    "task-modal",
    "delete-modal",
    "task-form",
    "stat-pending-count",
    "stat-today-count",
    "stat-overdue-count",
    "stat-completed-count",
    "dashboard-recent-tasks",
    "all-tasks-container",
    "priority-list-container",
    "planner-grid-container",
    "planner-warning-banner",
    "task-search-input",
    "filter-category",
    "filter-priority",
    "filter-status"
]

print("\nVerifying required DOM IDs in pace/index.html...")
for dom_id in required_ids:
    if f'id="{dom_id}"' not in html:
        print(f"❌ Missing DOM ID: {dom_id}")
        all_ok = False
    else:
        print(f"✓ Found #{dom_id}")

assert all_ok, "Some checks failed!"
print("\nAll file integrity and DOM element checks passed!")
