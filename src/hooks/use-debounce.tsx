import { useEffect, useState } from 'react'

/**
 * useDebounce - Debounce a value or callback
 * @param value The value to debounce
 * @param delay Delay in ms
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
} 