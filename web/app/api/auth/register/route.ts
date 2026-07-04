import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, orgName } = await request.json()

    const errors: string[] = []
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email is required')
    if (!password) errors.push('Password is required')
    else if (password.length < 6) errors.push('Password must be at least 6 characters')
    if (!fullName?.trim()) errors.push('Full name is required')
    if (!orgName?.trim()) errors.push('Organization name is required')
    if (errors.length) return NextResponse.json({ error: errors.join('. ') }, { status: 400 })

    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() }
    })

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
    }

    const { data: org, error: orgError } = await db
      .from('organizations')
      .insert({ name: orgName.trim() })
      .select()
      .single()

    if (orgError) {
      await db.auth.admin.deleteUser(authData.user.id).catch(() => {})
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    const { error: profileError } = await db
      .from('profiles')
      .insert({ id: authData.user.id, org_id: org.id, full_name: fullName.trim(), role: 'owner' })

    if (profileError) {
      try { await db.from('organizations').delete().eq('id', org.id) } catch {}
      await db.auth.admin.deleteUser(authData.user.id).catch(() => {})
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    const { data: signInData } = await db.auth.signInWithPassword({ email, password })
    const token = signInData?.session?.access_token || authData.user.id
    const user = signInData?.user || authData.user

    return NextResponse.json({ token, user: { id: user.id, email: user.email } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}
