export type SupabaseEnv = {
  readonly url: string
  readonly anonKey: string
  readonly source: {
    readonly url: string
    readonly anonKey: string
  }
}

function clean(value: string | undefined): string {
  return (value ?? '').trim()
}

export function getSupabaseEnv(): SupabaseEnv {
  const nextUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const viteUrl = clean(process.env.VITE_SUPABASE_URL)
  const legacyUrl = clean(process.env.SUPABASE_URL)

  const nextAnon = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const viteAnon = clean(process.env.VITE_SUPABASE_ANON_KEY)

  const url = nextUrl || viteUrl || legacyUrl
  const anonKey = nextAnon || viteAnon

  return {
    url,
    anonKey,
    source: {
      url: nextUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : viteUrl ? 'VITE_SUPABASE_URL' : legacyUrl ? 'SUPABASE_URL' : 'missing',
      anonKey: nextAnon ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : viteAnon ? 'VITE_SUPABASE_ANON_KEY' : 'missing'
    }
  }
}

export function validateSupabaseEnv(): { ok: true; env: SupabaseEnv } | { ok: false; message: string; env: SupabaseEnv } {
  const env = getSupabaseEnv()

  if (!env.url || !env.anonKey) {
    return { ok: false, message: 'Missing Supabase URL or anon key.', env }
  }

  try {
    const parsed = new URL(env.url)
    if (!parsed.protocol.startsWith('http')) {
      return { ok: false, message: 'Supabase URL must start with http or https.', env }
    }
  } catch {
    return { ok: false, message: 'Supabase URL is not a valid URL.', env }
  }

  if (env.anonKey.length < 40) {
    return { ok: false, message: 'Supabase anon key looks too short.', env }
  }

  return { ok: true, env }
}
