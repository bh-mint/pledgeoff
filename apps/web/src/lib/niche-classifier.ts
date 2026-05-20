export type Niche =
  | 'ai_ml' | 'dev_tools' | 'saas_b2b' | 'fintech' | 'ecommerce'
  | 'health' | 'edtech' | 'productivity' | 'marketing' | 'security'
  | 'gaming' | 'social' | 'data' | 'nocode' | 'other';

export const NICHE_LABELS: Record<Niche, string> = {
  ai_ml:        'AI / ML',
  dev_tools:    'Dev Tools',
  saas_b2b:     'SaaS / B2B',
  fintech:      'Fintech',
  ecommerce:    'E-commerce',
  health:       'Health',
  edtech:       'EdTech',
  productivity: 'Productivity',
  marketing:    'Marketing',
  security:     'Security',
  gaming:       'Gaming',
  social:       'Social',
  data:         'Data / Analytics',
  nocode:       'No-code',
  other:        'Other',
};

const RULES: [Niche, RegExp][] = [
  ['ai_ml',        /\b(ai|artificial intelligence|machine learning|llm|gpt|neural|embedding|vector|model|claude|openai|anthropic|generative|nlp|chatbot)\b/i],
  ['dev_tools',    /\b(cli|sdk|api|developer|devex|tooling|ide|debug|testing|ci\/cd|devops|infrastructure|framework|library|open.?source|package|npm|github)\b/i],
  ['fintech',      /\b(fintech|payment|banking|crypto|wallet|invoice|billing|lending|insurance|trading|defi|blockchain|stripe|transaction|finance)\b/i],
  ['ecommerce',    /\b(e.?commerce|marketplace|shop|store|dropshipping|product catalog|shopify|woocommerce|checkout|inventory|vendor|retail)\b/i],
  ['health',       /\b(health|wellness|fitness|medical|telemedicine|mental health|therapy|doctor|patient|clinic|pharma|nutrition|diet|workout)\b/i],
  ['edtech',       /\b(education|learning|course|tutoring|skill|training|school|student|teacher|curriculum|e.?learning|mooc|quiz|flashcard)\b/i],
  ['security',     /\b(security|privacy|auth|encryption|compliance|cybersecurity|soc2|gdpr|2fa|password|vulnerability|penetration|zero.?trust)\b/i],
  ['gaming',       /\b(game|gaming|virtual|metaverse|esport|steam|unity|unreal|player|multiplayer|rpg|simulation)\b/i],
  ['social',       /\b(social|community|network|forum|chat|messaging|feed|follow|creator|influencer|newsletter|discord|slack)\b/i],
  ['data',         /\b(data|analytics|bi|business intelligence|dashboard|visualization|pipeline|etl|warehouse|dbt|sql|metrics|reporting)\b/i],
  ['nocode',       /\b(no.?code|low.?code|builder|drag.?and.?drop|visual|zapier|make\.com|airtable|bubble|webflow|template)\b/i],
  ['marketing',    /\b(marketing|seo|content|social media|growth|ads|campaign|email|copywriting|funnel|conversion|landing page|affiliate)\b/i],
  ['productivity', /\b(productivity|task|project management|notes|time tracking|calendar|todo|kanban|notion|obsidian|workflow|automation|reminder)\b/i],
  ['saas_b2b',     /\b(saas|b2b|enterprise|software as a service|crm|erp|dashboard|subscription|multi.?tenant|white.?label|reseller|agency)\b/i],
];

export function classifyNiche(ideaText: string): Niche {
  for (const [niche, pattern] of RULES) {
    if (pattern.test(ideaText)) return niche;
  }
  return 'other';
}
