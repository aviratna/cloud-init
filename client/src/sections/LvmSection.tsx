import { useStore } from '../store'
import { Button, Card, InfoBanner, Input, Select, SectionHeader } from '../components/ui'

const FS_TYPES = [
  { value: 'xfs', label: 'XFS' },
  { value: 'ext4', label: 'ext4' },
  { value: 'btrfs', label: 'Btrfs' },
]

export function LvmSection() {
  const {
    enabledSections, lvm,
    toggleSection, updateLvm,
    addVg, updateVg, removeVg,
    addLv, updateLv, removeLv,
    resetLvm, syncLvmMounts,
  } = useStore()
  const enabled = enabledSections.lvm

  const handleLvUpdate = (id: string, patch: Parameters<typeof updateLv>[1]) => {
    updateLv(id, patch)
    setTimeout(syncLvmMounts, 50)
  }

  const handleVgUpdate = (id: string, patch: Parameters<typeof updateVg>[1]) => {
    updateVg(id, patch)
    setTimeout(syncLvmMounts, 50)
  }

  return (
    <section>
      <SectionHeader title="LVM Setup" icon="🧱" enabled={enabled} onToggle={() => toggleSection('lvm')} onReset={() => { resetLvm(); syncLvmMounts() }} />
      <InfoBanner>
        cloud-init has no native LVM support — this generates a <code className="bg-slate-800 px-1 rounded">runcmd</code> sequence:
        <code className="bg-slate-800 px-1 rounded">pvcreate</code> → <code className="bg-slate-800 px-1 rounded">vgcreate</code> →
        <code className="bg-slate-800 px-1 rounded">lvcreate</code> → <code className="bg-slate-800 px-1 rounded">mkfs</code> →
        <code className="bg-slate-800 px-1 rounded">mkdir</code> → <code className="bg-slate-800 px-1 rounded">mount</code>.
        <strong> lvm2 must be installed</strong> (add it to the Packages section). Mount points are auto-synced to the Mounts section.
      </InfoBanner>

      {!enabled && <p className="text-slate-500 text-sm text-center py-4">Section disabled — enable to configure</p>}

      {enabled && (
        <div className="space-y-4">
          {/* Physical Volume */}
          <Card>
            <h3 className="text-sm font-medium text-slate-300 mb-3">Physical Volume (pvcreate)</h3>
            <Input
              label="PV Device"
              value={lvm.pvDevice}
              onChange={(e) => updateLvm({ pvDevice: e.target.value })}
              placeholder="/dev/sdb"
              tooltip="The raw block device to initialize as a physical volume."
            />
          </Card>

          {/* Volume Groups */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">Volume Groups (vgcreate)</h3>
              <Button variant="secondary" size="sm" type="button" onClick={addVg}>+ Add VG</Button>
            </div>
            <div className="space-y-3">
              {lvm.vgs.map((vg, idx) => (
                <div key={vg.id} className="flex gap-2 items-end">
                  <span className="text-xs text-slate-500 pb-2">VG{idx + 1}</span>
                  <Input
                    label="VG Name"
                    value={vg.name}
                    onChange={(e) => handleVgUpdate(vg.id, { name: e.target.value })}
                    placeholder="vg_data"
                  />
                  <Input
                    label="Devices (space-separated)"
                    value={vg.devices}
                    onChange={(e) => handleVgUpdate(vg.id, { devices: e.target.value })}
                    placeholder="/dev/sdb"
                    className="flex-1"
                  />
                  <Button variant="danger" size="sm" type="button" onClick={() => removeVg(vg.id)} className="mb-0.5">×</Button>
                </div>
              ))}
              {lvm.vgs.length === 0 && <p className="text-xs text-slate-600">No volume groups — add one above.</p>}
            </div>
          </Card>

          {/* Logical Volumes */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">Logical Volumes (lvcreate)</h3>
              <Button variant="secondary" size="sm" type="button" onClick={() => { addLv(); setTimeout(syncLvmMounts, 50) }}>+ Add LV</Button>
            </div>
            <div className="space-y-3">
              {lvm.lvs.map((lv, idx) => (
                <div key={lv.id} className="bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">LV {idx + 1}</span>
                    <Button variant="danger" size="sm" type="button" onClick={() => { removeLv(lv.id); setTimeout(syncLvmMounts, 50) }}>Remove</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="LV Name"
                      value={lv.name}
                      onChange={(e) => handleLvUpdate(lv.id, { name: e.target.value })}
                      placeholder="lv_app"
                    />
                    <Input
                      label="Size"
                      value={lv.size}
                      onChange={(e) => handleLvUpdate(lv.id, { size: e.target.value })}
                      placeholder="10G"
                      tooltip="e.g. 10G, 500M, 100%FREE, 50%VG"
                    />
                    <Select
                      label="Filesystem"
                      value={lv.fsType}
                      onChange={(e) => handleLvUpdate(lv.id, { fsType: e.target.value as typeof lv.fsType })}
                      options={FS_TYPES}
                    />
                    <Input
                      label="Mount Point"
                      value={lv.mountPoint}
                      onChange={(e) => handleLvUpdate(lv.id, { mountPoint: e.target.value })}
                      placeholder="/opt/app"
                      tooltip="Auto-populates the Mounts section when filled."
                    />
                  </div>
                </div>
              ))}
              {lvm.lvs.length === 0 && <p className="text-xs text-slate-600">No logical volumes — add one above.</p>}
            </div>
          </Card>

          {/* Generated commands preview */}
          {(lvm.pvDevice || lvm.vgs.length > 0 || lvm.lvs.length > 0) && (
            <Card className="bg-slate-900/70">
              <h3 className="text-xs font-medium text-slate-400 mb-2">Generated runcmd preview</h3>
              <div className="font-mono text-xs text-green-400 space-y-0.5">
                {lvm.pvDevice && <div>pvcreate {lvm.pvDevice}</div>}
                {lvm.vgs.map((vg) => vg.name && vg.devices && (
                  <div key={vg.id}>vgcreate {vg.name} {vg.devices}</div>
                ))}
                {lvm.lvs.map((lv) => lv.name && lvm.vgs[0]?.name && (
                  <div key={lv.id} className="space-y-0.5">
                    <div>lvcreate -L {lv.size} -n {lv.name} {lvm.vgs[0].name}</div>
                    <div>mkfs.{lv.fsType} /dev/{lvm.vgs[0].name}/{lv.name}</div>
                    {lv.mountPoint && <div>mkdir -p {lv.mountPoint}</div>}
                    {lv.mountPoint && <div>mount /dev/{lvm.vgs[0].name}/{lv.name} {lv.mountPoint}</div>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </section>
  )
}
