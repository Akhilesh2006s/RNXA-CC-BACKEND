/** Jira-style main path: To Do → In Progress → In Review → Done */
export const TASK_WORKFLOW = ["Pending", "In Progress", "In Review", "Completed"];

export const TASK_STATUSES = [
  "Pending",
  "In Progress",
  "In Review",
  "Blocked",
  "Completed",
  "Overdue",
  "Archived"
];

export function workflowIndex(status) {
  return TASK_WORKFLOW.indexOf(status);
}

export function isAllowedTaskTransition(from, to) {
  if (from === to) return true;
  if (to === "Archived") return from === "Completed";
  if (to === "Overdue") return !["Completed", "Archived"].includes(from);
  if (to === "Blocked") return ["Pending", "In Progress", "In Review", "Overdue"].includes(from);
  if (from === "Blocked") return to === "In Progress" || to === "Pending";
  if (from === "Overdue") return to === "In Progress" || to === "Pending";
  if (from === "Completed" || from === "Archived") return false;

  const fromIdx = workflowIndex(from);
  const toIdx = workflowIndex(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return Math.abs(toIdx - fromIdx) === 1;
}

export function openSubtaskCount(subtasks) {
  return (subtasks ?? []).filter((s) => !s.done).length;
}

export function allSubtasksDone(subtasks) {
  const list = subtasks ?? [];
  return list.length === 0 || list.every((s) => s.done);
}
