export function generateSelector(element) {
  if (element.id && !element.id.match(/^\d/)) {
    return { selector: `#${element.id}`, strategy: 'id' }
  }

  const testId = element.dataset.testid || element.dataset.id || element.dataset.cy
  if (testId) {
    const attr = element.dataset.testid ? 'data-testid' :
                 element.dataset.id ? 'data-id' : 'data-cy'
    return { selector: `[${attr}="${testId}"]`, strategy: 'data-attr' }
  }

  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) {
    return {
      selector: `${element.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`,
      strategy: 'aria'
    }
  }

  if (element.classList.length > 0) {
    const classes = Array.from(element.classList)
      .filter(c => !c.match(/^(js-|is-|has-)/))
      .slice(0, 3)
      .join('.')
    if (classes) {
      const selector = `${element.tagName.toLowerCase()}.${classes}`
      if (document.querySelectorAll(selector).length === 1) {
        return { selector, strategy: 'class' }
      }
    }
  }

  return { selector: buildPositionalSelector(element), strategy: 'positional' }
}

function buildPositionalSelector(element) {
  const parts = []
  let current = element

  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase()
    const siblings = Array.from(current.parentNode?.children || [])
      .filter(s => s.tagName === current.tagName)
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1
      part += `:nth-of-type(${index})`
    }
    parts.unshift(part)
    current = current.parentElement
  }

  return parts.join(' > ')
}

export function getCoordinates(element) {
  const rect = element.getBoundingClientRect()
  const scrollTop = window.scrollY
  const scrollLeft = window.scrollX

  return {
    coordX: ((rect.left + scrollLeft + rect.width / 2) / document.body.scrollWidth) * 100,
    coordY: ((rect.top + scrollTop + rect.height / 2) / document.body.scrollHeight) * 100
  }
}
