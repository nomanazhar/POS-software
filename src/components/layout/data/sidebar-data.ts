import {
  IconBrandReact,
  IconChecklist,
  IconHelp,
  IconLayoutDashboard,
  // IconLockAccess,
  IconPackages,
  IconPalette,
  IconSettings,
  IconUserCog,
  IconUsers,
  IconCash,
} from '@tabler/icons-react'
import { AudioWaveform, Command, GalleryVerticalEnd } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Noman Azhar',
    email: 'nomanazhar@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Shadcn Admin',
      logo: Command,
      plan: 'Vite + ShadcnUI',
    },
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Navigations',
          url: '/navigations',
          icon: IconLayoutDashboard,
        },
        {
          title: 'Dashboard',
          url: '/',
          icon: IconLayoutDashboard,
        },
        {
          title: 'Sale POS',
          url: '/sales',
          icon: IconCash,
        },
        {
          title: 'Bills',
          url: '/bills',
          icon: IconChecklist,
        },
        { 
          title: 'Purchases',
          url: '/purchases',
          icon: IconPackages,
        },
        {
          title: 'Quotations',
          url: '/quotations',
          icon: IconChecklist,
        },
        {
          title: 'Inventory',
          url: '/inventory',
          icon: IconChecklist,
        },
        {
          title: 'Products',
          url: '/products',
          icon: IconPackages,
        },
        {
          title: 'Categories',
          url: '/categories',
          icon: IconPackages,
        },
        {
          title: 'Brands',
          url: '/brands',
          icon: IconBrandReact,
        },
        {
          title: 'Transactions',
          url: '/transactions',
          icon: IconCash,
        },
        {
          title: 'Accounts',
          url: '/accounts',
          icon: IconUsers,
        }
      ],
    },
    // {
    //   title: 'Pages',
    //   items: [
    //     {
    //       title: 'Auth',
    //       icon: IconLockAccess,
    //       items: [
    //         {
    //           title: 'Sign In',
    //           url: '/sign-in',
    //         },
    //         {
    //           title: 'Forgot Password',
    //           url: '/forgot-password',
    //         },
    //       ],
    //     },
    //   ],
    // },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: IconSettings,
          items: [
            {
              title: 'Users',
              url: '/users',
              icon: IconUsers,
            },
            {
              title: 'Profile',
              url: '/settings',
              icon: IconUserCog,
            },
            {
              title: 'Appearance',
              url: '/settings/appearance',
              icon: IconPalette,
            },
          ],
        },
        {
          title: 'Help Center',
          url: '/help-center',
          icon: IconHelp,
        },
      ],
    },
  ],
}