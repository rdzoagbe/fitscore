export const LANGUAGE_LABELS = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', pt: 'Portuguese', it: 'Italian', nl: 'Dutch' }

const LANGUAGE_MARKERS = {
  en: ['the','and','with','your','you','our','this','that','from','have','will','are','for','team','experience','requirements','responsibilities','role','skills','about','join','looking','years','strong'],
  fr: ['le','la','les','des','vous','nous','votre','notre','pour','dans','avec','une','poste','mission','equipe','recherchons','candidat','profil','sein','entreprise','competences','annees','et'],
  es: ['el','la','los','las','de','que','para','con','su','una','somos','equipo','experiencia','requisitos','empresa','trabajo','buscamos','anos','habilidades','y'],
  de: ['der','die','das','und','sie','mit','fur','ein','eine','wir','ihre','unternehmen','erfahrung','anforderungen','suchen','aufgaben','kenntnisse','jahre'],
  pt: ['o','a','os','as','de','que','para','com','uma','voce','equipe','experiencia','requisitos','empresa','trabalho','somos','procuramos','anos','habilidades','e'],
  it: ['il','la','le','gli','di','che','per','con','una','sei','esperienza','requisiti','azienda','cerchiamo','lavoro','competenze','anni'],
  nl: ['het','een','en','van','voor','met','je','jouw','wij','ons','ervaring','vereisten','bedrijf','baan','zoeken','vaardigheden','jaar']
}

export function detectLanguage(text = '') {
  const words = String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length < 20) return { code: 'unknown', label: null }

  let best = { code: 'unknown', score: 0 }
  for (const [code, markers] of Object.entries(LANGUAGE_MARKERS)) {
    const markerSet = new Set(markers)
    const score = words.reduce((sum, word) => sum + (markerSet.has(word) ? 1 : 0), 0)
    if (score > best.score) best = { code, score }
  }

  if (best.score < 4 || best.score / words.length < 0.015) return { code: 'unknown', label: null }
  return { code: best.code, label: LANGUAGE_LABELS[best.code] }
}
