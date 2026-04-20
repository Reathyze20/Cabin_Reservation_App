import { Link } from 'react-router-dom'
import { ScrollText, Settings, TicketPlus, UserPlus } from 'lucide-react'

export type AdminSectionMenuKey = 'members' | 'invites' | 'cabin' | 'diagnostics'

const adminMenuItems: Array<{
  key: AdminSectionMenuKey
  to: string
  label: string
  meta: string
  icon: typeof UserPlus
}> = [
  {
    key: 'members',
    to: '/admin',
    label: 'Členové a role',
    meta: 'Účty a oprávnění',
    icon: UserPlus,
  },
  {
    key: 'invites',
    to: '/admin/invites',
    label: 'Pozvánky',
    meta: 'Sdílené vstupy',
    icon: TicketPlus,
  },
  {
    key: 'cabin',
    to: '/admin/cabin',
    label: 'Nastavení chaty',
    meta: 'Moduly a pravidla',
    icon: Settings,
  },
  {
    key: 'diagnostics',
    to: '/admin/diagnostics',
    label: 'Diagnostika',
    meta: 'Logy a incidenty',
    icon: ScrollText,
  },
]

interface AdminSectionMenuProps {
  active: AdminSectionMenuKey
}

export function AdminSectionMenu({ active }: AdminSectionMenuProps) {
  return (
    <nav className="admin-section-nav" aria-label="Sekce administrace">
      {adminMenuItems.map((item) => {
        const Icon = item.icon

        return (
          <Link
            key={item.key}
            to={item.to}
            className={`admin-section-link ${active === item.key ? 'is-active' : ''}`}
            aria-current={active === item.key ? 'page' : undefined}
          >
            <span className="admin-section-link-icon"><Icon size={16} /></span>
            <span className="admin-section-link-copy">
              <span className="admin-section-link-label">{item.label}</span>
              <span className="admin-section-link-meta">{item.meta}</span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}