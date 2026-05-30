import { useLocation } from 'react-router-dom'

export type RouteSkeletonVariant =
  | 'dashboard'
  | 'calendar'
  | 'threads'
  | 'split'
  | 'grid'
  | 'board'
  | 'list'
  | 'form'

interface RouteTransitionSkeletonProps {
  variant?: RouteSkeletonVariant
}

function Block({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-slate-50/85 p-4 md:p-5 ${className}`}>
      {children}
    </div>
  )
}

function DashboardLayout() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.9fr]">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <SectionCard key={index} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Block className="h-4 w-28 rounded-full" />
              <Block className="h-9 w-16 rounded-2xl" />
            </div>
            <Block className="h-6 w-2/3 rounded-xl" />
            <div className="space-y-2.5">
              <Block className="h-3 w-full rounded-full" />
              <Block className="h-3 w-4/5 rounded-full" />
              <Block className="h-3 w-3/5 rounded-full" />
            </div>
          </SectionCard>
        ))}
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <SectionCard key={index} className="space-y-4">
            <div className="flex items-center gap-3">
              <Block className="h-10 w-10 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Block className="h-4 w-24 rounded-full" />
                <Block className="h-3 w-2/3 rounded-full" />
              </div>
            </div>
            <div className="space-y-2.5">
              <Block className="h-3 w-full rounded-full" />
              <Block className="h-3 w-5/6 rounded-full" />
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  )
}

function CalendarLayout() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]">
      <SectionCard className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Block className="h-7 w-40 rounded-xl" />
          <div className="flex gap-2">
            <Block className="h-10 w-10 rounded-full" />
            <Block className="h-10 w-10 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, index) => (
            <Block key={index} className="aspect-square min-h-12 rounded-2xl" />
          ))}
        </div>
      </SectionCard>

      <div className="space-y-4">
        <SectionCard className="space-y-3">
          <Block className="h-5 w-32 rounded-full" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Block className="h-11 w-11 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Block className="h-3.5 w-2/3 rounded-full" />
                  <Block className="h-3 w-1/2 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard className="space-y-3">
          <Block className="h-5 w-28 rounded-full" />
          <Block className="h-28 w-full rounded-2xl" />
          <Block className="h-10 w-full rounded-xl" />
        </SectionCard>
      </div>
    </div>
  )
}

function ThreadsLayout() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <SectionCard className="space-y-3">
        <Block className="h-11 w-full rounded-2xl" />
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3">
            <Block className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <Block className="h-4 w-24 rounded-full" />
                <Block className="h-3 w-10 rounded-full" />
              </div>
              <Block className="h-3 w-full rounded-full" />
              <Block className="h-3 w-3/4 rounded-full" />
            </div>
          </div>
        ))}
      </SectionCard>

      <SectionCard className="flex min-h-[28rem] flex-col gap-4">
        <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4">
          <Block className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Block className="h-4 w-40 rounded-full" />
            <Block className="h-3 w-28 rounded-full" />
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={`max-w-[84%] space-y-2 rounded-2xl px-4 py-3 ${index % 2 === 0 ? 'mr-auto bg-slate-100/85' : 'ml-auto bg-emerald-50/85'}`}
            >
              <Block className="h-3 w-28 rounded-full" />
              <Block className="h-3 w-full rounded-full" />
              <Block className="h-3 w-2/3 rounded-full" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 border-t border-slate-200/80 pt-4">
          <Block className="h-11 flex-1 rounded-2xl" />
          <Block className="h-11 w-28 rounded-full" />
        </div>
      </SectionCard>
    </div>
  )
}

function SplitLayout() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <SectionCard className="space-y-3">
        <Block className="h-11 w-full rounded-2xl" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-4">
            <div className="flex-1 space-y-2">
              <Block className="h-4 w-2/3 rounded-full" />
              <Block className="h-3 w-1/2 rounded-full" />
            </div>
            <Block className="h-6 w-14 rounded-full" />
          </div>
        ))}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Block className="h-6 w-40 rounded-xl" />
          <div className="flex gap-2">
            <Block className="h-10 w-10 rounded-full" />
            <Block className="h-10 w-24 rounded-full" />
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3">
            <Block className="h-6 w-6 rounded-md" />
            <div className="flex-1 space-y-2">
              <Block className="h-3.5 w-3/4 rounded-full" />
              <Block className="h-3 w-1/2 rounded-full" />
            </div>
            <Block className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </SectionCard>
    </div>
  )
}

function GridLayout() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Block className="h-11 w-full rounded-2xl md:max-w-sm" />
        <div className="flex gap-2">
          <Block className="h-10 w-28 rounded-full" />
          <Block className="h-10 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SectionCard key={index} className="space-y-4 overflow-hidden p-0">
            <Block className="h-44 w-full rounded-none" />
            <div className="space-y-3 px-4 pb-4">
              <Block className="h-5 w-2/3 rounded-xl" />
              <Block className="h-3 w-1/2 rounded-full" />
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  )
}

function BoardLayout() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, columnIndex) => (
        <SectionCard key={columnIndex} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Block className="h-5 w-28 rounded-xl" />
            <Block className="h-7 w-10 rounded-full" />
          </div>
          {Array.from({ length: 4 }).map((_, cardIndex) => (
            <div key={cardIndex} className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <Block className="h-4 w-3/4 rounded-full" />
              <Block className="h-3 w-full rounded-full" />
              <Block className="h-3 w-2/3 rounded-full" />
              <div className="flex gap-2 pt-2">
                <Block className="h-6 w-16 rounded-full" />
                <Block className="h-6 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </SectionCard>
      ))}
    </div>
  )
}

function ListLayout() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SectionCard key={index} className="space-y-3">
            <Block className="h-4 w-24 rounded-full" />
            <Block className="h-8 w-20 rounded-xl" />
            <Block className="h-3 w-2/3 rounded-full" />
          </SectionCard>
        ))}
      </div>
      <SectionCard className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Block className="h-4 w-48 rounded-full" />
              <Block className="h-3 w-32 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Block className="h-8 w-20 rounded-full" />
              <Block className="h-8 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  )
}

function FormLayout() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <SectionCard className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2.5">
              <Block className="h-3 w-24 rounded-full" />
              <Block className="h-11 w-full rounded-2xl" />
            </div>
          ))}
        </div>
        <div className="space-y-2.5">
          <Block className="h-3 w-28 rounded-full" />
          <Block className="h-32 w-full rounded-3xl" />
        </div>
        <div className="flex justify-end gap-3">
          <Block className="h-11 w-28 rounded-full" />
          <Block className="h-11 w-36 rounded-full" />
        </div>
      </SectionCard>
    </div>
  )
}

export function getRouteSkeletonVariant(pathname: string): RouteSkeletonVariant {
  if (pathname.startsWith('/reservations')) return 'calendar'
  if (pathname.startsWith('/notes')) return 'threads'
  if (pathname.startsWith('/shopping')) return 'split'
  if (pathname.startsWith('/gallery') || pathname.startsWith('/diary')) return 'grid'
  if (pathname.startsWith('/reconstruction')) return 'board'
  if (pathname.startsWith('/admin') || pathname.startsWith('/superadmin')) return 'list'
  if (pathname.startsWith('/onboarding')) return 'form'
  return 'dashboard'
}

export function RouteTransitionSkeleton({ variant = 'dashboard' }: RouteTransitionSkeletonProps) {
  return (
    <div className="flex h-full min-h-full flex-col p-4 md:p-6 lg:p-8 pb-20 md:pb-0">
      <div className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/60 bg-white/92 p-5 shadow-xl backdrop-blur-md md:p-7">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Block className="h-3 w-24 rounded-full" />
            <Block className="h-8 w-44 rounded-xl" />
          </div>
          <div className="hidden gap-3 md:flex">
            <Block className="h-10 w-28 rounded-full" />
            <Block className="h-10 w-36 rounded-full" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {variant === 'calendar' && <CalendarLayout />}
          {variant === 'threads' && <ThreadsLayout />}
          {variant === 'split' && <SplitLayout />}
          {variant === 'grid' && <GridLayout />}
          {variant === 'board' && <BoardLayout />}
          {variant === 'list' && <ListLayout />}
          {variant === 'form' && <FormLayout />}
          {variant === 'dashboard' && <DashboardLayout />}
        </div>
      </div>
    </div>
  )
}

export function RouteLoadingFallback() {
  const location = useLocation()

  return <RouteTransitionSkeleton variant={getRouteSkeletonVariant(location.pathname)} />
}