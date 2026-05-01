import React from 'react'

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'secondary'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center gap-1.5 rounded font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3 py-1.5 text-sm' }
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
    ghost: 'bg-transparent hover:bg-slate-700 text-slate-300',
    danger: 'bg-red-900/50 hover:bg-red-800 text-red-300',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  tooltip?: string
  error?: string
}

export function Input({ label, tooltip, error, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs text-slate-400 flex items-center gap-1">
          {label}
          {tooltip && <Tooltip text={tooltip} />}
        </label>
      )}
      <input
        id={inputId}
        className={`bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-sm
          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40
          placeholder:text-slate-600 ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  tooltip?: string
  options: { value: string; label: string }[]
}

export function Select({ label, tooltip, options, className = '', id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-xs text-slate-400 flex items-center gap-1">
          {label}
          {tooltip && <Tooltip text={tooltip} />}
        </label>
      )}
      <select
        id={selectId}
        className={`bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-sm
          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  tooltip?: string
}

export function Textarea({ label, tooltip, className = '', id, ...props }: TextareaProps) {
  const areaId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={areaId} className="text-xs text-slate-400 flex items-center gap-1">
          {label}
          {tooltip && <Tooltip text={tooltip} />}
        </label>
      )}
      <textarea
        id={areaId}
        className={`bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-sm
          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40
          placeholder:text-slate-600 resize-y min-h-[80px] ${className}`}
        {...props}
      />
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
interface ToggleProps {
  label?: string
  checked: boolean
  onChange: (v: boolean) => void
  tooltip?: string
}

export function Toggle({ label, checked, onChange, tooltip }: ToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      {label && <span className="text-sm text-slate-300">{label}</span>}
      {tooltip && <Tooltip text={tooltip} />}
    </label>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
export function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative">
      <span className="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[10px] flex items-center justify-center cursor-help">?</span>
      <span className="absolute left-5 top-0 z-50 hidden group-hover:block w-56 text-xs bg-slate-800 border border-slate-600 text-slate-300 rounded p-2 shadow-lg pointer-events-none">
        {text}
      </span>
    </span>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-4 ${className}`}>
      {children}
    </div>
  )
}

// ── InfoBanner ────────────────────────────────────────────────────────────────
export function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-950/50 border border-blue-800/50 rounded-lg p-3 text-xs text-blue-300 mb-4 leading-relaxed">
      <span className="font-semibold text-blue-200">ℹ️ </span>
      {children}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string
  enabled: boolean
  onToggle: () => void
  onReset: () => void
  icon?: string
}

export function SectionHeader({ title, enabled, onToggle, onReset, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onReset} type="button">Reset</Button>
        <Toggle checked={enabled} onChange={onToggle} label="Enable" />
      </div>
    </div>
  )
}

// ── Tag Input (chip input) ────────────────────────────────────────────────────
interface TagInputProps {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
  placeholder?: string
  label?: string
}

export function TagInput({ tags, onAdd, onRemove, placeholder, label }: TagInputProps) {
  const [input, setInput] = React.useState('')

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      onAdd(input.trim())
      setInput('')
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemove(tags[tags.length - 1])
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-slate-400">{label}</label>}
      <div className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 flex flex-wrap gap-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/40 min-h-[38px]">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 bg-blue-900/60 text-blue-200 text-xs rounded px-2 py-0.5">
            {tag}
            <button type="button" onClick={() => onRemove(tag)} className="hover:text-white">×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={tags.length === 0 ? (placeholder || 'Type and press Enter') : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
        />
      </div>
    </div>
  )
}

// ── MultiSelect checkboxes ────────────────────────────────────────────────────
interface MultiSelectProps {
  label?: string
  options: string[]
  selected: string[]
  onChange: (values: string[]) => void
}

export function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter((s) => s !== v))
    else onChange([...selected, v])
  }
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-slate-400">{label}</label>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              selected.includes(o)
                ? 'bg-blue-700 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}
