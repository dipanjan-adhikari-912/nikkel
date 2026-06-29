import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

let db
const mem = { users: [], profiles: [], organizations: [], projects: [], nikkels: [], replies: [] }
const sessions = {}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildChain(table, rows) {
  let result = [...rows]
  const chain = {
    select: () => chain,
    eq: (key, val) => { result = result.filter(r => r[key] === val); return chain },
    order: (col, { ascending } = {}) => {
      result.sort((a, b) => ascending ? (a[col] > b[col] ? 1 : -1) : (a[col] < b[col] ? 1 : -1))
      return chain
    },
    single: () => ({ data: result[0] || null, error: result.length === 0 ? new Error('Not found') : null }),
    then: (resolve) => resolve({ data: result, error: null }),
    insert: (row) => {
      const entry = { ...row, id: row.id || createId(), created_at: new Date().toISOString() }
      if (table === 'projects' && !entry.share_token) {
        entry.share_token = createId().replace(/-/g, '').slice(0, 32)
      }
      mem[table].push(entry)
      return {
        select: () => ({
          then: (resolve) => resolve({ data: entry, error: null }),
          single: () => ({ data: entry, error: null })
        }),
        error: null
      }
    },
    update: (vals) => ({
      eq: (key, val) => {
        const idx = mem[table].findIndex(r => r[key] === val)
        if (idx !== -1) mem[table][idx] = { ...mem[table][idx], ...vals }
        const updated = idx !== -1 ? mem[table][idx] : null
        return {
          select: () => ({ then: (resolve) => resolve({ data: updated, error: null }), single: () => ({ data: updated, error: null }) }),
          then: (resolve) => resolve({ data: updated, error: null })
        }
      }
    }),
    delete: () => ({
      eq: (key, val) => {
        mem[table] = mem[table].filter(r => r[key] !== val)
        return { then: (resolve) => resolve({ data: null, error: null }) }
      }
    })
  }
  return chain
}

if (!supabaseUrl || !supabaseKey) {
  console.log('Supabase not configured — using in-memory storage')
  db = {
    auth: {
      admin: {
        createUser: async ({ email, password, user_metadata }) => {
          const existing = mem.users.find(u => u.email === email)
          if (existing) return { data: null, error: new Error('User already registered') }
          const user = {
            id: createId(),
            email,
            password,
            user_metadata: user_metadata || {},
            created_at: new Date().toISOString()
          }
          mem.users.push(user)
          return { data: { user }, error: null }
        },
        deleteUser: async (id) => {
          mem.users = mem.users.filter(u => u.id !== id)
          return { data: null, error: null }
        }
      },
      signInWithPassword: async ({ email, password }) => {
        const user = mem.users.find(u => u.email === email && u.password === password)
        if (!user) return { data: null, error: new Error('Invalid login credentials') }
        return { data: { user, session: { access_token: createId() } }, error: null }
      },
      getUser: async (token) => {
        const session = sessions[token]
        if (!session) return { data: { user: null }, error: new Error('Invalid token') }
        return { data: { user: session.user }, error: null }
      },
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: null }),
      updateUser: async (token, attrs) => {
        const user = Object.values(sessions).find(s => s.user?.id)?.user
        if (!user) return { data: null, error: new Error('Invalid token') }
        Object.assign(user, attrs)
        return { data: { user }, error: null }
      }
    },
    from: (table) => {
      if (!mem[table]) mem[table] = []
      return buildChain(table, mem[table])
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: null } })
      })
    },
    rpc: async () => ({ data: null, error: null })
  }
} else {
  db = createClient(supabaseUrl, supabaseKey)
}

export { db, mem, sessions, createId }
