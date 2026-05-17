const KEY = 'joblytics_device_id'

function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID()
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function getDeviceId() {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = makeId()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'device_unavailable'
  }
}
