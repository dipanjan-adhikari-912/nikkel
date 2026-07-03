export const metadata = {
  title: 'Nikkel',
  description: 'Website annotation and feedback platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <style>{`@keyframes nikkel-spin{to{transform:rotate(360deg)}}`}</style>
      </head>
      <body style={{
        margin: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {children}
      </body>
    </html>
  )
}
