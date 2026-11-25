import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronRight, Library, Scroll } from 'lucide-react'
import { hapticSelect } from '@/lib/haptics'
import { SACRED_LIBRARY } from '@/data/sacred-library'

export default function SacredLibraryScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen px-5 pt-6 pb-8 safe-top">
      <div className="flex items-center gap-3 mb-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { hapticSelect(); navigate('/read') }}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-midnight/5 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-midnight" strokeWidth={1.5} />
        </motion.button>
        <h1 className="font-serif text-2xl text-charcoal">The Sacred Library</h1>
      </div>
      <p className="text-sm text-charcoal-muted mb-2">
        Texts every seeker should know — free, on your phone, in their own words.
      </p>
      <p className="text-xs text-charcoal-muted/80 mb-6 italic font-serif">
        The lost gospels, the desert scrolls, the wisdom the canon left behind.
      </p>

      <div className="space-y-4">
        {SACRED_LIBRARY.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.4) }}
            className="bg-cream-warm rounded-2xl border border-border-soft p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-midnight/5 text-midnight flex items-center justify-center flex-shrink-0">
                  <Library className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium text-charcoal leading-snug">{entry.name}</h2>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    {entry.era} · {entry.origin}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { hapticSelect(); navigate(`/read/${entry.id}`) }}
                className="text-xs text-terracotta font-medium whitespace-nowrap pt-1"
              >
                Read
              </button>
            </div>

            <p className="text-sm text-charcoal-muted mt-3 leading-relaxed">
              {entry.description}
            </p>
            <p className="text-xs text-charcoal-light mt-2 leading-relaxed italic">
              {entry.whyItMatters}
            </p>

            <div className="mt-4 pt-3 border-t border-border-soft space-y-2">
              {entry.books.map((book) => (
                <button
                  key={book.id}
                  onClick={() => { hapticSelect(); navigate(`/read/${entry.id}/${book.id}/1`) }}
                  className="w-full flex items-start justify-between gap-3 text-left active:opacity-70 transition-opacity"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <Scroll className="w-3.5 h-3.5 text-charcoal-muted mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <span className="text-sm text-charcoal font-medium">{book.name}</span>
                      <p className="text-xs text-charcoal-muted leading-snug mt-0.5">{book.note}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-charcoal-muted flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
