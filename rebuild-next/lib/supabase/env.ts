export type SupabaseEnv = {
  readonly url: string
  readonly anonKey: string
  readonly source: {
    readonly url: string
    readonly anonKey: string
  }
  readonly diagnostics: {
    readonly urlCandidates: Array<{ readonly name: string; readonly present: boolean; readonly valid: boolean }>
  }
}

type EnvCandidate = {
  readonly name: string
  readonly value: string
}

function clean(value: string | undefined): string {
  return (value ?? '').trim()
}

function isValidHttpUrl(value: string): boolean {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function firstValid(candidates: EnvCandidate[]): EnvCandidate | null {
  return candidates.find(candidate => isValidHttpUrl(candidate.value)) ?? null
}

function firstPresent(candidates: EnvCandidate[]): EnvCandidate | null {
  return candidates.find(candidate => candidate.value.length > 0) ?? null
}

export function getSupabaseEnv(): SupabaseEnv {
  const urlCandidates: EnvCandidate[] = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: clean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { name: 'VITE_SUPABASE_URL', value: clean(process.env.VITE_SUPABASE_URL) },
    { name: 'SUPABASE_URL', value: clean(process.env.SUPABASE_URL) }
  ]

  const anonCandidates: EnvCandidate[] = [
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    { name: 'VITE_SUPABASE_ANON_KEY', value: clean(process.env.VITE_SUPABASE_ANON_KEY) }
  ]

  const validUrl = firstValid(urlCandidates)
  const fallbackUrl = firstPresent(urlCandidates)
  const anonKey = firstPresent(anonCandidates)

  return {
    url: validUrl?.value ?? fallbackUrl?.value ?? '',
    anonKey: anonKey?.value ?? '',
    source: {
      url: validUrl?.name ?? fallbackUrl?.name ?? 'missing',
      anonKey: anonKey?.name ?? 'missing'
    },
    diagnostics: {
      urlCandidates: urlCandidates.map(candidate => ({
        name: candidate.name,
        present: candidate.value.length > 0,
        valid: isValidHttpUrl(candidate.value)
      }))
    }
  }
}

export function validateSupabaseEnv(): { ok: true; env: SupabaseEnv } | { ok: false; message: string; env: SupabaseEnv } {
  const env = getSupabaseEnv()

  if (!env.url || !env.anonKey) {
    return { ok: false, message: 'Missing Supabase URL or anon key.', env }
  }

  if (!isValidHttpUrl(env.url)) {
    return { ok: false, message: 'Supabase URL is not a valid URL. It must look like https://your-project-ref.supabase.co', env }
  }

  if (env.anonKey.length < 40) {
    return { ok: false, message: 'Supabase anon key looks too short.', env }
  }

  return { ok: true, env }
}
