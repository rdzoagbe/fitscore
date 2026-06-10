import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const DB_NAME = 'fitscore_cv'
const STORE = 'cvs'
const MAX_CVS = 5

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbSet(key, value) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

async function dbGet(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbDel(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function toStorageEntry(entry) {
  return { id: entry.id, name: entry.name, type: entry.type, size: entry.size, lastModified: entry.lastModified, blob: entry.blob }
}

function toRuntimeEntry(stored) {
  return {
    ...stored,
    file: new File([stored.blob], stored.name, { type: stored.type, lastModified: stored.lastModified || Date.now() })
  }
}

export function useCvPersist() {
  const { user } = useAuth()
  const [cvList, setCvList] = useState([])
  const [activeCvId, setActiveCvIdState] = useState(null)
  const [loading, setLoading] = useState(true)
  const userId = user?.id

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    ;(async () => {
      try {
        let list = await dbGet(`cv_list_${userId}`)
        let activeId = await dbGet(`cv_active_${userId}`)

        if (!list) {
          // Migrate from old single-CV format
          const old = await dbGet(`cv_${userId}`)
          if (old?.blob && old?.name) {
            const id = makeId()
            list = [{ id, name: old.name, type: old.type, size: old.size || 0, lastModified: old.lastModified || Date.now(), blob: old.blob }]
            activeId = id
            await dbSet(`cv_list_${userId}`, list)
            await dbSet(`cv_active_${userId}`, activeId)
          } else {
            list = []
          }
        }

        const withFiles = list.map(toRuntimeEntry)
        setCvList(withFiles)
        setActiveCvIdState(activeId || withFiles[0]?.id || null)
      } catch (e) {
        console.log('CV load error:', e.message)
      }
      setLoading(false)
    })()
  }, [userId])

  const saveCv = async (file) => {
    const blob = new Blob([await file.arrayBuffer()], { type: file.type })
    const existingEntry = cvList.find(c => c.name === file.name)
    const id = existingEntry?.id || makeId()
    const newEntry = { id, name: file.name, type: file.type, size: file.size, lastModified: file.lastModified || Date.now(), blob, file }

    const updatedList = existingEntry
      ? cvList.map(c => c.id === id ? newEntry : c)
      : [...cvList, newEntry].slice(-MAX_CVS)

    setCvList(updatedList)
    setActiveCvIdState(id)

    if (!userId) return
    try {
      await dbSet(`cv_list_${userId}`, updatedList.map(toStorageEntry))
      await dbSet(`cv_active_${userId}`, id)
    } catch (e) {
      console.log('CV save error:', e.message)
    }
  }

  const setActiveCv = async (id) => {
    setActiveCvIdState(id)
    if (!userId) return
    try { await dbSet(`cv_active_${userId}`, id) } catch {}
  }

  const deleteCv = async (id) => {
    const updated = cvList.filter(c => c.id !== id)
    const newActiveId = activeCvId === id ? (updated[0]?.id || null) : activeCvId
    setCvList(updated)
    setActiveCvIdState(newActiveId)
    if (!userId) return
    try {
      await dbSet(`cv_list_${userId}`, updated.map(toStorageEntry))
      await dbSet(`cv_active_${userId}`, newActiveId)
    } catch {}
  }

  const clearCv = async () => {
    setCvList([])
    setActiveCvIdState(null)
    if (!userId) return
    try {
      await dbDel(`cv_list_${userId}`)
      await dbDel(`cv_active_${userId}`)
    } catch {}
  }

  const cvFile = cvList.find(c => c.id === activeCvId)?.file || null

  return { cvFile, cvList, activeCvId, loading, saveCv, setActiveCv, deleteCv, clearCv }
}
