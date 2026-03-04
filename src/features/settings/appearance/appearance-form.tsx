import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { fonts } from '@/config/fonts'
import { cn } from '@/lib/utils'
import { showSubmittedData } from '@/utils/show-submitted-data'
import { useFont } from '@/context/font-context'
import { useTheme } from '@/context/theme-context'
import { useCurrency, currencyConfig } from '@/context/currency-context'
import { useTax } from '@/context/tax-context'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { DatabaseExportImport } from '../components/database-export-import'

const appearanceFormSchema = z.object({
  theme: z.enum(['light', 'dark'], {
    required_error: 'Please select a theme.',
  }),
  font: z.enum(fonts, {
    invalid_type_error: 'Select a font',
    required_error: 'Please select a font.',
  }),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'PKR'], {
    required_error: 'Please select a currency.',
  }),
  salesTaxRate: z.number().min(0).max(100, {
    message: 'Sales tax rate must be between 0 and 100 percent.',
  }),
})

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>

export function AppearanceForm() {
  const { font, setFont } = useFont()
  const { theme, setTheme } = useTheme()
  const { currency, setCurrency, formatAmount } = useCurrency()
  const { taxRate, setTaxRate, calculateTax } = useTax()

  // This can come from your database or API.
  const defaultValues: Partial<AppearanceFormValues> = {
    theme: theme as 'light' | 'dark',
    font,
    currency: currency as 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'PKR',
    salesTaxRate: taxRate,
  }

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues,
  })

  function onSubmit(data: AppearanceFormValues) {
    if (data.font != font) setFont(data.font)
    if (data.theme != theme) setTheme(data.theme)
    if (data.currency != currency) setCurrency(data.currency)
    if (data.salesTaxRate != taxRate) setTaxRate(data.salesTaxRate)

    showSubmittedData(data)
  }

  return (
    <div className='h-[60vh] overflow-y-auto'>
    <Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-2 overflow-y-auto grid grid-cols-2 gap-2'>
        <FormField
          control={form.control}
          name='font'
          render={({ field }) => (
            <FormItem>  
              <FormLabel>Font</FormLabel>
              <div className='relative w-max'>
                <FormControl>
                  <select
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-[200px] appearance-none font-normal capitalize',
                      'dark:bg-background dark:hover:bg-background'
                    )}
                    {...field}
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <ChevronDownIcon className='absolute top-2.5 right-3 h-4 w-4 opacity-50' />
              </div>
              <FormDescription className='font-manrope'>
                Set the font you want to use in the dashboard.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='currency'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <div className='relative w-max'>
                <FormControl>
                  <select
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-[200px] appearance-none font-normal',
                      'dark:bg-background dark:hover:bg-background'
                    )}
                    {...field}
                  >
                    {Object.entries(currencyConfig).map(([code, config]) => (
                      <option key={code} value={code}>
                        {config.symbol} {code}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <ChevronDownIcon className='absolute top-2.5 right-3 h-4 w-4 opacity-50' />
              </div>
              <FormDescription>
                Preview: {formatAmount(1234.56)}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='salesTaxRate'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sales Tax Rate (%)</FormLabel>
              <div className='relative w-max'>
                <FormControl>
                  <input
                    type='number'
                    min='0'
                    max='100'
                    step='0.1'
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-[200px] appearance-none font-normal px-3 py-2',
                      'dark:bg-background dark:hover:bg-background'
                    )}
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
              </div>
              <FormDescription>
                Preview: {formatAmount(1000)} + {formatAmount(calculateTax(1000))} tax = {formatAmount(1000 + calculateTax(1000))}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='theme'
          render={({ field }) => (
            <FormItem className='space-y-1'>
              <FormLabel>Theme</FormLabel>
              <FormDescription>
                Select the theme for the dashboard.
              </FormDescription>
              <FormMessage />
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className='grid max-w-md grid-cols-2 gap-8 pt-2'
              >
                <FormItem>
                  <FormLabel className='[&:has([data-state=checked])>div]:border-primary'>
                    <FormControl>
                      <RadioGroupItem value='light' className='sr-only' />
                    </FormControl>
                    <div className='border-muted hover:border-accent items-center rounded-md border-2 p-1'>
                      <div className='space-y-2 rounded-sm bg-[#ecedef] p-2'>
                        <div className='space-y-2 rounded-md bg-white p-2 shadow-xs'>
                          <div className='h-2 w-[80px] rounded-lg bg-[#ecedef]' />
                          <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
                        </div>
                        <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                          <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
                        </div>
                        <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                          <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
                        </div>
                      </div>
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      Light
                    </span>
                  </FormLabel>
                </FormItem>
                <FormItem>
                  <FormLabel className='[&:has([data-state=checked])>div]:border-primary'>
                    <FormControl>
                      <RadioGroupItem value='dark' className='sr-only' />
                    </FormControl>
                    <div className='border-muted bg-popover hover:bg-accent hover:text-accent-foreground items-center rounded-md border-2 p-1'>
                      <div className='space-y-2 rounded-sm bg-slate-950 p-2'>
                        <div className='space-y-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                          <div className='h-2 w-[80px] rounded-lg bg-slate-400' />
                          <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
                        </div>
                        <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-slate-400' />
                          <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
                        </div>
                        <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                          <div className='h-4 w-4 rounded-full bg-slate-400' />
                          <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
                        </div>
                      </div>
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      Dark
                    </span>
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormItem>
          )}
        />

        <Button className='col-span-2 justify-center' type='submit'>Update preferences</Button>
      </form>
      
      <Separator className="my-2" />
      
      <div className="space-y-4 ">
        <div className='p-2'>
          <h3 className="text-lg font-semibold">Database Management</h3>
          <p className="text-sm text-muted-foreground">
            Export your complete database to Excel or import data from Excel files.
          </p>
        </div>
        <DatabaseExportImport />
      </div>
    </Form>
    </div>
  )
}
