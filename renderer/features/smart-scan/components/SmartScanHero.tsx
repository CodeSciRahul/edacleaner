import {

  ArrowRight,

  CheckCircle2,

  Gauge,

  Loader2,

  RefreshCw,

  ScanSearch,

  ShieldCheck,

  Sparkles,

  Square

} from 'lucide-react'

import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'

import { cn } from '@/utils/cn'

import type { SmartScanAreaId, SmartScanResult } from '@shared/interfaces'

import { useTranslation } from '@/i18n/useTranslation'

import scanHeroBgDark from '@/assets/smart-scan/scan-hero-bg-dark.png'

import scanHeroBgLight from '@/assets/smart-scan/scan-hero-bg-light.png'



export type SmartScanHeroPhase = 'empty' | 'idle' | 'scanning' | 'complete'



interface SmartScanHeroProps {

  phase: SmartScanHeroPhase

  result?: SmartScanResult | null

  isScanning: boolean

  cancelPending: boolean

  progressMessage?: string

  onScan: () => void

  onCancel: () => void

}



function areaStatus(result: SmartScanResult, id: SmartScanAreaId) {

  return result.areas.find((area) => area.id === id)?.status

}



export function SmartScanHero({

  phase,

  result,

  isScanning,

  cancelPending,

  progressMessage,

  onScan,

  onCancel

}: SmartScanHeroProps): React.ReactElement {

  const { t } = useTranslation()

  const navigate = useNavigate()

  const complete = phase === 'complete' && result

  const healthy = complete ? result.areasNeedingAttention === 0 : false



  let badgeLabel: string

  let badgeIcon: typeof CheckCircle2

  let headline: string

  let subtext: string



  if (complete) {

    badgeLabel = t('smartScan.hero.complete')

    badgeIcon = CheckCircle2

    headline = result.summaryTitle

    subtext = result.summaryMessage

  } else if (phase === 'scanning') {

    badgeLabel = t('smartScan.title')

    badgeIcon = ScanSearch

    headline = t('smartScan.status.scanningTitle')

    subtext = progressMessage ?? t('smartScan.status.scanningMsg')

  } else if (phase === 'empty') {

    badgeLabel = t('smartScan.title')

    badgeIcon = Sparkles

    headline = t('smartScan.emptyTitle')

    subtext = t('smartScan.emptyDesc')

  } else {

    badgeLabel = t('smartScan.title')

    badgeIcon = ShieldCheck

    headline = t('smartScan.status.readyTitle')

    subtext = t('smartScan.status.readyMsg')

  }



  const scanLabel =

    phase === 'empty' ? t('smartScan.firstScan') : complete ? t('smartScan.rescan') : t('smartScan.start')



  const showGoCleanup =

    complete &&

    (result.totalReclaimableBytes > 0 ||

      areaStatus(result, 'cleanup') === 'warning' ||

      areaStatus(result, 'cleanup') === 'issue')

  const showGoStorage =

    complete &&

    (result.duplicateBytes > 0 ||

      areaStatus(result, 'storage') === 'warning' ||

      areaStatus(result, 'storage') === 'issue')



  const BadgeIcon = badgeIcon



  return (

    <section

      aria-label={t('smartScan.title')}

      className={cn(

        'relative overflow-hidden rounded-2xl border bg-card p-5 shadow-card sm:p-6',

        'animate-in fade-in-0 duration-300',

        complete && healthy ? 'border-success/25' : complete ? 'border-primary/25' : 'border-border'

      )}

    >

      <img
        src={scanHeroBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={scanHeroBgDark}
        alt=""
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
        draggable={false}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/90 via-card/55 to-transparent sm:via-card/40"
        aria-hidden="true"
      />



      <div className="relative z-10 flex max-w-2xl flex-col gap-3">

        <div

          className={cn(

            'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',

            complete && healthy

              ? 'border-success/25 bg-success/10 text-success'

              : complete

                ? 'border-primary/25 bg-primary/10 text-primary'

                : 'border-primary/25 bg-primary/10 text-primary'

          )}

        >

          <BadgeIcon className="h-3 w-3" aria-hidden="true" />

          {badgeLabel}

        </div>



        <div>

          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{headline}</h2>

          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtext}</p>

        </div>



        {complete ? (

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">

            <Gauge className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />

            <span>{t('smartScan.hero.healthScore')}</span>

            <span className="font-semibold tabular-nums text-foreground">{result.healthScore}</span>

            <span className="text-muted-foreground">/ 100</span>

          </div>

        ) : null}



        <div className="flex flex-wrap items-center gap-2 pt-0.5">

          {isScanning ? (

            <Button

              size="sm"

              variant="outline"

              className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"

              onClick={onCancel}

              disabled={cancelPending}

            >

              <Square className="h-3.5 w-3.5" aria-hidden="true" />

              {t('common.pause')}

            </Button>

          ) : (

            <Button size="sm" className="h-9 gap-2 rounded-lg px-4 text-[13px]" onClick={onScan}>

              <RefreshCw className="h-4 w-4" aria-hidden="true" />

              {scanLabel}

            </Button>

          )}

          {isScanning ? (

            <Button

              size="sm"

              variant="outline"

              className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"

              disabled

            >

              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />

              {t('common.scanning')}

            </Button>

          ) : null}

          {showGoCleanup ? (

            <Button

              size="sm"

              variant="outline"

              className="h-9 gap-1.5 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"

              onClick={() => navigate('/cleanup')}

            >

              {t('smartScan.goCleanup')}

              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />

            </Button>

          ) : null}

          {showGoStorage ? (

            <Button

              size="sm"

              variant="outline"

              className="h-9 gap-1.5 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"

              onClick={() => navigate('/storage')}

            >

              {t('smartScan.goStorage')}

              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />

            </Button>

          ) : null}

        </div>

      </div>

    </section>

  )

}


