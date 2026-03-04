
import { createFileRoute } from '@tanstack/react-router'
import PurchasesPage from '@/features/purchases'

export const Route = createFileRoute('/_authenticated/purchases/')({
  component: PurchasesPage,
})