import type { Metadata, Viewport } from 'next'
import { Inter, DM_Mono, Instrument_Serif } from 'next/font/google'
import { PreferencesProvider } from '@/components/system/PreferencesProvider'
import { ServiceWorkerReset } from '@/components/system/ServiceWorkerReset'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' })
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-mono', display: 'swap' })
const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: ['400'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' })

export const metadata: Metadata = {
  title: 'Joblytics AI — Job Search Cockpit',
  description: 'AI-powered job search cockpit for CV scoring, job tracking, cover letters, interviews and France Travail IPR export.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://joblytics-ai.com')
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable} ${instrumentSerif.variable}`} data-theme="dark" data-language="en">
      <body>
        <PreferencesProvider />
        <ServiceWorkerReset />
        {children}
      </body>
    </html>
  )
}
