// Measure the rendered bar, including wrapped buttons and inline errors.
export function reserveScrollSpace(element: HTMLElement, property: string) {
  const container = element.closest<HTMLElement>('#main-content')
  if (!container) return () => {}
  const previous = container.style.getPropertyValue(property)
  const measure = () => container.style.setProperty(property, `${Math.ceil(element.getBoundingClientRect().height)}px`)
  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(element)
  return () => {
    observer.disconnect()
    if (previous) container.style.setProperty(property, previous)
    else container.style.removeProperty(property)
  }
}
