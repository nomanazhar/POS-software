import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/brands')({
  component: lazy(() => import('@/features/brands')),
})
