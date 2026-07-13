import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
import { formatBytes } from '@shared/utils'
import {
  useAnalyzeStorage,
  useDuplicates,
  useLargeFiles,
  useRevealInFolder,
  useStorageDrives,
  useStorageUsage
} from '@/features/storage/hooks/useStorageData'
import { StorageSubnav } from '@/features/storage/components/StorageSubnav'
import { StorageSummaryCards } from '@/features/storage/components/StorageSummaryCards'
import { DriveStorageCard } from '@/features/storage/components/DriveStorageCard'
import {
  FolderBreakdownPanel,
  buildSegmentColors
} from '@/features/storage/components/FolderBreakdownPanel'
import { StorageInsightsSection } from '@/features/storage/components/StorageInsightsSection'
import { useTranslation } from '@/i18n/useTranslation'

export function StoragePage(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    data: drives = [],
    isLoading: drivesLoading,
    isError: drivesError,
    error: drivesErr,
    refetch: refetchDrives
  } = useStorageDrives()
  const [selectedMount, setSelectedMount] = useState<string | undefined>(undefined)

  const activeDrive = useMemo(() => {
    if (drives.length === 0) return undefined
    if (selectedMount) {
      return drives.find((drive) => drive.mountPath === selectedMount) ?? drives[0]
    }
    return drives[0]
  }, [drives, selectedMount])

  const mountPath = activeDrive?.mountPath
  const {
    data: usage,
    isLoading: usageLoading,
    isFetching: usageFetching
  } = useStorageUsage(mountPath, Boolean(mountPath))
  const { data: largeFiles = [], isLoading: largeLoading } = useLargeFiles()
  const { data: duplicates = [], isLoading: duplicatesLoading } = useDuplicates()
  const analyze = useAnalyzeStorage()
  const reveal = useRevealInFolder()

  const largeTotalBytes = largeFiles.reduce((sum, file) => sum + file.sizeBytes, 0)
  const duplicateWasteBytes = duplicates.reduce(
    (sum, group) => sum + group.sizeBytes * Math.max(0, group.copies - 1),
    0
  )

  const segments = buildSegmentColors(usage?.segments ?? [], formatBytes)

  const isAnalyzing =
    analyze.isPending || drivesLoading || usageLoading || largeLoading || duplicatesLoading

  const handleAnalyzeDrive = (driveMount: string): void => {
    setSelectedMount(driveMount)
    void analyze.mutateAsync(driveMount)
  }

  return (
    <>
      <Toolbar
        title={t('storage.title')}
        description={t('storage.description')}
        actions={
          <Button
            size="sm"
            className="h-9 gap-2 rounded-lg px-4 text-[13px]"
            onClick={() => void analyze.mutateAsync(mountPath)}
            disabled={isAnalyzing || !mountPath}
          >
            <HardDrive className="h-4 w-4" aria-hidden="true" />
            {analyze.isPending ? t('storage.analyzing') : t('storage.analyze')}
          </Button>
        }
      />

      <div className="space-y-6 p-content-pad">
        <StorageSubnav />

        {drivesError ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t('storage.drivesError')}</p>
              <p className="mt-0.5 opacity-90">
                {drivesErr instanceof Error ? drivesErr.message : 'Unknown error'}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void refetchDrives()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : null}

        <StorageSummaryCards drives={drives} isLoading={drivesLoading} />

        <section aria-label={t('storage.localDisks')}>
          <div className="mb-4">
            <h2 className="text-section-title text-foreground">{t('storage.localDisks')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('storage.localDisksHint')}</p>
          </div>

          {drivesLoading ? (
            <div className="grid gap-grid-gap sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-[280px] animate-pulse rounded-xl border border-border bg-muted/40"
                />
              ))}
            </div>
          ) : drives.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <HardDrive className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{t('storage.noDrives')}</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {t('storage.noDrivesHint')}
              </p>
              <Button size="sm" className="mt-4" onClick={() => void refetchDrives()}>
                {t('common.retry')}
              </Button>
            </div>
          ) : (
            <div
              className={
                drives.length === 1
                  ? 'grid gap-grid-gap'
                  : 'grid gap-grid-gap sm:grid-cols-2'
              }
            >
              {drives.map((drive) => (
                <DriveStorageCard
                  key={drive.mountPath}
                  drive={drive}
                  selected={drive.mountPath === mountPath}
                  analyzing={analyze.isPending && drive.mountPath === mountPath}
                  onSelect={() => setSelectedMount(drive.mountPath)}
                  onAnalyze={() => handleAnalyzeDrive(drive.mountPath)}
                  onOpenLargeFiles={() => navigate('/storage/large-files')}
                  onOpenDuplicates={() => navigate('/storage/duplicates')}
                />
              ))}
            </div>
          )}
        </section>

        <FolderBreakdownPanel
          driveLabel={activeDrive?.label}
          mountPath={activeDrive?.mountPath}
          segments={segments}
          isLoading={Boolean(mountPath) && (usageLoading || usageFetching)}
          onOpenCategory={(segment) => {
            if (segment.path) reveal.mutate(segment.path)
          }}
        />

        <StorageInsightsSection
          largeTotalBytes={largeTotalBytes}
          duplicateWasteBytes={duplicateWasteBytes}
          largeLoading={largeLoading}
          duplicatesLoading={duplicatesLoading}
          analyzing={isAnalyzing}
          hasDuplicates={duplicates.length > 0}
          onOpenLargeFiles={() => navigate('/storage/large-files')}
          onOpenDuplicates={() => navigate('/storage/duplicates')}
          onCleanup={() => navigate('/cleanup')}
        />
      </div>
    </>
  )
}
