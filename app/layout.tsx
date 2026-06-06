import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import AuthProvider from '@/providers/auth-provider'
import QueryProvider from '@/providers/query-provider'
import { Toaster } from 'sonner'
import { FaviconInjector } from '@/components/layout/FaviconInjector'
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
              {children}
            </AuthProvider>
          </ErrorBoundary>
        </QueryProvider>
      </body>
    </html>
  )
}
