// ─── Disk Setup ──────────────────────────────────────────────────────────────
export interface DiskEntry {
  id: string
  device: string
  tableType: 'gpt' | 'mbr'
  layout: 'single' | 'custom'
  customLayout: string
  overwrite: boolean
}

// ─── Filesystem Setup ─────────────────────────────────────────────────────────
export interface FsEntry {
  id: string
  label: string
  fsType: 'ext4' | 'xfs' | 'btrfs' | 'vfat'
  device: string
  partition?: number | ''
  overwrite: boolean
  extraOptions: string
}

// ─── Mounts ───────────────────────────────────────────────────────────────────
export type MountOption = 'defaults' | 'noatime' | 'nodiratime' | 'ro' | 'rw' | 'nofail' | 'x-systemd.automount'

export interface MountEntry {
  id: string
  device: string
  mountPoint: string
  fsType: string
  options: MountOption[]
  dump: 0 | 1
  pass: 0 | 1 | 2
}

export interface MountDefaultFields {
  fsType: string
  options: string
  dump: 0 | 1
  pass: 0 | 1 | 2
}

// ─── LVM ──────────────────────────────────────────────────────────────────────
export interface LvEntry {
  id: string
  name: string
  size: string
  mountPoint: string
  fsType: 'ext4' | 'xfs' | 'btrfs'
}

export interface VgEntry {
  id: string
  name: string
  devices: string
}

export interface LvmConfig {
  pvDevice: string
  vgs: VgEntry[]
  lvs: LvEntry[]
}

// ─── Packages ─────────────────────────────────────────────────────────────────
export interface PackagesConfig {
  packages: string[]
  packageUpdate: boolean
  packageUpgrade: boolean
}

// ─── Users ────────────────────────────────────────────────────────────────────
export interface UserEntry {
  id: string
  name: string
  shell: string
  sudo: boolean
  sshKey: string
  groups: string
  lockPassword: boolean
}

// ─── Write Files ──────────────────────────────────────────────────────────────
export type FileEncoding = 'text' | 'base64' | 'gz+base64'

export interface WriteFileEntry {
  id: string
  path: string
  content: string
  permissions: string
  owner: string
  encoding: FileEncoding
  append: boolean
}

// ─── Run Commands ─────────────────────────────────────────────────────────────
export interface RunCmdEntry {
  id: string
  command: string
}

// ─── System Settings ──────────────────────────────────────────────────────────
export interface SystemConfig {
  hostname: string
  preserveHostname: boolean
  fqdn: string
  timezone: string
  ntpServers: string[]
  selinux: 'enforcing' | 'permissive' | 'disabled' | ''
  locale: string
  swapEnabled: boolean
  swapSize: string
  swapPath: string
}

// ─── App Stack ────────────────────────────────────────────────────────────────
export interface SysctlEntry {
  id: string
  key: string
  value: string
}

export interface UlimitEntry {
  id: string
  domain: string
  type: 'soft' | 'hard' | '-'
  item: string
  value: string
}

export interface EnvVarEntry {
  id: string
  name: string
  value: string
  scope: 'system' | 'profile'
}

export interface ServiceEntry {
  id: string
  name: string
  action: 'enable' | 'start' | 'enable-now' | 'disable' | 'stop' | 'restart' | 'mask'
}

export interface AppStackConfig {
  sysctls: SysctlEntry[]
  ulimits: UlimitEntry[]
  envVars: EnvVarEntry[]
  services: ServiceEntry[]
  tunedProfile: string
  disableTHP: boolean
  hugepagesEnabled: boolean
  hugepagesCount: string
}

// ─── Section toggle state ─────────────────────────────────────────────────────
export type SectionId =
  | 'disk'
  | 'fs'
  | 'mounts'
  | 'lvm'
  | 'packages'
  | 'users'
  | 'writeFiles'
  | 'runcmd'
  | 'system'
  | 'appStack'

export interface AppState {
  enabledSections: Record<SectionId, boolean>
  disk: DiskEntry[]
  fs: FsEntry[]
  mounts: MountEntry[]
  mountDefaults: MountDefaultFields
  lvm: LvmConfig
  packages: PackagesConfig
  users: UserEntry[]
  writeFiles: WriteFileEntry[]
  runcmd: RunCmdEntry[]
  system: SystemConfig
  appStack: AppStackConfig
}
