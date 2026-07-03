import './globals.css'

export const metadata = {
  title: 'Nikkel',
  description: 'Website annotation and feedback platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`@keyframes nikkel-spin{to{transform:rotate(360deg)}}`}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
