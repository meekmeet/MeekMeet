import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SacredLibraryScreen from './SacredLibraryScreen'
import { SACRED_LIBRARY } from '@/data/sacred-library'
import { SACRED_LIBRARY_TRADITIONS } from '@/lib/scriptures'

vi.mock('@/lib/haptics', () => ({
  hapticSelect: vi.fn(),
}))

function renderScreen() {
  return render(
    <MemoryRouter>
      <SacredLibraryScreen />
    </MemoryRouter>
  )
}

describe('SacredLibraryScreen', () => {
  it('renders the library title and subtitle', () => {
    renderScreen()
    expect(screen.getByText('The Sacred Library')).toBeInTheDocument()
    expect(screen.getByText(/texts every seeker should know/i)).toBeInTheDocument()
  })

  it('renders every sacred library tradition', () => {
    renderScreen()
    for (const entry of SACRED_LIBRARY) {
      expect(screen.getByText(entry.name)).toBeInTheDocument()
    }
    expect(SACRED_LIBRARY).toHaveLength(SACRED_LIBRARY_TRADITIONS.length)
  })

  it('renders the era and origin for each entry', () => {
    const { container } = renderScreen()
    const text = container.textContent ?? ''
    for (const entry of SACRED_LIBRARY) {
      expect(text).toContain(entry.era)
      expect(text).toContain(entry.origin)
    }
  })

  it('renders every book of every tradition', () => {
    const { container } = renderScreen()
    const bookButtons = container.querySelectorAll('button')
    const bookCount = SACRED_LIBRARY.reduce((n, e) => n + e.books.length, 0)
    // 1 back button + 1 Read button per entry + 1 book button per book
    expect(bookButtons.length).toBe(1 + SACRED_LIBRARY.length + bookCount)
  })

  it('shows why-it-matters notes', () => {
    renderScreen()
    expect(screen.getByText(/Before 1947, scholars could only guess/)).toBeInTheDocument()
    expect(screen.getByText(/In four lines the Mul Mantar/)).toBeInTheDocument()
  })
})
