import {
    Sidebar,
    SidebarContent,
    // SidebarFooter,
    SidebarHeader,
    SidebarRail,
  } from '@/components/ui/sidebar'
  import { NavGroup } from '@/components/layout/nav-group'
 
  import { sidebarData } from './data/sidebar-data'
  
  export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
      <Sidebar className='h-[98vh] ' collapsible='icon' variant='floating' {...props}>
        <SidebarHeader>
          {/* Styled branding box with shadcn admin icon and mart pos text only */}
          <div className='flex items-center gap-2 sm:gap-3 p-2 bg-sidebar-primary text-sidebar-primary-foreground rounded-lg shadow-sm'>
            <img src='/images/favicon.svg' alt='Mart POS icon' className='h-6 w-6 sm:h-6 sm:w-6 rounded-md border flex-shrink-0' />
            <span className='truncate font-semibold text-sm sm:text-base'>Mart POS</span>
          </div>
        </SidebarHeader>
        <SidebarContent className='overflow-y-auto'>
          {sidebarData.navGroups.map((props) => (
            <NavGroup key={props.title} {...props} />
          ))}
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    )
  }