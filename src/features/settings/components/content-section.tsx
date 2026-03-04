import { ReactNode } from 'react'

interface ContentSectionProps {
  title: string
  desc: string
  children: ReactNode
}

export default function ContentSection({ title, desc, children }: ContentSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
} 