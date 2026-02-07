import type { ActivityInfo } from "./storage"

export interface WeekGroup {
  [sectionName: string]: ActivityInfo[]
}

export interface GroupedActivities {
  [weekKey: string]: WeekGroup
}

export function groupActivitiesByWeek(
  activities: ActivityInfo[]
): GroupedActivities {
  return activities.reduce((acc, activity) => {
    const weekKey = activity.weekNumber
      ? `Week ${activity.weekNumber}`
      : "General"
    if (!acc[weekKey]) acc[weekKey] = {}

    const sectionName = activity.sectionName || "General"
    if (!acc[weekKey][sectionName]) acc[weekKey][sectionName] = []
    acc[weekKey][sectionName].push(activity)

    return acc
  }, {} as GroupedActivities)
}

export function sortWeekKeys(weeks: string[]): string[] {
  return weeks.sort((a, b) => {
    if (a === "General") return 1
    if (b === "General") return -1
    const aNum = parseInt(a.match(/\d+/)?.[0] || "0")
    const bNum = parseInt(b.match(/\d+/)?.[0] || "0")
    return aNum - bNum
  })
}

export function formatCompletionDate(dateString?: string): string {
  if (!dateString) return ""
  return new Date(dateString).toLocaleDateString()
}
