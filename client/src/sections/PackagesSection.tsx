import { useStore } from '../store'
import { InfoBanner, SectionHeader, TagInput, Toggle } from '../components/ui'

const RHEL_PRESETS = [
  'lvm2', 'xfsprogs', 'e2fsprogs', 'mdadm', 'nfs-utils',
  'iscsi-initiator-utils', 'device-mapper', 'parted', 'gdisk',
  'chrony', 'tuned', 'policycoreutils-python-utils',
]

export function PackagesSection() {
  const {
    enabledSections, packages,
    toggleSection, updatePackages, addPackage, removePackage, resetPackages,
  } = useStore()
  const enabled = enabledSections.packages

  const togglePreset = (pkg: string) => {
    if (packages.packages.includes(pkg)) removePackage(pkg)
    else addPackage(pkg)
  }

  return (
    <section>
      <SectionHeader title="Package Installation" icon="📦" enabled={enabled} onToggle={() => toggleSection('packages')} onReset={resetPackages} />
      <InfoBanner>
        Installs packages using the native package manager (yum/dnf on RHEL/CentOS).
        <code className="bg-slate-800 px-1 rounded">package_update</code> runs <code className="bg-slate-800 px-1 rounded">yum update -y</code> before installation.
        For RHEL storage configurations, ensure <strong>lvm2</strong>, <strong>xfsprogs</strong>, and <strong>parted</strong> are included.
      </InfoBanner>

      {!enabled && <p className="text-slate-500 text-sm text-center py-4">Section disabled — enable to configure</p>}

      {enabled && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <Toggle
              label="Update packages on boot (package_update)"
              checked={packages.packageUpdate}
              onChange={(v) => updatePackages({ packageUpdate: v })}
              tooltip="Equivalent to: yum update -y — runs before package installation."
            />
            <Toggle
              label="Upgrade packages on boot (package_upgrade)"
              checked={packages.packageUpgrade}
              onChange={(v) => updatePackages({ packageUpgrade: v })}
              tooltip="Full system upgrade. Can significantly increase boot time."
            />
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-2">Common RHEL/CentOS presets — click to toggle:</p>
            <div className="flex flex-wrap gap-1.5">
              {RHEL_PRESETS.map((pkg) => (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => togglePreset(pkg)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    packages.packages.includes(pkg)
                      ? 'bg-green-900/60 border-green-600 text-green-300'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400'
                  }`}
                >
                  {pkg}
                </button>
              ))}
            </div>
          </div>

          <TagInput
            label="Package list"
            tags={packages.packages}
            onAdd={addPackage}
            onRemove={removePackage}
            placeholder="Type package name and press Enter"
          />

          {packages.packages.length > 0 && (
            <p className="text-xs text-slate-500">{packages.packages.length} package{packages.packages.length !== 1 ? 's' : ''} selected</p>
          )}
        </div>
      )}
    </section>
  )
}
