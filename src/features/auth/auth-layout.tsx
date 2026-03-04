interface Props {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  return (
    <div className='bg-primary-foreground container grid h-svh max-w-none items-center justify-center overflow-hidden'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-4 px-4 sm:py-8 sm:px-8 sm:w-[480px]'>
        <div className='mb-8 flex items-center justify-center'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='mr-2 h-5 w-5 sm:h-6 sm:w-6'
          >
            <path d='M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3' />
          </svg>
          <h1 className='text-lg sm:text-xl font-medium'> MART POS</h1>
        </div>
        <div className='w-full max-w-full overflow-hidden'>
          {children}
        </div>
      </div>
    </div>
  )
}
