'use client'

import { useState, useRef, useCallback } from 'react'

type Goal = 'retention' | 'conversion' | 'reach'

interface MediaFile {
  id: string
  file: File
  preview: string
  base64: string
  type: string
  isVideo: boolean
}

interface VideoIdea {
  video_title: string
  assets_to_use: string
  format: string
  hook: string
  alt_hooks: string[]
  video_prompt: string
  caption_angle: string
  cta: string
}

interface GenerationResult {
  collection_read: string
  pillar: string
  content_plan: VideoIdea[]
  series_idea: string | null
}

const goals = [
  { id: 'retention' as Goal, label: 'Retention', desc: 'Keep them watching, build loyal audience', icon: '◷' },
  { id: 'conversion' as Goal, label: 'Conversion', desc: 'Drive DMs, signups, sales, or clicks', icon: '◈' },
  { id: 'reach' as Goal, label: 'Reach', desc: 'Get shared, go viral, grow new followers', icon: '◎' }
]

export default function Home() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [goal, setGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const compressImage = (file: File): Promise<{ base64: string; preview: string }> => {
    return new Promise((res) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const MAX = 1200
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        const preview = canvas.toDataURL('image/jpeg', 0.85)
        const base64 = preview.split(',')[1]
        URL.revokeObjectURL(url)
        res({ base64, preview })
      }
      img.src = url
    })
  }

  const processFiles = useCallback(async (incoming: File[]) => {
    const valid = incoming
      .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .slice(0, 10 - files.length)

    if (!valid.length) return

    const imageFiles = valid.filter(f => !f.type.startsWith('video/'))
    const total = imageFiles.length
    setUploadProgress(total > 0 ? { current: 0, total } : null)

    const processed: MediaFile[] = []

    for (const file of valid) {
      const isVideo = file.type.startsWith('video/')
      let base64 = ''
      let preview = ''

      if (!isVideo) {
        const compressed = await compressImage(file)
        base64 = compressed.base64
        preview = compressed.preview
        setUploadProgress(prev => prev ? { ...prev, current: prev.current + 1 } : null)
      }

      processed.push({
        id: Math.random().toString(36).slice(2),
        file,
        preview,
        base64,
        type: 'image/jpeg',
        isVideo
      })

      setFiles(prev => [...prev, ...processed.slice(prev.length)].slice(0, 10))
    }

    setUploadProgress(null)
  }, [files.length])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    processFiles(Array.from(e.dataTransfer.files))
  }, [processFiles])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files))
  }

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id))

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const generate = async () => {
    if (!files.length || !goal) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const images = files
        .filter(f => !f.isVideo)
        .map(f => ({ base64: f.base64, type: f.type }))

      if (!images.length) {
        setError('Please include at least one image. Video files need image frames to analyze.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, goal })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFiles([])
    setGoal(null)
    setResult(null)
    setError(null)
  }

  const canGenerate = files.some(f => !f.isVideo) && goal && !loading

  return (
    <main className="min-h-screen bg-[#0e0e0e] text-white">
      <div className="max-w-2xl mx-auto px-5 py-12">

        <div className="mb-10">
          <p className="text-xs tracking-[0.2em] uppercase text-zinc-500 mb-3">Have Creative Agency</p>
          <h1 className="text-2xl font-medium tracking-tight text-white">Content Prompt Generator</h1>
          <p className="text-sm text-zinc-400 mt-2">Drop your media, pick a goal, get a content plan.</p>
        </div>

        {!result ? (
          <>
            <div
              className={`relative border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-3 ${
                dragOver ? 'border-zinc-400 bg-zinc-800/50' : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileInput} />
              <div className="text-3xl mb-3 text-zinc-600">↑</div>
              <p className="text-sm text-zinc-300 font-medium">Drop photos or videos</p>
              <p className="text-xs text-zinc-500 mt-1">Up to 10 files · jpg, png, mp4, mov</p>
              {files.length > 0 && (
                <p className="text-xs text-zinc-400 mt-2 font-medium">{files.length} file{files.length > 1 ? 's' : ''} added</p>
              )}
            </div>

            {uploadProgress && (
              <div className="mt-3 mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-500">Processing {uploadProgress.current} of {uploadProgress.total} images...</span>
                  <span className="text-xs text-zinc-500">{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                </div>
                <div className="h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mb-6">
                {files.map(f => (
                  <div key={f.id} className="relative group aspect-square">
                    {f.isVideo ? (
                      <div className="w-full h-full rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-lg">▶</div>
                    ) : (
                      <img src={f.preview} alt="" className="w-full h-full object-cover rounded-lg" />
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); removeFile(f.id) }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >×</button>
                  </div>
                ))}
                {files.length < 10 && (
                  <div
                    className="aspect-square rounded-lg border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600 cursor-pointer hover:border-zinc-500 transition-colors text-xl"
                    onClick={() => fileInputRef.current?.click()}
                  >+</div>
                )}
              </div>
            )}

            <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-500 mb-3">What&apos;s the goal?</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {goals.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    goal === g.id ? 'border-zinc-400 bg-zinc-800' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xl mb-2 text-zinc-400">{g.icon}</div>
                  <div className="text-sm font-medium text-white">{g.label}</div>
                  <div className="text-xs text-zinc-500 mt-1 leading-snug">{g.desc}</div>
                </button>
              ))}
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-4 py-3 mb-4">{error}</div>
            )}

            <button
              onClick={generate}
              disabled={!canGenerate}
              className="w-full py-4 rounded-xl text-sm font-medium transition-all bg-white text-black hover:bg-zinc-100 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              Generate content plan →
            </button>
          </>
        ) : (
          <div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-[10px] tracking-[0.15em] uppercase text-zinc-500">Collection read</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">{result.pillar}</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize">{goal}</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{result.collection_read}</p>
              {result.series_idea && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-500 mb-1">Series potential</p>
                  <p className="text-sm text-zinc-400">{result.series_idea}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {result.content_plan.map((idea, i) => (
                <div key={i} className="border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="bg-zinc-900 px-5 py-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-500 mb-1">Video {i + 1}</p>
                      <p className="text-sm font-medium text-white">{idea.video_title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">{idea.format}</span>
                      <span className="text-[11px] text-zinc-500 text-right max-w-[140px]">{idea.assets_to_use}</span>
                    </div>
                  </div>

                  <div className="bg-[#0e0e0e] px-5 py-4 space-y-4">
                    <div>
                      <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-500 mb-2">Hook — tap to copy</p>
                      <div
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white leading-relaxed cursor-pointer hover:border-zinc-500 transition-colors flex items-start justify-between gap-3 group"
                        onClick={() => copy(idea.hook, `hook-${i}`)}
                      >
                        <span>{idea.hook}</span>
                        <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0 text-xs mt-0.5">
                          {copied === `hook-${i}` ? '✓' : 'copy'}
                        </span>
                      </div>
                      {idea.alt_hooks?.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {idea.alt_hooks.map((h, j) => (
                            <div
                              key={j}
                              className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-zinc-400 cursor-pointer hover:border-zinc-600 hover:text-zinc-300 transition-all flex items-start justify-between gap-3 group"
                              onClick={() => copy(h, `alt-${i}-${j}`)}
                            >
                              <span>{h}</span>
                              <span className="text-zinc-700 group-hover:text-zinc-500 shrink-0">
                                {copied === `alt-${i}-${j}` ? '✓' : 'copy'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-500 mb-2">Video direction</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{idea.video_prompt}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-900 rounded-lg px-4 py-3">
                        <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-500 mb-1.5">Caption angle</p>
                        <p className="text-xs text-zinc-300 leading-relaxed">{idea.caption_angle}</p>
                      </div>
                      <div className="bg-zinc-900 rounded-lg px-4 py-3">
                        <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-500 mb-1.5">CTA</p>
                        <p className="text-xs text-zinc-300 leading-relaxed">{idea.cta}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={reset}
              className="w-full mt-6 py-3.5 rounded-xl text-sm text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 transition-all"
            >
              ↺ Start over
            </button>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-[#0e0e0e]/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="w-8 h-8 border border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-zinc-400">Analyzing your content...</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
