import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const { data, error } = await db.auth.signInWithPassword({ email, password })

    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }
      if (msg.includes('email not confirmed')) {
        return NextResponse.json({ error: 'Please confirm your email before logging in' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const { data: profile } = await db
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    return NextResponse.json({ token: data.session?.access_token, user: { id: data.user.id, email: data.user.email } })
  } catch {
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
