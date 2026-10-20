// Small line icons shared by the systems and Microsoft sections. Drawn for this site: they are not vendor logos.
const icon = body => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  endpoints: icon('<rect x="2.5" y="5" width="14.5" height="10" rx="1.6"/><path d="M1.5 18.5h16.5"/><rect x="18.8" y="8" width="3.7" height="8" rx="1"/>'),
  identity: icon('<circle cx="7.5" cy="12" r="3.6"/><path d="M11.1 12H21M17.2 12v3.2M20 12v2.2"/>'),
  m365: icon('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.8 7.2 12 13l8.2-5.8"/>'),
  network: icon('<path d="M12 3 19.5 6v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6L12 3Z"/><path d="m9 12 2.2 2.2 4.3-4.4"/>'),
  servers: icon('<rect x="4" y="4" width="16" height="6" rx="1.6"/><rect x="4" y="14" width="16" height="6" rx="1.6"/><path d="M7.5 7h.01M7.5 17h.01M12 7h5M12 17h5"/>'),
  automation: icon('<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.6 5l-3.2 14"/>'),
  sites: icon('<rect x="4" y="4" width="7" height="7" rx="1.4"/><rect x="13" y="4" width="7" height="7" rx="1.4"/><rect x="4" y="13" width="7" height="7" rx="1.4"/><path d="M13 16.5h7M13 19.5h4.5"/>'),
  power: icon('<circle cx="12" cy="12" r="8.6"/><path d="m13.2 6.6-4 6h3.4l-1.4 4.8 4.6-6.4h-3.5l.9-4.4Z"/>'),
  terminal: icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m7 10 3 2.5L7 15M12.5 15.2H17"/>'),
};
