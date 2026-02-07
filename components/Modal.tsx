import React, { useEffect, useRef } from "react"

import { borderRadius, colors, shadows, spacing } from "../lib/theme"

interface ModalProps {
  isOpen: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  maxWidth = "600px"
}) => {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.5)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(2px)"
      }}>
      <div
        style={{
          background: colors.white,
          borderRadius: borderRadius.xl,
          padding: spacing.xxl,
          maxWidth,
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: shadows.lg,
          animation: "modalSlideIn 0.3s ease-out"
        }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing.xl,
            borderBottom: `2px solid ${colors.lightGray}`,
            paddingBottom: "15px"
          }}>
          <div>
            <h2
              style={{
                margin: 0,
                color: colors.textPrimary,
                fontSize: "20px"
              }}>
              {title}
            </h2>
            {subtitle && (
              <p
                style={{
                  margin: "5px 0 0 0",
                  color: colors.textSecondary,
                  fontSize: "14px"
                }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: colors.danger,
              color: colors.white,
              border: "none",
              padding: "8px 12px",
              borderRadius: borderRadius.md,
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold"
            }}>
            x
          </button>
        </div>
        {children}
      </div>
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-50px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}

export default Modal
