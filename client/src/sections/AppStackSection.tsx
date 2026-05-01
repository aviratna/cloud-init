import { useState } from 'react'
import { useStore } from '../store'
import { Button, Card, InfoBanner, Input, Select, SectionHeader, Toggle } from '../components/ui'
import type { ServiceEntry, UlimitEntry } from '../types'

const SYSCTL_PRESETS = [
  { key: 'vm.swappiness', value: '10', desc: 'Reduce swap tendency (app servers)' },
  { key: 'vm.dirty_ratio', value: '15', desc: 'Max % RAM for dirty pages before write' },
  { key: 'vm.dirty_background_ratio', value: '5', desc: 'Background writeback threshold' },
  { key: 'net.core.somaxconn', value: '65535', desc: 'Max socket listen backlog' },
  { key: 'net.ipv4.tcp_tw_reuse', value: '1', desc: 'Reuse TIME_WAIT sockets' },
  { key: 'net.ipv4.tcp_fin_timeout', value: '15', desc: 'FIN_WAIT2 timeout in seconds' },
  { key: 'net.ipv4.ip_local_port_range', value: '1024 65535', desc: 'Ephemeral port range' },
  { key: 'fs.file-max', value: '2097152', desc: 'Max open file descriptors system-wide' },
  { key: 'kernel.pid_max', value: '4194304', desc: 'Max PIDs' },
  { key: 'net.core.netdev_max_backlog', value: '65536', desc: 'NIC receive queue length' },
]

const ULIMIT_ITEMS = ['nofile', 'nproc', 'memlock', 'stack', 'core', 'data', 'fsize', 'cpu', 'as', 'locks']

const TUNED_PROFILES = [
  { value: '', label: 'No change' },
  { value: 'throughput-performance', label: 'throughput-performance (DB/app servers)' },
  { value: 'latency-performance', label: 'latency-performance (low latency)' },
  { value: 'network-throughput', label: 'network-throughput' },
  { value: 'network-latency', label: 'network-latency' },
  { value: 'virtual-guest', label: 'virtual-guest (VMs)' },
  { value: 'virtual-host', label: 'virtual-host (hypervisors)' },
  { value: 'balanced', label: 'balanced (default)' },
  { value: 'powersave', label: 'powersave' },
]

const SERVICE_ACTIONS: { value: ServiceEntry['action']; label: string }[] = [
  { value: 'enable-now', label: 'enable + start (enable --now)' },
  { value: 'enable', label: 'enable only (on boot)' },
  { value: 'start', label: 'start only (this boot)' },
  { value: 'restart', label: 'restart' },
  { value: 'disable', label: 'disable' },
  { value: 'stop', label: 'stop' },
  { value: 'mask', label: 'mask (prevent start)' },
]

const ULIMIT_TYPES: { value: UlimitEntry['type']; label: string }[] = [
  { value: 'soft', label: 'soft' },
  { value: 'hard', label: 'hard' },
  { value: '-', label: '- (both)' },
]

type SubTab = 'sysctl' | 'ulimits' | 'envvars' | 'services' | 'misc'

export function AppStackSection() {
  const {
    enabledSections, appStack,
    toggleSection, updateAppStack,
    addSysctl, updateSysctl, removeSysctl,
    addUlimit, updateUlimit, removeUlimit,
    addEnvVar, updateEnvVar, removeEnvVar,
    addService, updateService, removeService,
    resetAppStack,
  } = useStore()
  const enabled = enabledSections.appStack
  const [tab, setTab] = useState<SubTab>('sysctl')

  const applyPreset = (key: string, value: string) => {
    const existing = appStack.sysctls.find((s) => s.key === key)
    if (existing) {
      updateSysctl(existing.id, { value })
    } else {
      addSysctl()
      // updateSysctl happens after re-render via the newly generated id — workaround: add with values
      useStore.setState((s) => ({
        appStack: {
          ...s.appStack,
          sysctls: [...s.appStack.sysctls, { id: Math.random().toString(36).slice(2), key, value }],
        },
      }))
    }
  }

  const TAB_STYLE = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
      active
        ? 'border-blue-500 text-blue-300 bg-slate-800'
        : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
    }`

  return (
    <section>
      <SectionHeader title="App Stack Configuration" icon="🔧" enabled={enabled} onToggle={() => toggleSection('appStack')} onReset={resetAppStack} />
      <InfoBanner>
        Configure OS-level settings required before application installation: kernel parameters (sysctl), process limits (ulimits),
        environment variables, systemd service management, and performance profiles. All settings are applied via
        <code className="bg-slate-800 px-1 rounded mx-1">write_files</code> and
        <code className="bg-slate-800 px-1 rounded mx-1">runcmd</code> — no cloud-init modules needed.
      </InfoBanner>

      {!enabled && <p className="text-slate-500 text-sm text-center py-4">Section disabled — enable to configure</p>}

      {enabled && (
        <div>
          {/* Sub-tabs */}
          <div className="flex gap-0.5 mb-4 border-b border-slate-700">
            {([
              ['sysctl', '⚙️ Kernel Params'],
              ['ulimits', '📊 Ulimits'],
              ['envvars', '🌍 Env Variables'],
              ['services', '🔄 Services'],
              ['misc', '🛠️ Performance'],
            ] as [SubTab, string][]).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={TAB_STYLE(tab === id)}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Kernel Parameters ── */}
          {tab === 'sysctl' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Written to <code className="bg-slate-800 px-1 rounded">/etc/sysctl.d/99-cloud-init-custom.conf</code> then applied with <code className="bg-slate-800 px-1 rounded">sysctl --system</code>
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {SYSCTL_PRESETS.map((p) => {
                  const active = appStack.sysctls.some((s) => s.key === p.key)
                  return (
                    <button
                      key={p.key}
                      type="button"
                      title={p.desc}
                      onClick={() => applyPreset(p.key, p.value)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        active
                          ? 'bg-blue-900/60 border-blue-600 text-blue-300'
                          : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-300'
                      }`}
                    >
                      {p.key}
                    </button>
                  )
                })}
              </div>

              {appStack.sysctls.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-2">No parameters — click a preset above or add manually below</p>
              )}

              <div className="space-y-2">
                {appStack.sysctls.map((s) => (
                  <div key={s.id} className="flex gap-2 items-center bg-slate-800/50 border border-slate-700 rounded px-3 py-2">
                    <input
                      value={s.key}
                      onChange={(e) => updateSysctl(s.id, { key: e.target.value })}
                      placeholder="net.core.somaxconn"
                      className="flex-1 bg-transparent font-mono text-sm text-slate-200 outline-none placeholder:text-slate-600"
                    />
                    <span className="text-slate-600">=</span>
                    <input
                      value={s.value}
                      onChange={(e) => updateSysctl(s.id, { value: e.target.value })}
                      placeholder="65535"
                      className="w-32 bg-transparent font-mono text-sm text-slate-200 outline-none placeholder:text-slate-600 text-right"
                    />
                    <button type="button" onClick={() => removeSysctl(s.id)} className="text-slate-600 hover:text-red-400 ml-1">×</button>
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="sm" type="button" onClick={addSysctl}>+ Add Parameter</Button>
            </div>
          )}

          {/* ── Ulimits ── */}
          {tab === 'ulimits' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Written to <code className="bg-slate-800 px-1 rounded">/etc/security/limits.d/99-cloud-init-custom.conf</code>.
                Requires <code className="bg-slate-800 px-1 rounded">pam_limits.so</code> in PAM config (enabled by default on RHEL).
              </p>

              {/* Quick presets */}
              <div className="flex flex-wrap gap-1.5 mb-1">
                {[
                  { domain: '*', type: 'soft' as const, item: 'nofile', value: '65536' },
                  { domain: '*', type: 'hard' as const, item: 'nofile', value: '65536' },
                  { domain: '*', type: 'soft' as const, item: 'nproc', value: '4096' },
                  { domain: '*', type: 'hard' as const, item: 'nproc', value: 'unlimited' },
                  { domain: 'root', type: 'soft' as const, item: 'nofile', value: '65536' },
                  { domain: '*', type: '-' as const, item: 'memlock', value: 'unlimited' },
                ].map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => useStore.setState((s) => ({
                      appStack: { ...s.appStack, ulimits: [...s.appStack.ulimits, { id: Math.random().toString(36).slice(2), ...p }] },
                    }))}
                    className="text-xs px-2 py-1 rounded border bg-slate-800 border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-300 transition-colors"
                  >
                    {p.domain} {p.type} {p.item} {p.value}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {appStack.ulimits.map((u) => (
                  <div key={u.id} className="flex gap-2 items-end bg-slate-800/50 border border-slate-700 rounded p-2">
                    <Input
                      label="Domain"
                      value={u.domain}
                      onChange={(e) => updateUlimit(u.id, { domain: e.target.value })}
                      placeholder="*"
                      tooltip="* = all users, root, @group, or username"
                      className="w-24"
                    />
                    <Select
                      label="Type"
                      value={u.type}
                      onChange={(e) => updateUlimit(u.id, { type: e.target.value as UlimitEntry['type'] })}
                      options={ULIMIT_TYPES}
                      className="w-28"
                    />
                    <Select
                      label="Item"
                      value={u.item}
                      onChange={(e) => updateUlimit(u.id, { item: e.target.value })}
                      options={ULIMIT_ITEMS.map((i) => ({ value: i, label: i }))}
                      className="w-32"
                    />
                    <Input
                      label="Value"
                      value={u.value}
                      onChange={(e) => updateUlimit(u.id, { value: e.target.value })}
                      placeholder="65536"
                      tooltip="Number or 'unlimited'"
                      className="w-28"
                    />
                    <button type="button" onClick={() => removeUlimit(u.id)} className="text-slate-500 hover:text-red-400 pb-1.5">×</button>
                  </div>
                ))}
              </div>
              {appStack.ulimits.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-2">No limits — click a preset above or add manually</p>
              )}
              <Button variant="secondary" size="sm" type="button" onClick={addUlimit}>+ Add Limit</Button>
            </div>
          )}

          {/* ── Environment Variables ── */}
          {tab === 'envvars' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 bg-slate-800/30 rounded p-3 border border-slate-700">
                <div>
                  <strong className="text-slate-300">system</strong> → <code className="bg-slate-900 px-1 rounded">/etc/environment</code>
                  <p className="mt-0.5 text-slate-500">Available to all users and services. Format: KEY=value (no export, no shell expansion)</p>
                </div>
                <div>
                  <strong className="text-slate-300">profile</strong> → <code className="bg-slate-900 px-1 rounded">/etc/profile.d/cloud-init-custom.sh</code>
                  <p className="mt-0.5 text-slate-500">Sourced for interactive login shells. Supports export and shell expansion.</p>
                </div>
              </div>

              <div className="space-y-2">
                {appStack.envVars.map((e) => (
                  <div key={e.id} className="flex gap-2 items-end bg-slate-800/50 border border-slate-700 rounded p-2">
                    <Input
                      label="Variable Name"
                      value={e.name}
                      onChange={(ev) => updateEnvVar(e.id, { name: ev.target.value })}
                      placeholder="JAVA_HOME"
                      className="flex-1"
                    />
                    <Input
                      label="Value"
                      value={e.value}
                      onChange={(ev) => updateEnvVar(e.id, { value: ev.target.value })}
                      placeholder="/usr/lib/jvm/java-17"
                      className="flex-1"
                    />
                    <Select
                      label="Scope"
                      value={e.scope}
                      onChange={(ev) => updateEnvVar(e.id, { scope: ev.target.value as 'system' | 'profile' })}
                      options={[
                        { value: 'system', label: '/etc/environment' },
                        { value: 'profile', label: 'profile.d (shell)' },
                      ]}
                      className="w-40"
                    />
                    <button type="button" onClick={() => removeEnvVar(e.id)} className="text-slate-500 hover:text-red-400 pb-1.5">×</button>
                  </div>
                ))}
              </div>
              {appStack.envVars.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-2">No environment variables configured</p>
              )}
              <Button variant="secondary" size="sm" type="button" onClick={addEnvVar}>+ Add Variable</Button>
            </div>
          )}

          {/* ── Services ── */}
          {tab === 'services' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Generates <code className="bg-slate-800 px-1 rounded">systemctl</code> runcmd entries. Applied after all packages are installed.
              </p>

              {/* Common service presets */}
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Common services — click to add:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['firewalld', 'tuned', 'chronyd', 'iscsid', 'multipathd', 'NetworkManager', 'rsyslog', 'crond', 'sshd'].map((svc) => (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => useStore.setState((s) => ({
                        appStack: { ...s.appStack, services: [...s.appStack.services, { id: Math.random().toString(36).slice(2), name: svc, action: 'enable-now' }] },
                      }))}
                      className="text-xs font-mono px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-300 transition-colors"
                    >
                      {svc}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {appStack.services.map((svc) => (
                  <div key={svc.id} className="flex gap-2 items-end bg-slate-800/50 border border-slate-700 rounded p-2">
                    <Input
                      label="Service name"
                      value={svc.name}
                      onChange={(e) => updateService(svc.id, { name: e.target.value })}
                      placeholder="nginx"
                      className="flex-1"
                    />
                    <Select
                      label="Action"
                      value={svc.action}
                      onChange={(e) => updateService(svc.id, { action: e.target.value as ServiceEntry['action'] })}
                      options={SERVICE_ACTIONS}
                      className="w-56"
                    />
                    <div className="text-xs font-mono text-green-500 pb-2 min-w-fit">
                      {svc.name && `systemctl ${svc.action === 'enable-now' ? 'enable --now' : svc.action} ${svc.name}`}
                    </div>
                    <button type="button" onClick={() => removeService(svc.id)} className="text-slate-500 hover:text-red-400 pb-1.5">×</button>
                  </div>
                ))}
              </div>
              {appStack.services.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-2">No services configured</p>
              )}
              <Button variant="secondary" size="sm" type="button" onClick={addService}>+ Add Service</Button>
            </div>
          )}

          {/* ── Performance / Misc ── */}
          {tab === 'misc' && (
            <div className="space-y-4">
              {/* Tuned profile */}
              <Card>
                <h3 className="text-sm font-medium text-slate-300 mb-3">Tuned Profile</h3>
                <p className="text-xs text-slate-500 mb-3">
                  Automatically enables and configures the <code className="bg-slate-900 px-1 rounded">tuned</code> daemon.
                  Install <code className="bg-slate-900 px-1 rounded">tuned</code> in the Packages section.
                </p>
                <Select
                  label="Profile"
                  value={appStack.tunedProfile}
                  onChange={(e) => updateAppStack({ tunedProfile: e.target.value })}
                  options={TUNED_PROFILES}
                />
              </Card>

              {/* Transparent Huge Pages */}
              <Card>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Transparent Huge Pages (THP)</h3>
                <p className="text-xs text-slate-500 mb-3">
                  Many databases (Oracle, MongoDB, Redis) require THP to be disabled.
                  Writes to <code className="bg-slate-900 px-1 rounded">/sys/kernel/mm/transparent_hugepage/</code> and persists via <code className="bg-slate-900 px-1 rounded">/etc/rc.local</code>.
                </p>
                <Toggle
                  label="Disable Transparent Huge Pages"
                  checked={appStack.disableTHP}
                  onChange={(v) => updateAppStack({ disableTHP: v })}
                  tooltip="Sets THP enabled and defrag to 'never'. Required for Oracle DB, MongoDB, Redis."
                />
              </Card>

              {/* Hugepages */}
              <Card>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Static Hugepages</h3>
                <p className="text-xs text-slate-500 mb-3">
                  Pre-allocates 2MB hugepages for applications that use <code className="bg-slate-900 px-1 rounded">mmap(MAP_HUGETLB)</code>.
                  Used by Oracle DB, DPDK, and high-performance apps. Set <code className="bg-slate-900 px-1 rounded">vm.swappiness=10</code> in kernel params when enabling.
                </p>
                <div className="flex items-center gap-4">
                  <Toggle
                    label="Enable hugepages"
                    checked={appStack.hugepagesEnabled}
                    onChange={(v) => updateAppStack({ hugepagesEnabled: v })}
                  />
                  {appStack.hugepagesEnabled && (
                    <Input
                      label="Page count (2MB each)"
                      value={appStack.hugepagesCount}
                      onChange={(e) => updateAppStack({ hugepagesCount: e.target.value })}
                      placeholder="512"
                      tooltip="512 pages × 2MB = 1GB of hugepage memory reserved"
                      className="w-32"
                    />
                  )}
                  {appStack.hugepagesEnabled && appStack.hugepagesCount && (
                    <span className="text-xs text-slate-400 pb-1 self-end">
                      = {Math.round(parseInt(appStack.hugepagesCount || '0') * 2 / 1024 * 10) / 10} GB reserved
                    </span>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
