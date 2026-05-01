import { useStore } from '../store'
import { Button, Card, InfoBanner, Input, Select, SectionHeader, Toggle } from '../components/ui'

const DEVICE_SUGGESTIONS = ['/dev/sdb', '/dev/sdc', '/dev/sdd', '/dev/nvme1n1', '/dev/xvdb', '/dev/vdb']

export function DiskSection() {
  const { enabledSections, disk, toggleSection, addDisk, updateDisk, removeDisk, resetDisk } = useStore()
  const enabled = enabledSections.disk

  return (
    <section>
      <SectionHeader title="Disk Setup" icon="💽" enabled={enabled} onToggle={() => toggleSection('disk')} onReset={resetDisk} />
      <InfoBanner>
        Configures partition tables on raw block devices using cloud-init's <code className="bg-slate-800 px-1 rounded">disk_setup</code> module.
        Runs early in boot, before filesystems are created. Use <strong>GPT</strong> for disks &gt;2TB or UEFI systems.
        On AWS/GCP, additional disks appear as <code className="bg-slate-800 px-1 rounded">/dev/xvdb</code> or <code className="bg-slate-800 px-1 rounded">/dev/nvme1n1</code>.
      </InfoBanner>

      {!enabled && (
        <p className="text-slate-500 text-sm text-center py-4">Section disabled — enable to configure</p>
      )}

      {enabled && (
        <>
          <div className="space-y-3">
            {disk.map((d, idx) => (
              <Card key={d.id}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">Disk {idx + 1}</span>
                  <Button variant="danger" size="sm" type="button" onClick={() => removeDisk(d.id)}>Remove</Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">Device</label>
                    <input
                      list={`disk-devices-${d.id}`}
                      value={d.device}
                      onChange={(e) => updateDisk(d.id, { device: e.target.value })}
                      className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="/dev/sdb"
                    />
                    <datalist id={`disk-devices-${d.id}`}>
                      {DEVICE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <Select
                    label="Partition Table"
                    value={d.tableType}
                    onChange={(e) => updateDisk(d.id, { tableType: e.target.value as 'gpt' | 'mbr' })}
                    options={[{ value: 'gpt', label: 'GPT' }, { value: 'mbr', label: 'MBR' }]}
                    tooltip="GPT supports disks >2TB and up to 128 partitions. MBR for legacy BIOS systems."
                  />
                  <Select
                    label="Layout"
                    value={d.layout}
                    onChange={(e) => updateDisk(d.id, { layout: e.target.value as 'single' | 'custom' })}
                    options={[
                      { value: 'single', label: 'Single partition (whole disk)' },
                      { value: 'custom', label: 'Custom sizes (%)' },
                    ]}
                    tooltip="Single = one partition using 100% of disk. Custom = comma-separated percentages like 50,30,20."
                  />
                  {d.layout === 'custom' && (
                    <Input
                      label="Partition sizes (%)"
                      value={d.customLayout}
                      onChange={(e) => updateDisk(d.id, { customLayout: e.target.value })}
                      placeholder="50,30,20"
                      tooltip="Comma-separated percentages. Must add up to 100."
                    />
                  )}
                  <div className="flex items-end pb-1">
                    <Toggle
                      label="Overwrite existing"
                      checked={d.overwrite}
                      onChange={(v) => updateDisk(d.id, { overwrite: v })}
                      tooltip="If true, will overwrite any existing partition table on this device. DESTRUCTIVE."
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Button variant="secondary" size="sm" type="button" onClick={addDisk} className="mt-3">
            + Add Disk
          </Button>
        </>
      )}
    </section>
  )
}
