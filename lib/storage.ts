export interface ActivityInfo {
  id: string
  name: string
  completed: boolean
  completedAt?: string
  type: string
  sectionName?: string
  weekNumber?: number
}

export interface CourseInfo {
  courseId: string
  courseName: string
  activities: { [key: string]: ActivityInfo }
  totalActivities: number
  lastUpdated: string
}

export interface StudyListCourse {
  courseId: string
  courseName: string
  courseUrl: string
  level?: string
  school?: string
  addedAt: string
}

/**
 * Wraps chrome.storage.local and chrome.storage.sync for the LMS helper.
 *
 * Study list data is written to sync storage (primary) so it survives profile
 * resets and syncs across devices, with local storage kept as a fast-read
 * cache/fallback for when sync is unavailable. Course progress data stays in
 * local storage only — it can be large and is easily re-derived by visiting a
 * course page, so it does not need cross-device durability.
 */
class LMSStorage {
  private readonly localPrefix = "miva_lms_"
  private readonly syncPrefix = "miva_lms_sync_"
  private readonly syncStudyListKey = "miva_lms_sync_study_list"
  private readonly localStudyListKey = "miva_lms_study_list"

  /**
   * Must be called once on extension startup. Migrates any study list data
   * that was previously stored only in local storage over to sync storage.
   */
  async init(): Promise<void> {
    await this.migrateStudyListToSync()
  }

  private migrateStudyListToSync(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.localStudyListKey], (localResult) => {
        if (chrome.runtime.lastError || !localResult[this.localStudyListKey]?.length) {
          resolve()
          return
        }

        const localList: StudyListCourse[] = localResult[this.localStudyListKey]

        chrome.storage.sync.get([this.syncStudyListKey], (syncResult) => {
          if (chrome.runtime.lastError) {
            resolve()
            return
          }

          const syncList: StudyListCourse[] = syncResult[this.syncStudyListKey] || []
          const syncIds = new Set(syncList.map((c) => c.courseId))
          const merged = [
            ...syncList,
            ...localList.filter((c) => !syncIds.has(c.courseId))
          ]

          chrome.storage.sync.set({ [this.syncStudyListKey]: merged }, () => {
            if (chrome.runtime.lastError) {
              console.error("Study list migration to sync failed:", chrome.runtime.lastError)
              resolve()
              return
            }

            chrome.storage.local.remove([this.localStudyListKey], () => {
              console.log(`Migrated ${localList.length} study list courses to sync storage`)
              resolve()
            })
          })
        })
      })
    })
  }

  async saveCourse(courseInfo: CourseInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      courseInfo.lastUpdated = new Date().toISOString()
      const key = `${this.localPrefix}course_${courseInfo.courseId}`

      chrome.storage.local.set({ [key]: courseInfo }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }

  async getCourse(courseId: string): Promise<CourseInfo | null> {
    return new Promise((resolve, reject) => {
      const key = `${this.localPrefix}course_${courseId}`

      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result[key] ?? null)
        }
      })
    })
  }

  async getAllCourses(): Promise<CourseInfo[]> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
          return
        }

        const courses: CourseInfo[] = []
        for (const key of Object.keys(result)) {
          if (key.startsWith(`${this.localPrefix}course_`)) {
            courses.push(result[key])
          }
        }

        resolve(courses)
      })
    })
  }

  async clearAll(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
          return
        }

        const keysToRemove = Object.keys(result).filter((k) =>
          k.startsWith(this.localPrefix)
        )

        if (keysToRemove.length === 0) {
          resolve()
          return
        }

        chrome.storage.local.remove(keysToRemove, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve()
          }
        })
      })
    })
  }

  /**
   * Reads the study list from sync storage, falling back to local storage if
   * sync is unavailable (e.g. user not signed into Chrome, sync disabled).
   */
  async getStudyList(): Promise<StudyListCourse[]> {
    return new Promise((resolve) => {
      chrome.storage.sync.get([this.syncStudyListKey], (syncResult) => {
        if (!chrome.runtime.lastError && syncResult[this.syncStudyListKey]) {
          resolve(syncResult[this.syncStudyListKey])
          return
        }

        chrome.storage.local.get([this.localStudyListKey], (localResult) => {
          resolve(
            chrome.runtime.lastError ? [] : (localResult[this.localStudyListKey] ?? [])
          )
        })
      })
    })
  }

  async addToStudyList(course: StudyListCourse): Promise<void> {
    const current = await this.getStudyList()
    if (current.some((c) => c.courseId === course.courseId)) return

    const updated = [...current, course]
    await this.writeStudyList(updated)
  }

  async removeFromStudyList(courseId: string): Promise<void> {
    const current = await this.getStudyList()
    const updated = current.filter((c) => c.courseId !== courseId)
    await this.writeStudyList(updated)
  }

  async isInStudyList(courseId: string): Promise<boolean> {
    const list = await this.getStudyList()
    return list.some((c) => c.courseId === courseId)
  }

  /**
   * Writes the study list to both sync (primary) and local (fallback cache),
   * so a read never returns stale data even when sync is briefly unreachable.
   */
  private writeStudyList(list: StudyListCourse[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const syncWrite = new Promise<void>((res, rej) => {
        chrome.storage.sync.set({ [this.syncStudyListKey]: list }, () => {
          if (chrome.runtime.lastError) {
            console.error("Study list sync write failed:", chrome.runtime.lastError)
            rej(chrome.runtime.lastError)
          } else {
            res()
          }
        })
      })

      const localWrite = new Promise<void>((res, rej) => {
        chrome.storage.local.set({ [this.localStudyListKey]: list }, () => {
          if (chrome.runtime.lastError) {
            rej(chrome.runtime.lastError)
          } else {
            res()
          }
        })
      })

      Promise.allSettled([syncWrite, localWrite]).then((results) => {
        const syncResult = results[0]
        const localResult = results[1]

        if (syncResult.status === "fulfilled" || localResult.status === "fulfilled") {
          resolve()
        } else {
          reject(new Error("Study list write failed in both sync and local storage"))
        }
      })
    })
  }

  async markActivityCompleted(
    activityId: string
  ): Promise<{ courseId: string; courseName: string } | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
          return
        }

        for (const key of Object.keys(result)) {
          if (!key.startsWith(`${this.localPrefix}course_`)) continue

          const course: CourseInfo = result[key]
          if (!course.activities[activityId]) continue

          if (course.activities[activityId].completed) {
            resolve({ courseId: course.courseId, courseName: course.courseName })
            return
          }

          course.activities[activityId].completed = true
          course.activities[activityId].completedAt = new Date().toISOString()
          course.lastUpdated = new Date().toISOString()

          chrome.storage.local.set({ [key]: course }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError)
            } else {
              resolve({ courseId: course.courseId, courseName: course.courseName })
            }
          })
          return
        }

        resolve(null)
      })
    })
  }
}

export class CourseIndexScraper {
  static scrapeCourseIndex(courseId: string): {
    activities: ActivityInfo[]
    totalCount: number
  } {
    const activities: ActivityInfo[] = []

    const dropdownMenu = document.querySelector(
      "#courseActivities .focus-dropdown-menu"
    )

    if (dropdownMenu) {
      const accordionCards = dropdownMenu.querySelectorAll(".accordion .card")

      accordionCards.forEach((card) => {
        const cardHeader = card.querySelector(".card-header h5")
        const sectionName = cardHeader?.textContent?.trim() || "General"
        const weekMatch = sectionName.match(/(?:week|module|chapter)\s*(\d+)/i)
        const weekNumber = weekMatch ? parseInt(weekMatch[1]) : null

        const cardBody = card.querySelector(".card-body")
        if (cardBody) {
          const activityLinks = cardBody.querySelectorAll(
            'a[href*="mod/"][href*="id="]'
          )

          activityLinks.forEach((link) => {
            const href = link.getAttribute("href")
            if (!href) return

            const activityMatch = href.match(/mod\/(\w+)\/view\.php\?id=(\d+)/)
            if (!activityMatch) return

            const activityType = activityMatch[1]
            const activityId = activityMatch[2]
            const activityName =
              link.querySelector("h5")?.textContent?.trim() ||
              link.textContent?.trim() ||
              "Unknown Activity"

            const isCompleted = CourseIndexScraper.detectCompletion(link)
            activities.push({
              id: activityId,
              name: activityName,
              completed: isCompleted,
              completedAt: isCompleted ? new Date().toISOString() : undefined,
              type: activityType,
              sectionName,
              weekNumber
            })
          })
        }
      })
    }

    if (activities.length === 0) {
      const courseIndex =
        document.querySelector("#courseindex-content") ||
        document.querySelector(".courseindex")

      if (courseIndex) {
        const sectionDivs = courseIndex.querySelectorAll(
          'div[id^="courseindex-section"]'
        )

        sectionDivs.forEach((sectionDiv) => {
          const sectionHeader = sectionDiv.querySelector(
            'h3, .section-title, [data-region="header"] h3, .course-section-header h3'
          )
          const sectionName = sectionHeader?.textContent?.trim() || "General"
          const weekMatch = sectionName.match(/(?:week|module|chapter)\s*(\d+)/i)
          const weekNumber = weekMatch ? parseInt(weekMatch[1]) : null

          const activityLinks = sectionDiv.querySelectorAll(
            'a[href*="mod/"][href*="id="]'
          )

          activityLinks.forEach((link) => {
            const href = link.getAttribute("href")
            if (!href) return

            const activityMatch = href.match(/mod\/(\w+)\/view\.php\?id=(\d+)/)
            if (!activityMatch) return

            const activityType = activityMatch[1]
            const activityId = activityMatch[2]
            const activityName = link.textContent?.trim() || "Unknown Activity"

            const isCompleted = CourseIndexScraper.detectCompletion(link)
            activities.push({
              id: activityId,
              name: activityName,
              completed: isCompleted,
              completedAt: isCompleted ? new Date().toISOString() : undefined,
              type: activityType,
              sectionName,
              weekNumber
            })
          })
        })
      }
    }

    return { activities, totalCount: activities.length }
  }

  static detectCompletion(activityLink: Element): boolean {
    const container = activityLink.closest(
      'li, .activity, .section-item, [data-region="activity"]'
    )
    if (!container) return false

    const completionElement = container.querySelector(
      '[data-for="completion"], .completion-complete, .completion-y, .complete, [data-action="toggle-manual-completion"]'
    )

    if (completionElement) {
      return (
        completionElement.classList.contains("completion-complete") ||
        completionElement.classList.contains("completion-y") ||
        completionElement.classList.contains("complete") ||
        (completionElement.getAttribute("data-toggletype") === "manual" &&
          completionElement.getAttribute("aria-checked") === "true") ||
        completionElement.querySelector(
          ".fa-check-circle, .fa-check, .icon-completion-complete"
        ) !== null
      )
    }

    const checkIcon = container.querySelector(
      'i.fa-check-circle, i.fa-check, .icon[aria-label*="omplete"]'
    )
    return checkIcon !== null
  }
}

export const storage = new LMSStorage()
