"use client"
 
import { useEffect, useRef } from "react"
import { fetchSystemSettings } from "@/lib/supabase/api"
import { usePathname } from "next/navigation"
import { getErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"
 
export function FaviconInjector() {
  const pathname = usePathname()
  const customTitleRef = useRef<string>("")

  // 1. MutationObserver to lock the title tag and enforce the custom app name against Next.js metadata overrides
  useEffect(() => {
    // Find or create title element if missing
    let target = document.querySelector('title')
    if (!target) {
      target = document.createElement('title')
      document.head.appendChild(target)
    }

    const observer = new MutationObserver(() => {
      const expectedTitle = customTitleRef.current
      if (expectedTitle && document.title !== expectedTitle) {
        document.title = expectedTitle
      }
    })

    observer.observe(target, {
      childList: true,
      characterData: true,
      subtree: true
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    // 2. Instantly apply from localStorage cache to prevent flicker during transitions
    try {
      const cachedName = localStorage.getItem("sys_app_name")
      const cachedFavicon = localStorage.getItem("sys_favicon_url")
      
      if (cachedName) {
        customTitleRef.current = cachedName
        document.title = cachedName
      }
      
      if (cachedFavicon) {
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.getElementsByTagName('head')[0].appendChild(link)
        }
        link.href = cachedFavicon
      }
    } catch (e) {
      logger.warn("[Favicon] Storage access failed", { error: getErrorMessage(e) })
    }

    // 3. Fetch fresh settings from DB to update cache and title
    const updateFavicon = async () => {
      try {
        const settings = await fetchSystemSettings()
        const faviconUrl = settings.find((s: any) => s.key === 'favicon_url')?.value
        const appName = settings.find((s: any) => s.key === 'app_name')?.value
        
        if (faviconUrl) {
          try {
            localStorage.setItem("sys_favicon_url", faviconUrl)
          } catch (e) {}
          let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
          if (!link) {
            link = document.createElement('link')
            link.rel = 'icon'
            document.getElementsByTagName('head')[0].appendChild(link)
          }
          link.href = faviconUrl
        }
        
        if (appName) {
          try {
            localStorage.setItem("sys_app_name", appName)
          } catch (e) {}
          customTitleRef.current = appName
          document.title = appName
        }
      } catch (err) {
        logger.warn("[Favicon] Failed to inject favicon or title", { error: getErrorMessage(err) })
      }
    }
    
    updateFavicon()
    window.addEventListener('storage', updateFavicon)
    return () => window.removeEventListener('storage', updateFavicon)
  }, [pathname])
 
  return null
}
