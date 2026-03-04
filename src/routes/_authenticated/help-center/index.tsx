import { createFileRoute } from '@tanstack/react-router'
import B1080 from '../../../assets/B1080.jpg'



const HelpCenterPage = () => {
  return (
    <div className=" container mx-auto p-4 space-y-6 flex flex-col items-center justify-between">
      <div className="text-center m-8">
        <h1 className="text-3xl font-bold mb-2">Help Center</h1>
        
      </div>
      <div className='m-8'>
      <p className="text-muted-foreground">Powered by TWC</p>
      <strong className='text-primary'>03041348494 | 0313 7573667</strong></div>
      <div className='my-4 flex items-center justify-between  h-[45%] w-[85%] mx-auto'>
          <img src={B1080} alt="MartPOS" className="w-full h-full object-fill" />
      </div>
           
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/help-center/')({
  component: HelpCenterPage,
})
