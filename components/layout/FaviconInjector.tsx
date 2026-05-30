"use client"

import { useEffect } from "react"
import { fetchSystemSettings } from "@/lib/supabase/api"

export function FaviconInjector() {
  useEffect(() => {
    const updateFavicon = async () => {
      try {
        const settings = await fetchSystemSettings()
        const faviconUrl = settings.find(s => s.key === 'favicon_url')?.value
        if (faviconUrl) {
          let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
          if (!link) {
            link = document.createElement('link')
            link.rel = 'icon'
            document.getElementsByTagName('head')[0].appendChild(link)
          }
          link.href = faviconUrl
        }
        
        const appName = settings.find(s => s.key === 'app_name')?.value
        if (appName) {
          document.title = appName
        }
      } catch (err) {
        console.warn("Failed to inject favicon/title:", err)
      }
    }
    updateFavicon()
    window.addEventListener('storage', updateFavicon)
    return () => window.removeEventListener('storage', updateFavicon)
  }, [])

  return null
}
