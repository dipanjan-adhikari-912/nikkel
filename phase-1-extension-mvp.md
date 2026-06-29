# Nikkel — Phase 1: Chrome Extension MVP
> AI Coding Agent Instructions for OpenCode + DeepSeek
> Read this entire file before writing any code.

---

## 0. Agent Orientation

You are building **Nikkel**, a website annotation and feedback platform targeting agencies and corporates. The core value proposition is: drop a comment ("Nikkel") on any web page element, and an AI agent automatically classifies it, summarises it, and drafts a ticket — eliminating manual admin between client feedback and developer action.

Phase 1 delivers the Chrome extension, backend API, agent pipeline, and shareable client review board. No proxy, no white labelling, no mobile — those are Phase 2 and 3.

**Primary user:** An agency employee reviewing a client's staging site.
**Secondary user:** A client who receives a share link and replies to feedback. No install required for the client.

---

## 1. Architecture Overview

```
Chrome Extension (Manifest V3)
  └── Content Script      → injected into client site, handles DOM interaction
  └── Service Worker      → background, holds auth token, relays messages
  └── Popup               → toolbar UI, login state, project selector

        │ HTTPS (REST)
        ▼

Nikkel API (Node.js + Express)
  └── Auth routes
  └── Project routes
  └── Nikkel routes
  └── Board routes (public, no auth)
  └── Integration routes (Slack, Jira, Asana)
  └── Agent queue (pg_notify → async Claude API call)

        │
        ▼

Supabase
  └── PostgreSQL (all data)
  └── Storage (screenshots)
  └── Auth (JWT)

        │
        ▼

Claude API (claude-sonnet-4-6)
  └── Classifies Nikkel
  └── Summarises feedback
  └── Drafts ticket title + description

        │
        ▼

Next.js Frontend
  └── /dashboard         → agency dashboard
  └── /board/[token]     → public client review page (iframe + pins)
```

---

## 2. File Structure

```
nikkel/
├── extension/
│   ├── manifest.json
│   ├── background/
│   │   └── service-worker.js
│   ├── content/
│   │   ├── content-script.js
│   │   ├── overlay.js
│   │   ├── selector.js
│   │   └── screenshot.js
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.js
│   └── shared/
│       └── api.js
│
├── api/
│   ├── index.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── nikkels.js
│   │   ├── board.js
│   │   └── integrations.js
│   ├── services/
│   │   ├── agent.js
│   │   ├── queue.js
│   │   ├── slack.js
│   │   └── storage.js
│   └── db/
│       ├── client.js
│       └── schema.sql
│
└── web/
    ├── app/
    │   ├── dashboard/
    │   │   └── page.jsx
    │   ├── board/
    │   │   └── [token]/
    │   │       └── page.jsx
    │   └── layout.jsx
    └── components/
        ├── NikkelPin.jsx
        ├── CommentBubble.jsx
        └── KanbanBoard.jsx
```

---

## 3. Database Schema

Run this SQL in Supabase SQL editor before writing any application code.

```sql
-- Organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Users (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id),
  full_name text,
  role text default 'member', -- 'owner' | 'member'
  created_at timestamptz default now()
);

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  url text not null,
  share_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now()
);

-- Nikkels (annotations)
create table nikkels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  page_url text not null,
  selector text,                  -- CSS selector, may be null if only coords available
  coord_x float,                  -- % of page width, fallback positioning
  coord_y float,                  -- % of page height, fallback positioning
  element_tag text,
  element_text text,
  comment_text text not null,
  screenshot_url text,
  author_id uuid references profiles(id),
  author_name text,               -- stored denormalised for guest replies
  status text default 'open',     -- 'open' | 'in_progress' | 'resolved'
  -- Agent output fields
  classification text,            -- 'bug' | 'copy' | 'design' | 'content' | 'other'
  severity text,                  -- 'low' | 'medium' | 'high'
  agent_summary text,
  ticket_title text,
  ticket_description text,
  agent_processed_at timestamptz,
  -- Integration fields
  jira_issue_id text,
  asana_task_id text,
  created_at timestamptz default now()
);

-- Replies
create table replies (
  id uuid primary key default gen_random_uuid(),
  nikkel_id uuid references nikkels(id) on delete cascade,
  author_name text not null,
  author_email text,
  text text not null,
  is_client boolean default false,
  created_at timestamptz default now()
);

-- Integrations
create table integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  type text not null,             -- 'slack' | 'jira' | 'asana'
  credentials jsonb not null,     -- encrypted at app level before storing
  created_at timestamptz default now()
);

-- Indexes
create index on nikkels(project_id);
create index on nikkels(status);
create index on replies(nikkel_id);
create index on projects(org_id);
create index on projects(share_token);
```

---

## 4. API Routes

### 4.1 Auth
```
POST   /auth/login          body: { email, password }
POST   /auth/logout
POST   /auth/register       body: { email, password, fullName, orgName }
GET    /auth/me
```

### 4.2 Projects
```
GET    /projects                          → list all projects for org
POST   /projects                          body: { name, url }
GET    /projects/:id                      → project + nikkel summary counts
DELETE /projects/:id
```

### 4.3 Nikkels
```
GET    /projects/:id/nikkels              → all nikkels for project
POST   /projects/:id/nikkels             body: { pageUrl, selector, coordX, coordY,
                                                  elementTag, elementText,
                                                  commentText, screenshotBase64 }
GET    /nikkels/:id
PATCH  /nikkels/:id                       body: { status }
DELETE /nikkels/:id
GET    /nikkels/:id/replies
POST   /nikkels/:id/replies              body: { authorName, authorEmail, text }
```

### 4.4 Board (public — no auth)
```
GET    /board/:shareToken                 → project metadata + all nikkels
POST   /board/:shareToken/reply          body: { nikkelId, authorName,
                                                  authorEmail, text }
```

### 4.5 Integrations
```
POST   /integrations/slack/connect       body: { webhookUrl }
POST   /integrations/jira/connect        body: { domain, email, apiToken, projectKey }
POST   /integrations/asana/connect       body: { accessToken, projectId }
POST   /integrations/jira/push/:nikkelId
POST   /integrations/asana/push/:nikkelId
```

---

## 5. Chrome Extension — Detailed Implementation

### 5.1 manifest.json
```json
{
  "manifest_version": 3,
  "name": "Nikkel",
  "version": "1.0.0",
  "description": "Drop a Nikkel. Ship faster.",
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "tabs"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

### 5.2 Extension Modes

The content script operates in three modes:

```javascript
// content/content-script.js

const MODES = {
  IDLE: 'idle',
  BROWSING: 'browsing',
  ANNOTATING: 'annotating'
}

let currentMode = MODES.IDLE
let activeProject = null

// Listen for mode changes from popup or service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_MODE') {
    currentMode = message.mode
    activeProject = message.project
    applyMode(currentMode)
  }
  if (message.type === 'GET_MODE') {
    sendResponse({ mode: currentMode })
  }
})

function applyMode(mode) {
  if (mode === MODES.ANNOTATING) {
    document.body.style.cursor = 'crosshair'
    document.addEventListener('mouseover', handleHover)
    document.addEventListener('click', handleClick, true)
  } else {
    document.body.style.cursor = ''
    document.removeEventListener('mouseover', handleHover)
    document.removeEventListener('click', handleClick, true)
    removeHighlight()
    closeCommentBubble()
  }
}
```

### 5.3 Selector Generation

```javascript
// content/selector.js

export function generateSelector(element) {
  // Strategy 1: ID
  if (element.id && !element.id.match(/^\d/)) {
    return { selector: `#${element.id}`, strategy: 'id' }
  }

  // Strategy 2: data-testid or data-id
  const testId = element.dataset.testid || element.dataset.id || element.dataset.cy
  if (testId) {
    const attr = element.dataset.testid ? 'data-testid' :
                 element.dataset.id ? 'data-id' : 'data-cy'
    return { selector: `[${attr}="${testId}"]`, strategy: 'data-attr' }
  }

  // Strategy 3: aria-label
  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) {
    return {
      selector: `${element.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`,
      strategy: 'aria'
    }
  }

  // Strategy 4: unique class combination
  if (element.classList.length > 0) {
    const classes = Array.from(element.classList)
      .filter(c => !c.match(/^(js-|is-|has-)/)) // skip state classes
      .slice(0, 3)
      .join('.')
    if (classes) {
      const selector = `${element.tagName.toLowerCase()}.${classes}`
      if (document.querySelectorAll(selector).length === 1) {
        return { selector, strategy: 'class' }
      }
    }
  }

  // Strategy 5: positional (fragile, last resort)
  return { selector: buildPositionalSelector(element), strategy: 'positional' }
}

function buildPositionalSelector(element) {
  const parts = []
  let current = element

  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase()
    const siblings = Array.from(current.parentNode?.children || [])
      .filter(s => s.tagName === current.tagName)
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1
      part += `:nth-of-type(${index})`
    }
    parts.unshift(part)
    current = current.parentElement
  }

  return parts.join(' > ')
}

export function getCoordinates(element) {
  const rect = element.getBoundingClientRect()
  const scrollTop = window.scrollY
  const scrollLeft = window.scrollX

  return {
    coordX: ((rect.left + scrollLeft + rect.width / 2) / document.body.scrollWidth) * 100,
    coordY: ((rect.top + scrollTop + rect.height / 2) / document.body.scrollHeight) * 100
  }
}
```

### 5.4 Screenshot Capture

Use `html2canvas`. Load it as an extension resource.

```javascript
// content/screenshot.js

export async function captureScreenshot(element) {
  // Scroll element into view
  element.scrollIntoView({ behavior: 'instant', block: 'center' })

  // Small delay for scroll to settle
  await new Promise(r => setTimeout(r, 150))

  const canvas = await html2canvas(document.body, {
    useCORS: true,
    allowTaint: true,
    scale: 1,
    logging: false
  })

  // Draw a highlight rect over the target element
  const ctx = canvas.getContext('2d')
  const rect = element.getBoundingClientRect()
  const scrollTop = window.scrollY

  ctx.strokeStyle = '#6366f1' // Nikkel brand colour
  ctx.lineWidth = 3
  ctx.strokeRect(
    rect.left,
    rect.top + scrollTop,
    rect.width,
    rect.height
  )

  return canvas.toDataURL('image/jpeg', 0.8)
}
```

---

## 6. Agent Pipeline

### 6.1 Queue (pg_notify)

```javascript
// api/services/queue.js
import { db } from '../db/client.js'

// Producer — called after nikkel is saved
export async function enqueueNikkel(nikkelId) {
  await db.query(
    `SELECT pg_notify('nikkel_created', $1)`,
    [JSON.stringify({ nikkelId })]
  )
}

// Consumer — runs as a long-lived listener
export async function startAgentWorker() {
  const listenerClient = await db.connect()
  await listenerClient.query('LISTEN nikkel_created')

  listenerClient.on('notification', async (msg) => {
    const { nikkelId } = JSON.parse(msg.payload)
    await processNikkel(nikkelId)
  })

  console.log('Agent worker listening for nikkels...')
}
```

### 6.2 Claude API Call

```javascript
// api/services/agent.js
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function processNikkel(nikkelId) {
  const nikkel = await getNikkelById(nikkelId)
  if (!nikkel) return

  const prompt = buildAgentPrompt(nikkel)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: `You are an expert project manager assistant for a web agency.
You receive website feedback annotations and your job is to:
1. Classify the feedback type
2. Assess severity
3. Write a concise summary
4. Draft a clear, actionable ticket

Always respond with valid JSON only. No preamble, no markdown, no explanation.`,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          ...(nikkel.screenshot_url ? [{
            type: 'image',
            source: {
              type: 'url',
              url: nikkel.screenshot_url
            }
          }] : [])
        ]
      }
    ]
  })

  const raw = response.content[0].text
  const result = JSON.parse(raw)

  await updateNikkelWithAgentOutput(nikkelId, result)
  await notifySlack(nikkel, result)
}

function buildAgentPrompt(nikkel) {
  return `
Page URL: ${nikkel.page_url}
Element: <${nikkel.element_tag}> "${nikkel.element_text || 'no text'}"
Feedback: "${nikkel.comment_text}"
Project: ${nikkel.project_name}

Respond with this exact JSON structure:
{
  "classification": "bug" | "copy" | "design" | "content" | "other",
  "severity": "low" | "medium" | "high",
  "summary": "One sentence, present tense, action-oriented",
  "ticket_title": "Short, scannable, starts with [TYPE]",
  "ticket_description": "2-3 sentences. What is wrong, where, and what the expected behaviour should be."
}
`
}
```

---

## 7. Client Review Board

The board page loads the target URL in an iframe and overlays Nikkel pins.

```jsx
// web/app/board/[token]/page.jsx
'use client'
import { useEffect, useState, useRef } from 'react'

export default function BoardPage({ params }) {
  const [project, setProject] = useState(null)
  const [nikkels, setNikkels] = useState([])
  const [activeNikkel, setActiveNikkel] = useState(null)
  const iframeRef = useRef(null)

  useEffect(() => {
    fetch(`/api/board/${params.token}`)
      .then(r => r.json())
      .then(data => {
        setProject(data.project)
        setNikkels(data.nikkels)
      })
  }, [params.token])

  // Pin positioning: convert stored % coords back to pixels
  function getPinStyle(nikkel) {
    return {
      position: 'absolute',
      left: `${nikkel.coord_x}%`,
      top: `${nikkel.coord_y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: 1000
    }
  }

  if (!project) return <div>Loading...</div>

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Live site in iframe */}
      <iframe
        ref={iframeRef}
        src={project.url}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Client site review"
      />

      {/* Nikkel pins overlaid */}
      {nikkels.map(nikkel => (
        <div
          key={nikkel.id}
          style={getPinStyle(nikkel)}
          onClick={() => setActiveNikkel(nikkel)}
        >
          <NikkelPin nikkel={nikkel} />
        </div>
      ))}

      {/* Active comment bubble */}
      {activeNikkel && (
        <CommentBubble
          nikkel={activeNikkel}
          token={params.token}
          onClose={() => setActiveNikkel(null)}
        />
      )}
    </div>
  )
}
```

> **Known limitation:** Sites that set `X-Frame-Options: DENY` or `Content-Security-Policy: frame-ancestors 'none'` will not render in the iframe. Document this to users. This is resolved in Phase 2 with the proxy layer.

---

## 8. Environment Variables

```bash
# api/.env
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
SLACK_DEFAULT_WEBHOOK=
JIRA_BASE_URL=
PORT=3001

# web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 9. Tech Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Extension | Vanilla JS + Preact | MV3 |
| Screenshot | html2canvas | latest |
| API | Node.js + Express | 20+ / 4.x |
| Database | Supabase (PostgreSQL) | latest |
| Storage | Supabase Storage | latest |
| Agent | Anthropic SDK | latest |
| AI Model | claude-sonnet-4-6 | — |
| Queue | pg_notify (built into Postgres) | — |
| Frontend | Next.js + Tailwind | 14+ |
| Deployment | Vercel (web) + Railway (api) | — |

---

## 10. Acceptance Criteria

Phase 1 is complete when all of the following pass:

- [ ] Agency user can install the extension and log in
- [ ] Extension activates on any public website
- [ ] Clicking an element opens a comment bubble
- [ ] Submitting a comment saves to DB and shows a pin on the page
- [ ] Screenshot is captured and stored in Supabase Storage
- [ ] Within 10 seconds of submission, agent has classified and summarised the Nikkel
- [ ] Slack notification sent on every new Nikkel
- [ ] Shareable board URL loads the target site with all Nikkels as pins
- [ ] Client can click a pin and post a reply without logging in
- [ ] Dashboard shows all projects and Nikkels with status
- [ ] Nikkel status can be updated (open → in_progress → resolved)
- [ ] One-click push to Jira creates a pre-filled issue
- [ ] One-click push to Asana creates a pre-filled task

---

## 11. What Is Explicitly Out of Scope for Phase 1

Do not build these. They are Phase 2 or Phase 3.

- Proxy-based canvas (Phase 2)
- White labelling / custom domains (Phase 2)
- PDF export (Phase 2)
- Firefox extension (Phase 2)
- SSO / SAML (Phase 3)
- Pattern detection across Nikkels (Phase 3)
- Proactive agent follow-ups (Phase 3)
- Mobile support (Phase 2)
- Multi-agent workflows (Phase 3)
