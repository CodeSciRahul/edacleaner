import { featureSections } from '@/features/sections/feature-sections'
import { FeatureHub } from '@/components/navigation/FeatureHub'

interface FeatureSectionPageProps {
  sectionId: keyof typeof featureSections
}

export function FeatureSectionPage({ sectionId }: FeatureSectionPageProps): React.ReactElement {
  const section = featureSections[sectionId]
  return <FeatureHub section={section} />
}
