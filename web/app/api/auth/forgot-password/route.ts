import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const origin = request.headers.get('origin') || ''
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/dashboard?reset=true`
    })

    if (error) {
      return NextResponse.json({ error: 'Failed to send reset email. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ message: 'If an account exists with this email, you will receive a password reset link.' })
  } catch {
    return NextResponse.json({ error: 'Failed to send reset email. Please try again.' }, { status: 500 })
  }
}
