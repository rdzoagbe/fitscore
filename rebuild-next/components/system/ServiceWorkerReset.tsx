'use client'

import { useEffect } from 'react'

export function ServiceWorkerReset(): null {
  useEffect(() => {
    async function resetServiceWorkers(): Promise<void> {
      if (!('serviceWorker' in navigator)) return

      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(registration => registration.unregister()))

        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map(key => caches.delete(key)))
        }
      } catch (error) {
        console.warn('Service worker reset skipped', error)
      }
    }

    resetServiceWorkers()
  }, [])

  return null
}
