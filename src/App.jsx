import { useState } from 'react'

export default function App() {
  const [text, setText] = useState('')
  const [cards, setCards] = useState(null)
  const [checked, setChecked] = useState({})
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  async function handleGenerate() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setSaved(false)
    try {
      const result = await window.electronAPI.generateCards(text)
      setCards(result)
      const initial = {}
      result.forEach((_, i) => { initial[i] = true })
      setChecked(initial)
    } catch (e) {
      setError('Failed to generate cards. Check your API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  function toggleCard(i) {
    setChecked(prev => ({ ...prev, [i]: !prev[i] }))
  }

  async function handleSave() {
    const selected = cards.filter((_, i) => checked[i])
    await window.electronAPI.saveCards(selected)
    setSaved(true)
  }

  function handleBack() {
    setCards(null)
    setSaved(false)
    setError(null)
  }

  const anyChecked = Object.values(checked).some(Boolean)

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <div className="h-8 bg-white w-full" style={{ WebkitAppRegion: 'drag' }} />

      <div className="flex flex-col items-center justify-center flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6 tracking-tight">Flash Card Generator</h1>

        {!cards ? (
          <>
            <textarea
              className="w-full max-w-2xl h-64 border border-black p-3 font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="Type or paste text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {error && <p className="mt-2 text-sm text-black border border-black px-3 py-2 w-full max-w-2xl">{error}</p>}
            <button
              onClick={handleGenerate}
              disabled={loading || !text.trim()}
              className="mt-4 px-4 py-2 border border-black bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate Flash Cards'}
            </button>
          </>
        ) : (
          <div className="w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-500">{cards.length} cards generated</span>
              <button onClick={handleBack} className="text-sm underline">
                ← Back
              </button>
            </div>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {cards.map((card, i) => (
                <div
                  key={i}
                  onClick={() => toggleCard(i)}
                  className={`border p-4 cursor-pointer flex gap-4 items-start transition-opacity ${
                    checked[i] ? 'border-black' : 'border-gray-300 opacity-40'
                  }`}
                >
                  <span className="text-base font-bold select-none w-4 shrink-0 mt-0.5">
                    {checked[i] ? '✓' : '✗'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{card.front}</p>
                    <p className="text-sm text-gray-600 mt-1">{card.back}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={!anyChecked || saved}
                className="px-4 py-2 border border-black bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add to Deck
              </button>
              {saved && (
                <span className="text-sm text-gray-600">
                  Saved to Networks deck!
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
