import { useEffect, useState } from "react"

import { Badge, ProgressBar } from "../components"
import {
  calculateProgress,
  getCompletedCount,
  getRemainingCount,
  getTotalCount
} from "../lib/progress"
import type { CourseInfo } from "../lib/storage"
import { storage } from "../lib/storage"
import { borderRadius, colors, shadows, spacing } from "../lib/theme"

function SettingsPage() {
  const [courses, setCourses] = useState<CourseInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "progress" | "lastUpdated">(
    "name"
  )
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const courseData = await storage.getAllCourses()
      setCourses(courseData)
    } catch (error) {
      console.error("Failed to load courses:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteCourse = async (courseId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this course? This action cannot be undone."
      )
    ) {
      try {
        const key = `miva_lms_course_${courseId}`
        await new Promise<void>((resolve, reject) => {
          chrome.storage.local.remove([key], () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError)
            } else {
              resolve()
            }
          })
        })

        const updatedCourses = courses.filter((c) => c.courseId !== courseId)
        setCourses(updatedCourses)
      } catch (error) {
        console.error("Failed to delete course:", error)
        alert("Failed to delete course. Please try again.")
      }
    }
  }

  const clearAllData = async () => {
    if (
      confirm(
        "Are you sure you want to clear ALL progress data? This action cannot be undone."
      )
    ) {
      try {
        await storage.clearAll()
        setCourses([])
      } catch (error) {
        console.error("Failed to clear data:", error)
        alert("Failed to clear data. Please try again.")
      }
    }
  }

  const exportAllData = async () => {
    try {
      const data = {
        courses: courses,
        exportDate: new Date().toISOString(),
        version: "1.0"
      }
      const jsonData = JSON.stringify(data, null, 2)

      const blob = new Blob([jsonData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `miva-lms-progress-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export data:", error)
      alert("Failed to export data. Please try again.")
    }
  }

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!data.courses || !Array.isArray(data.courses)) {
        throw new Error("Invalid file format")
      }

      for (const course of data.courses) {
        await storage.saveCourse(course)
      }

      await loadCourses()
      alert(`Successfully imported ${data.courses.length} courses!`)
    } catch (error) {
      console.error("Failed to import data:", error)
      alert("Failed to import data. Please check the file format.")
    } finally {
      setImporting(false)
      event.target.value = ""
    }
  }

  const filteredAndSortedCourses = courses
    .filter((course) =>
      course.courseName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "progress":
          return calculateProgress(b) - calculateProgress(a)
        case "lastUpdated":
          return (
            new Date(b.lastUpdated).getTime() -
            new Date(a.lastUpdated).getTime()
          )
        default:
          return a.courseName.localeCompare(b.courseName)
      }
    })

  const totalActivitiesCompleted = courses.reduce(
    (acc, course) => acc + getCompletedCount(course),
    0
  )
  const totalActivities = courses.reduce(
    (acc, course) => acc + getTotalCount(course),
    0
  )
  const averageProgress =
    courses.length > 0
      ? Math.round(
          courses.reduce((acc, course) => acc + calculateProgress(course), 0) /
            courses.length
        )
      : 0

  if (loading) {
    return (
      <div
        style={{
          padding: spacing.xl,
          fontFamily: "Arial, sans-serif",
          maxWidth: 800,
          margin: "0 auto"
        }}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          Loading settings...
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: spacing.xl,
        fontFamily: "Arial, sans-serif",
        maxWidth: 800,
        margin: "0 auto"
      }}>
      <div style={{ marginBottom: "30px" }}>
        <h1
          style={{
            margin: 0,
            color: colors.textPrimary,
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
          Miva LMS Helper Settings
        </h1>
        <p style={{ margin: "5px 0", color: colors.textSecondary }}>
          Manage your tracked courses and progress data
        </p>
      </div>

      <div
        style={{
          marginBottom: spacing.xl,
          display: "flex",
          gap: "15px",
          alignItems: "center",
          flexWrap: "wrap"
        }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: `1px solid ${colors.borderGray}`,
              borderRadius: borderRadius.sm,
              fontSize: "14px"
            }}
          />
        </div>
        <div>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "name" | "progress" | "lastUpdated")
            }
            style={{
              padding: "8px 12px",
              border: `1px solid ${colors.borderGray}`,
              borderRadius: borderRadius.sm,
              fontSize: "14px"
            }}>
            <option value="name">Sort by Name</option>
            <option value="progress">Sort by Progress</option>
            <option value="lastUpdated">Sort by Last Updated</option>
          </select>
        </div>
      </div>

      <div
        style={{
          marginBottom: "30px",
          padding: "15px",
          backgroundColor: colors.lightGray,
          borderRadius: borderRadius.lg
        }}>
        <h3 style={{ margin: "0 0 10px 0", color: colors.textPrimary }}>
          Overview
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "15px"
          }}>
          <StatCard
            value={courses.length}
            label="Total Courses"
            color={colors.primary}
          />
          <StatCard
            value={totalActivitiesCompleted}
            label="Activities Completed"
            color={colors.success}
          />
          <StatCard
            value={totalActivities}
            label="Total Activities"
            color={colors.warning}
          />
          <StatCard
            value={`${averageProgress}%`}
            label="Average Progress"
            color="#9C27B0"
          />
        </div>
      </div>

      <div style={{ marginBottom: "30px" }}>
        <h3 style={{ margin: "0 0 15px 0", color: colors.textPrimary }}>
          Tracked Courses ({filteredAndSortedCourses.length})
        </h3>
        {filteredAndSortedCourses.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: colors.textSecondary
            }}>
            {searchTerm
              ? "No courses match your search."
              : "No courses tracked yet. Visit course pages on Miva LMS to start tracking!"}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "15px" }}>
            {filteredAndSortedCourses.map((course) => {
              const progress = calculateProgress(course)
              const completedCount = getCompletedCount(course)
              const totalCount = getTotalCount(course)
              const remainingCount = getRemainingCount(course)

              return (
                <div
                  key={course.courseId}
                  style={{
                    border: `1px solid ${colors.borderGray}`,
                    borderRadius: borderRadius.lg,
                    padding: "15px",
                    backgroundColor: colors.white,
                    boxShadow: shadows.sm
                  }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "10px"
                    }}>
                    <div style={{ flex: 1 }}>
                      <h4
                        style={{
                          margin: "0 0 5px 0",
                          color: colors.textPrimary,
                          fontSize: "16px"
                        }}>
                        {course.courseName}
                      </h4>
                      <div
                        style={{
                          fontSize: "12px",
                          color: colors.textSecondary
                        }}>
                        Course ID: {course.courseId} - Last updated:{" "}
                        {new Date(course.lastUpdated).toLocaleDateString()}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                      }}>
                      <Badge
                        text={`${progress}%`}
                        percentage={progress}
                        size="medium"
                      />
                      <button
                        onClick={() => deleteCourse(course.courseId)}
                        style={{
                          background: colors.danger,
                          color: colors.white,
                          border: "none",
                          padding: "4px 8px",
                          borderRadius: borderRadius.sm,
                          fontSize: "12px",
                          cursor: "pointer"
                        }}
                        title="Delete this course">
                        Delete
                      </button>
                    </div>
                  </div>

                  <ProgressBar percentage={progress} height={8} />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: colors.textSecondary,
                      marginTop: "10px"
                    }}>
                    <span>
                      {completedCount} of {totalCount} activities completed
                    </span>
                    <span>{remainingCount} remaining</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ marginBottom: "30px" }}>
        <h3 style={{ margin: "0 0 15px 0", color: colors.textPrimary }}>
          Data Management
        </h3>
        <div style={{ display: "grid", gap: "15px" }}>
          <DataCard
            title="Export Data"
            description="Download your progress data as a JSON file for backup or transfer."
            buttonText="Export All Data"
            buttonColor={colors.primary}
            onClick={exportAllData}
          />

          <div
            style={{
              padding: "15px",
              border: `1px solid ${colors.borderGray}`,
              borderRadius: borderRadius.lg
            }}>
            <h4 style={{ margin: "0 0 10px 0", color: colors.textPrimary }}>
              Import Data
            </h4>
            <p
              style={{
                margin: "0 0 10px 0",
                fontSize: "14px",
                color: colors.textSecondary
              }}>
              Import previously exported progress data. This will merge with
              existing data.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={importData}
              disabled={importing}
              style={{ marginBottom: "10px", fontSize: "14px" }}
            />
            {importing && (
              <div
                style={{ fontSize: "12px", color: colors.textSecondary }}>
                Importing...
              </div>
            )}
          </div>

          <div
            style={{
              padding: "15px",
              border: "1px solid #ffebee",
              borderRadius: borderRadius.lg,
              backgroundColor: "#ffebee"
            }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#d32f2f" }}>
              Clear All Data
            </h4>
            <p
              style={{
                margin: "0 0 10px 0",
                fontSize: "14px",
                color: colors.textSecondary
              }}>
              Permanently delete all tracked progress. This action cannot be
              undone.
            </p>
            <button
              onClick={clearAllData}
              style={{
                background: colors.danger,
                color: colors.white,
                border: "none",
                padding: "8px 16px",
                borderRadius: borderRadius.sm,
                cursor: "pointer",
                fontSize: "14px"
              }}>
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          padding: spacing.xl,
          borderTop: `1px solid ${colors.borderGray}`,
          color: colors.textSecondary,
          fontSize: "12px"
        }}>
        <p style={{ margin: 0 }}>
          Miva LMS Helper v1.0.0 - Made for Miva University students
        </p>
      </div>
    </div>
  )
}

interface StatCardProps {
  value: string | number
  label: string
  color: string
}

const StatCard: React.FC<StatCardProps> = ({ value, label, color }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: "24px", fontWeight: "bold", color }}>{value}</div>
    <div style={{ fontSize: "12px", color: colors.textSecondary }}>{label}</div>
  </div>
)

interface DataCardProps {
  title: string
  description: string
  buttonText: string
  buttonColor: string
  onClick: () => void
}

const DataCard: React.FC<DataCardProps> = ({
  title,
  description,
  buttonText,
  buttonColor,
  onClick
}) => (
  <div
    style={{
      padding: "15px",
      border: `1px solid ${colors.borderGray}`,
      borderRadius: borderRadius.lg
    }}>
    <h4 style={{ margin: "0 0 10px 0", color: colors.textPrimary }}>{title}</h4>
    <p
      style={{
        margin: "0 0 10px 0",
        fontSize: "14px",
        color: colors.textSecondary
      }}>
      {description}
    </p>
    <button
      onClick={onClick}
      style={{
        background: buttonColor,
        color: colors.white,
        border: "none",
        padding: "8px 16px",
        borderRadius: borderRadius.sm,
        cursor: "pointer",
        fontSize: "14px"
      }}>
      {buttonText}
    </button>
  </div>
)

export default SettingsPage
