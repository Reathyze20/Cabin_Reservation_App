import { AVATARS } from '@/lib/avatars'
import { AnimalAvatar } from '@/components/shared/AnimalAvatar'

interface AvatarPickerProps {
  value: string
  onChange: (avatarId: string) => void
  compact?: boolean
}

export function AvatarPicker({ value, onChange, compact }: AvatarPickerProps) {
  const sz = compact ? 36 : 52
  const imgSz = compact ? 28 : 40
  const radius = compact ? 8 : 12
  const pad = compact ? 2 : 4

  return (
    <div className="avatar-picker-grid" style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${sz}px, 1fr))`,
      gap: compact ? '4px' : '0.5rem',
    }}>
      {AVATARS.map((avatar) => (
        <button
          key={avatar.id}
          type="button"
          className={`avatar-swatch${value === avatar.id ? ' selected' : ''}`}
          title={avatar.label}
          style={{
            width: sz,
            height: sz,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius,
            border: value === avatar.id ? '2px solid var(--color-primary, #d97706)' : '2px solid transparent',
            background: value === avatar.id ? 'var(--color-primary-light, #fef3c7)' : 'var(--color-surface, #fff)',
            cursor: 'pointer',
            padding: pad,
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onClick={() => onChange(avatar.id)}
        >
          <AnimalAvatar icon={avatar.id} username={avatar.label} size={imgSz} />
        </button>
      ))}
    </div>
  )
}
