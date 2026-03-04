import { createFileRoute } from '@tanstack/react-router'
// import { Header } from '@/components/layout/header'
// import { Main } from '@/components/layout/main'
// import { ProfileDropdown } from '@/components/profile-dropdown'
// import { ThemeSwitch } from '@/components/theme-switch'
import TransactionsPage from '@/features/transactions'

export const Route = createFileRoute('/_authenticated/transactions')({
  component: TransactionsPage,
})

// function TransactionsPageWrapper() {
//   return (
//     <>
//       <Header fixed>
//         <div className="ml-auto flex items-center justify-end space-x-4">
//           <ThemeSwitch />
//           <ProfileDropdown />
//         </div>
//       </Header>
//       <Main>
//         <TransactionsPage />
//       </Main>
//     </>
//   )
// }



 
