import Anthropic from '@anthropic-ai/sdk'
import { db } from '../db/client.js'

const client = new Anthropic()

export async function processNikkel(nikkelId) {
  const { data: nikkel, error } = await db
    .from('nikkels')
    .select('*, projects(name)')
    .eq('id', nikkelId)
    .single()

  if (error || !nikkel) {
    console.error('Nikkel not found:', nikkelId)
    return
  }

  const prompt = buildAgentPrompt(nikkel)

  try {
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
            { type: 'text', text: prompt },
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

    await db
      .from('nikkels')
      .update({
        classification: result.classification,
        severity: result.severity,
        agent_summary: result.summary,
        ticket_title: result.ticket_title,
        ticket_description: result.ticket_description,
        agent_processed_at: new Date().toISOString()
      })
      .eq('id', nikkelId)

    console.log(`Agent processed nikkel ${nikkelId}: ${result.classification}/${result.severity}`)
  } catch (err) {
    console.error(`Agent processing failed for ${nikkelId}:`, err.message)
  }
}

function buildAgentPrompt(nikkel) {
  return `
Page URL: ${nikkel.page_url}
Element: <${nikkel.element_tag}> "${nikkel.element_text || 'no text'}"
Feedback: "${nikkel.comment_text}"
Project: ${nikkel.projects?.name || 'Unknown'}

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
