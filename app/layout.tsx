import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import AuthProvider from '@/providers/auth-provider'
import QueryProvider from '@/providers/query-provider'
import { Toaster } from 'sonner'
import { FaviconInjector } from '@/components/layout/FaviconInjector'
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar'
import { ErrorBoundary } from '@/components/error-boundary'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Nexus Banking CRM',
  description: 'Nền tảng quản lý khách hàng ngân hàng',
  applicationName: 'Nexus Banking CRM',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nexus CRM',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#006b68',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        <QueryProvider>
          <ErrorBoundary>
            <AuthProvider>
              <Toaster richColors position="top-right" />
              <FaviconInjector />
              <ServiceWorkerRegistrar />
              {children}
            </AuthProvider>
          </ErrorBoundary>
        </QueryProvider>
      </body>
    </html>
  )
}
