import { useState } from 'react'

export default function App() {
  const [text, setText] = useState('')
  const [filePath, setFilePath] = useState(null)

  async function handleImportFile() {
    const path = await window.electronAPI.openFile()
    if (path) setFilePath(path)
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <div className="h-8 bg-white w-full" style={{ WebkitAppRegion: 'drag' }} />
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6 tracking-tight">Flash Card Generator</h1>

        <textarea
          className="w-full max-w-2xl h-64 border border-black p-3 font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="Type or paste text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handleImportFile}
            className="px-4 py-2 border border-black bg-white text-black hover:bg-black hover:text-white transition-colors"
          >
            Import File
          </button>

          {filePath && (
            <span className="text-xs text-gray-600 truncate max-w-xs">{filePath}</span>
          )}
        </div>
      </div>
    </div>
  )
}
