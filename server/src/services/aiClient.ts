const SYSTEM_PROMPT =
  'You are analyzing a payment incident timeline. Write a 3-4 sentence root cause summary ' +
  'explaining what happened, in the style of a technical incident report. Then list 3-5 key ' +
  'factors as short bullet points. Respond as strict JSON: {"summary": string, "keyFactors": string[]}.'

export interface RootCauseAnalysis {
  summary: string
  keyFactors: string[]
}

function parseAnalysis(content: string): RootCauseAnalysis {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('AI response was not valid JSON')
  }

  const { summary, keyFactors } = parsed as Record<string, unknown>
  if (typeof summary !== 'string' || !Array.isArray(keyFactors)) {
    throw new Error('AI response had an unexpected shape')
  }

  return { summary, keyFactors: keyFactors.map(String) }
}

async function callOpenAI(apiKey: string, userContent: string): Promise<RootCauseAnalysis> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`OpenAI request failed (${res.status}): ${await res.text()}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('OpenAI returned no content')
  }

  return parseAnalysis(content)
}

async function callGemini(apiKey: string, userContent: string): Promise<RootCauseAnalysis> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
      }),
    },
  )

  if (!res.ok) {
    throw new Error(`Gemini request failed (${res.status}): ${await res.text()}`)
  }

  const data = await res.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) {
    throw new Error('Gemini returned no content')
  }

  return parseAnalysis(content)
}

export async function generateRootCauseAnalysis(
  events: { step: string; detail: string }[],
): Promise<RootCauseAnalysis> {
  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    throw new Error('AI_API_KEY is not configured')
  }

  const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase()
  const userContent = `Incident timeline events:\n${events
    .map((e, i) => `${i + 1}. [${e.step}] ${e.detail}`)
    .join('\n')}`

  return provider === 'gemini' ? callGemini(apiKey, userContent) : callOpenAI(apiKey, userContent)
}
