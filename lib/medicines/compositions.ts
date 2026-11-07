import { catalogHash, strengthText } from './brand'
// Split only explicit top-level source separators; retain parenthesized salt names.
export function sourceCompositions(text: string, formText: string) {
  let value = text.trim()
  if (formText && value.toLowerCase().endsWith(formText.toLowerCase())) value = value.slice(0, -formText.length).trim()
  const segments: string[] = []; let start = 0, depth = 0
  for (let i=0; i<value.length; i++) {
    if (value[i]==='(') depth++
    if (value[i]===')') depth = Math.max(0, depth-1)
    const separator = depth === 0 ? /^ (?:and|\+) /u.exec(value.slice(i))?.[0] : null
    if (separator) { segments.push(value.slice(start,i).trim()); i += separator.length-1; start=i+1 }
  }
  segments.push(value.slice(start).trim())
  return segments.filter(Boolean).map(segment => {
    const strength = strengthText(segment)
    const position = strength ? segment.indexOf(strength) : -1
    const genericName = position > 0 ? segment.slice(0,position).trim() : segment
    return { id: `composition_${catalogHash([genericName.toLowerCase(), strength || ''])}`, genericName, strengthText: strength || '' }
  })
}
