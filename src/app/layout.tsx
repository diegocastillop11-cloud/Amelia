import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Amelia — Tu sitio web con IA',
  description: 'Constructor de sitios web para pequeños negocios, potenciado por IA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* Aplica el tema guardado antes del primer render para evitar flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('amelia-theme');
            if (t && t !== 'dark') document.documentElement.setAttribute('data-theme', t);
          })();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
