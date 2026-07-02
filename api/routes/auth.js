import { Router } from 'express'
import { db, mem, sessions, createId } from '../db/client.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password) {
  if (password.length < 6) return 'Password must be at least 6 characters'
  return null
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, orgName } = req.body

    const errors = []
    if (!email || !validateEmail(email)) errors.push('Valid email is required')
    if (!password) errors.push('Password is required')
    else {
      const pwErr = validatePassword(password)
      if (pwErr) errors.push(pwErr)
    }
    if (!fullName?.trim()) errors.push('Full name is required')
    if (!orgName?.trim()) errors.push('Organization name is required')
    if (errors.length) return res.status(400).json({ error: errors.join('. ') })

    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() }
    })

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return res.status(409).json({ error: 'An account with this email already exists' })
      }
      return res.status(500).json({ error: 'Registration failed. Please try again.' })
    }

    const { data: org, error: orgError } = await db
      .from('organizations')
      .insert({ name: orgName.trim() })
      .select()
      .single()

    if (orgError) {
      await db.auth.admin.deleteUser(authData.user.id).catch(() => {})
      return res.status(500).json({ error: 'Failed to create organization' })
    }

    const { error: profileError } = await db
      .from('profiles')
      .insert({
        id: authData.user.id,
        org_id: org.id,
        full_name: fullName.trim(),
        role: 'owner'
      })

    if (profileError) {
      await db.from('organizations').delete().eq('id', org.id).catch(() => {})
      await db.auth.admin.deleteUser(authData.user.id).catch(() => {})
      return res.status(500).json({ error: 'Failed to create profile' })
    }

    let token, user
    const { data: signInData } = await db.auth.signInWithPassword({ email, password })
    if (signInData?.session?.access_token) {
      token = signInData.session.access_token
      user = signInData.user
    } else {
      token = createId()
      user = authData.user
    }

    sessions[token] = {
      user,
      profile: { id: authData.user.id, org_id: org.id, full_name: fullName.trim(), role: 'owner' }
    }

    res.status(201).json({ token, user: { id: user.id, email: user.email } })
  } catch (err) {
    res.status(500).json({ error: 'Registration failed. Please try again.' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const { data, error } = await db.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message?.toLowerCase().includes('invalid login credentials') ||
          error.message?.toLowerCase().includes('invalid credentials')) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        return res.status(401).json({ error: 'Please confirm your email before logging in' })
      }
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const { data: profile } = await db
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    const token = data.session?.access_token || createId()
    sessions[token] = { user: data.user, profile }

    res.json({ token, user: { id: data.user.id, email: data.user.email } })
  } catch (err) {
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' })
    }

    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.origin || 'http://localhost:3000'}/dashboard?reset=true`
    })

    if (error) {
      return res.status(500).json({ error: 'Failed to send reset email. Please try again.' })
    }

    res.json({ message: 'If an account exists with this email, you will receive a password reset link.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to send reset email. Please try again.' })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { password } = req.body

    const pwErr = validatePassword(password)
    if (pwErr) return res.status(400).json({ error: pwErr })

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Reset token is required. Use the link from your email.' })
    }

    const token = authHeader.slice(7)
    const { error } = await db.auth.updateUser(token, { password })

    if (error) {
      return res.status(500).json({ error: 'Failed to reset password. The link may have expired.' })
    }

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password. Please try again.' })
  }
})

router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    delete sessions[authHeader.slice(7)]
  }
  res.json({ message: 'Logged out' })
})

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email }, profile: req.profile })
})

export default router
