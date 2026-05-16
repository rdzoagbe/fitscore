import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseCvFile, isAllowedCvFile } from '@/lib/cv/parse'
import { requireUserSession } from '@/lib/auth/profile-session'

const MAX_FILE_SIZE = 8 * 1024 * 1024

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireUserSession()
    const formData = await req.formData()

    const value = formData.get('cvFile')
    if (!(value instanceof File) || value.size === 0) {
      return NextResponse.json({ error: 'Choose a CV file to upload.' }, { status: 400 })
    }

    const file = value
    const label = (formData.get('label') as string | null)?.trim() || 'Base CV'
    const targetRole = (formData.get('targetRole') as string | null)?.trim() || null

    if (!isAllowedCvFile(file)) {
      return NextResponse.json({ error: 'Upload a PDF, DOCX or TXT file.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File is too large. Maximum size is 8 MB.' }, { status: 400 })
    }

    const parsedText = await parseCvFile(file)
    if (parsedText.length < 50) {
      return NextResponse.json({ error: 'The CV text could not be extracted. Try another file or upload TXT.' }, { status: 400 })
    }

    const supabase = createClient()
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 90)
    const storagePath = `${user.id}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('cv-files')
      .upload(storagePath, file, {
        contentType: file.type || `application/${extension}`,
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { error: insertError } = await supabase.from('cv_versions').insert({
      user_id: user.id,
      name: label,
      file_url: storagePath,
      file_name: file.name,
      parsed_text: parsedText,
      is_base: true,
      target_role: targetRole
    })

    if (insertError) {
      await supabase.storage.from('cv-files').remove([storagePath])
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'CV uploaded successfully.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
