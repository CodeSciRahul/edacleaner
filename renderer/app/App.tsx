import { AppProviders } from '@/providers/AppProviders'
import { AppRouter } from '@/routes/AppRouter'

export function App(): React.ReactElement {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}
