import { useStore } from '../store'
import { InfoBanner, Input, Select, SectionHeader, TagInput, Toggle } from '../components/ui'

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Singapore',
  'Australia/Sydney', 'Pacific/Auckland',
].map((tz) => ({ value: tz, label: tz }))

const SELINUX_OPTS = [
  { value: '', label: 'No change (leave as-is)' },
  { value: 'enforcing', label: 'Enforcing (default RHEL)' },
  { value: 'permissive', label: 'Permissive (log only)' },
  { value: 'disabled', label: 'Disabled (requires reboot)' },
]

export function SystemSection() {
  const {
    enabledSections, system,
    toggleSection, updateSystem, addNtpServer, removeNtpServer, resetSystem,
  } = useStore()
  const enabled = enabledSections.system

  return (
    <section>
      <SectionHeader title="System Settings" icon="⚙️" enabled={enabled} onToggle={() => toggleSection('system')} onReset={resetSystem} />
      <InfoBanner>
        Configures core OS parameters. <strong>SELinux disabled/permissive mode</strong> generates
        <code className="bg-slate-800 px-1 rounded">runcmd</code> entries — a full disable requires reboot to take effect.
        NTP uses chrony on RHEL 7+ (install <code className="bg-slate-800 px-1 rounded">chrony</code> in Packages).
        Swap configuration generates <code className="bg-slate-800 px-1 rounded">runcmd</code> commands to create a swap file.
      </InfoBanner>

      {!enabled && <p className="text-slate-500 text-sm text-center py-4">Section disabled — enable to configure</p>}

      {enabled && (
        <div className="space-y-4">
          {/* Hostname */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Hostname"
              value={system.hostname}
              onChange={(e) => updateSystem({ hostname: e.target.value })}
              placeholder="web-server-01"
            />
            <Input
              label="FQDN"
              value={system.fqdn}
              onChange={(e) => updateSystem({ fqdn: e.target.value })}
              placeholder="web-server-01.example.com"
              tooltip="Fully qualified domain name. Takes precedence over hostname."
            />
            <div className="col-span-2">
              <Toggle
                label="preserve_hostname — don't override hostname if already set"
                checked={system.preserveHostname}
                onChange={(v) => updateSystem({ preserveHostname: v })}
                tooltip="Useful when hostname is set by DHCP or instance metadata."
              />
            </div>
          </div>

          <hr className="border-slate-700" />

          {/* Locale / Timezone */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Timezone"
              value={system.timezone}
              onChange={(e) => updateSystem({ timezone: e.target.value })}
              options={TIMEZONES}
            />
            <Input
              label="Locale"
              value={system.locale}
              onChange={(e) => updateSystem({ locale: e.target.value })}
              placeholder="en_US.UTF-8"
            />
          </div>

          <hr className="border-slate-700" />

          {/* NTP */}
          <TagInput
            label="NTP Servers"
            tags={system.ntpServers}
            onAdd={addNtpServer}
            onRemove={removeNtpServer}
            placeholder="0.pool.ntp.org"
          />

          <hr className="border-slate-700" />

          {/* SELinux */}
          <Select
            label="SELinux Mode"
            value={system.selinux}
            onChange={(e) => updateSystem({ selinux: e.target.value as typeof system.selinux })}
            options={SELINUX_OPTS}
            tooltip="Changes /etc/selinux/config. Disabled/Permissive also runs setenforce at boot."
          />
          {system.selinux === 'disabled' && (
            <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded px-2 py-1.5">
              ⚠️ Fully disabling SELinux requires a reboot to complete. Consider using <strong>permissive</strong> mode first.
            </p>
          )}

          <hr className="border-slate-700" />

          {/* Swap */}
          <div className="space-y-2">
            <Toggle
              label="Create swap file"
              checked={system.swapEnabled}
              onChange={(v) => updateSystem({ swapEnabled: v })}
              tooltip="Generates runcmd to create and enable a swap file via fallocate."
            />
            {system.swapEnabled && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Input
                  label="Swap size"
                  value={system.swapSize}
                  onChange={(e) => updateSystem({ swapSize: e.target.value })}
                  placeholder="2G"
                  tooltip="Size passed to fallocate -l, e.g. 2G, 512M."
                />
                <Input
                  label="Swap file path"
                  value={system.swapPath}
                  onChange={(e) => updateSystem({ swapPath: e.target.value })}
                  placeholder="/swapfile"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
