// The two live sites from the Renu Bio Health role: the company website and the Royal Canadian store.
// Screenshots were taken in October 2026. The sites are live and may have changed since.
const SITES = [
  {
    kind: 'Company website', name: 'Renu Bio Health', host: 'renubiohealth.com', url: 'https://www.renubiohealth.com/',
    image: 'assets/projects/renu-company-site.jpg', width: 1898, height: 916,
    alt: 'The Renu Bio Health company website, showing its social contribution section.',
    text: 'The corporate site: company story, R&D, social contribution, products and news.',
  },
  {
    kind: 'Online store · Shopify', name: 'Royal Canadian', host: 'royal-canadian.ca', url: 'https://www.royal-canadian.ca/collections/shop-all',
    image: 'assets/projects/renu-royal-canadian-store.jpg', width: 1892, height: 876,
    alt: 'The Royal Canadian online store, showing supplement products and prices in Canadian dollars.',
    text: 'The company’s supplement brand store, selling directly to customers.',
  },
];

const WORK = [
  'Managed the company website and the Royal Canadian store.',
  'Built and maintained the company’s B2B and B2C e-commerce on Shopify, Amazon, AWS and GoDaddy, and connected it to internal systems.',
  'Built automated workflows for order handling and reporting.',
];

export function mountRenuSites(root) {
  const section = document.createElement('section');
  section.className = 'renu-sites';
  section.setAttribute('aria-label', 'Renu Bio Health websites');
  const grid = document.createElement('div');
  grid.className = 'renu-grid';
  for (const site of SITES) {
    const card = document.createElement('article');
    card.className = 'renu-site';
    const shot = document.createElement('figure');
    shot.className = 'renu-shot';
    const bar = document.createElement('div');
    bar.className = 'renu-bar'; bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<i></i><i></i><i></i>';
    const address = document.createElement('span'); address.textContent = site.host; bar.append(address);
    const img = document.createElement('img');
    Object.assign(img, { src: site.image, alt: site.alt, width: site.width, height: site.height, loading: 'lazy', decoding: 'async' });
    shot.append(bar, img);
    const kind = document.createElement('span'); kind.className = 'renu-kind'; kind.textContent = site.kind;
    const name = document.createElement('h3'); name.textContent = site.name;
    const text = document.createElement('p'); text.textContent = site.text;
    const link = document.createElement('a');
    Object.assign(link, { href: site.url, target: '_blank', rel: 'noopener noreferrer', className: 'renu-link' });
    link.textContent = `Visit ${site.host} ↗`;
    card.append(shot, kind, name, text, link);
    grid.append(card);
  }
  const work = document.createElement('div');
  work.className = 'renu-work';
  const heading = document.createElement('h4'); heading.textContent = 'What I did';
  const list = document.createElement('ul');
  for (const line of WORK) { const item = document.createElement('li'); item.textContent = line; list.append(item); }
  work.append(heading, list);
  const note = document.createElement('p');
  note.className = 'renu-note';
  note.textContent = 'Screenshots from October 2026. Both sites are live and may have changed since I left in February 2025.';
  section.append(grid, work, note);
  root.append(section);
  return () => root.replaceChildren();
}
