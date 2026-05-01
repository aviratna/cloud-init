import type { SectionId } from '../types'
import { useStore } from '../store'

interface NavItem {
  id: SectionId | 'summary'
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'system', label: 'System Settings', icon: '⚙️' },
  { id: 'packages', label: 'Packages', icon: '📦' },
  { id: 'appStack', label: 'App Stack Config', icon: '🔧' },
  { id: 'disk', label: 'Disk Setup', icon: '💽' },
  { id: 'fs', label: 'Filesystem Setup', icon: '🗂️' },
  { id: 'mounts', label: 'Mount Points', icon: '📁' },
  { id: 'lvm', label: 'LVM Setup', icon: '🧱' },
  { id: 'users', label: 'Users & Groups', icon: '👥' },
  { id: 'writeFiles', label: 'Write Files', icon: '📝' },
  { id: 'runcmd', label: 'Run Commands', icon: '⚡' },
  { id: 'summary', label: 'Summary & Review', icon: '📋' },
]

interface SidebarProps {
  active: string
  onSelect: (id: string) => void
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  const { enabledSections } = useStore()

  return (
    <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-700">
        <div className="text-sm font-bold text-blue-400 leading-tight">Cloud-Init</div>
        <div className="text-xs text-slate-400">Config Generator</div>
        <div className="text-[10px] text-slate-600 mt-0.5">RHEL / CentOS</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const isSectionItem = item.id !== 'summary'
          const isEnabled = isSectionItem ? enabledSections[item.id as SectionId] : true
          const isActive = active === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors text-sm
                ${isActive
                  ? 'bg-blue-900/50 text-blue-300 border-r-2 border-blue-500'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {isSectionItem && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isEnabled ? 'bg-green-500' : 'bg-slate-600'}`} />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700 text-[10px] text-slate-600">
        Green dot = section enabled
      </div>
    </aside>
  )
}
