import React from "react"

import {
  formatCompletionDate,
  groupActivitiesByWeek,
  sortWeekKeys
} from "../lib/activities"
import type { ActivityInfo } from "../lib/storage"
import { borderRadius, colors, spacing } from "../lib/theme"

interface ActivityListProps {
  activities: ActivityInfo[]
  groupByWeek?: boolean
  compact?: boolean
}

export const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  groupByWeek = true,
  compact = false
}) => {
  if (activities.length === 0) {
    return (
      <p style={{ textAlign: "center", color: colors.textSecondary, padding: spacing.xl }}>
        No activities tracked yet for this course.
      </p>
    )
  }

  if (!groupByWeek) {
    return (
      <div>
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} compact={compact} />
        ))}
      </div>
    )
  }

  const grouped = groupActivitiesByWeek(activities)
  const sortedWeeks = sortWeekKeys(Object.keys(grouped))

  return (
    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
      {sortedWeeks.map((weekName) => (
        <div
          key={weekName}
          style={{
            marginBottom: spacing.xl,
            border: `1px solid ${colors.gray}`,
            borderRadius: borderRadius.lg,
            overflow: "hidden"
          }}>
          <div
            style={{
              background: colors.lightGray,
              padding: `${spacing.md} ${spacing.lg}`,
              borderBottom: `1px solid ${colors.gray}`
            }}>
            <h4
              style={{
                margin: 0,
                fontSize: "14px",
                color: colors.textPrimary,
                fontWeight: 600
              }}>
              {weekName}
            </h4>
          </div>
          <div style={{ padding: spacing.md }}>
            {Object.keys(grouped[weekName]).map((sectionName) => (
              <div key={sectionName} style={{ marginBottom: "15px" }}>
                <h5
                  style={{
                    margin: `0 0 ${spacing.sm} 0`,
                    fontSize: "13px",
                    color: colors.textSecondary,
                    fontWeight: 500
                  }}>
                  {sectionName}
                </h5>
                <div style={{ marginLeft: spacing.md }}>
                  {grouped[weekName][sectionName].map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      compact={compact}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface ActivityItemProps {
  activity: ActivityInfo
  compact?: boolean
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, compact }) => {
  const fontSize = compact ? "11px" : "12px"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: `${spacing.xs} 0`,
        fontSize,
        borderBottom: `1px dotted ${colors.gray}`
      }}>
      <span style={{ marginRight: spacing.sm, fontSize: "14px" }}>
        {activity.completed ? "\u2705" : "\u2B55"}
      </span>
      <span
        style={{
          color: activity.completed ? colors.success : colors.textSecondary,
          flex: 1
        }}>
        {activity.name}
      </span>
      {activity.completed && activity.completedAt && (
        <span
          style={{
            color: colors.textMuted,
            fontSize: "10px",
            background: colors.lightGray,
            padding: "2px 6px",
            borderRadius: borderRadius.full
          }}>
          {formatCompletionDate(activity.completedAt)}
        </span>
      )}
    </div>
  )
}

export default ActivityList
