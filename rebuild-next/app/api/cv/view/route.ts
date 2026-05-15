import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cv } = await supabase
    .from('cv_versions')
    .select('file_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!cv?.file_url) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: signedData } = await supabase.storage
    .from('cv-files')
    .createSignedUrl(cv.file_url as string, 300)

  if (!signedData?.signedUrl) return NextResponse.json({ error: 'Could not generate preview URL' }, { status: 500 })

  return NextResponse.redirect(signedData.signedUrl)
}
