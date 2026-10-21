// Microsoft section: four certifications (data lives in credentials.json) and the stack I use.
// The plaques are drawn for this site. They are not Microsoft's badge artwork.
import { ICONS } from './icons.js?v=6';

const esc = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STACK = [
  { name: 'Microsoft 365', logo: 'microsoft-icon', use: 'Tenant admin, licensing and governance.' },
  { name: 'Entra ID', glyph: 'identity', use: 'Hybrid identity, Conditional Access, MFA and PIM.' },
  { name: 'Intune', glyph: 'endpoints', use: 'Android Enterprise and device policy.' },
  { name: 'Windows & Windows Server', logo: 'microsoft-windows-icon', use: 'Group Policy, LAPS, Hyper-V and Active Directory.' },
  { name: 'Azure', logo: 'microsoft-azure', use: 'AKS, Automation runbooks and Azure DevOps.' },
  { name: 'Teams', logo: 'microsoft-teams', use: 'Governance, guest access and sign-in.' },
  { name: 'SharePoint', glyph: 'sites', use: 'Intranet design and a service desk list.' },
  { name: 'Exchange Online', glyph: 'm365', use: 'Mailboxes, migrations and PowerShell.' },
  { name: 'OneDrive', logo: 'microsoft-onedrive', use: 'Tenant domain rename with Microsoft Support.' },
  { name: 'Power Platform', glyph: 'power', use: 'Power Apps, Power Automate and Copilot Studio.' },
  { name: 'Power BI', logo: 'microsoft-power-bi', use: 'Reports on Dataverse and Fabric.' },
  { name: 'Dataverse', logo: 'microsoft-dataverse', use: 'Business data for reporting and analysis.' },
  { name: 'Microsoft Fabric', glyph: 'data', use: 'Data and reporting stack I built and maintained.' },
  { name: 'Dynamics 365 Business Central', logo: 'microsoft-dynamics-365', use: 'ERP rollout with outside consultants.' },
  { name: 'Dynamics 365 Sales', logo: 'microsoft-dynamics-365', use: 'CRM rollout with outside consultants.' },
  { name: 'PowerShell', glyph: 'terminal', use: 'Automation for AD, Exchange Online and Entra Connect.' },
];

// Other tools in the same toolbox. Square icon marks are drawn in one quiet colour; names without a square mark stay text only.
const TOOLBOX = [
  { name: 'Jamf Pro' }, { name: 'Apple Business Manager', logo: 'apple' }, { name: 'Microsoft Defender' }, { name: 'Bitdefender', logo: 'bitdefender' },
  { name: 'Bitwarden', logo: 'bitwarden' }, { name: 'Palo Alto Networks', logo: 'paloaltonetworks' }, { name: 'UniFi', logo: 'ubiquiti' },
  { name: 'Juniper' }, { name: 'Cloudflare', logo: 'cloudflare' }, { name: 'VMware' }, { name: 'Synology' },
  { name: 'AWS', logo: 'aws' }, { name: 'Linux', logo: 'linux' }, { name: 'Docker', logo: 'docker' }, { name: 'Kubernetes', logo: 'kubernetes' },
  { name: 'GitLab', logo: 'gitlab' }, { name: 'Grafana', logo: 'grafana' }, { name: 'Prometheus', logo: 'prometheus' }, { name: 'Python', logo: 'python' },
  { name: 'Google Workspace' }, { name: 'Jira', logo: 'jira' }, { name: 'Confluence', logo: 'confluence' }, { name: 'Shopify', logo: 'shopify' },
];

const NUMBER_WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'];
function certLabel(certs) {
  if (!certs.length) return 'CERTIFICATIONS';
  const earned = certs.filter(cert => cert.status === 'earned').length;
  const word = count => NUMBER_WORDS[count] || String(count);
  if (earned === certs.length) return `CERTIFICATIONS · ${certs.length === 1 ? 'EARNED' : `ALL ${word(certs.length)} EARNED`}`;
  return `CERTIFICATIONS · ${earned} EARNED · ${certs.length - earned} IN PROGRESS`;
}

const month = value => {
  if (!value) return '';
  const date = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
};

function plaque(cert) {
  const earned = cert.status === 'earned';
  const issued = month(cert.issued);
  const verify = cert.verifyUrl && /^https:\/\//.test(cert.verifyUrl) ? `<a class="cert-verify" href="${esc(cert.verifyUrl)}" target="_blank" rel="noopener noreferrer">Verify ↗</a>` : '';
  return `
    <article class="cert" style="--accent:${esc(cert.accent || '#2ee6ff')}">
      <div class="cert-head"><span class="cert-vendor"><img src="assets/logos/microsoft-icon.svg" alt="" width="13" height="13" decoding="async"> MICROSOFT CERTIFIED</span><span class="cert-level">${esc(String(cert.level).toUpperCase())}</span></div>
      <h3>${esc(cert.code)}</h3>
      <p class="cert-short">${esc(cert.short)}</p>
      <p class="cert-covers">${esc(cert.covers)}</p>
      ${cert.use ? `<p class="cert-use"><b>Where I use it</b>${esc(cert.use)}</p>` : ''}
      <div class="cert-foot">
        <span class="cert-state${earned ? ' earned' : ''}"><span aria-hidden="true">${earned ? '✓' : '…'}</span> ${earned ? 'Earned' : 'In progress'}${issued ? ` · ${esc(issued)}` : ''}</span>
        ${verify}
      </div>
      <p class="cert-official">${esc(cert.name)}</p>
    </article>`;
}

function tile(item) {
  const mark = item.logo
    ? `<img src="assets/logos/${item.logo}.svg" alt="" width="30" height="30" loading="lazy" decoding="async">`
    : ICONS[item.glyph];
  return `<li class="stack-tile${item.logo ? ' has-logo' : ''}"><span class="stack-mark">${mark}</span><strong>${esc(item.name)}</strong><span class="stack-use">${esc(item.use)}</span></li>`;
}

function toolboxItem(item) {
  const mark = item.logo ? `<span class="toolbox-mark" style="--logo:url('assets/logos/${item.logo}.svg')" aria-hidden="true"></span>` : '<span class="toolbox-dot" aria-hidden="true"></span>';
  return `<li>${mark}<span>${esc(item.name)}</span></li>`;
}

export async function mountMicrosoft(root) {
  let certs = [];
  try {
    const response = await fetch('./credentials.json');
    if (!response.ok) throw new Error('credentials unavailable');
    certs = await response.json();
  } catch { certs = []; }

  root.innerHTML = `
    <div class="ms-layout">
      <div class="cert-block">
        <p class="mini-label">${certLabel(certs)}</p>
        ${certs.length ? `<div class="cert-grid">${certs.map(plaque).join('')}</div>` : '<p class="cert-fallback">AZ-900 Azure Fundamentals · MS-900 Microsoft 365 Fundamentals · MD-102 Endpoint Administrator Associate · SC-300 Identity and Access Administrator Associate</p>'}
      </div>
      <div class="stack-block">
        <p class="mini-label">THE STACK I WORK IN</p>
        <ul class="stack-grid">${STACK.map(tile).join('')}</ul>
      </div>
    </div>
    <div class="toolbox">
      <p class="mini-label">ALSO IN THE TOOLBOX</p>
      <ul class="toolbox-list">${TOOLBOX.map(toolboxItem).join('')}</ul>
    </div>
    <p class="trademark-note">Microsoft, Windows, Azure, Teams, OneDrive, Power BI, Dataverse, Fabric, Dynamics 365 and the Microsoft logo are trademarks of the Microsoft group of companies. Other product names and logos belong to their owners. They appear here only to name the tools I work with. This site is not affiliated with or endorsed by any vendor. The certification plaques are my own design, not official badges.</p>`;
}
