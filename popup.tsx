import { useEffect, useState } from "react"

import { Badge, ProgressBar } from "./components"
import { cleanCourseName } from "./lib/dom"
import {
  calculateProgress,
  getCompletedCount,
  getProgressColor,
  getTotalCount
} from "./lib/progress"
import type { CourseInfo, StudyListCourse } from "./lib/storage"
import { storage } from "./lib/storage"
import { borderRadius, colors, spacing } from "./lib/theme"

function IndexPopup() {
  const [courses, setCourses] = useState<CourseInfo[]>([])
  const [studyList, setStudyList] = useState<StudyListCourse[]>([])
  const [studyListExpanded, setStudyListExpanded] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allCourses, studyListData] = await Promise.all([
          storage.getAllCourses(),
          storage.getStudyList()
        ])
        setCourses(allCourses)
        setStudyList(studyListData)
      } catch (error) {
        console.error("Failed to load data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const clearProgress = async () => {
    if (confirm("Are you sure you want to clear all progress data?")) {
      try {
        await storage.clearAll()
        setCourses([])
      } catch (error) {
        console.error("Failed to clear data:", error)
      }
    }
  }

  const openSettings = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("tabs/settings.html")
    })
  }

  const removeFromStudyList = async (courseId: string) => {
    try {
      await storage.removeFromStudyList(courseId)
      setStudyList(studyList.filter((c) => c.courseId !== courseId))
    } catch (error) {
      console.error("Failed to remove from study list:", error)
    }
  }

  const openCourse = (courseUrl: string) => {
    chrome.tabs.create({ url: courseUrl })
  }

  const getLastActivityDate = (course: CourseInfo): string => {
    const completedDates = Object.values(course.activities)
      .filter((a) => a.completedAt)
      .map((a) => new Date(a.completedAt!).getTime())

    if (completedDates.length === 0) return "Never"
    return new Date(Math.max(...completedDates)).toLocaleDateString()
  }

  if (loading) {
    return (
      <div style={{ padding: spacing.lg, width: 350, minHeight: 200 }}>
        <div style={{ textAlign: "center", padding: spacing.xl }}>
          Loading your progress...
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: spacing.lg, width: 350, minHeight: 200 }}>
      <div style={{ marginBottom: spacing.lg }}>
        <h2 style={{ margin: 0, fontSize: "18px", color: colors.textPrimary }}>
          Miva LMS Study Helper
        </h2>
        <p
          style={{
            margin: "4px 0",
            fontSize: "12px",
            color: colors.textSecondary
          }}>
          Track your learning progress across all courses
        </p>
      </div>

      {studyList.length > 0 && (
        <div
          style={{
            marginBottom: spacing.lg,
            border: `1px solid ${colors.borderGray}`,
            borderRadius: borderRadius.lg,
            overflow: "hidden"
          }}>
          <div
            onClick={() => setStudyListExpanded(!studyListExpanded)}
            style={{
              padding: spacing.md,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: colors.white
                }}>
                My Study List ({studyList.length})
              </h3>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.9)"
                }}>
                Current semester courses
              </p>
            </div>
            <span style={{ color: colors.white, fontSize: "18px" }}>
              {studyListExpanded ? "v" : ">"}
            </span>
          </div>

          {studyListExpanded && (
            <div
              style={{
                padding: spacing.md,
                background: colors.lightGray,
                maxHeight: 300,
                overflowY: "auto"
              }}>
              {studyList.map((course) => {
                const courseData = courses.find(
                  (c) => c.courseId === course.courseId
                )
                const progress = courseData ? calculateProgress(courseData) : 0
                const completedCount = courseData
                  ? getCompletedCount(courseData)
                  : 0
                const totalCount = courseData ? getTotalCount(courseData) : 0

                return (
                  <div
                    key={course.courseId}
                    style={{
                      marginBottom: spacing.sm,
                      padding: "10px",
                      background: colors.white,
                      border: `1px solid ${colors.borderGray}`,
                      borderRadius: borderRadius.md
                    }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "6px"
                      }}>
                      <div style={{ flex: 1 }}>
                        {course.level && (
                          <Badge
                            text={course.level}
                            variant="level"
                            size="small"
                          />
                        )}
                        <h4
                          style={{
                            margin: "4px 0",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: colors.textPrimary
                          }}>
                          {cleanCourseName(course.courseName)}
                        </h4>
                        {course.school && (
                          <p
                            style={{
                              margin: 0,
                              fontSize: "10px",
                              color: colors.textSecondary
                            }}>
                            {course.school}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFromStudyList(course.courseId)
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          fontSize: "16px",
                          cursor: "pointer",
                          padding: 0,
                          color: colors.textMuted,
                          marginLeft: spacing.sm
                        }}
                        title="Remove from Study List">
                        x
                      </button>
                    </div>

                    {courseData && (
                      <>
                        <ProgressBar percentage={progress} height={4} />
                        <div
                          style={{
                            fontSize: "10px",
                            color: colors.textSecondary,
                            marginTop: "4px",
                            marginBottom: "6px"
                          }}>
                          {completedCount} of {totalCount} completed -{" "}
                          {progress}%
                        </div>
                      </>
                    )}

                    <button
                      onClick={() => openCourse(course.courseUrl)}
                      style={{
                        width: "100%",
                        background: colors.primary,
                        color: colors.white,
                        border: "none",
                        padding: "6px 8px",
                        borderRadius: borderRadius.sm,
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}>
                      Open Course
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {courses.length === 0 ? (
        <div style={{ textAlign: "center", padding: spacing.xl }}>
          <p style={{ margin: "8px 0" }}>No progress tracked yet!</p>
          <p
            style={{
              margin: "8px 0",
              fontSize: "12px",
              color: colors.textSecondary
            }}>
            Visit course pages on Miva LMS to start tracking your progress.
          </p>
        </div>
      ) : (
        <div>
          {courses.map((course) => {
            const progress = calculateProgress(course)
            const completedCount = getCompletedCount(course)
            const totalCount = getTotalCount(course)

            return (
              <div
                key={course.courseId}
                style={{
                  marginBottom: spacing.md,
                  padding: spacing.md,
                  border: `1px solid ${colors.borderGray}`,
                  borderRadius: borderRadius.lg
                }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: spacing.sm
                  }}>
                  <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
                    {course.courseName}
                  </h3>
                  <Badge text={`${progress}%`} percentage={progress} />
                </div>

                <ProgressBar percentage={progress} height={6} />

                <div
                  style={{
                    fontSize: "11px",
                    color: colors.textSecondary,
                    marginTop: spacing.sm
                  }}>
                  <div>
                    {completedCount} of {totalCount} activities completed
                  </div>
                  {totalCount > 0 && (
                    <div style={{ marginTop: "2px" }}>
                      Last activity: {getLastActivityDate(course)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div
        style={{
          marginTop: spacing.lg,
          display: "flex",
          gap: spacing.sm,
          justifyContent: "center"
        }}>
        <button
          onClick={openSettings}
          style={{
            background: colors.primary,
            color: colors.white,
            border: "none",
            padding: "6px 12px",
            borderRadius: borderRadius.sm,
            fontSize: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}>
          Settings
        </button>
        <button
          onClick={clearProgress}
          style={{
            background: colors.danger,
            color: colors.white,
            border: "none",
            padding: "6px 12px",
            borderRadius: borderRadius.sm,
            fontSize: "12px",
            cursor: "pointer"
          }}>
          Clear All
        </button>
      </div>
    </div>
  )
}

export default IndexPopup
