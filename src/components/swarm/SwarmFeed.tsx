import { useMemo } from 'react'
import { useSwarmStore } from '@/store/swarmStore'
import type { AgentPost, Sentiment } from '@/types/swarm'

const SENTIMENT_STYLE: Record<Sentiment, { dot: string; text: string; label: string }> = {
  positive: { dot: 'bg-emerald-500', text: 'text-emerald-400', label: 'positive' },
  neutral: { dot: 'bg-slate-500', text: 'text-slate-400', label: 'neutral' },
  negative: { dot: 'bg-red-500', text: 'text-red-400', label: 'negative' },
}

function PostCard({ post, reply }: { post: AgentPost; reply?: boolean }) {
  const s = SENTIMENT_STYLE[post.sentiment]
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/60 p-3 ${reply ? 'ml-8 mt-2' : ''}`}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-base">
          {post.avatar ?? '👤'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-slate-100">{post.authorName}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} title={s.label} />
            <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">
              {post.platform === 'twitter' ? '𝕏' : 'reddit'}
            </span>
          </div>
          <div className="truncate text-[11px] text-slate-500">{post.authorRole}</div>
        </div>
      </div>
      <p className="mt-2 text-sm leading-snug text-slate-200">{post.content}</p>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
        <span>♥ {post.likes.toLocaleString()}</span>
        <span>↻ {post.reposts}</span>
        <span className={s.text}>{s.label}</span>
      </div>
    </div>
  )
}

export default function SwarmFeed() {
  const rounds = useSwarmStore((s) => s.rounds)
  const activeRound = useSwarmStore((s) => s.activeRound)
  const setActiveRound = useSwarmStore((s) => s.setActiveRound)
  const injected = useSwarmStore((s) => s.injected)

  const round = rounds[activeRound]

  const threaded = useMemo(() => {
    if (!round) return []
    const roots = round.posts.filter((p) => !p.replyToId)
    return roots.map((root) => ({
      root,
      replies: round.posts.filter((p) => p.replyToId === root.id),
    }))
  }, [round])

  if (!round) {
    return <div className="flex h-full items-center justify-center text-slate-500">Run the simulation to populate the feed.</div>
  }

  const total = round.sentimentBreakdown.positive + round.sentimentBreakdown.neutral + round.sentimentBreakdown.negative
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  const activeInjection = injected.find((v) => v.id === round.injectedVariableId)

  return (
    <div className="flex h-full flex-col">
      {/* round scrubber */}
      <div className="border-b border-slate-800 p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-100">{round.label}</div>
          <div className="text-xs text-slate-400">
            Round {activeRound + 1} / {rounds.length}
          </div>
        </div>
        <div className="mt-2 flex gap-1">
          {rounds.map((r, i) => (
            <button
              key={r.round}
              onClick={() => setActiveRound(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i === activeRound ? 'bg-blue-400' : i < activeRound ? 'bg-blue-800' : 'bg-slate-700'
              }`}
              title={r.label}
            />
          ))}
        </div>

        {/* sentiment bar */}
        <div className="mt-3 flex h-2 overflow-hidden rounded-full">
          <div className="bg-emerald-500" style={{ width: `${pct(round.sentimentBreakdown.positive)}%` }} />
          <div className="bg-slate-500" style={{ width: `${pct(round.sentimentBreakdown.neutral)}%` }} />
          <div className="bg-red-500" style={{ width: `${pct(round.sentimentBreakdown.negative)}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span className="text-emerald-400">{pct(round.sentimentBreakdown.positive)}% positive</span>
          <span>{pct(round.sentimentBreakdown.neutral)}% neutral</span>
          <span className="text-red-400">{pct(round.sentimentBreakdown.negative)}% negative</span>
        </div>

        {/* emergent themes */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {round.emergentThemes.map((t) => (
            <span key={t} className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
              #{t.replace(/\s+/g, '')}
            </span>
          ))}
        </div>

        {activeInjection && (
          <div className="mt-2 rounded-lg border border-amber-700/50 bg-amber-900/20 px-2.5 py-1.5 text-[11px] text-amber-300">
            ⚡ God&apos;s-eye event: {activeInjection.description}
          </div>
        )}
      </div>

      {/* feed */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {threaded.map(({ root, replies }) => (
          <div key={root.id}>
            <PostCard post={root} />
            {replies.map((r) => (
              <PostCard key={r.id} post={r} reply />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
