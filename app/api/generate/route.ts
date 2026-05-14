import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { images, goal } = await req.json()

    const goalContext = {
      retention: 'The goal is RETENTION — keep viewers watching to the end, build loyal audience, drive follows and saves. Hooks should be open-loop, story-first, or pattern-interrupt. Formats should favor talking heads, series formats, storytelling. CTAs: follow, save, watch part 2.',
      conversion: 'The goal is CONVERSION — drive DMs, signups, sales, or link clicks. Hooks should be problem-solution, objection-handling, or proof-based. Formats: testimonials, before/after, demos, direct offers. CTAs: DM me, link in bio, book a call, buy now.',
      reach: 'The goal is REACH — get shared, go viral, attract new followers. Hooks should be relatable, shareable, surprising, or trend-adjacent. Formats: POV, reactions, collab-bait, hot takes. CTAs: share this, comment your answer, tag someone, duet.'
    }

    const systemPrompt = `You are a short-form video strategist. You analyze a batch of images/media together as a content collection and generate a strategic content plan — not one prompt per image, but a cohesive set of video ideas that use the assets together.

Respond in valid JSON only. No markdown, no backticks, no preamble.

Return this exact structure:
{
  "collection_read": "2-3 sentence read of what this batch of content suggests about the creator, niche, aesthetic, and story potential",
  "pillar": "one of: Education | Inspiration | Social Proof | Entertainment | Authority",
  "content_plan": [
    {
      "video_title": "Short working title for this video idea",
      "assets_to_use": "Which images/assets from the batch work best for this (e.g. 'all of them', 'the outdoor shots', 'image 1 and 3')",
      "format": "Format type (Talking Head, B-Roll Overlay, POV, Before/After, Photo Montage, Trending Audio, etc.)",
      "hook": "The specific opening hook — ready to say on camera or use as text overlay",
      "alt_hooks": ["Alternative hook 1", "Alternative hook 2"],
      "video_prompt": "2-3 sentence director-style prompt describing exactly how to shoot or sequence this video",
      "caption_angle": "One-sentence caption direction",
      "cta": "Specific call to action"
    }
  ],
  "series_idea": "Optional: if the batch suggests a multi-part series, describe it in 1-2 sentences. Otherwise null."
}

Return 3-5 video ideas in content_plan. Make hooks specific and platform-native. The video_prompt should feel like real creative direction, not a generic template.`

    const imageContent = images.map((img: { base64: string; type: string }, i: number) => ([
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.type,
          data: img.base64
        }
      },
      {
        type: 'text',
        text: `Image ${i + 1}`
      }
    ])).flat()

    const messages = [
      {
        role: 'user' as const,
        content: [
          ...imageContent,
          {
            type: 'text' as const,
            text: `I've shared ${images.length} image(s) above. Analyze them together as a content collection.\n\nGoal context: ${goalContext[goal as keyof typeof goalContext]}\n\nGenerate a strategic content plan for this batch.`
          }
        ]
      }
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages
    })

    const raw = response.content.find(b => b.type === 'text')?.text || ''
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

    return NextResponse.json(parsed)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
