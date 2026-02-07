import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

import {
  formatCompletionDate,
  groupActivitiesByWeek,
  sortWeekKeys
} from "../lib/activities"
import {
  buildCourseUrl,
  cleanCourseName,
  extractCourseIdFromHref
} from "../lib/dom"
import { calculateProgress, getCompletedCount, getProgressColor, getTotalCount } from "../lib/progress"
import type { CourseInfo, StudyListCourse } from "../lib/storage"
import { storage } from "../lib/storage"
import { borderRadius, colors, shadows, spacing } from "../lib/theme"

export const config: PlasmoCSConfig = {
  matches: ["https://lms.miva.university/my/courses.php*"],
  all_frames: false
}

let studyListCache: StudyListCourse[] = []
let coursesCache: { [key: string]: CourseInfo } = {}
let isProcessing = false
let debounceTimer: NodeJS.Timeout | null = null

const MyCoursesProgressIndicator = () => {
  const [, setCourses] = useState<{ [key: string]: CourseInfo }>({})
  const [, setStudyList] = useState<StudyListCourse[]>([])
  const [loading, setLoading] = useState(true)

  const initializeData = async () => {
    if (isProcessing) return
    isProcessing = true

    try {
      const [allCourses, studyListData] = await Promise.all([
        storage.getAllCourses(),
        storage.getStudyList()
      ])

      const courseMap: { [key: string]: CourseInfo } = {}
      allCourses.forEach((course) => {
        courseMap[course.courseId] = course
      })

      coursesCache = courseMap
      studyListCache = studyListData

      setCourses(courseMap)
      setStudyList(studyListData)

      let retryCount = 0
      const maxRetries = 20

      const waitForCourseCards = () => {
        const courseCards = document.querySelectorAll(
          '[data-region="course-content"]'
        )

        if (courseCards.length > 0) {
          addProgressIndicators()
          addBookmarkIcons()
          addStudyListSection()
          setLoading(false)
          isProcessing = false
        } else if (retryCount < maxRetries) {
          retryCount++
          setTimeout(waitForCourseCards, 500)
        } else {
          setLoading(false)
          isProcessing = false
        }
      }

      setTimeout(waitForCourseCards, 500)
    } catch (error) {
      console.error("Failed to load data:", error)
      setLoading(false)
      isProcessing = false
    }
  }

  const refreshStudyList = async () => {
    try {
      const list = await storage.getStudyList()
      studyListCache = list
      setStudyList(list)
      setTimeout(() => {
        addStudyListSection()
        addBookmarkIcons()
      }, 100)
    } catch (error) {
      console.error("Failed to refresh study list:", error)
    }
  }

  const toggleStudyList = async (
    courseId: string,
    courseName: string,
    courseUrl: string
  ) => {
    try {
      const isInList = studyListCache.some((c) => c.courseId === courseId)

      if (isInList) {
        await storage.removeFromStudyList(courseId)
      } else {
        const card = document
          .querySelector(
            `[data-region="course-content"] a[href*="course/view.php?id=${courseId}"]`
          )
          ?.closest('[data-region="course-content"]')
        const levelBadge =
          card
            ?.querySelector('.badge, [class*="level"], [class*="badge"]')
            ?.textContent?.trim() || ""
        const schoolText =
          card
            ?.querySelector('.text-muted, .small, [class*="school"]')
            ?.textContent?.trim() || ""

        await storage.addToStudyList({
          courseId,
          courseName,
          courseUrl,
          level: levelBadge,
          school: schoolText,
          addedAt: new Date().toISOString()
        })
      }

      await refreshStudyList()
    } catch (error) {
      console.error("Failed to toggle study list:", error)
    }
  }

  const addBookmarkIcons = () => {
    const courseCards = document.querySelectorAll(
      '[data-region="course-content"]'
    )
    const studyListIds = new Set(studyListCache.map((c) => c.courseId))

    courseCards.forEach((card) => {
      const courseLink = card.querySelector('a[href*="course/view.php?id="]')
      if (!courseLink) return

      const href = courseLink.getAttribute("href")
      const courseId = extractCourseIdFromHref(href || "")
      if (!courseId) return

      const courseNameElement =
        card.querySelector(
          '.coursename, .course-fullname, .card-title, .multiline, [class*="coursename"]'
        ) ||
        card.querySelector("h3, h4, h5") ||
        courseLink
      const courseName = cleanCourseName(
        courseNameElement?.textContent?.trim() || "Unknown Course"
      )
      const courseUrl = buildCourseUrl(href || "")

      const existingBookmark = card.querySelector(".lms-helper-bookmark")
      if (existingBookmark) existingBookmark.remove()

      const isInList = studyListIds.has(courseId)
      const bookmark = document.createElement("button")
      bookmark.className = "lms-helper-bookmark"
      bookmark.innerHTML = isInList ? "In My List" : "+ Add to List"
      bookmark.title = isInList
        ? "Remove from Study List"
        : "Add to current semester study list"
      bookmark.style.cssText = `
        background: ${isInList ? colors.darkBlue : colors.white};
        color: ${isInList ? colors.white : colors.darkBlue};
        border: 1px solid ${colors.darkBlue};
        border-radius: ${borderRadius.md};
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        margin-left: ${spacing.sm};
      `

      bookmark.addEventListener("mouseenter", () => {
        bookmark.style.background = isInList
          ? colors.darkGrayBlue
          : colors.darkBlue
        bookmark.style.color = colors.white
      })

      bookmark.addEventListener("mouseleave", () => {
        bookmark.style.background = isInList ? colors.darkBlue : colors.white
        bookmark.style.color = isInList ? colors.white : colors.darkBlue
      })

      bookmark.addEventListener("click", async (e) => {
        e.preventDefault()
        e.stopPropagation()
        await toggleStudyList(courseId, courseName, courseUrl)
      })

      const existingViewCourseBtn = card.querySelector(
        'a.btn[href*="course/view.php"], a[href*="course/view.php"].btn-outline-secondary, .coursemenubtn'
      )
      if (existingViewCourseBtn && existingViewCourseBtn.parentElement) {
        existingViewCourseBtn.parentElement.style.display = "flex"
        existingViewCourseBtn.parentElement.style.alignItems = "center"
        existingViewCourseBtn.parentElement.style.gap = spacing.sm
        existingViewCourseBtn.parentElement.style.flexWrap = "wrap"
        existingViewCourseBtn.insertAdjacentElement("afterend", bookmark)
      } else {
        const cardFooter =
          card.querySelector(".card-footer, .course-info-container, .card-body") ||
          card
        cardFooter.appendChild(bookmark)
      }
    })
  }

  const addStudyListSection = () => {
    const existingSection = document.querySelector(
      "#lms-helper-study-list-section"
    )
    if (existingSection) existingSection.remove()

    if (studyListCache.length === 0) return

    const mainContent =
      document.querySelector('#page-content, .main-content, [role="main"]') ||
      document.body
    const courseOverviewHeading =
      document.querySelector('h2.h4, h2[class*="h4"]') ||
      Array.from(document.querySelectorAll("h2, h3")).find((h) =>
        h.textContent?.trim().toLowerCase().includes("course overview")
      )

    const insertionParent =
      courseOverviewHeading?.parentElement ||
      document.querySelector('[data-region="courses-view"]')?.parentElement ||
      mainContent

    const section = document.createElement("div")
    section.id = "lms-helper-study-list-section"
    section.style.cssText = `
      margin-bottom: ${spacing.xxl};
      background: ${colors.darkBlue};
      border-radius: ${borderRadius.xl};
      box-shadow: ${shadows.md};
      overflow: hidden;
    `

    const studyListHtml = studyListCache
      .map((course) => {
        const courseData = coursesCache[course.courseId]
        const progress = courseData ? calculateProgress(courseData) : null
        const completedCount = courseData ? getCompletedCount(courseData) : 0
        const totalCount = courseData ? getTotalCount(courseData) : 0
        const name = cleanCourseName(course.courseName)
        const progressColor = progress !== null ? getProgressColor(progress) : ""

        return `
          <a href="${course.courseUrl}" class="study-list-card" style="
            background: rgba(255,255,255,0.08);
            border-radius: ${borderRadius.lg};
            padding: ${spacing.md};
            text-decoration: none;
            display: flex;
            flex-direction: column;
            gap: ${spacing.sm};
            transition: all 0.2s ease;
            border: 1px solid rgba(255,255,255,0.1);
            position: relative;
          ">
            <button class="remove-from-study-list" data-course-id="${course.courseId}" style="
              position: absolute;
              top: ${spacing.sm};
              right: ${spacing.sm};
              background: rgba(255,255,255,0.1);
              border: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              font-size: 14px;
              cursor: pointer;
              color: rgba(255,255,255,0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
            " title="Remove">x</button>
            <div style="display: flex; align-items: center; gap: ${spacing.sm}; padding-right: ${spacing.xl};">
              ${course.level ? `<span style="background: ${colors.dangerDark}; color: ${colors.white}; padding: 2px 6px; border-radius: ${borderRadius.sm}; font-size: 10px; font-weight: 600; flex-shrink: 0;">${course.level}</span>` : ""}
              <span style="color: ${colors.white}; font-size: 13px; font-weight: 500; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${name}</span>
            </div>
            ${
              progress !== null
                ? `
                <div style="display: flex; align-items: center; gap: ${spacing.sm};">
                  <div style="flex: 1; background: rgba(255,255,255,0.15); height: 4px; border-radius: 2px; overflow: hidden;">
                    <div style="background: ${progressColor}; height: 100%; width: ${progress}%;"></div>
                  </div>
                  <span style="color: ${progressColor}; font-size: 11px; font-weight: 600; min-width: 32px;">${progress}%</span>
                </div>
                <span style="color: rgba(255,255,255,0.5); font-size: 10px;">${completedCount}/${totalCount} done</span>
              `
                : `<span style="color: rgba(255,255,255,0.4); font-size: 10px;">Click to track progress</span>`
            }
          </a>
        `
      })
      .join("")

    section.innerHTML = `
      <div style="padding: ${spacing.lg} ${spacing.xl}; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div>
          <h2 style="margin: 0; color: ${colors.white}; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: ${spacing.sm};">
            My Study List
            <span style="background: rgba(255,255,255,0.2); color: ${colors.white}; padding: 2px 8px; border-radius: ${borderRadius.full}; font-size: 12px; font-weight: 500;">${studyListCache.length} courses</span>
          </h2>
        </div>
        <button id="toggle-study-list" style="background: transparent; border: none; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
          <span id="toggle-text">Collapse</span>
          <span id="toggle-icon" style="font-size: 10px;">^</span>
        </button>
      </div>
      <div id="study-list-content" style="padding: ${spacing.lg}; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: ${spacing.md};">
        ${studyListHtml}
      </div>
    `

    if (
      courseOverviewHeading &&
      courseOverviewHeading.parentElement === insertionParent
    ) {
      insertionParent.insertBefore(section, courseOverviewHeading)
    } else if (insertionParent.firstChild) {
      insertionParent.insertBefore(section, insertionParent.firstChild)
    } else {
      insertionParent.appendChild(section)
    }

    const toggleBtn = section.querySelector("#toggle-study-list")
    const toggleText = section.querySelector("#toggle-text")
    const toggleIcon = section.querySelector("#toggle-icon")
    const content = section.querySelector(
      "#study-list-content"
    ) as HTMLElement

    if (toggleBtn && content) {
      toggleBtn.addEventListener("click", () => {
        const isCollapsed = content.style.display === "none"
        content.style.display = isCollapsed ? "grid" : "none"
        if (toggleText) toggleText.textContent = isCollapsed ? "Collapse" : "Expand"
        if (toggleIcon) toggleIcon.textContent = isCollapsed ? "^" : "v"
      })
    }

    section.querySelectorAll(".study-list-card").forEach((card) => {
      const cardEl = card as HTMLElement
      cardEl.addEventListener("mouseenter", () => {
        cardEl.style.background = "rgba(255,255,255,0.15)"
        cardEl.style.borderColor = "rgba(255,255,255,0.25)"
        cardEl.style.transform = "translateY(-2px)"
      })
      cardEl.addEventListener("mouseleave", () => {
        cardEl.style.background = "rgba(255,255,255,0.08)"
        cardEl.style.borderColor = "rgba(255,255,255,0.1)"
        cardEl.style.transform = "translateY(0)"
      })
    })

    section.querySelectorAll(".remove-from-study-list").forEach((btn) => {
      const btnEl = btn as HTMLElement
      btnEl.addEventListener("mouseenter", () => {
        btnEl.style.background = "rgba(255,100,100,0.3)"
        btnEl.style.color = "#ff6b6b"
      })
      btnEl.addEventListener("mouseleave", () => {
        btnEl.style.background = "rgba(255,255,255,0.1)"
        btnEl.style.color = "rgba(255,255,255,0.6)"
      })
      btnEl.addEventListener("click", async (e) => {
        e.preventDefault()
        e.stopPropagation()
        const courseId = btnEl.getAttribute("data-course-id")
        if (courseId) {
          await storage.removeFromStudyList(courseId)
          await refreshStudyList()
        }
      })
    })
  }

  const addProgressIndicators = () => {
    const courseCards = document.querySelectorAll(
      '[data-region="course-content"]'
    )

    courseCards.forEach((card) => {
      const courseLink = card.querySelector('a[href*="course/view.php?id="]')
      if (!courseLink) return

      const href = courseLink.getAttribute("href")
      const courseId = extractCourseIdFromHref(href || "")
      if (!courseId) return

      const courseData = coursesCache[courseId]
      const existingIndicator = card.querySelector(
        ".lms-helper-progress-indicator"
      )
      if (existingIndicator) existingIndicator.remove()

      if (courseData) {
        const progress = calculateProgress(courseData)
        const completedCount = getCompletedCount(courseData)
        const totalCount = getTotalCount(courseData)
        const progressColor = getProgressColor(progress)

        const indicator = document.createElement("div")
        indicator.className = "lms-helper-progress-indicator"
        indicator.style.cssText = `
          margin-top: ${spacing.sm};
          padding: ${spacing.sm};
          background: ${colors.lightGray};
          border-radius: ${borderRadius.md};
          border-left: 4px solid ${progressColor};
          font-size: 12px;
          line-height: 1.4;
        `

        indicator.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 600; color: ${colors.textPrimary};">Study Progress</span>
            <span style="background: ${progressColor}; color: ${colors.white}; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 10px;">
              ${progress}%
            </span>
          </div>
          <div style="background: ${colors.gray}; height: 6px; border-radius: 3px; margin-bottom: 6px; overflow: hidden;">
            <div style="background: ${progressColor}; height: 100%; width: ${progress}%; transition: width 0.3s ease; border-radius: 3px;"></div>
          </div>
          <div style="color: ${colors.textSecondary}; font-size: 11px;">
            ${completedCount} of ${totalCount} activities completed
            ${totalCount > 0 ? ` - ${totalCount - completedCount} remaining` : ""}
          </div>
        `

        indicator.style.cursor = "pointer"
        indicator.title = "Click to view detailed progress"
        indicator.addEventListener("click", (e) => {
          e.preventDefault()
          e.stopPropagation()
          showDetailedProgress(courseData)
        })

        const courseContent =
          card.querySelector(".course-content") ||
          card.querySelector(".card-body") ||
          card.querySelector(".course-info-container")

        if (courseContent) {
          courseContent.appendChild(indicator)
        } else {
          card.appendChild(indicator)
        }
      }
    })
  }

  const showDetailedProgress = (courseData: CourseInfo) => {
    const existingModal = document.querySelector("#lms-course-progress-modal")
    if (existingModal) existingModal.remove()

    const activities = Object.values(courseData.activities)
    const completed = activities.filter((a) => a.completed).length
    const total = courseData.totalActivities || activities.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const grouped = groupActivitiesByWeek(activities)
    const sortedWeeks = sortWeekKeys(Object.keys(grouped))

    const weeksHtml =
      sortedWeeks.length === 0
        ? '<p style="text-align: center; color: #666; padding: 20px;">No activities tracked yet for this course.</p>'
        : sortedWeeks
            .map((weekName) => {
              const sectionsHtml = Object.keys(grouped[weekName])
                .map((sectionName) => {
                  const activitiesHtml = grouped[weekName][sectionName]
                    .map(
                      (activity) => `
                      <div style="display: flex; align-items: center; padding: 6px 0; font-size: 12px; border-bottom: 1px dotted ${colors.gray};">
                        <span style="margin-right: ${spacing.sm}; font-size: 14px;">${activity.completed ? "\u2705" : "\u2B55"}</span>
                        <span style="color: ${activity.completed ? colors.success : colors.textSecondary}; flex: 1;">${activity.name}</span>
                        ${activity.completed && activity.completedAt ? `<span style="color: ${colors.textMuted}; font-size: 10px; background: ${colors.lightGray}; padding: 2px 6px; border-radius: 10px;">${formatCompletionDate(activity.completedAt)}</span>` : ""}
                      </div>
                    `
                    )
                    .join("")

                  return `
                    <div style="margin-bottom: 15px;">
                      <h5 style="margin: 0 0 ${spacing.sm} 0; font-size: 13px; color: ${colors.textSecondary}; font-weight: 500;">${sectionName}</h5>
                      <div style="margin-left: ${spacing.md};">
                        ${activitiesHtml}
                      </div>
                    </div>
                  `
                })
                .join("")

              return `
                <div style="margin-bottom: ${spacing.xl}; border: 1px solid ${colors.gray}; border-radius: ${borderRadius.lg}; overflow: hidden;">
                  <div style="background: ${colors.lightGray}; padding: ${spacing.md} ${spacing.lg}; border-bottom: 1px solid ${colors.gray};">
                    <h4 style="margin: 0; font-size: 14px; color: ${colors.textPrimary}; font-weight: 600;">${weekName}</h4>
                  </div>
                  <div style="padding: ${spacing.md};">
                    ${sectionsHtml}
                  </div>
                </div>
              `
            })
            .join("")

    const backdrop = document.createElement("div")
    backdrop.id = "lms-course-progress-modal"
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
      backdrop-filter: blur(2px);
    `

    backdrop.innerHTML = `
      <div style="
        background: ${colors.white};
        border-radius: ${borderRadius.xl};
        padding: ${spacing.xxl};
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: ${shadows.lg};
        animation: modalSlideIn 0.3s ease-out;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${spacing.xl}; border-bottom: 2px solid ${colors.lightGray}; padding-bottom: 15px;">
          <div>
            <h2 style="margin: 0; color: ${colors.textPrimary}; font-size: 20px;">${courseData.courseName}</h2>
            <p style="margin: 5px 0 0 0; color: ${colors.textSecondary}; font-size: 14px;">Detailed Progress Overview</p>
          </div>
          <button id="close-modal" style="background: ${colors.danger}; color: ${colors.white}; border: none; padding: 8px 12px; border-radius: ${borderRadius.md}; cursor: pointer; font-size: 16px; font-weight: bold;">x</button>
        </div>

        <div style="margin-bottom: ${spacing.xl}; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: ${colors.white};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 18px; font-weight: 600;">Overall Progress</span>
            <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: ${borderRadius.full}; font-weight: bold; font-size: 16px;">
              ${percentage}%
            </span>
          </div>
          <div style="background: rgba(255,255,255,0.2); height: 12px; border-radius: 6px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, ${colors.success}, #8BC34A); height: 100%; width: ${percentage}%; border-radius: 6px;"></div>
          </div>
          <div style="margin-top: ${spacing.sm}; font-size: 14px; opacity: 0.9;">
            ${completed} of ${total} activities completed - ${total - completed} remaining
          </div>
        </div>

        <div style="max-height: 400px; overflow-y: auto;">
          ${weeksHtml}
        </div>

        <div style="text-align: center; margin-top: ${spacing.xl}; padding-top: 15px; border-top: 1px solid ${colors.gray};">
          <p style="margin: 0; font-size: 12px; color: ${colors.textMuted};">Last updated: ${new Date(courseData.lastUpdated).toLocaleString()}</p>
        </div>
      </div>
      <style>
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(-50px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      </style>
    `

    document.body.appendChild(backdrop)

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.remove()
    })

    const closeBtn = backdrop.querySelector("#close-modal")
    if (closeBtn) {
      closeBtn.addEventListener("click", () => backdrop.remove())
    }

    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        backdrop.remove()
        document.removeEventListener("keydown", escapeHandler)
      }
    }
    document.addEventListener("keydown", escapeHandler)
  }

  useEffect(() => {
    initializeData()

    const debouncedUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (!isProcessing) {
          addProgressIndicators()
          addBookmarkIcons()
        }
      }, 500)
    }

    const observer = new MutationObserver((mutations) => {
      const isRelevantMutation = mutations.some(
        (m) =>
          m.addedNodes.length > 0 &&
          Array.from(m.addedNodes).some(
            (node) =>
              node instanceof Element &&
              (node.matches('[data-region="course-content"]') ||
                node.querySelector?.('[data-region="course-content"]'))
          )
      )

      if (isRelevantMutation) {
        debouncedUpdate()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => {
      observer.disconnect()
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [])

  useEffect(() => {
    if (loading) {
      const indicator = document.createElement("div")
      indicator.id = "lms-helper-loading"
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors.primary};
        color: ${colors.white};
        padding: 8px 16px;
        border-radius: ${borderRadius.full};
        font-size: 12px;
        z-index: 1000;
        box-shadow: ${shadows.md};
      `
      indicator.textContent = "Loading progress indicators..."
      document.body.appendChild(indicator)

      return () => {
        const loadingEl = document.querySelector("#lms-helper-loading")
        if (loadingEl) loadingEl.remove()
      }
    }
  }, [loading])

  return null
}

export default MyCoursesProgressIndicator
