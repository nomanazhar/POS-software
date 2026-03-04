import { createFileRoute } from '@tanstack/react-router'
import NavigationsPage from '@/features/navigations'

export const Route = createFileRoute('/_authenticated/navigations/')({
  component: NavigationsPage,
})


