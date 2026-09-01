import { useId } from 'react'
import { cn } from '@/utils/cn'

const PARTICLES = [
  { left: '22%', delay: '0s', duration: '0.95s', size: 3, streak: false },
  { left: '34%', delay: '0.18s', duration: '0.85s', size: 2, streak: true },
  { left: '46%', delay: '0.42s', duration: '1.05s', size: 2, streak: false },
  { left: '58%', delay: '0.08s', duration: '0.9s', size: 3, streak: true },
  { left: '70%', delay: '0.55s', duration: '0.88s', size: 2, streak: false },
  { left: '28%', delay: '0.72s', duration: '1s', size: 2, streak: false },
  { left: '40%', delay: '0.32s', duration: '0.82s', size: 3, streak: true },
  { left: '52%', delay: '0.62s', duration: '0.92s', size: 2, streak: false },
  { left: '64%', delay: '0.25s', duration: '0.98s', size: 2, streak: true },
  { left: '76%', delay: '0.48s', duration: '0.86s', size: 3, streak: false },
  { left: '36%', delay: '0.88s', duration: '0.94s', size: 2, streak: false },
  { left: '48%', delay: '0.12s', duration: '1.02s', size: 2, streak: true }
] as const

interface BoostRocketLoaderProps {
  className?: string
}

export function BoostRocketLoader({ className }: BoostRocketLoaderProps): React.ReactElement {
  const uid = useId().replace(/:/g, '')

  return (
    <div
      className={cn(
        'relative mx-auto h-44 w-44 overflow-hidden sm:h-48 sm:w-48',
        className
      )}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-2 top-[38%]">
        {PARTICLES.map((particle, index) => (
          <span
            key={index}
            className={cn(
              'boost-particle-fall absolute rounded-full bg-cyan-400/70 dark:bg-cyan-300/60',
              particle.streak && 'h-3 w-[1.5px] rounded-sm bg-cyan-400/50 dark:bg-cyan-300/45'
            )}
            style={{
              left: particle.left,
              top: '18%',
              width: particle.streak ? undefined : particle.size,
              height: particle.streak ? undefined : particle.size,
              animation: `boost-particle-fall ${particle.duration} linear infinite`,
              animationDelay: particle.delay
            }}
          />
        ))}
      </div>

      <div className="absolute left-1/2 top-[42%] w-[72px] -translate-x-1/2 sm:w-[76px]">
        <div
          className="boost-rocket-rise flex flex-col items-center"
          style={{ animation: 'boost-rocket-rise 1.65s linear infinite' }}
        >
          <svg
            viewBox="0 0 64 88"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="block h-auto w-full drop-shadow-[0_4px_14px_rgba(6,182,212,0.35)]"
            aria-hidden="true"
          >
          <defs>
            <linearGradient id={`${uid}-body`} x1="32" y1="8" x2="32" y2="68" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22D3EE" />
              <stop offset="0.55" stopColor="#06B6D4" />
              <stop offset="1" stopColor="#0891B2" />
            </linearGradient>
            <linearGradient id={`${uid}-nose`} x1="32" y1="4" x2="32" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FDE68A" />
              <stop offset="1" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id={`${uid}-fin`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#FBBF24" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
          </defs>

          <path d="M32 4 L38 22 L26 22 Z" fill={`url(#${uid}-nose)`} />
          <rect x="24" y="20" width="16" height="40" rx="4" fill={`url(#${uid}-body)`} />
          <circle cx="32" cy="36" r="5.5" fill="#E0F2FE" stroke="#0891B2" strokeWidth="1.5" />
          <circle cx="32" cy="36" r="2.5" fill="#67E8F9" opacity="0.85" />
          <path d="M24 52 L14 66 L24 60 Z" fill={`url(#${uid}-fin)`} />
          <path d="M40 52 L50 66 L40 60 Z" fill={`url(#${uid}-fin)`} />
          <path d="M28 60 L36 60 L32 68 Z" fill="#0891B2" />
          </svg>

          <div className="relative -mt-1 flex w-full justify-center">
            <div className="relative h-7 w-4">
              <div
                className="boost-rocket-flame h-full w-full origin-top rounded-full bg-gradient-to-b from-amber-300 via-orange-500 to-transparent blur-[1px]"
                style={{ animation: 'boost-rocket-flame 0.28s ease-in-out infinite' }}
              />
              <div className="absolute left-1/2 top-0 -translate-x-1/2">
                <div
                  className="boost-rocket-flame h-4 w-2 origin-top rounded-full bg-gradient-to-b from-yellow-200 via-amber-400 to-transparent"
                  style={{ animation: 'boost-rocket-flame 0.22s ease-in-out infinite reverse' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
