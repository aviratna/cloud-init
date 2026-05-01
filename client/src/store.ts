import { create } from 'zustand'
import { nanoid } from './lib/nanoid'
import type {
  AppState, SectionId,
  DiskEntry, FsEntry, MountEntry, MountDefaultFields,
  LvmConfig, VgEntry, LvEntry,
  PackagesConfig, UserEntry, WriteFileEntry,
  SystemConfig,
  AppStackConfig, SysctlEntry, UlimitEntry, EnvVarEntry, ServiceEntry,
} from './types'

const defaultSystem: SystemConfig = {
  hostname: '', preserveHostname: false, fqdn: '',
  timezone: 'UTC', ntpServers: [], selinux: '',
  locale: '', swapEnabled: false, swapSize: '2G', swapPath: '/swapfile',
}

const defaultLvm: LvmConfig = { pvDevice: '', vgs: [], lvs: [] }

const defaultAppStack: AppStackConfig = {
  sysctls: [], ulimits: [], envVars: [], services: [],
  tunedProfile: '', disableTHP: false, hugepagesEnabled: false, hugepagesCount: '512',
}

type Store = AppState & {
  toggleSection: (id: SectionId) => void

  // Disk
  addDisk: () => void
  updateDisk: (id: string, patch: Partial<DiskEntry>) => void
  removeDisk: (id: string) => void
  resetDisk: () => void

  // FS
  addFs: () => void
  updateFs: (id: string, patch: Partial<FsEntry>) => void
  removeFs: (id: string) => void
  resetFs: () => void

  // Mounts
  addMount: () => void
  updateMount: (id: string, patch: Partial<MountEntry>) => void
  removeMount: (id: string) => void
  updateMountDefaults: (patch: Partial<MountDefaultFields>) => void
  resetMounts: () => void

  // LVM
  updateLvm: (patch: Partial<LvmConfig>) => void
  addVg: () => void
  updateVg: (id: string, patch: Partial<VgEntry>) => void
  removeVg: (id: string) => void
  addLv: () => void
  updateLv: (id: string, patch: Partial<LvEntry>) => void
  removeLv: (id: string) => void
  resetLvm: () => void

  // Packages
  updatePackages: (patch: Partial<PackagesConfig>) => void
  addPackage: (pkg: string) => void
  removePackage: (pkg: string) => void
  resetPackages: () => void

  // Users
  addUser: () => void
  updateUser: (id: string, patch: Partial<UserEntry>) => void
  removeUser: (id: string) => void
  resetUsers: () => void

  // Write Files
  addWriteFile: () => void
  updateWriteFile: (id: string, patch: Partial<WriteFileEntry>) => void
  removeWriteFile: (id: string) => void
  resetWriteFiles: () => void

  // Runcmd
  addRuncmd: (cmd?: string) => void
  updateRuncmd: (id: string, command: string) => void
  removeRuncmd: (id: string) => void
  reorderRuncmd: (from: number, to: number) => void
  resetRuncmd: () => void

  // System
  updateSystem: (patch: Partial<SystemConfig>) => void
  addNtpServer: (s: string) => void
  removeNtpServer: (s: string) => void
  resetSystem: () => void

  // AppStack
  updateAppStack: (patch: Partial<AppStackConfig>) => void
  addSysctl: () => void
  updateSysctl: (id: string, patch: Partial<SysctlEntry>) => void
  removeSysctl: (id: string) => void
  addUlimit: () => void
  updateUlimit: (id: string, patch: Partial<UlimitEntry>) => void
  removeUlimit: (id: string) => void
  addEnvVar: () => void
  updateEnvVar: (id: string, patch: Partial<EnvVarEntry>) => void
  removeEnvVar: (id: string) => void
  addService: () => void
  updateService: (id: string, patch: Partial<ServiceEntry>) => void
  removeService: (id: string) => void
  resetAppStack: () => void

  // LVM → Mounts sync
  syncLvmMounts: () => void
}

export const useStore = create<Store>((set, get) => ({
  enabledSections: {
    disk: false, fs: false, mounts: false, lvm: false,
    packages: true, users: false, writeFiles: false, runcmd: false,
    system: true, appStack: false,
  },
  disk: [], fs: [], mounts: [],
  mountDefaults: { fsType: 'xfs', options: 'defaults', dump: 0, pass: 2 },
  lvm: defaultLvm,
  packages: { packages: [], packageUpdate: true, packageUpgrade: false },
  users: [], writeFiles: [], runcmd: [],
  system: defaultSystem,
  appStack: defaultAppStack,

  toggleSection: (id) => set((s) => ({
    enabledSections: { ...s.enabledSections, [id]: !s.enabledSections[id] },
  })),

  // ── Disk ──
  addDisk: () => set((s) => ({
    disk: [...s.disk, { id: nanoid(), device: '/dev/sdb', tableType: 'gpt', layout: 'single', customLayout: '', overwrite: false }],
  })),
  updateDisk: (id, patch) => set((s) => ({ disk: s.disk.map((d) => d.id === id ? { ...d, ...patch } : d) })),
  removeDisk: (id) => set((s) => ({ disk: s.disk.filter((d) => d.id !== id) })),
  resetDisk: () => set({ disk: [] }),

  // ── FS ──
  addFs: () => set((s) => ({
    fs: [...s.fs, { id: nanoid(), label: '', fsType: 'xfs', device: '/dev/sdb1', partition: '', overwrite: false, extraOptions: '' }],
  })),
  updateFs: (id, patch) => set((s) => ({ fs: s.fs.map((f) => f.id === id ? { ...f, ...patch } : f) })),
  removeFs: (id) => set((s) => ({ fs: s.fs.filter((f) => f.id !== id) })),
  resetFs: () => set({ fs: [] }),

  // ── Mounts ──
  addMount: () => set((s) => ({
    mounts: [...s.mounts, { id: nanoid(), device: '', mountPoint: '', fsType: 'xfs', options: ['defaults'], dump: 0, pass: 2 }],
  })),
  updateMount: (id, patch) => set((s) => ({ mounts: s.mounts.map((m) => m.id === id ? { ...m, ...patch } : m) })),
  removeMount: (id) => set((s) => ({ mounts: s.mounts.filter((m) => m.id !== id) })),
  updateMountDefaults: (patch) => set((s) => ({ mountDefaults: { ...s.mountDefaults, ...patch } })),
  resetMounts: () => set({ mounts: [] }),

  // ── LVM ──
  updateLvm: (patch) => set((s) => ({ lvm: { ...s.lvm, ...patch } })),
  addVg: () => set((s) => ({ lvm: { ...s.lvm, vgs: [...s.lvm.vgs, { id: nanoid(), name: '', devices: '' }] } })),
  updateVg: (id, patch) => set((s) => ({ lvm: { ...s.lvm, vgs: s.lvm.vgs.map((v) => v.id === id ? { ...v, ...patch } : v) } })),
  removeVg: (id) => set((s) => ({ lvm: { ...s.lvm, vgs: s.lvm.vgs.filter((v) => v.id !== id) } })),
  addLv: () => set((s) => ({ lvm: { ...s.lvm, lvs: [...s.lvm.lvs, { id: nanoid(), name: '', size: '10G', mountPoint: '', fsType: 'xfs' }] } })),
  updateLv: (id, patch) => set((s) => ({ lvm: { ...s.lvm, lvs: s.lvm.lvs.map((l) => l.id === id ? { ...l, ...patch } : l) } })),
  removeLv: (id) => set((s) => ({ lvm: { ...s.lvm, lvs: s.lvm.lvs.filter((l) => l.id !== id) } })),
  resetLvm: () => set({ lvm: defaultLvm }),

  // ── Packages ──
  updatePackages: (patch) => set((s) => ({ packages: { ...s.packages, ...patch } })),
  addPackage: (pkg) => set((s) => {
    const t = pkg.trim()
    if (!t || s.packages.packages.includes(t)) return s
    return { packages: { ...s.packages, packages: [...s.packages.packages, t] } }
  }),
  removePackage: (pkg) => set((s) => ({ packages: { ...s.packages, packages: s.packages.packages.filter((p) => p !== pkg) } })),
  resetPackages: () => set({ packages: { packages: [], packageUpdate: true, packageUpgrade: false } }),

  // ── Users ──
  addUser: () => set((s) => ({
    users: [...s.users, { id: nanoid(), name: '', shell: '/bin/bash', sudo: false, sshKey: '', groups: '', lockPassword: true }],
  })),
  updateUser: (id, patch) => set((s) => ({ users: s.users.map((u) => u.id === id ? { ...u, ...patch } : u) })),
  removeUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
  resetUsers: () => set({ users: [] }),

  // ── Write Files ──
  addWriteFile: () => set((s) => ({
    writeFiles: [...s.writeFiles, { id: nanoid(), path: '', content: '', permissions: '0644', owner: 'root:root', encoding: 'text', append: false }],
  })),
  updateWriteFile: (id, patch) => set((s) => ({ writeFiles: s.writeFiles.map((f) => f.id === id ? { ...f, ...patch } : f) })),
  removeWriteFile: (id) => set((s) => ({ writeFiles: s.writeFiles.filter((f) => f.id !== id) })),
  resetWriteFiles: () => set({ writeFiles: [] }),

  // ── Runcmd ──
  addRuncmd: (cmd = '') => set((s) => ({ runcmd: [...s.runcmd, { id: nanoid(), command: cmd }] })),
  updateRuncmd: (id, command) => set((s) => ({ runcmd: s.runcmd.map((r) => r.id === id ? { ...r, command } : r) })),
  removeRuncmd: (id) => set((s) => ({ runcmd: s.runcmd.filter((r) => r.id !== id) })),
  reorderRuncmd: (from, to) => set((s) => {
    const items = [...s.runcmd]
    const [moved] = items.splice(from, 1)
    items.splice(to, 0, moved)
    return { runcmd: items }
  }),
  resetRuncmd: () => set({ runcmd: [] }),

  // ── System ──
  updateSystem: (patch) => set((s) => ({ system: { ...s.system, ...patch } })),
  addNtpServer: (server) => set((s) => {
    if (s.system.ntpServers.includes(server)) return s
    return { system: { ...s.system, ntpServers: [...s.system.ntpServers, server] } }
  }),
  removeNtpServer: (server) => set((s) => ({ system: { ...s.system, ntpServers: s.system.ntpServers.filter((n) => n !== server) } })),
  resetSystem: () => set({ system: defaultSystem }),

  // ── AppStack ──
  updateAppStack: (patch) => set((s) => ({ appStack: { ...s.appStack, ...patch } })),
  addSysctl: () => set((s) => ({ appStack: { ...s.appStack, sysctls: [...s.appStack.sysctls, { id: nanoid(), key: '', value: '' }] } })),
  updateSysctl: (id, patch) => set((s) => ({ appStack: { ...s.appStack, sysctls: s.appStack.sysctls.map((e) => e.id === id ? { ...e, ...patch } : e) } })),
  removeSysctl: (id) => set((s) => ({ appStack: { ...s.appStack, sysctls: s.appStack.sysctls.filter((e) => e.id !== id) } })),

  addUlimit: () => set((s) => ({ appStack: { ...s.appStack, ulimits: [...s.appStack.ulimits, { id: nanoid(), domain: '*', type: 'soft', item: 'nofile', value: '65536' }] } })),
  updateUlimit: (id, patch) => set((s) => ({ appStack: { ...s.appStack, ulimits: s.appStack.ulimits.map((e) => e.id === id ? { ...e, ...patch } : e) } })),
  removeUlimit: (id) => set((s) => ({ appStack: { ...s.appStack, ulimits: s.appStack.ulimits.filter((e) => e.id !== id) } })),

  addEnvVar: () => set((s) => ({ appStack: { ...s.appStack, envVars: [...s.appStack.envVars, { id: nanoid(), name: '', value: '', scope: 'system' }] } })),
  updateEnvVar: (id, patch) => set((s) => ({ appStack: { ...s.appStack, envVars: s.appStack.envVars.map((e) => e.id === id ? { ...e, ...patch } : e) } })),
  removeEnvVar: (id) => set((s) => ({ appStack: { ...s.appStack, envVars: s.appStack.envVars.filter((e) => e.id !== id) } })),

  addService: () => set((s) => ({ appStack: { ...s.appStack, services: [...s.appStack.services, { id: nanoid(), name: '', action: 'enable-now' }] } })),
  updateService: (id, patch) => set((s) => ({ appStack: { ...s.appStack, services: s.appStack.services.map((e) => e.id === id ? { ...e, ...patch } : e) } })),
  removeService: (id) => set((s) => ({ appStack: { ...s.appStack, services: s.appStack.services.filter((e) => e.id !== id) } })),
  resetAppStack: () => set({ appStack: defaultAppStack }),

  // ── LVM → Mounts sync ──
  syncLvmMounts: () => {
    const { lvm, mounts } = get()
    const existing = mounts.filter((m) => !m.id.startsWith('lvm:'))
    const lvMounts: MountEntry[] = lvm.lvs
      .filter((l) => l.mountPoint && l.name && lvm.vgs[0])
      .map((l) => ({
        id: `lvm:${l.id}`,
        device: `/dev/${lvm.vgs[0]?.name || 'vg0'}/${l.name}`,
        mountPoint: l.mountPoint,
        fsType: l.fsType,
        options: ['defaults'],
        dump: 0,
        pass: 2,
      }))
    set({ mounts: [...existing, ...lvMounts] })
  },
}))
