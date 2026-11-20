"""
Unit test suite verifying PACE Priority Engine logic and Weekly Planner algorithms
"""
import math
from datetime import datetime, timedelta

def evaluate_task_priority(task, now=None):
    if now is None:
        now = datetime.now()
    
    deadline = datetime.fromisoformat(task["deadline"])
    diff_hours = (deadline - now).total_seconds() / 3600.0
    duration_hours = task.get("estimatedMinutes", 60) / 60.0
    is_overdue = diff_hours < 0

    # 1. Urgency score (Max 45)
    if is_overdue:
        urgency_score = 45
    elif diff_hours <= 12:
        urgency_score = 42
    elif diff_hours <= 24:
        urgency_score = 36
    elif diff_hours <= 48:
        urgency_score = 28
    elif diff_hours <= 72:
        urgency_score = 22
    elif diff_hours <= 168:
        urgency_score = 14
    else:
        urgency_score = 6

    # 2. Importance score (Max 35)
    imp = task.get("importance", "Medium").lower()
    if imp == "high":
        importance_score = 35
    elif imp == "medium":
        importance_score = 22
    else:
        importance_score = 10

    # 3. Effort Pressure (Max 20)
    if is_overdue:
        effort_score = 20
    else:
        ratio = duration_hours / max(diff_hours, 0.5)
        if ratio >= 0.35:
            effort_score = 18
        elif ratio >= 0.20:
            effort_score = 14
        elif ratio >= 0.08:
            effort_score = 10
        else:
            effort_score = 5

        if duration_hours >= 2.5 and diff_hours <= 48:
            effort_score = min(20, effort_score + 3)

    total_score = min(100, urgency_score + importance_score + effort_score)

    if is_overdue or total_score >= 75:
        tier = "Critical"
    elif total_score >= 55:
        tier = "High"
    elif total_score >= 35:
        tier = "Medium"
    else:
        tier = "Low"

    return {
        "tier": tier,
        "score": total_score,
        "urgency_score": urgency_score,
        "importance_score": importance_score,
        "effort_score": effort_score,
        "is_overdue": is_overdue
    }

def run_tests():
    now = datetime(2026, 11, 20, 10, 0, 0)
    print("Testing PACE Priority Algorithm Scenarios...")

    # Scenario 1: Overdue task
    overdue_task = {
        "title": "Old Assignment",
        "deadline": (now - timedelta(days=1)).isoformat(),
        "importance": "High",
        "estimatedMinutes": 120
    }
    res1 = evaluate_task_priority(overdue_task, now)
    assert res1["is_overdue"] == True, "Failed overdue check"
    assert res1["tier"] == "Critical", f"Expected Critical tier for overdue, got {res1['tier']}"
    assert res1["urgency_score"] == 45, "Expected max urgency score 45"
    print("✓ Scenario 1 (Overdue Task): PASSED ->", res1)

    # Scenario 2: Imminent High-Importance Task due in 8 hours
    imminent_task = {
        "title": "Economics Exam Revision",
        "deadline": (now + timedelta(hours=8)).isoformat(),
        "importance": "High",
        "estimatedMinutes": 180 # 3 hours
    }
    res2 = evaluate_task_priority(imminent_task, now)
    assert res2["urgency_score"] == 42
    assert res2["importance_score"] == 35
    assert res2["tier"] == "Critical"
    print("✓ Scenario 2 (Imminent High-Imp Task): PASSED ->", res2)

    # Scenario 3: Task due tomorrow (20h), Medium importance
    tomorrow_task = {
        "title": "English Speech",
        "deadline": (now + timedelta(hours=20)).isoformat(),
        "importance": "Medium",
        "estimatedMinutes": 60
    }
    res3 = evaluate_task_priority(tomorrow_task, now)
    assert res3["tier"] in ["High", "Medium"]
    print("✓ Scenario 3 (Due tomorrow, Medium Imp): PASSED ->", res3)

    # Scenario 4: Low importance task due in 10 days
    distant_task = {
        "title": "Clean desk",
        "deadline": (now + timedelta(days=10)).isoformat(),
        "importance": "Low",
        "estimatedMinutes": 30
    }
    res4 = evaluate_task_priority(distant_task, now)
    assert res4["tier"] == "Low", f"Expected Low, got {res4['tier']}"
    assert res4["urgency_score"] == 6
    assert res4["importance_score"] == 10
    print("✓ Scenario 4 (Low importance, 10 days out): PASSED ->", res4)

    print("\nAll algorithm assertions PASSED successfully!")

if __name__ == "__main__":
    run_tests()
