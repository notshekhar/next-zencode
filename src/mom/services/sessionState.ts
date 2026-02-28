export interface Task {
    id: string;
    task: string;
    status: "pending" | "completed" | "in_progress";
}

// In-memory state for the current session
let currentTasks: Task[] = [];

/**
 * Get all current tasks
 */
export function getTasks(): Task[] {
    return currentTasks;
}

/**
 * Add a new task
 */
export function addTask(task: string): void {
    currentTasks.push({
        id: Math.random().toString(36).substring(2, 9),
        task,
        status: "pending",
    });
}

/**
 * Update an existing task
 */
export function updateTask(
    id: string,
    task?: string,
    status?: "pending" | "in_progress" | "completed",
): void {
    const t = currentTasks.find((entry) => entry.id === id);
    if (t) {
        if (status) t.status = status;
        if (task) t.task = task;
    }
}

/**
 * Clear all tasks
 */
export function clearTasks(): void {
    currentTasks = [];
}
