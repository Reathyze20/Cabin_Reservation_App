/**
 * components/layout/MobileHeader.tsx
 * Překlad: header.mobile-header z index.html + mobile menu btn logika z main.ts
 */
import { Link } from 'react-router-dom'

interface MobileHeaderProps {
  animalIcon: string | null
  username: string
  onOpenProfileDrawer: () => void
}

export function MobileHeader({ animalIcon, username, onOpenProfileDrawer }: MobileHeaderProps) {
  const menuIcon = animalIcon || '☰'

  return (
    <header className="mobile-header" id="mobile-header">
      <Link to="/dashboard" className="mobile-header-logo brand-logo-lockup">
        <img src="/logo-icon.svg" alt="kdynachatu.cz" className="mobile-header-logo-img" />
        <span className="mobile-header-logo-text">kdynachatu.cz</span>
      </Link>
      <button
        className="mobile-menu-trigger"
        id="mobile-menu-btn"
        aria-label="Menu"
        title={`Menu — ${username}`}
        onClick={onOpenProfileDrawer}
      >
        <span className="mobile-menu-avatar" id="mobile-menu-icon">
          {menuIcon}
        </span>
      </button>
    </header>
  )
}
