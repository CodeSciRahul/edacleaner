import { bootstrap } from '@main/bootstrap'

bootstrap().catch((error) => {
  console.error('Failed to bootstrap application:', error)
  process.exit(1)
})
