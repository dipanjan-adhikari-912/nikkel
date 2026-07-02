export async function captureScreenshot(element) {
  element.scrollIntoView({ behavior: 'instant', block: 'center' })
  await new Promise(r => setTimeout(r, 150))

  const canvas = await html2canvas(document.body, {
    useCORS: true,
    allowTaint: true,
    scale: 1,
    logging: false
  })

  const ctx = canvas.getContext('2d')
  const rect = element.getBoundingClientRect()
  const scrollTop = window.scrollY

  ctx.strokeStyle = '#6366f1'
  ctx.lineWidth = 3
  ctx.strokeRect(rect.left, rect.top + scrollTop, rect.width, rect.height)

  return canvas.toDataURL('image/jpeg', 0.8)
}
