import React from "react"

import { cleanCourseName } from "../lib/dom"
import { calculateProgress, getCompletedCount, getTotalCount } from "../lib/progress"
import type { CourseInfo, StudyListCourse } from "../lib/storage"
import { borderRadius, colors, spacing } from "../lib/theme"

import { Badge } from "./Badge"
import { ProgressBar } from "./ProgressBar"

interface CourseCardProps {
  course: CourseInfo | StudyListCourse
  courseData?: CourseInfo
  onRemove?: () => void
  onClick?: () => void
  variant?: "compact" | "full" | "dark"
}

function isCourseInfo(
  course: CourseInfo | StudyListCourse
): course is CourseInfo {
  return "activities" in course
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  courseData,
  onRemove,
  onClick,
  variant = "full"
}) => {
  const info = isCourseInfo(course) ? course : courseData
  const studyListCourse = !isCourseInfo(course) ? course : null

  const progress = info ? calculateProgress(info) : null
  const completedCount = info ? getCompletedCount(info) : 0
  const totalCount = info ? getTotalCount(info) : 0
  const courseName = cleanCourseName(course.courseName)

  const isDark = variant === "dark"
  const isCompact = variant === "compact"

  const baseStyles: React.CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.08)" : colors.white,
    borderRadius: borderRadius.lg,
    padding: isCompact ? spacing.md : spacing.lg,
    border: isDark
      ? "1px solid rgba(255,255,255,0.1)"
      : `1px solid ${colors.borderGray}`,
    cursor: onClick ? "pointer" : "default",
    transition: "all 0.2s ease",
    position: "relative"
  }

  const handleClick = () => {
    if (onClick) onClick()
    else if (studyListCourse?.courseUrl) {
      window.open(studyListCourse.courseUrl, "_blank")
    }
  }

  return (
    <div
      style={baseStyles}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (onClick || studyListCourse?.courseUrl) {
          e.currentTarget.style.transform = "translateY(-2px)"
          e.currentTarget.style.background = isDark
            ? "rgba(255,255,255,0.15)"
            : colors.lightGray
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)"
        e.currentTarget.style.background = isDark
          ? "rgba(255,255,255,0.08)"
          : colors.white
      }}>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          style={{
            position: "absolute",
            top: spacing.sm,
            right: spacing.sm,
            background: isDark ? "rgba(255,255,255,0.1)" : colors.lightGray,
            border: "none",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            fontSize: "14px",
            cursor: "pointer",
            color: isDark ? "rgba(255,255,255,0.6)" : colors.textSecondary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,100,100,0.3)"
            e.currentTarget.style.color = "#ff6b6b"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark
              ? "rgba(255,255,255,0.1)"
              : colors.lightGray
            e.currentTarget.style.color = isDark
              ? "rgba(255,255,255,0.6)"
              : colors.textSecondary
          }}
          title="Remove">
          x
        </button>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: spacing.sm,
          paddingRight: onRemove ? spacing.xl : 0
        }}>
        {studyListCourse?.level && (
          <Badge text={studyListCourse.level} variant="level" />
        )}
        <span
          style={{
            color: isDark ? colors.white : colors.textPrimary,
            fontSize: isCompact ? "13px" : "14px",
            fontWeight: 500,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical"
          }}>
          {courseName}
        </span>
      </div>

      {progress !== null && (
        <div style={{ marginTop: spacing.sm }}>
          <ProgressBar
            percentage={progress}
            height={4}
            showLabel
            variant={isDark ? "light" : "default"}
          />
          <span
            style={{
              color: isDark ? "rgba(255,255,255,0.5)" : colors.textMuted,
              fontSize: "10px",
              marginTop: spacing.xs,
              display: "block"
            }}>
            {completedCount}/{totalCount} done
          </span>
        </div>
      )}

      {progress === null && studyListCourse && (
        <span
          style={{
            color: isDark ? "rgba(255,255,255,0.4)" : colors.textMuted,
            fontSize: "10px",
            marginTop: spacing.sm,
            display: "block"
          }}>
          Click to track progress
        </span>
      )}
    </div>
  )
}

export default CourseCard
