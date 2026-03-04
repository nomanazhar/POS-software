import { useState } from 'react';
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from '@/components/ui/star'
import { Link } from '@tanstack/react-router'
import { 
  IconChecklist, 
  IconHelp, 
  IconLayoutDashboard, 
  IconPackages, 
  IconPalette, 
  IconSettings, 
  IconUserCog, 
  IconUsers, 
  IconCash 
} from '@tabler/icons-react'
import { AudioWaveform, Command, GalleryVerticalEnd } from 'lucide-react'
import B1080 from '../../assets/B1080.jpg'
import { JSX } from 'react'
// import A1920 from '../../assets/A1920.jpg'

type FeatureLink = {
  title: string
  url: string
  style?: string
  icon: JSX.Element
}

const featureLinks: FeatureLink[] = [
  { 
    title: 'Dashboard', 
    url: '/', 
    style: 'bg-[#293241]',
    icon: <IconLayoutDashboard className="h-4 w-4" />
  },
  { 
    title: 'Sale POS', 
    url: '/sales',
    style: 'bg-[#0F8D08]',
    icon: <IconCash className="h-4 w-4" />
  },
  { 
    title: 'Bills', 
    url: '/bills',
    style: 'bg-[#D02C2B]',
    icon: <IconChecklist className="h-4 w-4" />
  },
  { 
    title: 'Purchases', 
    url: '/purchases',
    style: 'bg-[#009DDC]',
    icon: <IconPackages className="h-4 w-4" />
  },
  { 
    title: 'Quotations', 
    url: '/quotations',
    style: 'bg-[#374E54]',
    icon: <IconChecklist className="h-4 w-4" />
  },
  { 
    title: 'Inventory', 
    url: '/inventory',
    style: 'bg-[#473462]',
    icon: <IconChecklist className="h-4 w-4" />
  },
  { 
    title: 'Products', 
    url: '/products',
    style: 'bg-[#6B4B3E]',
    icon: <IconPackages className="h-4 w-4" />
  },
  { 
    title: 'Categories', 
    url: '/categories',
    style: 'bg-[#0092A1]',
    icon: <IconPackages className="h-4 w-4" />
  },
  { 
    title: 'Transactions', 
    url: '/transactions',
    style: 'bg-[#136070]',
    icon: <IconCash className="h-4 w-4" />
  },
  { 
    title: 'Accounts', 
    url: '/accounts',
    style: 'bg-[#293241]',
    icon: <IconUsers className="h-4 w-4" />
  },
  { 
    title: 'Users', 
    url: '/users',
    style: 'bg-[#EE6B4D]',
    icon: <IconUserCog className="h-4 w-4" />
  },
  { 
    title: 'Settings', 
    url: '/settings',
    style: 'bg-[#DC4E80]',
    icon: <IconSettings className="h-4 w-4" />
  },
  // { 
  //   title: 'Help Center', 
  //   url: '/help-center',
  //   icon: <IconHelp className="h-4 w-4" />
  // },
]

export default function NavigationsPage() {
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    // Load favorites from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('navigationFavorites');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const toggleFavorite = (url: string) => {
    const newFavorites = {
      ...favorites,
      [url]: !favorites[url]
    };
    setFavorites(newFavorites);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('navigationFavorites', JSON.stringify(newFavorites));
    }
  };
  return (
    <>
      <Header>
        <div className='ml-auto flex items-center justify-end space-x-2 sm:space-x-4 flex-shrink-0'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className='mb-4 flex items-center justify-between'>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight underline'>Navigations</h1>
        </div>
        <div className='grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
          {featureLinks.map((feature) => (
            <Link key={feature.url} to={feature.url} preload='intent'>
              <Card className={`p-2 sm:p-3 hover:shadow-md transition-all cursor-pointer h-full text-white ${feature.style} hover:scale-[1.02] group`}>
                <CardHeader className='pb-2 flex flex-row items-center justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-white/20 rounded-lg'>
                      {feature.icon}
                    </div>
                    <CardTitle className='text-xl'>{feature.title}</CardTitle>
                  </div>
                  <Star 
                    isFavorite={!!favorites[feature.url]} 
                    onClick={() => toggleFavorite(feature.url)}
                    className='opacity-100 group-hover:opacity-100 transition-opacity'
                  />
                </CardHeader>
                <CardContent>
                  <div className='text-white/80 text-xs'>Go to {feature.title}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className='my-4 flex fixed bottom-2 items-center justify-between  h-[30%] w-[85%] mx-auto'>
          <img src={B1080} alt="MartPOS" className="w-full h-full object-contain" />
        </div>
      </Main>
    </>
  )
}


