chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ joblyticsAppUrl: 'https://joblytics-ai.vercel.app/analyzer' })
})
