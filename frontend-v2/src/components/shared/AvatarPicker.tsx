import { AVATARS } from '@/lib/avatars'
import { AnimalAvatar } from '@/components/shared/AnimalAvatar'

interface AvatarPickerProps {
  value: string
  onChange: (avatarId: string) => void
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="avatar-picker-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
      gap: '0.5rem',
    }}>
      {AVATARS.map((avatar) => (
        <button
          key={avatar.id}
          type="button"
          className={`avatar-swatch${value === avatar.id ? ' selected' : ''}`}
          title={avatar.label}
          style={{
            width: 52,
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            border: value === avatar.id ? '2px solid var(--color-primary, #d97706)' : '2px solid transparent',
            background: value === avatar.id ? 'var(--color-primary-light, #fef3c7)' : 'var(--color-surface, #fff)',
            cursor: 'pointer',
            padding: 4,
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onClick={() => onChange(avatar.id)}
        >
          <AnimalAvatar icon={avatar.id} username={avatar.label} size={40} />
        </button>
      ))}
    </div>
  )
}
