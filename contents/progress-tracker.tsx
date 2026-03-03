import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

import {
  formatCompletionDate,
  groupActivitiesByWeek,
  sortWeekKeys
} from "../lib/activities"
import { extractCourseIdFromUrl } from "../lib/dom"
import { calculateProgress, getCompletedCount, getProgressColor, getTotalCount } from "../lib/progress"
import type { ActivityInfo, CourseInfo } from "../lib/storage"
import { CourseIndexScraper, storage } from "../lib/storage"
import { borderRadius, colors, shadows, spacing } from "../lib/theme"

export const config: PlasmoCSConfig = {
  matches: ["https://lms.miva.university/course/view.php*"],
  all_frames: false
}

/**
 * Attempts to resolve the human-readable course name using, in order:
 *  1. Common Moodle page-header selectors
 *  2. The study list entry (which was captured from the My Courses page and
 *     always has the real name)
 *  3. The previously-stored name (so we never downgrade to "Unknown Course"
 *     if the page hasn't fully loaded yet)
 */
async function resolveCourseNameForId(
  courseId: string,
  storedName?: string
): Promise<string> {
  const pageSelectors = [
    ".page-header-headings h1",
    "#page-header h1",
    "h1.h2",
    ".course-fullname",
    '[data-region="course-name"]',
    ".breadcrumb-item:last-child a",
    ".breadcrumb-item a"
  ]

  for (const selector of pageSelectors) {
    const text = document.querySelector(selector)?.textContent?.trim()
    if (text && text.length > 3 && text !== "Unknown Course") return text
  }

  try {
    const studyList = await storage.getStudyList()
    const entry = studyList.find((c) => c.courseId === courseId)
    if (entry?.courseName) return entry.courseName
  } catch {
    // non-critical
  }

  return storedName && storedName !== "Unknown Course"
    ? storedName
    : "Unknown Course"
}

const ProgressTracker = () => {
  const [progress, setProgress] = useState<CourseInfo | null>(null)

  useEffect(() => {
    const initializeTracker = async () => {
      const url = window.location.href
      const courseId = extractCourseIdFromUrl(url)
      if (!courseId) return

      try {
        await storage.init()
        let courseInfo = await storage.getCourse(courseId)

        const courseName = await resolveCourseNameForId(courseId, courseInfo?.courseName)

        if (!courseInfo) {
          const scrapedData = CourseIndexScraper.scrapeCourseIndex(courseId)
          courseInfo = {
            courseId,
            courseName,
            activities: {},
            totalActivities: scrapedData.totalCount,
            lastUpdated: new Date().toISOString()
          }
          scrapedData.activities.forEach((activity) => {
            courseInfo!.activities[activity.id] = activity
          })
        } else {
          if (courseName && courseName !== "Unknown Course") {
            courseInfo.courseName = courseName
          }
          const scrapedData = CourseIndexScraper.scrapeCourseIndex(courseId)
          courseInfo.totalActivities = scrapedData.totalCount

          scrapedData.activities.forEach((activity) => {
            if (!courseInfo!.activities[activity.id]) {
              courseInfo!.activities[activity.id] = activity
            } else {
              courseInfo!.activities[activity.id].name = activity.name
              courseInfo!.activities[activity.id].sectionName =
                activity.sectionName
              if (activity.completed && !courseInfo!.activities[activity.id].completed) {
                courseInfo!.activities[activity.id].completed = true
                courseInfo!.activities[activity.id].completedAt =
                  activity.completedAt || new Date().toISOString()
              }
            }
          })

          const scrapedIds = new Set(scrapedData.activities.map(a => a.id))
          Object.keys(courseInfo.activities).forEach(id => {
            if (!scrapedIds.has(id)) {
              delete courseInfo!.activities[id]
            }
          })
        }

        await storage.saveCourse(courseInfo)
        setProgress(courseInfo)
      } catch (error) {
        // Silent fail
      }
    }

    setTimeout(initializeTracker, 1000)
  }, [])

  useEffect(() => {
    if (!progress) return

    const addProgressIndicators = async () => {
      const courseId = extractCourseIdFromUrl(window.location.href)
      if (!courseId) return

      try {
        const courseInfo = await storage.getCourse(courseId)
        if (!courseInfo) return

        const activityLinks = document.querySelectorAll(
          'a[href*="mod/"][href*="id="]'
        )

        activityLinks.forEach((link) => {
          const href = link.getAttribute("href")
          if (!href) return

          const activityMatch = href.match(/mod\/\w+\/view\.php\?id=(\d+)/)
          if (!activityMatch) return

          const activityId = activityMatch[1]
          const activity = courseInfo.activities[activityId]
          const isCompleted = activity?.completed

          const existingCheckmark = link.querySelector(".progress-checkmark")
          if (existingCheckmark) existingCheckmark.remove()

          if (isCompleted) {
            const checkmark = document.createElement("span")
            checkmark.className = "progress-checkmark"
            checkmark.innerHTML = "\u2705 "
            checkmark.style.marginRight = "4px"
            checkmark.style.fontSize = "12px"
            checkmark.style.display = "inline"
            checkmark.title = `Completed on ${formatCompletionDate(activity.completedAt)}`

            const h5Element = link.querySelector("h5")
            if (h5Element) {
              h5Element.prepend(checkmark)
            } else {
              link.prepend(checkmark)
            }
          }
        })
      } catch (error) {
        // Silent fail
      }
    }

    setTimeout(addProgressIndicators, 500)

    const dropdownToggle = document.querySelector(
      "#courseActivities .dropdown-toggle"
    )
    if (dropdownToggle) {
      dropdownToggle.addEventListener("click", () => {
        setTimeout(addProgressIndicators, 800)
      })
    }
  }, [progress])

  useEffect(() => {
    const addNavbarButton = () => {
      if (document.querySelector("#lms-helper-btn")) return

      const navbar =
        document.querySelector("#moremenu-6848b13cb0089-navbar-nav") ||
        document.querySelector(".primary-navigation .navbar-nav")

      if (navbar) {
        const listItem = document.createElement("li")
        listItem.className = "nav-item"
        listItem.setAttribute("data-key", "lms-helper")

        const link = document.createElement("a")
        link.id = "lms-helper-btn"
        link.className = "nav-link"
        link.href = "#"
        link.role = "menuitem"
        link.tabIndex = -1
        link.title = "Study Progress"
        link.innerHTML = "Study Progress"

        link.addEventListener("click", (e) => {
          e.preventDefault()
          showProgressModal()
        })

        listItem.appendChild(link)

        const reportsItem = Array.from(navbar.children).find((item) =>
          item.textContent?.includes("Reports & Analytics")
        )

        if (reportsItem && reportsItem.nextSibling) {
          navbar.insertBefore(listItem, reportsItem.nextSibling)
        } else {
          navbar.appendChild(listItem)
        }
      }
    }

    setTimeout(addNavbarButton, 2000)
  }, [])

  const showProgressModal = () => {
    const existingModal = document.querySelector("#lms-progress-modal")
    if (existingModal) existingModal.remove()

    const backdrop = document.createElement("div")
    backdrop.id = "lms-progress-modal"
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `

    const modal = document.createElement("div")
    modal.style.cssText = `
      background: ${colors.white};
      border-radius: ${borderRadius.lg};
      padding: ${spacing.xl};
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: ${shadows.lg};
    `

    const loadProgressData = async () => {
      try {
        const courses = await storage.getAllCourses()

        const coursesHtml =
          courses.length === 0
            ? `<p style="text-align: center; color: ${colors.textSecondary};">No progress tracked yet. Visit course activities to start tracking!</p>`
            : courses
                .map((course) => {
                  const activities = Object.values(course.activities)
                  const completed = activities.filter((a) => a.completed).length
                  const total = course.totalActivities || activities.length
                  const percentage =
                    total > 0 ? Math.round((completed / total) * 100) : 0
                  const progressColor = getProgressColor(percentage)
                  const grouped = groupActivitiesByWeek(activities)
                  const sortedWeeks = sortWeekKeys(Object.keys(grouped))

                  const weeksHtml = sortedWeeks
                    .map((weekName) => {
                      const sectionsHtml = Object.keys(grouped[weekName])
                        .map((sectionName) => {
                          const activitiesHtml = grouped[weekName][sectionName]
                            .map(
                              (activity: ActivityInfo) => `
                              <div style="display: flex; align-items: center; padding: 3px 0; font-size: 11px;">
                                <span style="margin-right: 6px;">${activity.completed ? "\u2705" : "\u2B55"}</span>
                                <span style="color: ${activity.completed ? colors.success : colors.textSecondary}; flex: 1;">${activity.name}</span>
                                ${activity.completed && activity.completedAt ? `<span style="color: ${colors.textMuted}; font-size: 9px;">${formatCompletionDate(activity.completedAt)}</span>` : ""}
                              </div>
                            `
                            )
                            .join("")

                          return `
                            <div style="margin-bottom: ${spacing.md};">
                              <h5 style="margin: 0 0 6px 0; font-size: 12px; color: ${colors.textSecondary}; font-weight: 500;">${sectionName}</h5>
                              <div style="margin-left: ${spacing.sm};">
                                ${activitiesHtml}
                              </div>
                            </div>
                          `
                        })
                        .join("")

                      return `
                        <div style="margin-bottom: ${spacing.xl}; border: 1px solid ${colors.lightGray}; border-radius: ${borderRadius.sm}; overflow: hidden;">
                          <div style="background: ${colors.lightGray}; padding: ${spacing.sm} ${spacing.md}; border-bottom: 1px solid ${colors.gray};">
                            <h4 style="margin: 0; font-size: 13px; color: ${colors.textPrimary}; font-weight: 600;">${weekName}</h4>
                          </div>
                          <div style="padding: ${spacing.sm};">
                            ${sectionsHtml}
                          </div>
                        </div>
                      `
                    })
                    .join("")

                  return `
                    <div style="margin-bottom: 15px; border: 1px solid ${colors.borderGray}; border-radius: ${borderRadius.md}; overflow: hidden;">
                      <div class="course-header" data-course-id="${course.courseId}" style="padding: 15px; cursor: pointer; background: ${colors.lightGray};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${spacing.sm};">
                          <h3 style="margin: 0; font-size: 16px; color: ${colors.textPrimary};">${course.courseName}</h3>
                          <div style="display: flex; align-items: center; gap: ${spacing.sm};">
                            <span style="background: ${progressColor}; color: ${colors.white}; padding: 3px 8px; border-radius: ${borderRadius.sm}; font-size: 12px;">${percentage}%</span>
                            <span style="font-size: 12px; color: ${colors.textSecondary};">v</span>
                          </div>
                        </div>
                        <div style="background: ${colors.gray}; height: 8px; border-radius: ${borderRadius.sm}; margin-bottom: ${spacing.sm};">
                          <div style="background: ${progressColor}; height: 100%; border-radius: ${borderRadius.sm}; width: ${percentage}%; transition: width 0.3s ease;"></div>
                        </div>
                        <p style="margin: 0; font-size: 12px; color: ${colors.textSecondary};">${completed} of ${total} activities completed</p>
                      </div>
                      <div class="course-details" data-course-id="${course.courseId}" style="display: none; padding: 15px; background: ${colors.white}; border-top: 1px solid ${colors.borderGray};">
                        ${weeksHtml}
                      </div>
                    </div>
                  `
                })
                .join("")

        modal.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${spacing.xl};">
            <h2 style="margin: 0; color: ${colors.textPrimary};">Study Progress</h2>
            <button id="close-modal" style="background: ${colors.danger}; color: ${colors.white}; border: none; padding: 5px 10px; border-radius: ${borderRadius.sm}; cursor: pointer;">x</button>
          </div>
          ${coursesHtml}
          <div style="text-align: center; margin-top: 15px;">
            <button id="clear-progress" style="background: ${colors.danger}; color: ${colors.white}; border: none; padding: 8px 16px; border-radius: ${borderRadius.sm}; cursor: pointer; font-size: 12px;">Clear All Progress</button>
          </div>
        `

        setTimeout(() => {
          const courseHeaders = modal.querySelectorAll(".course-header")
          courseHeaders.forEach((header) => {
            header.addEventListener("click", () => {
              const courseId = header.getAttribute("data-course-id")
              const details = modal.querySelector(
                `.course-details[data-course-id="${courseId}"]`
              )
              const arrow = header.querySelector("span:last-child")

              if (details) {
                const detailsElement = details as HTMLElement
                const isVisible = detailsElement.style.display !== "none"
                detailsElement.style.display = isVisible ? "none" : "block"
                if (arrow) arrow.textContent = isVisible ? "v" : "^"
              }
            })
          })
        }, 100)
      } catch (error) {
        modal.innerHTML = `<p style="text-align: center; color: ${colors.danger};">Failed to load progress data</p>`
      }
    }

    loadProgressData()

    backdrop.appendChild(modal)
    document.body.appendChild(backdrop)

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.remove()
    })

    setTimeout(() => {
      const closeBtn = document.querySelector("#close-modal")
      const clearBtn = document.querySelector("#clear-progress")

      if (closeBtn) {
        closeBtn.addEventListener("click", () => backdrop.remove())
      }

      if (clearBtn) {
        clearBtn.addEventListener("click", async () => {
          if (confirm("Are you sure you want to clear all progress data?")) {
            try {
              await storage.clearAll()
              chrome.storage.local.clear()
              backdrop.remove()
            } catch (error) {
              chrome.storage.local.clear(() => backdrop.remove())
            }
          }
        })
      }
    }, 100)
  }

  return null
}

export default ProgressTracker
