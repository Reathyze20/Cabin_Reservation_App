import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { CalendarGrid } from '@/features/reservations/calendar/CalendarGrid'
import type { Reservation, UserAvailability } from '@/api/reservations'

function createProps(overrides: Partial<React.ComponentProps<typeof CalendarGrid>> = {}) {
  return {
    month: 4,
    year: 2026,
    reservations: [] as Reservation[],
    availabilities: [] as UserAvailability[],
    currentUserId: 'user-1',
    selectedDay: null,
    rangeStart: null,
    onGoToPrev: vi.fn(),
    onGoToNext: vi.fn(),
    onRangeStartSet: vi.fn(),
    onRangeClear: vi.fn(),
    onRangeComplete: vi.fn(),
    onShowDetail: vi.fn(),
    onShowMonthList: vi.fn(),
    onDaySelect: vi.fn(),
    ...overrides,
  }
}

function clickDay(container: HTMLElement, dateStr: string) {
  const cell = container.querySelector(`[data-date="${dateStr}"]`) as HTMLDivElement | null
  expect(cell).not.toBeNull()
  cell?.click()
}

describe('CalendarGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-01T09:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('uses the first tap to select a day before starting a range', () => {
    const props = createProps()
    const { container } = render(<CalendarGrid {...props} />)

    clickDay(container, '2026-05-12')

    expect(props.onDaySelect).toHaveBeenCalledWith('2026-05-12')
    expect(props.onRangeStartSet).not.toHaveBeenCalled()
  })

  it('starts a range when the selected day is tapped again', () => {
    const props = createProps({ selectedDay: '2026-05-12' })
    const { container } = render(<CalendarGrid {...props} />)

    clickDay(container, '2026-05-12')

    expect(props.onRangeStartSet).toHaveBeenCalledWith('2026-05-12')
    expect(props.onDaySelect).not.toHaveBeenCalled()
  })

  it('completes the range when a later day is tapped', () => {
    const props = createProps({ rangeStart: '2026-05-12', selectedDay: '2026-05-12' })
    const { container } = render(<CalendarGrid {...props} />)

    clickDay(container, '2026-05-15')

    expect(props.onRangeClear).toHaveBeenCalledTimes(1)
    expect(props.onRangeComplete).toHaveBeenCalledWith('2026-05-12', '2026-05-15')
    expect(props.onRangeStartSet).not.toHaveBeenCalled()
  })

  it('moves the range start when an earlier day is tapped', () => {
    const props = createProps({ rangeStart: '2026-05-12', selectedDay: '2026-05-12' })
    const { container } = render(<CalendarGrid {...props} />)

    clickDay(container, '2026-05-10')

    expect(props.onRangeClear).toHaveBeenCalledTimes(1)
    expect(props.onRangeStartSet).toHaveBeenCalledWith('2026-05-10')
    expect(props.onRangeComplete).not.toHaveBeenCalled()
  })
})