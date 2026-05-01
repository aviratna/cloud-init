import { useStore } from '../store'
import { Button, Card, InfoBanner, Input, Select, SectionHeader, MultiSelect } from '../components/ui'
import type { MountOption } from '../types'
import { useState } from 'react'

const FS_TYPES = [
  { value: 'auto', label: 'auto' },
  { value: 'xfs', label: 'xfs' },
  { value: 'ext4', label: 'ext4' },
  { value: 'btrfs', label: 'btrfs' },
  { value: 'nfs', label: 'nfs' },
  { value: 'nfs4', label: 'nfs4' },
  { value: 'tmpfs', label: 'tmpfs' },
  { value: 'vfat', label: 'vfat' },
]

const MOUNT_OPTS: MountOption[] = ['defaults', 'noatime', 'nodiratime', 'ro', 'rw', 'nofail']

export function MountsSection() {
  const {
    enabledSections, mounts, mountDefaults,
    toggleSection, addMount, updateMount, removeMount,
    updateMountDefaults, resetMounts,
  } = useStore()
  const enabled = enabledSections.mounts
  const [defaultsExpanded, setDefaultsExpanded] = useState(false)

  return (
    <section>
      <SectionHeader title="Mount Points" icon="📁" enabled={enabled} onToggle={() => toggleSection('mounts')} onReset={resetMounts} />
      <InfoBanner>
        Configures <code className="bg-slate-800 px-1 rounded">/etc/fstab</code> entries via the <code className="bg-slate-800 px-1 rounded">mounts</code> module.
        Entries are written as: <code className="bg-slate-800 px-1 rounded">[device, mountpoint, fstype, options, dump, pass]</code>.
        Use <strong>nofail</strong> for non-critical mounts to prevent boot failures. LVM logical volumes auto-populate here.
      </InfoBanner>

      {!enabled && <p className="text-slate-500 text-sm text-center py-4">Section disabled — enable to configure</p>}

      {enabled && (
        <>
          <div className="space-y-3">
            {mounts.map((m, idx) => (
              <Card key={m.id} className={m.id.startsWith('lvm:') ? 'border-indigo-700/50' : ''}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">
                    Mount {idx + 1}
                    {m.id.startsWith('lvm:') && <span className="ml-2 text-xs text-indigo-400 bg-indigo-900/40 px-1.5 py-0.5 rounded">from LVM</span>}
                  </span>
                  <Button variant="danger" size="sm" type="button" onClick={() => removeMount(m.id)}>Remove</Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Device" value={m.device} onChange={(e) => updateMount(m.id, { device: e.target.value })} placeholder="/dev/sdb1" />
                  <Input label="Mount Point" value={m.mountPoint} onChange={(e) => updateMount(m.id, { mountPoint: e.target.value })} placeholder="/data" />
                  <Select
                    label="Filesystem Type"
                    value={m.fsType}
                    onChange={(e) => updateMount(m.id, { fsType: e.target.value })}
                    options={FS_TYPES}
                  />
                  <div className="col-span-2">
                    <MultiSelect
                      label="Mount Options"
                      options={MOUNT_OPTS}
                      selected={m.options}
                      onChange={(v) => updateMount(m.id, { options: v as MountOption[] })}
                    />
                  </div>
                  <Select
                    label="Dump"
                    value={String(m.dump)}
                    onChange={(e) => updateMount(m.id, { dump: parseInt(e.target.value) as 0 | 1 })}
                    options={[{ value: '0', label: '0 (disabled)' }, { value: '1', label: '1 (enabled)' }]}
                    tooltip="Used by dump utility. Almost always 0."
                  />
                  <Select
                    label="Pass (fsck order)"
                    value={String(m.pass)}
                    onChange={(e) => updateMount(m.id, { pass: parseInt(e.target.value) as 0 | 1 | 2 })}
                    options={[
                      { value: '0', label: '0 (skip fsck)' },
                      { value: '1', label: '1 (root)' },
                      { value: '2', label: '2 (other)' },
                    ]}
                    tooltip="fsck check order at boot. 0=skip, 1=root filesystem, 2=all others."
                  />
                </div>
              </Card>
            ))}
          </div>

          <Button variant="secondary" size="sm" type="button" onClick={addMount} className="mt-3">
            + Add Mount
          </Button>

          {/* Global defaults collapsible */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setDefaultsExpanded((v) => !v)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <span>{defaultsExpanded ? '▼' : '▶'}</span>
              mount_default_fields (global defaults)
            </button>
            {defaultsExpanded && (
              <Card className="mt-2">
                <p className="text-xs text-slate-500 mb-3">These defaults apply to entries that don't specify a value for that field.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Default Filesystem"
                    value={mountDefaults.fsType}
                    onChange={(e) => updateMountDefaults({ fsType: e.target.value })}
                    options={FS_TYPES}
                  />
                  <Input
                    label="Default Options"
                    value={mountDefaults.options}
                    onChange={(e) => updateMountDefaults({ options: e.target.value })}
                    placeholder="defaults"
                  />
                  <Select
                    label="Default Dump"
                    value={String(mountDefaults.dump)}
                    onChange={(e) => updateMountDefaults({ dump: parseInt(e.target.value) as 0 | 1 })}
                    options={[{ value: '0', label: '0' }, { value: '1', label: '1' }]}
                  />
                  <Select
                    label="Default Pass"
                    value={String(mountDefaults.pass)}
                    onChange={(e) => updateMountDefaults({ pass: parseInt(e.target.value) as 0 | 1 | 2 })}
                    options={[{ value: '0', label: '0' }, { value: '1', label: '1' }, { value: '2', label: '2' }]}
                  />
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </section>
  )
}
