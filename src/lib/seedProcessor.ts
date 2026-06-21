// MiroFish: text_processor — seed extraction & chunking.
// Splits the policy "seed" into overlapping chunks for graph ingestion.

import type { SeedChunk } from '@/types/swarm'

export function splitSeed(text: string, chunkSize = 320, overlap = 48): SeedChunk[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []

  const chunks: SeedChunk[] = []
  let start = 0
  let index = 0
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length)
    // try to break on a sentence boundary near the end
    let slice = clean.slice(start, end)
    if (end < clean.length) {
      const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('; '))
      if (lastStop > chunkSize * 0.5) slice = slice.slice(0, lastStop + 1)
    }
    chunks.push({ index, text: slice.trim() })
    index += 1
    start += Math.max(1, slice.length - overlap)
  }
  return chunks
}

// Pull salient keywords from the seed for downstream entity/topic seeding.
export function extractKeywords(text: string, max = 12): string[] {
  const stop = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'will', 'into', 'their',
    'have', 'are', 'was', 'were', 'has', 'aims', 'phase', 'both', 'four', 'two',
    'new', 'all', 'per', 'lane', 'lanes', 'project', 'includes', 'support',
  ])
  const freq = new Map<string, number>()
  for (const raw of text.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
    if (stop.has(raw)) continue
    freq.set(raw, (freq.get(raw) ?? 0) + 1)
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w)
}
