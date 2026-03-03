import type { PlasmoCSConfig } from "plasmo"
import { useEffect } from "react"

import { extractActivityFromUrl } from "../lib/dom"
import { storage } from "../lib/storage"

export const config: PlasmoCSConfig = {
  matches: ["https://lms.miva.university/mod/*/view.php*"],
  all_frames: false
}

const ActivityTracker = () => {
  useEffect(() => {
    const trackActivity = async () => {
      const activityData = extractActivityFromUrl(window.location.href)
      if (!activityData) return

      try {
        await storage.init()
        await storage.markActivityCompleted(activityData.id)
      } catch (error) {
        // Silent fail
      }
    }

    setTimeout(trackActivity, 500)
  }, [])

  return null
}

export default ActivityTracker
