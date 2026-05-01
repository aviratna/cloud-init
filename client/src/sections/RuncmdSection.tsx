import { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DragEndEvent } from '@dnd-kit/core'
import { useStore } from '../store'
import { Button, InfoBanner, SectionHeader } from '../components/ui'
import type { RunCmdEntry } from '../types'

const RHEL_PRESETS = [
  'systemctl daemon-reload',
  'setenforce 0',
  'systemctl enable tuned',
  'tuned-adm profile throughput-performance',
  'sysctl -p',
  'systemctl restart NetworkManager',
  'echo "net.ipv4.tcp_tw_reuse=1" >> /etc/sysctl.conf',
]

function SortableRow({ item, onUpdate, onRemove }: { item: RunCmdEntry; onUpdate: (v: string) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded px-2 py-1.5">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 px-0.5 touch-none"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <input
        value={item.command}
        onChange={(e) => onUpdate(e.target.value)}
        className="flex-1 bg-transparent font-mono text-sm text-slate-200 outline-none placeholder:text-slate-600"
        placeholder="command..."
      />
      <button type="button" onClick={onRemove} className="text-slate-500 hover:text-red-400 px-1">×</button>
    </div>
  )
}

export function RuncmdSection() {
  const {
    enabledSections, runcmd,
    toggleSection, addRuncmd, updateRuncmd, removeRuncmd, reorderRuncmd, resetRuncmd,
  } = useStore()
  const enabled = enabledSections.runcmd
  const [newCmd, setNewCmd] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const from = runcmd.findIndex((r) => r.id === active.id)
      const to = runcmd.findIndex((r) => r.id === over.id)
      reorderRuncmd(from, to)
    }
  }

  const handleAdd = () => {
    if (newCmd.trim()) { addRuncmd(newCmd.trim()); setNewCmd('') }
  }

  return (
    <section>
      <SectionHeader title="Run Commands" icon="⚡" enabled={enabled} onToggle={() => toggleSection('runcmd')} onReset={resetRuncmd} />
      <InfoBanner>
        Commands in <code className="bg-slate-800 px-1 rounded">runcmd</code> run once at first boot, after all other cloud-init modules.
        They run as root. <strong>LVM setup and SELinux/swap commands are automatically prepended</strong> from their respective sections.
        Drag rows to reorder execution sequence.
      </InfoBanner>

      {!enabled && <p className="text-slate-500 text-sm text-center py-4">Section disabled — enable to configure</p>}

      {enabled && (
        <div className="space-y-4">
          {/* Presets */}
          <div>
            <p className="text-xs text-slate-400 mb-1.5">RHEL presets — click to add:</p>
            <div className="flex flex-wrap gap-1.5">
              {RHEL_PRESETS.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => addRuncmd(cmd)}
                  className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-300 transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          {/* Sortable list */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={runcmd.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {runcmd.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    onUpdate={(v) => updateRuncmd(item.id, v)}
                    onRemove={() => removeRuncmd(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add new command */}
          <div className="flex gap-2">
            <input
              value={newCmd}
              onChange={(e) => setNewCmd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Add command..."
              className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
            <Button variant="secondary" size="sm" type="button" onClick={handleAdd}>Add</Button>
          </div>
        </div>
      )}
    </section>
  )
}
