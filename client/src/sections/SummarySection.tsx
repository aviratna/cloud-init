import { useStore } from '../store'

function Row({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-slate-800 last:border-0 text-sm">
      <span className="text-slate-400 w-48 shrink-0">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span>{icon}</span>{title}
      </h3>
      <div className="bg-slate-800/40 border border-slate-700 rounded-lg px-3 py-1">
        {children}
      </div>
    </div>
  )
}

export function SummarySection() {
  const { enabledSections: en, disk, fs, mounts, lvm, packages, users, writeFiles, runcmd, system } = useStore()

  const hasAnything = Object.values(en).some(Boolean)

  return (
    <section>
      <div className="pb-3 border-b border-slate-700 mb-4">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <span>📋</span> Configuration Summary
        </h2>
        <p className="text-xs text-slate-400 mt-1">Plain-English review of all configured items</p>
      </div>

      {!hasAnything && (
        <p className="text-slate-500 text-sm text-center py-8">No sections enabled yet. Enable and configure sections in the left panel.</p>
      )}

      {en.system && (
        <Section title="System Settings" icon="⚙️">
          {system.hostname && <Row label="Hostname" value={system.fqdn || system.hostname} />}
          {system.timezone && system.timezone !== 'UTC' && <Row label="Timezone" value={system.timezone} />}
          {system.locale && <Row label="Locale" value={system.locale} />}
          {system.ntpServers.length > 0 && <Row label="NTP servers" value={system.ntpServers.join(', ')} />}
          {system.selinux && <Row label="SELinux mode" value={system.selinux} />}
          {system.swapEnabled && <Row label="Swap" value={`${system.swapSize} at ${system.swapPath}`} />}
          {!system.hostname && !system.timezone && !system.selinux && !system.swapEnabled && (
            <p className="text-slate-500 text-xs py-1">No system settings configured.</p>
          )}
        </Section>
      )}

      {en.packages && (
        <Section title="Packages" icon="📦">
          {packages.packageUpdate && <Row label="Package update" value="Yes — yum update -y before install" />}
          {packages.packageUpgrade && <Row label="Package upgrade" value="Yes — full system upgrade" />}
          {packages.packages.length > 0
            ? <Row label={`${packages.packages.length} packages`} value={packages.packages.join(', ')} />
            : <p className="text-slate-500 text-xs py-1">No packages specified.</p>}
        </Section>
      )}

      {en.disk && disk.length > 0 && (
        <Section title="Disk Setup" icon="💽">
          {disk.map((d, i) => (
            <Row key={d.id} label={`Disk ${i + 1}`} value={`${d.device} — ${d.tableType.toUpperCase()}, ${d.layout === 'single' ? 'single partition' : `custom: ${d.customLayout}`}${d.overwrite ? ', overwrite' : ''}`} />
          ))}
        </Section>
      )}

      {en.fs && fs.length > 0 && (
        <Section title="Filesystems" icon="🗂️">
          {fs.map((f, i) => (
            <Row key={f.id} label={`FS ${i + 1}`} value={`${f.device} → ${f.fsType}${f.label ? ` (label: ${f.label})` : ''}${f.overwrite ? ', overwrite' : ''}`} />
          ))}
        </Section>
      )}

      {en.mounts && mounts.length > 0 && (
        <Section title="Mounts" icon="📁">
          {mounts.map((m, i) => (
            <Row key={m.id} label={`Mount ${i + 1}`} value={`${m.device} → ${m.mountPoint} (${m.fsType}, ${m.options.join(',')})`} />
          ))}
        </Section>
      )}

      {en.lvm && (lvm.pvDevice || lvm.vgs.length > 0 || lvm.lvs.length > 0) && (
        <Section title="LVM" icon="🧱">
          {lvm.pvDevice && <Row label="Physical volume" value={lvm.pvDevice} />}
          {lvm.vgs.map((vg) => vg.name && <Row key={vg.id} label="Volume group" value={`${vg.name} on ${vg.devices}`} />)}
          {lvm.lvs.map((lv) => lv.name && (
            <Row key={lv.id} label="Logical volume" value={`${lv.name}: ${lv.size}, ${lv.fsType}${lv.mountPoint ? ` → ${lv.mountPoint}` : ''}`} />
          ))}
        </Section>
      )}

      {en.users && users.length > 0 && (
        <Section title="Users" icon="👥">
          {users.map((u) => u.name && (
            <Row key={u.id} label={u.name} value={`shell: ${u.shell}${u.sudo ? ', sudo' : ''}${u.lockPassword ? ', password locked' : ''}${u.sshKey ? ', SSH key added' : ''}${u.groups ? `, groups: ${u.groups}` : ''}`} />
          ))}
        </Section>
      )}

      {en.writeFiles && writeFiles.length > 0 && (
        <Section title="Write Files" icon="📝">
          {writeFiles.map((f, i) => (
            <Row key={f.id} label={`File ${i + 1}`} value={`${f.path} (${f.permissions}, ${f.owner}${f.append ? ', append' : ''})`} />
          ))}
        </Section>
      )}

      {en.runcmd && runcmd.length > 0 && (
        <Section title="Run Commands" icon="⚡">
          {runcmd.map((r, i) => (
            <Row key={r.id} label={`Command ${i + 1}`} value={<code className="font-mono text-green-400 text-xs">{r.command}</code>} />
          ))}
        </Section>
      )}
    </section>
  )
}
