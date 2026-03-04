import { createFileRoute } from '@tanstack/react-router'
import QuotationsPage from '@/features/quotations'

export const Route = createFileRoute('/_authenticated/quotations/')({
  component: QuotationsPage,
})

