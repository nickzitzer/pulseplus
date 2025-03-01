import '../styles/globals.css'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  // This helps with hydration issues
  useEffect(() => {
    // This forces a client-side update after initial render
    // which can help resolve hydration mismatches
    const timer = setTimeout(() => {
      const event = new Event('resize')
      window.dispatchEvent(event)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  return <Component {...pageProps} />
} 