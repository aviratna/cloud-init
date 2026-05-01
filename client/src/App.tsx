import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { YamlPreview } from './components/YamlPreview'
import { AppStackSection } from './sections/AppStackSection'
import { DiskSection } from './sections/DiskSection'
import { FsSection } from './sections/FsSection'
import { LvmSection } from './sections/LvmSection'
import { MountsSection } from './sections/MountsSection'
import { PackagesSection } from './sections/PackagesSection'
import { RuncmdSection } from './sections/RuncmdSection'
import { SummarySection } from './sections/SummarySection'
import { SystemSection } from './sections/SystemSection'
import { UsersSection } from './sections/UsersSection'
import { WriteFilesSection } from './sections/WriteFilesSection'

type SectionId = 'system' | 'packages' | 'appStack' | 'disk' | 'fs' | 'mounts' | 'lvm' | 'users' | 'writeFiles' | 'runcmd' | 'summary'

const SECTIONS: Record<SectionId, React.ComponentType> = {
  system: SystemSection,
  packages: PackagesSection,
  appStack: AppStackSection,
  disk: DiskSection,
  fs: FsSection,
  mounts: MountsSection,
  lvm: LvmSection,
  users: UsersSection,
  writeFiles: WriteFilesSection,
  runcmd: RuncmdSection,
  summary: SummarySection,
}

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('system')
  const ActiveComponent = SECTIONS[activeSection]

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar active={activeSection} onSelect={(id) => setActiveSection(id as SectionId)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Form panel */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-w-0">
          <ActiveComponent />
        </div>
        {/* YAML preview */}
        <div className="w-[42%] shrink-0 overflow-hidden flex flex-col border-l border-slate-700">
          <YamlPreview />
        </div>
      </div>
    </div>
  )
}
