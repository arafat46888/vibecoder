export interface Template {
  id: string
  name: string
  category: 'Business' | 'Store' | 'Personal'
  emoji: string
  gradient: string
  prompt: string
}

export const SUGGESTIONS: string[] = [
  'Solar system explorer with animated orbiting planets',
  'Portfolio site for a photographer',
  'Restaurant menu with categories and prices',
  'Pomodoro timer with statistics',
  'Kanban board with drag & drop',
  'Recipe finder card gallery',
]

export const TEMPLATES: Template[] = [
  {
    id: 'solar',
    name: 'Solar System',
    category: 'Personal',
    emoji: '🪐',
    gradient: 'linear-gradient(135deg,#1e1b4b,#4c1d95)',
    prompt:
      'An interactive solar system: the sun in the center with 8 planets orbiting at different speeds using CSS/JS animation. Clicking a planet shows an info card with fun facts. Dark space background with stars.',
  },
  {
    id: 'portfolio',
    name: 'Photographer Portfolio',
    category: 'Personal',
    emoji: '📷',
    gradient: 'linear-gradient(135deg,#0f172a,#334155)',
    prompt:
      'A minimal portfolio website for a photographer: hero section with name and tagline, a responsive gallery grid (use CSS gradients as placeholder images), an about section, and a contact form. Elegant serif headings.',
  },
  {
    id: 'restaurant',
    name: 'Restaurant Menu',
    category: 'Business',
    emoji: '🍝',
    gradient: 'linear-gradient(135deg,#451a03,#92400e)',
    prompt:
      'A warm, appetizing restaurant menu page for an Italian bistro: category tabs (Starters, Mains, Desserts, Drinks) that filter items via JS, dish names with descriptions and prices, and a reservation CTA button.',
  },
  {
    id: 'store',
    name: 'Sneaker Store',
    category: 'Store',
    emoji: '👟',
    gradient: 'linear-gradient(135deg,#052e16,#166534)',
    prompt:
      'A modern single-page sneaker store: product grid with cards (name, price, size selector), add-to-cart buttons, a cart drawer that lists items with quantities and a total, persisted with localStorage.',
  },
  {
    id: 'dashboard',
    name: 'SaaS Dashboard',
    category: 'Business',
    emoji: '📊',
    gradient: 'linear-gradient(135deg,#0c4a6e,#075985)',
    prompt:
      'A clean analytics dashboard mockup: sidebar navigation, KPI stat cards, a bar chart drawn with pure CSS/canvas from sample data, and a recent activity table. Light theme with subtle shadows.',
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro Timer',
    category: 'Personal',
    emoji: '⏱️',
    gradient: 'linear-gradient(135deg,#7f1d1d,#b91c1c)',
    prompt:
      'A pomodoro focus timer: large circular countdown, start/pause/reset, automatic switch between 25-min work and 5-min break sessions, session counter, and a pleasant red theme.',
  },
  {
    id: 'travel',
    name: 'Travel Agency Landing',
    category: 'Business',
    emoji: '✈️',
    gradient: 'linear-gradient(135deg,#164e63,#0e7490)',
    prompt:
      'A travel agency landing page: full-width hero with search-like destination picker, three featured destination cards (CSS gradient imagery), testimonials carousel with JS, and a newsletter signup footer.',
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    category: 'Business',
    emoji: '🗂️',
    gradient: 'linear-gradient(135deg,#312e81,#4338ca)',
    prompt:
      'A kanban task board with three columns (To Do, In Progress, Done). Support adding tasks via an input, deleting them, and drag-and-drop between columns using the HTML5 drag API. Save state to localStorage.',
  },
  {
    id: 'coffee',
    name: 'Coffee Shop',
    category: 'Store',
    emoji: '☕',
    gradient: 'linear-gradient(135deg,#3f2a1d,#78543a)',
    prompt:
      'A cozy coffee shop homepage: hero with opening hours, a drink menu with prices and badges (vegan, seasonal), an interactive "build your latte" size/milk/syrup picker that computes the price, and a location footer.',
  },
  {
    id: 'budget',
    name: 'Budget Tracker',
    category: 'Personal',
    emoji: '💰',
    gradient: 'linear-gradient(135deg,#14532d,#15803d)',
    prompt:
      'A personal budget tracker: add income/expense entries with categories, see running balance and per-category totals, a simple canvas donut chart of spending, all stored in localStorage.',
  },
  {
    id: 'wedding',
    name: 'Wedding Invitation',
    category: 'Personal',
    emoji: '💍',
    gradient: 'linear-gradient(135deg,#831843,#be185d)',
    prompt:
      'An elegant wedding invitation page: couple names in script-style typography, date and venue details, a countdown timer to the wedding day, schedule of events, and an RSVP form (client-side confirmation only).',
  },
  {
    id: 'headphones',
    name: 'Headphones Product Page',
    category: 'Store',
    emoji: '🎧',
    gradient: 'linear-gradient(135deg,#111827,#374151)',
    prompt:
      'A premium product landing page for noise-cancelling headphones: sticky nav, big hero with CSS-drawn headphone illustration, feature sections with scroll-reveal animations, spec table, and buy CTA.',
  },
]

export const CATEGORIES = ['All', 'Business', 'Store', 'Personal'] as const
