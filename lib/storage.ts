// Enhanced storage utility using IndexedDB for better performance and structure

export interface ActivityInfo {
  id: string
  name: string
  completed: boolean
  completedAt?: string
  type: string // 'video', 'pdf', 'quiz', etc.
  sectionName?: string
  weekNumber?: number // Week grouping for activities
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

class LMSStorage {
  private storagePrefix = "miva_lms_"

  async init(): Promise<void> {
    // Chrome storage doesn't need initialization
    console.log("Chrome storage initialized")
    return Promise.resolve()
  }

  async saveCourse(courseInfo: CourseInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      courseInfo.lastUpdated = new Date().toISOString()
      const key = `${this.storagePrefix}course_${courseInfo.courseId}`

      chrome.storage.local.set({ [key]: courseInfo }, () => {
        if (chrome.runtime.lastError) {
          console.error("Failed to save course:", chrome.runtime.lastError)
          reject(chrome.runtime.lastError)
        } else {
          console.log("Course saved successfully:", courseInfo.courseId)
          resolve()
        }
      })
    })
  }

  async getCourse(courseId: string): Promise<CourseInfo | null> {
    return new Promise((resolve, reject) => {
      const key = `${this.storagePrefix}course_${courseId}`

      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          console.error("Failed to get course:", chrome.runtime.lastError)
          reject(chrome.runtime.lastError)
        } else {
          const courseInfo = result[key] || null
          console.log(
            "Retrieved course:",
            courseId,
            courseInfo ? "found" : "not found"
          )
          resolve(courseInfo)
        }
      })
    })
  }

  async getAllCourses(): Promise<CourseInfo[]> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
          console.error("Failed to get all courses:", chrome.runtime.lastError)
          reject(chrome.runtime.lastError)
        } else {
          const courses: CourseInfo[] = []

          Object.keys(result).forEach((key) => {
            if (key.startsWith(`${this.storagePrefix}course_`)) {
              courses.push(result[key])
            }
          })

          console.log("Retrieved all courses:", courses.length)
          resolve(courses)
        }
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

        const keysToRemove = Object.keys(result).filter((key) =>
          key.startsWith(this.storagePrefix)
        )

        if (keysToRemove.length === 0) {
          resolve()
          return
        }

        chrome.storage.local.remove(keysToRemove, () => {
          if (chrome.runtime.lastError) {
            console.error("Failed to clear storage:", chrome.runtime.lastError)
            reject(chrome.runtime.lastError)
          } else {
            console.log("Storage cleared successfully")
            resolve()
          }
        })
      })
    })
  }

  async addToStudyList(course: StudyListCourse): Promise<void> {
    return new Promise((resolve, reject) => {
      const key = `${this.storagePrefix}study_list`
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
          return
        }

        const studyList: StudyListCourse[] = result[key] || []
        
        if (studyList.some(c => c.courseId === course.courseId)) {
          resolve()
          return
        }

        studyList.push(course)
        chrome.storage.local.set({ [key]: studyList }, () => {
          if (chrome.runtime.lastError) {
            console.error("Failed to add to study list:", chrome.runtime.lastError)
            reject(chrome.runtime.lastError)
          } else {
            console.log("Course added to study list:", course.courseId)
            resolve()
          }
        })
      })
    })
  }

  async removeFromStudyList(courseId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const key = `${this.storagePrefix}study_list`
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
          return
        }

        const studyList: StudyListCourse[] = result[key] || []
        const updatedList = studyList.filter(c => c.courseId !== courseId)

        chrome.storage.local.set({ [key]: updatedList }, () => {
          if (chrome.runtime.lastError) {
            console.error("Failed to remove from study list:", chrome.runtime.lastError)
            reject(chrome.runtime.lastError)
          } else {
            console.log("Course removed from study list:", courseId)
            resolve()
          }
        })
      })
    })
  }

  async getStudyList(): Promise<StudyListCourse[]> {
    return new Promise((resolve, reject) => {
      const key = `${this.storagePrefix}study_list`
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          console.error("Failed to get study list:", chrome.runtime.lastError)
          reject(chrome.runtime.lastError)
        } else {
          const studyList: StudyListCourse[] = result[key] || []
          console.log("Retrieved study list:", studyList.length, "courses")
          resolve(studyList)
        }
      })
    })
  }

  async isInStudyList(courseId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const key = `${this.storagePrefix}study_list`
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          const studyList: StudyListCourse[] = result[key] || []
          resolve(studyList.some(c => c.courseId === courseId))
        }
      })
    })
  }
}

// Course index scraper to get all available activities
export class CourseIndexScraper {
  static scrapeCourseIndex(courseId: string): {
    activities: ActivityInfo[]
    totalCount: number
  } {
    const activities: ActivityInfo[] = []

    // First try to scrape from the navigation dropdown menu (more reliable for this LMS)
    const dropdownMenu = document.querySelector(
      "#courseActivities .focus-dropdown-menu"
    )

    if (dropdownMenu) {
      // Get all accordion cards in the dropdown
      const accordionCards = dropdownMenu.querySelectorAll(".accordion .card")

      accordionCards.forEach((card) => {
        // Get section name from the card header
        const cardHeader = card.querySelector(".card-header h5")
        const sectionName = cardHeader?.textContent?.trim() || "General"

        // Extract week number from section name (e.g., "Week 1", "Module 2", etc.)
        const weekMatch = sectionName.match(/(?:week|module|chapter)\s*(\d+)/i)
        const weekNumber = weekMatch ? parseInt(weekMatch[1]) : null

        // Get all activity links within the card body
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

            // Get activity name from h5 element within the link
            const activityName =
              link.querySelector("h5")?.textContent?.trim() ||
              link.textContent?.trim() ||
              "Unknown Activity"

            activities.push({
              id: activityId,
              name: activityName,
              completed: false,
              type: activityType,
              sectionName: sectionName,
              weekNumber: weekNumber
            })
          })
        }
      })
    }

    // Fallback: try course index content if dropdown is not available
    if (activities.length === 0) {
      const courseIndex =
        document.querySelector("#courseindex-content") ||
        document.querySelector(".courseindex")

      if (courseIndex) {
        // Get all section divs (div elements with id starting with "courseindex-section")
        const sectionDivs = courseIndex.querySelectorAll(
          'div[id^="courseindex-section"]'
        )

        sectionDivs.forEach((sectionDiv) => {
          // Get section name from the section header
          const sectionHeader = sectionDiv.querySelector(
            'h3, .section-title, [data-region="header"] h3, .course-section-header h3'
          )
          const sectionName = sectionHeader?.textContent?.trim() || "General"

          // Extract week number from section name
          const weekMatch = sectionName.match(
            /(?:week|module|chapter)\s*(\d+)/i
          )
          const weekNumber = weekMatch ? parseInt(weekMatch[1]) : null

          // Get all activity links within this section
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

            activities.push({
              id: activityId,
              name: activityName,
              completed: false,
              type: activityType,
              sectionName: sectionName,
              weekNumber: weekNumber
            })
          })
        })
      }
    }

    return {
      activities: activities,
      totalCount: activities.length
    }
  }
}

export const storage = new LMSStorage()
