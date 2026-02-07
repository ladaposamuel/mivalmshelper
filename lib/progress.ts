import type { CourseInfo } from "./storage"

export function calculateProgress(course: CourseInfo): number {
  const activities = Object.values(course.activities)
  if (activities.length === 0) return 0
  const completed = activities.filter((a) => a.completed).length
  return Math.round((completed / activities.length) * 100)
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 70) return "#4CAF50"
  if (percentage >= 40) return "#FF9800"
  return "#f44336"
}

export function getProgressTextColor(percentage: number): string {
  if (percentage >= 70) return "#81C784"
  if (percentage >= 40) return "#FFB74D"
  return "#ef9a9a"
}

export function getCompletedCount(course: CourseInfo): number {
  return Object.values(course.activities).filter((a) => a.completed).length
}

export function getTotalCount(course: CourseInfo): number {
  return Object.values(course.activities).length
}

export function getRemainingCount(course: CourseInfo): number {
  const total = getTotalCount(course)
  const completed = getCompletedCount(course)
  return total - completed
}
