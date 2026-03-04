import { createFileRoute } from '@tanstack/react-router'
import BillsPage from '@/features/bills'

export const Route = createFileRoute('/_authenticated/bills/')({
  component: BillsPage,
}) 