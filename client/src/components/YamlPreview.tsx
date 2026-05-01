import { useMemo, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useStore } from '../store'
import { generateCloudConfig } from '../lib/yaml-generator'

export function YamlPreview() {
  const state = useStore()
  const [copied, setCopied] = useState(false)

  const yaml = useMemo(() => {
    try {
      return generateCloudConfig(state)
    } catch (e) {
      return `# Error generating YAML:\n# ${e}`
    }
  }, [state])

  const handleCopy = () => {
    navigator.clipboard.writeText(yaml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([yaml], { type: 'text/yaml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cloud-config.yaml'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const lineCount = yaml.split('\n').length

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">YAML Preview</h2>
          <p className="text-xs text-slate-500 mt-0.5">{lineCount} lines · live preview</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1.5"
          >
            {copied ? '✓ Copied' : '⎘ Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="text-xs px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white transition-colors flex items-center gap-1.5"
          >
            ↓ Download
          </button>
        </div>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto text-xs">
        <SyntaxHighlighter
          language="yaml"
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '16px',
            background: 'transparent',
            fontSize: '12px',
            lineHeight: '1.6',
            height: '100%',
          }}
          showLineNumbers
          lineNumberStyle={{ color: '#475569', minWidth: '2.5em' }}
          wrapLines={false}
        >
          {yaml}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
