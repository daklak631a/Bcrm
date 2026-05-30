"use client"
 
import { useEffect } from "react"
import { fetchSystemSettings } from "@/lib/supabase/api"
import { usePathname } from "next/navigation"
 
export function FaviconInjector() {
  const pathname = usePathname()

  useEffect(() => {
    // 1. Instantly apply from localStorage cache to prevent flicker during transitions
    try {
      const cachedName = localStorage.getItem("sys_app_name")
      const cachedFavicon = localStorage.getItem("sys_favicon_url")
      
      if (cachedName) {
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
      console.warn("Storage access failed:", e)
    }

    // 2. Fetch fresh settings from DB to update cache and title
    const updateFavicon = async () => {
      try {
        const settings = await fetchSystemSettings()
        const faviconUrl = settings.find(s => s.key === 'favicon_url')?.value
        const appName = settings.find(s => s.key === 'app_name')?.value
        
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
          document.title = appName
        }
      } catch (err) {
        console.warn("Failed to inject favicon/title:", err)
      }
    }
    
    updateFavicon()
    window.addEventListener('storage', updateFavicon)
    return () => window.removeEventListener('storage', updateFavicon)
  }, [pathname])
 
  return null
}
