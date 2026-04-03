import { SWATCH_COLORS } from '@/lib/utils'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  colors?: string[]
}

export function ColorPicker({ value, onChange, colors }: ColorPickerProps) {
  const palette = colors ?? SWATCH_COLORS

  return (
    <div className="color-picker-grid" style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
    }}>
      {palette.map((color) => (
        <button
          key={color}
          type="button"
          className={`color-swatch${value === color ? ' selected' : ''}`}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: color,
            border: value === color ? '3px solid var(--color-text, #1f2937)' : '2px solid transparent',
            cursor: 'pointer',
            outline: value === color ? '2px solid white' : 'none',
            outlineOffset: -3,
            transition: 'border-color 0.15s, outline 0.15s',
            flexShrink: 0,
          }}
          onClick={() => onChange(color)}
          title={color}
        />
      ))}
    </div>
  )
}
