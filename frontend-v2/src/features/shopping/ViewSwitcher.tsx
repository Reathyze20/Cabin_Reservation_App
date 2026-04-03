/**
 * ViewSwitcher.tsx — iOS-style pill toggle pro Shopping / Pantry view
 */
import { motion } from 'framer-motion'

export type ActiveView = 'shopping' | 'pantry'

interface Props {
  activeView: ActiveView
  onShowLists: () => void
  onShowPantry: () => void
  missingCount?: number
}

export function ViewSwitcher({ activeView, onShowLists, onShowPantry, missingCount }: Props) {
  return (
    <div className="detail-view-switcher">
      <div className="detail-view-switcher-track">
        {(['shopping', 'pantry'] as const).map((viewId) => {
          const isActive = activeView === viewId
          return (
            <button
              key={viewId}
              onClick={viewId === 'shopping' ? onShowLists : onShowPantry}
              className={`detail-view-switcher-btn${isActive ? ' is-active' : ''}`}
            >
              <span className="detail-view-switcher-label">
                {viewId === 'shopping' ? 'Nákupní seznamy' : 'Zásoby na chatě'}
              </span>
              {viewId === 'pantry' && missingCount != null && missingCount > 0 && (
                <span className="switcher-badge-count">{missingCount}</span>
              )}
              {isActive && (
                <motion.div
                  layoutId="shoppingActiveTab"
                  className="detail-view-switcher-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
