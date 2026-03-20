import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'

const FEEDS = [
  {
    label: 'BBC Sport',
    url: 'https://feeds.bbci.co.uk/sport/formula1/rss.xml',
  },
  {
    label: 'Autosport',
    url: 'https://www.autosport.com/rss/f1/news',
  },
  {
    label: 'RaceFans',
    url: 'https://www.racefans.net/feed/',
  },
]

const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url='

interface NewsItem {
  title: string
  link: string
  pubDate: string
  description: string
  thumbnail: string
  author: string
}

function useFeed(url: string) {
  return useQuery({
    queryKey: ['news', url],
    queryFn: async () => {
      const res = await fetch(`${RSS2JSON}${encodeURIComponent(url)}`)
      const data = await res.json()
      return (data.items ?? []) as NewsItem[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days > 0)  return `${days}d ago`
  if (hrs > 0)   return `${hrs}h ago`
  if (mins > 0)  return `${mins}m ago`
  return 'Just now'
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  return (
    <motion.a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex gap-4 rounded-xl border p-4 cursor-pointer group"
      style={{ backgroundColor: 'var(--f1-card)', borderColor: 'var(--f1-border)', textDecoration: 'none' }}
      whileHover={{ borderColor: 'var(--f1-red)', scale: 1.01 }}
    >
      {/* Thumbnail */}
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt=""
          className="w-24 h-20 object-cover rounded-lg flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div
          className="w-24 h-20 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl"
          style={{ backgroundColor: 'var(--f1-border)' }}
        >
          🏎️
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-white transition-colors"
          style={{ color: 'white' }}
        >
          {item.title}
        </p>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
          {stripHtml(item.description).slice(0, 120)}...
        </p>
        <div className="flex items-center gap-3 mt-2">
          {item.author && (
            <span className="text-xs text-gray-500">{item.author}</span>
          )}
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--f1-red)' }}
          >
            {timeAgo(item.pubDate)}
          </span>
        </div>
      </div>
    </motion.a>
  )
}

function SkeletonCard() {
  return (
    <div
      className="flex gap-4 rounded-xl border p-4"
      style={{ backgroundColor: 'var(--f1-card)', borderColor: 'var(--f1-border)' }}
    >
      <div className="w-24 h-20 rounded-lg animate-pulse flex-shrink-0" style={{ backgroundColor: 'var(--f1-border)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--f1-border)' }} />
        <div className="h-4 w-3/4 rounded animate-pulse" style={{ backgroundColor: 'var(--f1-border)' }} />
        <div className="h-3 w-1/2 rounded animate-pulse" style={{ backgroundColor: 'var(--f1-border)' }} />
      </div>
    </div>
  )
}

export default function News() {
  const [activeFeed, setActiveFeed] = useState(0)
  const { data, isLoading, error } = useFeed(FEEDS[activeFeed].url)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          <span style={{ color: 'var(--f1-red)' }}>F1</span> News
        </h1>
        <p className="text-gray-400 text-sm mt-1">Latest from the paddock</p>
      </motion.div>

      {/* Source tabs */}
      <div className="flex gap-2 mb-6">
        {FEEDS.map((feed, i) => (
          <button
            key={feed.label}
            onClick={() => setActiveFeed(i)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeFeed === i ? 'var(--f1-red)' : 'var(--f1-card)',
              color: activeFeed === i ? 'white' : '#6b6b6b',
              border: `1px solid ${activeFeed === i ? 'var(--f1-red)' : 'var(--f1-border)'}`,
            }}
          >
            {feed.label}
          </button>
        ))}
      </div>

      {/* Live dot + count */}
      {data && (
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {data.length} articles from {FEEDS[activeFeed].label}
        </div>
      )}

      {/* Feed */}
      <div className="space-y-3">
        {isLoading && Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}

        {error && (
          <div
            className="rounded-xl border p-6 text-center"
            style={{ backgroundColor: 'var(--f1-card)', borderColor: 'var(--f1-border)' }}
          >
            <p className="text-gray-400 text-sm">Could not load feed. Try another source.</p>
          </div>
        )}

        {data?.map((item, i) => (
          <NewsCard key={item.link} item={item} index={i} />
        ))}
      </div>

    </div>
  )
}