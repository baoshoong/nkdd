import type { Metadata } from 'next'
import { Inter, Geist } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Báo cáo Điều dưỡng | Bệnh viện Đa khoa Khánh Hội',
  description: 'Hệ thống báo cáo NKDD',
  icons: { icon: '/logo.png' }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning className={cn("h-full", inter.variable, "font-sans", geist.variable)}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var theme = localStorage.getItem('nkdd_theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch(e) {}
            })();`
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#edeef5] dark:bg-[#0F1021] text-[#1f2050] dark:text-[#F0F1F9] antialiased font-sans transition-colors duration-200">
        {children}
      </body>
    </html>
  )
}
