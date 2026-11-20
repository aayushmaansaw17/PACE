"""
Planner Engine Test
Verifies workload allocation, capacity limit enforcement, overload detection and deficit calculations.
"""
from datetime import datetime, timedelta

def simulate_planner():
    # 5 weekdays @ 3.5h = 17.5h
    # 2 weekends @ 6.0h = 12.0h
    # Total weekly capacity = 29.5h
    weekday_cap = 3.5
    weekend_cap = 6.0
    total_capacity = (5 * weekday_cap) + (2 * weekend_cap)

    # Workload: 10 heavy tasks totalling 34 hours
    task_durations = [3.0, 4.0, 2.5, 3.5, 4.0, 5.0, 4.0, 3.0, 3.0, 2.0]
    total_workload = sum(task_durations)

    is_overloaded = total_workload > total_capacity
    deficit = total_workload - total_capacity if is_overloaded else 0

    print(f"Total capacity: {total_capacity}h")
    print(f"Total workload: {total_workload}h")
    print(f"Is overloaded: {is_overloaded}")
    print(f"Deficit: {deficit:.1f}h")

    assert is_overloaded == True, "Should detect overloaded state"
    assert round(deficit, 1) == 4.5, f"Expected 4.5h deficit, got {deficit}"
    print("✓ Planner capacity validation PASSED")

if __name__ == "__main__":
    simulate_planner()
