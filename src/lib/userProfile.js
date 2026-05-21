export function getIdentityData(user) {
  return user?.identities?.[0]?.identity_data || {}
}

export function getUserEmail(user) {
  const metadata = user?.user_metadata || {}
  const identity = getIdentityData(user)

  return (
    user?.email ||
    metadata.email ||
    metadata.preferred_username ||
    metadata.upn ||
    metadata.user_name ||
    identity.email ||
    identity.preferred_username ||
    identity.upn ||
    identity.userPrincipalName ||
    ''
  )
}

export function getUserDisplayName(user) {
  const metadata = user?.user_metadata || {}
  const identity = getIdentityData(user)
  const email = getUserEmail(user)

  return (
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
    metadata.displayName ||
    identity.full_name ||
    identity.name ||
    identity.display_name ||
    identity.displayName ||
    identity.given_name ||
    identity.preferred_username ||
    identity.userPrincipalName ||
    metadata.preferred_username ||
    metadata.upn ||
    metadata.user_name ||
    email?.split('@')?.[0] ||
    'User'
  )
}

export function getUserInitials(userOrName) {
  const name = typeof userOrName === 'string' ? userOrName : getUserDisplayName(userOrName)

  return String(name || 'User')
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'U'
}

export function getNormalizedUserMetadata(user, source = 'auth_normalize') {
  const displayName = getUserDisplayName(user)
  const email = getUserEmail(user)

  return {
    display_name: displayName,
    full_name: displayName,
    name: displayName,
    email,
    normalized_email: email,
    profile_normalized_at: new Date().toISOString(),
    profile_normalized_source: source
  }
}

export function clearPreviousUserBrowserData(currentUserId) {
  if (!currentUserId) return

  const lastUserId = localStorage.getItem('joblytics:last_user_id')

  if (!lastUserId) {
    localStorage.setItem('joblytics:last_user_id', currentUserId)
    return
  }

  if (lastUserId === currentUserId) return

  const keepExact = new Set([
    'joblytics:last_user_id',
    'theme',
    'language',
    'lang',
    'i18nextLng'
  ])

  const appPrefixesToClear = [
    'fitscore_',
    'joblytics_',
    'joblytics:',
    'smart_sync',
    'analysis',
    'history',
    'cv_',
    'profile_',
    'dashboard_'
  ]

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('sb-')) continue
    if (keepExact.has(key)) continue

    const shouldClear = appPrefixesToClear.some(prefix => key.startsWith(prefix))
    if (shouldClear) localStorage.removeItem(key)
  }

  sessionStorage.clear()
  localStorage.setItem('joblytics:last_user_id', currentUserId)
}
