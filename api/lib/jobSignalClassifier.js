export const REFUS_KW = [
  'unfortunately','not moving forward','not selected','not a fit','not the right fit','have decided not','unable to move forward','no longer moving','we regret','after careful consideration','decided to move forward with other','position has been filled','not proceed','not progressing','not shortlisted','unsuccessful','not successful','pas retenu','pas donner suite','regrettons','négative','rejetée','nous ne sommes pas en mesure','ne correspond pas','sans suite',"n'avons pas retenu",'ne donnera pas suite','ne souhaitons pas poursuivre',"n'avons pas pu retenir",'porter notre choix sur','profil ne correspond',"vous informer que votre candidature n'a pas",'décision finale',"avons retenu d'autres",'ne pas retenir',"n'est pas retenue",'retour négatif','réponse négative','malheureusement','nous ne donnerons pas suite','nous ne poursuivrons pas'
]

export const ENTRETIEN_KW = [
  'interview','entretien','visio','phone screen','rendez-vous','rendezvous','video call','zoom call','teams meeting','google meet','schedule a call','scheduleonce','calendly','discuter de votre candidature','appel téléphonique','entretien téléphonique','prise de contact','screening','recruiter call','hiring manager','visioconférence','disponibilités','availability'
]

export const EN_COURS_KW = [
  'reviewing your application','under review',"en cours d'examen",'à l’étude',"à l'étude",'shortlisted','présélectionné','étudier votre candidature','intéressés par votre profil','souhaitons poursuivre','pleased to inform','next steps','we received your application','nous avons bien reçu','application received','candidature reçue','candidature bien reçue','thank you for applying','merci pour votre candidature','we are pleased','moving forward','présélection','in progress','en cours','being reviewed'
]

export const OFFER_KW = [
  'offer','job offer','offre','proposition','contrat','contract','compensation package','salary proposal','proposition salariale','promesse d’embauche','promesse d\'embauche'
]

export const CALENDAR_INTERVIEW_KW = [
  'interview','entretien','recruit','screening','hr call','hiring','talent','recruiter','visio','appel','candidature','teams','zoom','google meet','meet'
]

export const NOISE_SUBJECT_PATTERNS = [
  /^"?information technology/i,/job alert/i,/alerte emploi/i,/offre recommandée/i,/recommended jobs/i,/vos alertes/i,/newsletter/i,/apply now to /i,/reactivate premium/i,/premium today/i,/premium career/i,/uninterrupted access to your linkedin/i,/looking for a new job\?/i,/your \d{4} event recap/i,/mit weekly/i,/business insider/i,/forbes via/i,/le figaro via/i,/agile clinic/i,/genai works/i,/cyber security hub/i,/massachusetts institute/i,/google cloud via/i,/crossover via/i,/agent d'entretien/i,/un poste comme agent/i,/emplois pour paris/i,/recap is ready/i,/impressions last week/i,/posts got \d+/i,/tinder/i,/hot millennial/i,/infrastructure redefined/i,/threat actors/i,/phishing/i,/cancel.*premium/i,/accepted your invitation/i,/just messaged you/i,/is waiting for your response/i,/wanted to connect on linkedin/i
]

export const SENDER_PLATFORM_MAP = [
  ['linkedin','LinkedIn'],['apec.fr','APEC'],['apec','APEC'],['hellowork','HelloWork'],['cadremploi','Cadremploi'],['cadreemploi','Cadremploi'],['welcometothejungle','Welcome to the Jungle'],['wttj','Welcome to the Jungle'],['builtin','Built In'],['indeed','Indeed'],['glassdoor','Glassdoor'],['monster','Monster'],['talent.io','Talent.io'],['jobteaser','JobTeaser'],['meteojob','Meteojob'],['regionsjob','RegionsJob'],['francetravail','France Travail'],['france-travail','France Travail'],['pole-emploi','France Travail'],['pole.emploi','France Travail'],['emploipublic','Emploi Public'],['michael page','Michael Page'],['morgan philips','Morgan Philips'],['lhh','LHH'],['greenhouse','Direct (ATS)'],['workable','Direct (ATS)'],['myworkday','Direct (ATS)'],['icims','Direct (ATS)'],['smartrecruiters','Direct (ATS)'],['lever.co','Direct (ATS)'],['amazon.jobs','Amazon Jobs']
]

export function clean(value, max = 9999) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

export function containsAny(text, keywords) {
  const lower = String(text || '').toLowerCase()
  return keywords.some(keyword => lower.includes(keyword.toLowerCase()))
}

export function isNoiseSubject(subject = '') {
  return NOISE_SUBJECT_PATTERNS.some(pattern => pattern.test(subject))
}

export function parseFromHeader(fromValue = '') {
  const raw = String(fromValue || 'Unknown')
  const match = raw.match(/<(.*?)>/)
  if (match) return { name: clean(raw.split('<')[0].replace(/^"|"$/g, ''), 80), email: clean(match[1], 120) }
  return { name: clean(raw.replace(/^"|"$/g, ''), 80), email: clean(raw, 120) }
}

export function detectPlatform(senderName = '', senderEmail = '') {
  const combined = `${senderName} ${senderEmail}`.toLowerCase()
  const hit = SENDER_PLATFORM_MAP.find(([keyword]) => combined.includes(keyword))
  return hit ? hit[1] : 'Direct / Other'
}

export function classifyStatus(subject = '', snippet = '', body = '') {
  const combined = `${subject} ${snippet} ${body}`.toLowerCase()
  if (containsAny(combined, REFUS_KW)) return { status: 'rejected', label: 'Rejected', eventType: 'rejection', confidence: 0.88 }
  if (containsAny(combined, OFFER_KW)) return { status: 'offer', label: 'Offer', eventType: 'offer_signal', confidence: 0.86 }
  if (containsAny(combined, ENTRETIEN_KW)) return { status: 'interview', label: 'Interview', eventType: 'interview_scheduled', confidence: 0.86 }
  if (containsAny(combined, EN_COURS_KW)) return { status: 'applied', label: 'In progress', eventType: 'application_confirmed', confidence: 0.78 }
  return { status: 'sent', label: 'Sent', eventType: 'application_signal', confidence: 0.58 }
}

export function extractCompany(senderName = '', senderEmail = '', subject = '') {
  const cleaned = clean(senderName.replace(/\b(team|recruiting|careers|no-?reply|support|talent acquisition|talent|hr|jobs?|notifications?)\b/gi, '').replace(/[\-_,]+/g, ' '), 80)
  if (cleaned.length >= 3 && !['notifications','noreply','no reply','gmail','outlook','linkedin'].includes(cleaned.toLowerCase())) return cleaned
  const match = subject.match(/(?:at|chez)\s+([A-Z][\w&'\- ]{2,40})/)
  if (match) return clean(match[1].replace(/[\-_,]+$/g, ''), 80)
  const domain = senderEmail.includes('@') ? senderEmail.split('@').pop() : senderEmail
  const root = String(domain || '').split('.')[0]
  return root ? root.charAt(0).toUpperCase() + root.slice(1) : 'Unknown'
}

export function decodeBase64Url(value = '') {
  try {
    const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(normalized + '='.repeat((4 - normalized.length % 4) % 4), 'base64').toString('utf8')
  } catch { return '' }
}

export function extractGmailBody(payload = {}) {
  const mime = payload.mimeType || ''
  const data = payload.body?.data || ''
  if (mime === 'text/plain' && data) return decodeBase64Url(data)
  if (mime === 'text/html' && data) return decodeBase64Url(data).replace(/<[^>]+>/g, ' ')
  const parts = payload.parts || []
  const plain = parts.find(part => part.mimeType === 'text/plain')
  if (plain) {
    const value = extractGmailBody(plain)
    if (value.trim()) return value
  }
  for (const part of parts) {
    const value = extractGmailBody(part)
    if (value.trim()) return value
  }
  return ''
}

export function cleanBody(raw = '', maxChars = 2200) {
  const lines = String(raw || '').split(/\r?\n/).map(line => line.trim()).filter(line => {
    if (line.length < 3) return false
    return !/(unsubscribe|se désabonner|click here|cliquez ici|privacy policy|politique de confidentialité|view in browser|voir dans le navigateur)/i.test(line)
  })
  const body = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return body.length > maxChars ? `${body.slice(0, maxChars)}\n[…truncated]` : body
}

export function eventIsInterview(summary = '', description = '', location = '', attendees = '') {
  const haystack = `${summary} ${description} ${location} ${attendees}`.toLowerCase()
  return containsAny(haystack, CALENDAR_INTERVIEW_KW)
}

export function confidenceLabel(confidence = 0) {
  if (confidence >= 0.82) return 'High confidence'
  if (confidence >= 0.65) return 'Needs confirmation'
  return 'Low confidence'
}

export function simpleSummary(signal, classification) {
  const subject = clean(signal.subject || signal.eventTitle || 'Job signal', 140)
  const status = classification?.label || 'Job update'
  const action = classification?.eventType === 'follow_up_needed' ? 'Suggested action: reply or confirm availability.' : classification?.eventType === 'interview_scheduled' ? 'Suggested action: prepare for the interview and verify the calendar time.' : classification?.eventType === 'rejection' ? 'No action required unless you want to follow up.' : 'Suggested action: review the original message.'
  return `${status}: ${subject}. ${action}`
}

export function buildGmailQuery(searchAfter = '2025/01/01') {
  return `after:${searchAfter} (subject:("your application was sent" OR "votre candidature" OR "your application" OR "candidature sur offre" OR "réponse à votre candidature" OR "suite à votre candidature" OR "merci pour votre candidature" OR "thank you for applying" OR "thanks for applying" OR "nous avons bien reçu votre candidature" OR "application received" OR "bien reçu votre candidature" OR "your application was viewed" OR "votre candidature nous est bien parvenue" OR "accusé de réception" OR "votre candidature est arrivée") OR from:no-reply@apec.fr OR from:hellowork OR from:cadremploi OR from:welcometothejungle OR from:builtin.com OR subject:(entretien OR interview OR "pas retenu" OR unfortunately OR regrettons OR availability OR disponibilités OR "next steps"))`
}
