import React from "react"

import { getProgressColor } from "../lib/progress"
import { borderRadius, colors } from "../lib/theme"

interface ProgressBarProps {
  percentage: number
  height?: number
  showLabel?: boolean
  backgroundColor?: string
  variant?: "default" | "light"
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  height = 8,
  showLabel = false,
  backgroundColor,
  variant = "default"
}) => {
  const progressColor = getProgressColor(percentage)
  const bgColor =
    backgroundColor ||
    (variant === "light" ? "rgba(255,255,255,0.15)" : colors.gray)

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          flex: 1,
          background: bgColor,
          height: `${height}px`,
          borderRadius: borderRadius.sm,
          overflow: "hidden"
        }}>
        <div
          style={{
            background: progressColor,
            height: "100%",
            width: `${percentage}%`,
            transition: "width 0.3s ease",
            borderRadius: borderRadius.sm
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            color: progressColor,
            fontSize: "12px",
            fontWeight: 600,
            minWidth: "32px"
          }}>
          {percentage}%
        </span>
      )}
    </div>
  )
}

export default ProgressBar
