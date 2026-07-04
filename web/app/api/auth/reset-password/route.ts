import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Reset token is required. Use the link from your email.' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: userError } = await db.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 401 })
    }

    const { error } = await db.auth.admin.updateUserById(user.id, { password })

    if (error) {
      return NextResponse.json({ error: 'Failed to reset password. The link may have expired.' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch {
    return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 })
  }
}
