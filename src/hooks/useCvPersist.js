import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const DB_NAME = 'fitscore_cv'
const STORE = 'cvs'

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

function toStoredCv(file, label) {
  return file.arrayBuffer().then(buffer => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    blob: new Blob([buffer], { type: file.type }),
    name: file.name,
    label: label || inferLabel(file.name),
    type: file.type,
    size: file.size,
    lastModified: file.lastModified || Date.now(),
    createdAt: Date.now()
  }))
}

function inferLabel(name = '') {
  const lower = name.toLowerCase()
  if (/(^|[_\-.\s])(fr|fra|french|francais|français)([_\-.\s]|$)/.test(lower)) return 'FR'
  if (/(^|[_\-.\s])(en|eng|english)([_\-.\s]|$)/.test(lower)) return 'EN'
  return 'CV'
}

function storedToFile(stored) {
  if (!stored?.blob || !stored?.name) return null
  return new File([stored.blob], stored.name, {
    type: stored.type,
    lastModified: stored.lastModified || Date.now()
  })
}

export function useCvPersist() {
  const { user } = useAuth()
  const [cvFiles, setCvFiles] = useState([])
  const [selectedCvId, setSelectedCvId] = useState(null)
  const [loading, setLoading] = useState(true)
  const userId = user?.id

  const selectedCv = useMemo(() => cvFiles.find(cv => cv.id === selectedCvId) || cvFiles[0] || null, [cvFiles, selectedCvId])
  const cvFile = useMemo(() => storedToFile(selectedCv), [selectedCv])

  const persistList = async (nextFiles, nextSelectedId) => {
    if (!userId) return
    await dbSet(`cvs_${userId}`, nextFiles)
    await dbSet(`selected_cv_${userId}`, nextSelectedId || nextFiles[0]?.id || null)
  }

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    let cancelled = false

    ;(async () => {
      try {
        let storedList = await dbGet(`cvs_${userId}`)
        let selected = await dbGet(`selected_cv_${userId}`)

        if (!storedList?.length) {
          const legacy = await dbGet(`cv_${userId}`)
          if (legacy?.blob && legacy?.name) {
            storedList = [{
              ...legacy,
              id: `legacy_${userId}`,
              label: inferLabel(legacy.name),
              createdAt: legacy.lastModified || Date.now()
            }]
            selected = storedList[0].id
            await persistList(storedList, selected)
          }
        }

        if (!cancelled) {
          setCvFiles(storedList || [])
          setSelectedCvId(selected || storedList?.[0]?.id || null)
        }
      } catch (e) {
        console.log('CV load error:', e.message)
      }
      if (!cancelled) setLoading(false)
    })()

    return () => { cancelled = true }
  }, [userId])

  const saveCv = async (file, label) => {
    if (!file) return
    const stored = await toStoredCv(file, label)
    const nextFiles = [stored, ...cvFiles.filter(cv => cv.name !== file.name)]
    setCvFiles(nextFiles)
    setSelectedCvId(stored.id)
    if (userId) {
      try { await persistList(nextFiles, stored.id) } catch (e) { console.log('CV save error:', e.message) }
    }
  }

  const selectCv = async (id) => {
    setSelectedCvId(id)
    if (userId) {
      try { await dbSet(`selected_cv_${userId}`, id) } catch (e) { console.log('CV select error:', e.message) }
    }
  }

  const removeCv = async (id) => {
    const nextFiles = cvFiles.filter(cv => cv.id !== id)
    const nextSelected = selectedCvId === id ? nextFiles[0]?.id || null : selectedCvId
    setCvFiles(nextFiles)
    setSelectedCvId(nextSelected)
    if (userId) {
      try { await persistList(nextFiles, nextSelected) } catch (e) { console.log('CV remove error:', e.message) }
    }
  }

  const clearCv = async () => {
    if (selectedCvId) return removeCv(selectedCvId)
    setCvFiles([])
    setSelectedCvId(null)
    if (userId) {
      try {
        await dbDel(`cvs_${userId}`)
        await dbDel(`selected_cv_${userId}`)
        await dbDel(`cv_${userId}`)
      } catch {}
    }
  }

  return { cvFile, cvFiles, selectedCvId, loading, saveCv, selectCv, removeCv, clearCv }
}
