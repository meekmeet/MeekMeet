import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shuffle, ArrowRight } from 'lucide-react'
import { hapticSelect } from '@/lib/haptics'
import { getRelatedVerses } from '@/data/cross-references'
import { TRADITION_LABELS as traditionLabels } from '@/data/tradition-labels'

interface CrossReferenceProps {
  tradition: string
  bookId: string
  chapter: number
  verse: number
}

const traditionColors: Record<string, string> = {
  bible: 'bg-sage-pale text-sage-dark border-sage/20',
  quran: 'bg-wheat-pale text-wheat-dark border-wheat/20',
  tanakh: 'bg-sky-pale text-sky-soft border-sky-soft/20',
  buddhist: 'bg-terracotta-pale text-terracotta border-terracotta/20',
  mormon: 'bg-amber-50 text-amber-800 border-amber-200',
  dead_sea_scrolls: 'bg-stone-200 text-stone-700 border-stone-300',
  nag_hammadi: 'bg-violet-100 text-violet-800 border-violet-200',
  apocrypha: 'bg-teal-100 text-teal-800 border-teal-200',
  pseudepigrapha: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  vedas: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  upanishads: 'bg-orange-100 text-orange-900 border-orange-200',
  tao: 'bg-gray-200 text-gray-700 border-gray-300',
  confucian: 'bg-red-100 text-red-800 border-red-200',
  sikh: 'bg-blue-100 text-blue-800 border-blue-200',
  jain: 'bg-lime-100 text-lime-800 border-lime-200',
}

export default function CrossReference({ tradition, bookId, chapter, verse }: CrossReferenceProps) {
  const navigate = useNavigate()
  const related = getRelatedVerses(tradition, bookId, chapter, verse)

  if (related.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-10 pt-8 border-t border-border-soft"
    >
      <div className="flex items-center gap-2 mb-4">
        <Shuffle className="w-4 h-4 text-terracotta" strokeWidth={1.5} />
        <h3 className="text-sm font-medium text-charcoal-muted uppercase tracking-wider">
          Related in Other Traditions
        </h3>
      </div>

      <div className="space-y-3">
        {related.map((r, i) => (
          <motion.button
            key={`${r.tradition}-${r.bookId}-${r.chapter}-${r.verse}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              hapticSelect()
              navigate(`/read/${r.tradition}/${r.bookId}/${r.chapter}?verse=${r.verse}`)
            }}
            className="w-full text-left bg-cream-warm rounded-xl border border-border-soft p-4 shadow-sm active:scale-[0.98] transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${traditionColors[r.tradition] || 'bg-midnight/5 text-charcoal-muted border-midnight/10'}`}>
                {traditionLabels[r.tradition] || r.tradition}
              </span>
              <span className="text-xs text-charcoal-muted">
                {r.book} {r.chapter}:{r.verse}
              </span>
            </div>
            <p className="text-sm text-charcoal leading-relaxed line-clamp-2">
              "{r.text}"
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-terracotta font-medium">
              <span>Read this passage</span>
              <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
