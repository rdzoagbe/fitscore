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
  const inferredLang = inferLanguage(file.name)
  return file.arrayBuffer().then(buffer => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    blob: new Blob([buffer], { type: file.type }),
    name: file.name,
    displayName: cleanDisplayName(file.name),
    label: label || inferredLang || inferLabel(file.name),
    languageTag: inferredLang || 'Auto',
    roleTag: '',
    isDefault: false,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified || Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastUsedAt: null
  }))
}

function cleanDisplayName(name = '') {
  return name.replace(/\.(pdf|doc|docx)$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || name || 'CV'
}

function inferLabel(name = '') {
  const lower = name.toLowerCase()
  if (/(^|[_\-.\s])(fr|fra|french|francais|français)([_\-.\s]|$)/.test(lower)) return 'FR'
  if (/(^|[_\-.\s])(en|eng|english)([_\-.\s]|$)/.test(lower)) return 'EN'
  return 'CV'
}

function inferLanguage(name = '') {
  const label = inferLabel(name)
  return ['FR', 'EN'].includes(label) ? label : ''
}

function normalizeStoredCv(cv, selectedId) {
  if (!cv) return cv
  const languageTag = cv.languageTag || (['FR', 'EN'].includes(cv.label) ? cv.label : 'Auto')
  return {
    ...cv,
    displayName: cv.displayName || cleanDisplayName(cv.name),
    label: cv.label || languageTag || inferLabel(cv.name),
    languageTag,
    roleTag: cv.roleTag || '',
    isDefault: Boolean(cv.isDefault || (selectedId && cv.id === selectedId)),
    updatedAt: cv.updatedAt || cv.createdAt || cv.lastModified || Date.now(),
    lastUsedAt: cv.lastUsedAt || null
  }
}

function ensureOneDefault(list, selectedId = null) {
  if (!list.length) return []
  const defaultId = list.find(cv => cv.isDefault)?.id || selectedId || list[0].id
  return list.map(cv => ({ ...cv, isDefault: cv.id === defaultId }))
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

  const selectedCv = useMemo(() => cvFiles.find(cv => cv.id === selectedCvId) || cvFiles.find(cv => cv.isDefault) || cvFiles[0] || null, [cvFiles, selectedCvId])
  const cvFile = useMemo(() => storedToFile(selectedCv), [selectedCv])

  const persistList = async (nextFiles, nextSelectedId) => {
    if (!userId) return
    const normalized = ensureOneDefault(nextFiles.map(cv => normalizeStoredCv(cv, nextSelectedId)), nextSelectedId)
    await dbSet(`cvs_${userId}`, normalized)
    await dbSet(`selected_cv_${userId}`, nextSelectedId || normalized.find(cv => cv.isDefault)?.id || normalized[0]?.id || null)
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
              languageTag: inferLanguage(legacy.name) || 'Auto',
              displayName: cleanDisplayName(legacy.name),
              roleTag: '',
              isDefault: true,
              createdAt: legacy.lastModified || Date.now(),
              updatedAt: Date.now(),
              lastUsedAt: null
            }]
            selected = storedList[0].id
            await persistList(storedList, selected)
          }
        }

        const normalized = ensureOneDefault((storedList || []).map(cv => normalizeStoredCv(cv, selected)), selected)
        const defaultSelected = selected || normalized.find(cv => cv.isDefault)?.id || normalized[0]?.id || null

        if (!cancelled) {
          setCvFiles(normalized)
          setSelectedCvId(defaultSelected)
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
    const shouldBeDefault = cvFiles.length === 0
    const nextFiles = [
      { ...stored, isDefault: shouldBeDefault },
      ...cvFiles.filter(cv => cv.name !== file.name)
    ]
    const normalized = ensureOneDefault(nextFiles, stored.id)
    setCvFiles(normalized)
    setSelectedCvId(stored.id)
    if (userId) {
      try { await persistList(normalized, stored.id) } catch (e) { console.log('CV save error:', e.message) }
    }
  }

  const selectCv = async (id) => {
    const nextFiles = cvFiles.map(cv => cv.id === id ? { ...cv, lastUsedAt: Date.now() } : cv)
    setCvFiles(nextFiles)
    setSelectedCvId(id)
    if (userId) {
      try {
        await persistList(nextFiles, id)
        await dbSet(`selected_cv_${userId}`, id)
      } catch (e) { console.log('CV select error:', e.message) }
    }
  }

  const setDefaultCv = async (id) => {
    const nextFiles = cvFiles.map(cv => ({ ...cv, isDefault: cv.id === id, lastUsedAt: cv.id === id ? Date.now() : cv.lastUsedAt, updatedAt: cv.id === id ? Date.now() : cv.updatedAt }))
    setCvFiles(nextFiles)
    setSelectedCvId(id)
    if (userId) {
      try { await persistList(nextFiles, id) } catch (e) { console.log('CV default error:', e.message) }
    }
  }

  const updateCvMetadata = async (id, patch = {}) => {
    const cleanPatch = {
      ...patch,
      displayName: patch.displayName !== undefined ? String(patch.displayName).trim().slice(0, 80) : undefined,
      languageTag: patch.languageTag !== undefined ? String(patch.languageTag).trim().slice(0, 12) : undefined,
      roleTag: patch.roleTag !== undefined ? String(patch.roleTag).trim().slice(0, 60) : undefined,
      updatedAt: Date.now()
    }
    Object.keys(cleanPatch).forEach(key => cleanPatch[key] === undefined && delete cleanPatch[key])
    const nextFiles = cvFiles.map(cv => cv.id === id ? { ...cv, ...cleanPatch, label: cleanPatch.languageTag || cv.label } : cv)
    setCvFiles(nextFiles)
    if (userId) {
      try { await persistList(nextFiles, selectedCvId) } catch (e) { console.log('CV metadata update error:', e.message) }
    }
  }

  const removeCv = async (id) => {
    const nextRaw = cvFiles.filter(cv => cv.id !== id)
    const nextSelected = selectedCvId === id ? nextRaw.find(cv => cv.isDefault)?.id || nextRaw[0]?.id || null : selectedCvId
    const nextFiles = ensureOneDefault(nextRaw, nextSelected)
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

  return { cvFile, cvFiles, selectedCv, selectedCvId, loading, saveCv, selectCv, setDefaultCv, updateCvMetadata, removeCv, clearCv }
}
