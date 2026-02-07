import React from "react"

import { getProgressColor } from "../lib/progress"
import { borderRadius, colors } from "../lib/theme"

type BadgeVariant = "success" | "warning" | "danger" | "info" | "level"

interface BadgeProps {
  text: string | number
  variant?: BadgeVariant
  size?: "small" | "medium"
  percentage?: number
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: colors.success, text: colors.white },
  warning: { bg: colors.warning, text: colors.white },
  danger: { bg: colors.danger, text: colors.white },
  info: { bg: colors.primary, text: colors.white },
  level: { bg: colors.dangerDark, text: colors.white }
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = "info",
  size = "small",
  percentage
}) => {
  const colorScheme =
    percentage !== undefined
      ? { bg: getProgressColor(percentage), text: colors.white }
      : variantColors[variant]

  const padding = size === "small" ? "2px 6px" : "3px 8px"
  const fontSize = size === "small" ? "10px" : "12px"

  return (
    <span
      style={{
        background: colorScheme.bg,
        color: colorScheme.text,
        padding,
        borderRadius: borderRadius.sm,
        fontSize,
        fontWeight: 600,
        display: "inline-block"
      }}>
      {text}
    </span>
  )
}

export default Badge
