import { Document, YAMLSeq } from 'yaml'
import type { AppState } from '../types'

export function generateCloudConfig(state: AppState): string {
  const config: Record<string, unknown> = {}
  const { enabledSections: en } = state

  // ── System ────────────────────────────────────────────────────────────────
  if (en.system) {
    const sys = state.system
    if (sys.hostname) config.hostname = sys.hostname
    if (sys.fqdn) config.fqdn = sys.fqdn
    if (sys.preserveHostname) config.preserve_hostname = true
    if (sys.timezone && sys.timezone !== 'UTC') config.timezone = sys.timezone
    if (sys.locale) config.locale = sys.locale
    if (sys.ntpServers.length > 0) {
      config.ntp = { enabled: true, servers: sys.ntpServers }
    }
  }

  // ── Packages ──────────────────────────────────────────────────────────────
  if (en.packages) {
    const pkg = state.packages
    if (pkg.packageUpdate) config.package_update = true
    if (pkg.packageUpgrade) config.package_upgrade = true
    if (pkg.packages.length > 0) config.packages = [...pkg.packages]
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  if (en.users && state.users.length > 0) {
    config.users = state.users
      .filter((u) => u.name)
      .map((u) => {
        const user: Record<string, unknown> = { name: u.name }
        if (u.shell) user.shell = u.shell
        if (u.groups) user.groups = u.groups.split(',').map((g) => g.trim()).filter(Boolean)
        if (u.sudo) user.sudo = ['ALL=(ALL) NOPASSWD:ALL']
        if (u.lockPassword) user.lock_passwd = true
        if (u.sshKey) user.ssh_authorized_keys = [u.sshKey.trim()]
        return user
      })
  }

  // ── Disk Setup ────────────────────────────────────────────────────────────
  if (en.disk && state.disk.length > 0) {
    const diskSetup: Record<string, unknown> = {}
    for (const d of state.disk) {
      if (!d.device) continue
      diskSetup[d.device] = {
        table_type: d.tableType,
        layout: d.layout === 'single'
          ? true
          : d.customLayout.split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n)),
        overwrite: d.overwrite,
      }
    }
    if (Object.keys(diskSetup).length > 0) config.disk_setup = diskSetup
  }

  // ── Filesystem Setup ──────────────────────────────────────────────────────
  if (en.fs && state.fs.length > 0) {
    config.fs_setup = state.fs
      .filter((f) => f.device)
      .map((f) => {
        const entry: Record<string, unknown> = { filesystem: f.fsType, device: f.device, overwrite: f.overwrite }
        if (f.label) entry.label = f.label
        if (f.partition !== '' && f.partition !== undefined) entry.partition = f.partition
        if (f.extraOptions) entry.extra_opts = f.extraOptions.split(' ').filter(Boolean)
        return entry
      })
  }

  // ── Mounts ────────────────────────────────────────────────────────────────
  // cloud-init mounts format: each entry is an inline list
  //   [ device, mountpoint, fstype, options, dump, pass ]
  // Reference: https://cloudinit.readthedocs.io/en/latest/reference/modules/mounts.html
  if (en.mounts && state.mounts.length > 0) {
    const validMounts = state.mounts.filter((m) => m.device && m.mountPoint)
    if (validMounts.length > 0) {
      // We'll apply flow style after building the Document
      config.mounts = validMounts.map((m) => [
        m.device,
        m.mountPoint,
        m.fsType || 'auto',
        m.options.join(',') || 'defaults',
        m.dump,
        m.pass,
      ])
      const md = state.mountDefaults
      config.mount_default_fields = [
        null, null,
        md.fsType || 'auto',
        md.options || 'defaults,nofail',
        md.dump,
        md.pass,
      ]
    }
  }

  // ── Collect write_files from all sources ──────────────────────────────────
  const allWriteFiles: Record<string, unknown>[] = []

  // User-defined write_files
  if (en.writeFiles) {
    for (const f of state.writeFiles) {
      if (!f.path) continue
      const entry: Record<string, unknown> = {
        path: f.path,
        content: f.content,
        permissions: f.permissions || '0644',
        owner: f.owner || 'root:root',
      }
      if (f.encoding !== 'text') entry.encoding = f.encoding
      if (f.append) entry.append = true
      allWriteFiles.push(entry)
    }
  }

  // AppStack write_files: sysctl, ulimits, env vars
  if (en.appStack) {
    const as = state.appStack

    // sysctl → /etc/sysctl.d/99-cloud-init-custom.conf
    if (as.sysctls.filter((s) => s.key).length > 0) {
      const lines = as.sysctls
        .filter((s) => s.key)
        .map((s) => `${s.key} = ${s.value}`)
        .join('\n')
      allWriteFiles.push({
        path: '/etc/sysctl.d/99-cloud-init-custom.conf',
        content: lines + '\n',
        permissions: '0644',
        owner: 'root:root',
      })
    }

    // ulimits → /etc/security/limits.d/99-cloud-init-custom.conf
    if (as.ulimits.filter((u) => u.item).length > 0) {
      const lines = as.ulimits
        .filter((u) => u.item)
        .map((u) => `${u.domain}\t${u.type}\t${u.item}\t${u.value}`)
        .join('\n')
      allWriteFiles.push({
        path: '/etc/security/limits.d/99-cloud-init-custom.conf',
        content: `# Generated by cloud-init\n${lines}\n`,
        permissions: '0644',
        owner: 'root:root',
      })
    }

    // system-scope env vars → /etc/environment
    const sysEnvVars = as.envVars.filter((e) => e.name && e.scope === 'system')
    if (sysEnvVars.length > 0) {
      allWriteFiles.push({
        path: '/etc/environment',
        content: sysEnvVars.map((e) => `${e.name}=${e.value}`).join('\n') + '\n',
        permissions: '0644',
        owner: 'root:root',
        append: true,
      })
    }

    // profile-scope env vars → /etc/profile.d/custom-env.sh
    const profileEnvVars = as.envVars.filter((e) => e.name && e.scope === 'profile')
    if (profileEnvVars.length > 0) {
      allWriteFiles.push({
        path: '/etc/profile.d/cloud-init-custom.sh',
        content: profileEnvVars.map((e) => `export ${e.name}=${e.value}`).join('\n') + '\n',
        permissions: '0644',
        owner: 'root:root',
      })
    }
  }

  if (allWriteFiles.length > 0) config.write_files = allWriteFiles

  // ── Collect all runcmd entries ─────────────────────────────────────────────
  const allCmds: string[] = []

  // LVM commands
  if (en.lvm) {
    const lvm = state.lvm
    if (lvm.pvDevice) allCmds.push(`pvcreate ${lvm.pvDevice}`)
    for (const vg of lvm.vgs) {
      if (vg.name && vg.devices) allCmds.push(`vgcreate ${vg.name} ${vg.devices}`)
    }
    for (const lv of lvm.lvs) {
      if (!lv.name || !lvm.vgs[0]?.name) continue
      const vgName = lvm.vgs[0].name
      allCmds.push(`lvcreate -L ${lv.size} -n ${lv.name} ${vgName}`)
      allCmds.push(`mkfs.${lv.fsType} /dev/${vgName}/${lv.name}`)
      if (lv.mountPoint) {
        allCmds.push(`mkdir -p ${lv.mountPoint}`)
        allCmds.push(`mount /dev/${vgName}/${lv.name} ${lv.mountPoint}`)
      }
    }
  }

  // SELinux / swap
  if (en.system) {
    const sys = state.system
    if (sys.selinux === 'disabled') {
      allCmds.push("sed -i 's/^SELINUX=.*/SELINUX=disabled/' /etc/selinux/config")
      allCmds.push('setenforce 0 || true')
    } else if (sys.selinux === 'permissive') {
      allCmds.push("sed -i 's/^SELINUX=.*/SELINUX=permissive/' /etc/selinux/config")
      allCmds.push('setenforce 0 || true')
    }
    if (sys.swapEnabled && sys.swapSize && sys.swapPath) {
      allCmds.push(`fallocate -l ${sys.swapSize} ${sys.swapPath}`)
      allCmds.push(`chmod 600 ${sys.swapPath}`)
      allCmds.push(`mkswap ${sys.swapPath}`)
      allCmds.push(`swapon ${sys.swapPath}`)
      allCmds.push(`echo '${sys.swapPath} none swap sw 0 0' >> /etc/fstab`)
    }
  }

  // AppStack runcmds: sysctl reload, services, tuned, THP, hugepages
  if (en.appStack) {
    const as = state.appStack

    // Apply sysctl after writing config file
    if (as.sysctls.filter((s) => s.key).length > 0) {
      allCmds.push('sysctl --system')
    }

    // Disable Transparent Huge Pages
    if (as.disableTHP) {
      allCmds.push("echo never > /sys/kernel/mm/transparent_hugepage/enabled")
      allCmds.push("echo never > /sys/kernel/mm/transparent_hugepage/defrag")
      allCmds.push("echo 'echo never > /sys/kernel/mm/transparent_hugepage/enabled' >> /etc/rc.local")
      allCmds.push("echo 'echo never > /sys/kernel/mm/transparent_hugepage/defrag' >> /etc/rc.local")
      allCmds.push('chmod +x /etc/rc.local')
    }

    // Hugepages
    if (as.hugepagesEnabled && as.hugepagesCount) {
      allCmds.push(`echo vm.nr_hugepages = ${as.hugepagesCount} >> /etc/sysctl.d/99-cloud-init-custom.conf`)
      allCmds.push(`sysctl -w vm.nr_hugepages=${as.hugepagesCount}`)
    }

    // Tuned profile
    if (as.tunedProfile) {
      allCmds.push('systemctl enable --now tuned')
      allCmds.push(`tuned-adm profile ${as.tunedProfile}`)
    }

    // Services
    for (const svc of as.services) {
      if (!svc.name) continue
      switch (svc.action) {
        case 'enable':        allCmds.push(`systemctl enable ${svc.name}`); break
        case 'start':         allCmds.push(`systemctl start ${svc.name}`); break
        case 'enable-now':    allCmds.push(`systemctl enable --now ${svc.name}`); break
        case 'disable':       allCmds.push(`systemctl disable ${svc.name}`); break
        case 'stop':          allCmds.push(`systemctl stop ${svc.name}`); break
        case 'restart':       allCmds.push(`systemctl restart ${svc.name}`); break
        case 'mask':          allCmds.push(`systemctl mask ${svc.name}`); break
      }
    }
  }

  // User-defined runcmds (always last)
  if (en.runcmd) {
    for (const r of state.runcmd) {
      if (r.command) allCmds.push(r.command)
    }
  }

  if (allCmds.length > 0) config.runcmd = allCmds

  // ── Build YAML Document with correct formatting ───────────────────────────
  const doc = new Document(config)

  // Fix mounts: each entry must be an inline sequence [ dev, mp, fs, opts, dump, pass ]
  // This is the cloud-init-required format per official docs
  const mountsNode = doc.getIn(['mounts'])
  if (mountsNode instanceof YAMLSeq) {
    for (const item of mountsNode.items) {
      if (item instanceof YAMLSeq) item.flow = true
    }
  }
  const mountDefaultNode = doc.getIn(['mount_default_fields'])
  if (mountDefaultNode instanceof YAMLSeq) {
    mountDefaultNode.flow = true
  }

  const yamlStr = doc.toString({
    lineWidth: 120,
  })

  return `#cloud-config\n${yamlStr}`
}
