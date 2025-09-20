const path = require('path');

const searchableTypes = [
  'post', 'about', 'curriculum', 'tribe', 'transfer', 'feed',
  'votes', 'vote', 'report', 'task', 'event', 'bookmark', 'document',
  'image', 'audio', 'video', 'market', 'forum', 'job', 'project',
  'contact', 'pub', 'pixelia', 'bankWallet', 'bankClaim', 'aiExchange'
];

const clip = (s, n) => String(s || '').slice(0, n);
const squash = s => String(s || '').replace(/\s+/g, ' ').trim();
const compact = s => squash(clip(s, 160));

function fieldsForSnippet(type, c) {
  switch (type) {
    case 'aiExchange': return [c?.question, clip(squash(c?.answer || ''), 120)];
    case 'post': return [c?.text, ...(c?.tags || [])];
    case 'about': return [c?.about, c?.name, c?.description];
    case 'curriculum': return [c?.name, c?.description, c?.location];
    case 'tribe': return [c?.title, c?.description, ...(c?.tags || [])];
    case 'transfer': return [c?.from, c?.to, String(c?.amount), c?.status];
    case 'feed': return [c?.text, ...(c?.tags || [])];
    case 'votes': return [c?.question, c?.status];
    case 'vote': return [c?.vote?.link, String(c?.vote?.value)];
    case 'report': return [c?.title, c?.severity, c?.status];
    case 'task': return [c?.title, c?.status];
    case 'event': return [c?.title, c?.date, c?.location];
    case 'bookmark': return [c?.url, c?.description];
    case 'document': return [c?.title, c?.description];
    case 'image': return [c?.title, c?.description];
    case 'audio': return [c?.title, c?.description];
    case 'video': return [c?.title, c?.description];
    case 'market': return [c?.title, String(c?.price), c?.status];
    case 'forum': return [c?.title, c?.category, c?.text];
    case 'job': return [c?.title, c?.job_type, String(c?.salary), c?.status];
    case 'project': return [c?.title, c?.status, String(c?.progress)];
    case 'contact': return [c?.contact];
    case 'pub': return [c?.address?.key, c?.address?.host];
    case 'pixelia': return [c?.author];
    case 'bankWallet': return [c?.address];
    case 'bankClaim': return [String(c?.amount), c?.epochId, c?.txid];
    default: return [];
  }
}

async function publishExchange({ q, a, ctx = [], tokens = {} }) {
  // NOTE: Esta función requiere acceso al cliente SSB
  // Por ahora retornamos un placeholder hasta que se configure correctamente
  console.log('publishExchange: Función no implementada - requiere cliente SSB');
  
  const content = {
    type: 'aiExchange',
    question: clip(String(q || ''), 2000),
    answer: clip(String(a || ''), 5000),
    ctx: ctx.slice(0, 12).map(s => clip(String(s || ''), 800)),
    timestamp: Date.now()
  };

  // Placeholder hasta que se configure correctamente con cooler
  return Promise.resolve({ success: false, reason: 'SSB client not available' });
}

async function buildContext(maxItems = 100) {

  const context = "";
  return `[CONTEXT]${context}[/CONTEXT]`;

}

module.exports = { fieldsForSnippet, buildContext, clip, publishExchange };

