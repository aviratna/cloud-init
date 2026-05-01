import { useStore } from '../store'
import { Button, Card, InfoBanner, Input, Select, SectionHeader, Toggle } from '../components/ui'

const FS_TYPES = [
  { value: 'xfs', label: 'XFS (recommended for RHEL)' },
  { value: 'ext4', label: 'ext4' },
  { value: 'btrfs', label: 'Btrfs' },
  { value: 'vfat', label: 'vfat (EFI)' },
]

export function FsSection() {
  const { enabledSections, fs, toggleSection, addFs, updateFs, removeFs, resetFs } = useStore()
  const enabled = enabledSections.fs

  return (
    <section>
      <SectionHeader title="Filesystem Setup" icon="🗂️" enabled={enabled} onToggle={() => toggleSection('fs')} onReset={resetFs} />
      <InfoBanner>
        Creates filesystems on block devices or partitions using <code className="bg-slate-800 px-1 rounded">fs_setup</code>.
        Runs after <code className="bg-slate-800 px-1 rounded">disk_setup</code>.{' '}
        <strong>XFS is the default and recommended filesystem on RHEL/CentOS 7+</strong> — it offers better performance for large files.
        Use <code className="bg-slate-800 px-1 rounded">LABEL=</code> syntax in device to reference by label.
      </InfoBanner>

      {!enabled && <p className="text-slate-500 text-sm text-center py-4">Section disabled — enable to configure</p>}

      {enabled && (
        <>
          <div className="space-y-3">
            {fs.map((f, idx) => (
              <Card key={f.id}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">Filesystem {idx + 1}</span>
                  <Button variant="danger" size="sm" type="button" onClick={() => removeFs(f.id)}>Remove</Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Label"
                    value={f.label}
                    onChange={(e) => updateFs(f.id, { label: e.target.value })}
                    placeholder="data-vol"
                    tooltip="Filesystem label — can be referenced as LABEL=data-vol in mounts."
                  />
                  <Select
                    label="Filesystem Type"
                    value={f.fsType}
                    onChange={(e) => updateFs(f.id, { fsType: e.target.value as typeof f.fsType })}
                    options={FS_TYPES}
                  />
                  <Input
                    label="Device"
                    value={f.device}
                    onChange={(e) => updateFs(f.id, { device: e.target.value })}
                    placeholder="/dev/sdb1"
                    tooltip="Block device path or LABEL= / UUID= reference."
                  />
                  <Input
                    label="Partition (optional)"
                    type="number"
                    value={f.partition === '' ? '' : String(f.partition)}
                    onChange={(e) => updateFs(f.id, { partition: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                    placeholder="1"
                    tooltip="Partition number if targeting a specific partition of the device."
                  />
                  <Input
                    label="Extra mkfs options"
                    value={f.extraOptions}
                    onChange={(e) => updateFs(f.id, { extraOptions: e.target.value })}
                    placeholder="-i size=512"
                    tooltip="Additional flags passed to mkfs. Space-separated."
                  />
                  <div className="flex items-end pb-1">
                    <Toggle
                      label="Overwrite existing"
                      checked={f.overwrite}
                      onChange={(v) => updateFs(f.id, { overwrite: v })}
                      tooltip="If true, will reformat even if a filesystem already exists."
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Button variant="secondary" size="sm" type="button" onClick={addFs} className="mt-3">
            + Add Filesystem
          </Button>
        </>
      )}
    </section>
  )
}
