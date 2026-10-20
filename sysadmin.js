// Systems section: what I run, field notes, how I work.
// Everything here is written in general terms on purpose: no hostnames, tickets, configs or client names.
// Items that were still open when a role ended are described as "started" or "scoped", never as finished.

import { ICONS } from './icons.js?v=5';

export const capabilities = [
  {
    id: 'endpoints', label: 'Endpoints', title: 'A smooth first login.',
    lead: 'Mac, Windows and Android devices, from the first enrollment to the last wipe. One clear standard, so every device behaves the same way.',
    does: [
      'Enroll Macs with Apple Business Manager and Automated Device Enrollment. A full wipe and re-enroll is the standard reset.',
      'Deploy apps through Jamf Pro, including the App Catalog. Write profiles for PPPC, login items and restrictions.',
      'Manage Android Enterprise policy in Intune. Trace a blocked setting back to the audit log.',
      'Use Windows LAPS and Group Policy on domain PCs.',
      'Fix the quiet problems: token clashes between MDMs, install order, accessories blocked by a profile.',
    ],
    practice: 'Large apps failed on managed Macs while small apps installed. One Apple VPP token sat in two MDMs. One token per MDM fixed it.',
    tags: ['Jamf Pro', 'Microsoft Intune', 'Apple Business Manager', 'Automated Device Enrollment', 'VPP', 'PPPC / TCC', 'Windows 11', 'macOS', 'Android Enterprise', 'Windows LAPS'],
    cert: { code: 'MD-102', name: 'Endpoint Administrator Associate' },
  },
  {
    id: 'identity', label: 'Identity & Windows Server', title: 'Sign-in that works and stays safe.',
    lead: 'Active Directory stays the source of truth. Entra ID carries it to the cloud. I keep both tidy and write down how they connect.',
    does: [
      'Run Active Directory, Entra Connect and Group Policy. Password resets happen in one place: AD.',
      'Design Conditional Access. One policy required Entra ID joined devices for Azure DevOps.',
      'Choose Kerberos over NTLM. I change how people sign in. I do not weaken the policy.',
      'Keep DNS clean after reimaging. Fix Group Policy rights that break services such as WSL.',
      'Register OATH software tokens for Entra ID MFA. Keep service accounts documented, with credentials in a password vault.',
      'Spot single points of failure. I flagged a lone domain controller and recommended a second one.',
    ],
    practice: 'Remote Desktop failed with an NTLM error. The policy was right. I changed the sign-in format and kept the policy strict.',
    tags: ['Active Directory', 'Entra ID', 'Entra Connect', 'Conditional Access', 'Group Policy', 'DNS / DHCP', 'Kerberos / NTLM', 'LDAP', 'MFA', 'Windows Server', 'Bitwarden'],
    cert: { code: 'SC-300', name: 'Identity and Access Administrator Associate' },
  },
  {
    id: 'm365', label: 'Microsoft 365', title: 'One workplace people can find their way around.',
    lead: 'Mail, files, chat and the business apps around them. Easy to use. Easy to govern.',
    does: [
      'Administer Exchange Online, SharePoint, OneDrive and Teams. Use PowerShell for what the admin center cannot do.',
      'Handle migration work: user mailboxes, shared mailboxes and Teams groups.',
      'Design SharePoint sites and Teams governance. Built and kept up a company intranet.',
      'Designed a SharePoint List and Power Apps service desk to replace a ticket tool, and started the move.',
      'Co-led Copilot Studio agents with a developer. Wrote the access and data-handling rules that keep client files out of them.',
      'Ran a SharePoint and OneDrive tenant domain rename with Microsoft Support.',
    ],
    practice: 'The admin center could not rename a mailbox. Set-Mailbox in PowerShell could.',
    tags: ['Microsoft 365', 'Exchange Online', 'SharePoint Online', 'OneDrive', 'Teams', 'Power Apps', 'Power Automate', 'Copilot Studio', 'PowerShell'],
    cert: { code: 'MS-900', name: 'Microsoft 365 Fundamentals' },
  },
  {
    id: 'network', label: 'Network & security', title: 'Open for work. Closed to the rest.',
    lead: 'Firewalls, VPN, Wi-Fi and endpoint security. Every change is logged, checked and easy to undo.',
    does: [
      'Manage Palo Alto PA-460 rules: App-ID, rule order, zones and geo-based access. Read the traffic and config logs.',
      'Run GlobalProtect VPN with sign-in against Active Directory.',
      'Follow change control: check commit status before and after, test on one device, get approval for risky commits.',
      'Manage UniFi access points and the UniFi controller.',
      'Run Bitdefender GravityZone: policy delivery, exclusion standards, hash-based allowlists and license audits.',
      'Mapped a staged DMARC plan, from none to quarantine to reject.',
    ],
    practice: 'A chat app kept getting reset at the firewall. Its App-ID was missing from the allow rule. I fixed that one rule and left the deny rule alone.',
    tags: ['Palo Alto NGFW', 'GlobalProtect', 'UniFi', 'Bitdefender GravityZone', 'VLAN', 'DNS / DHCP', 'Cloudflare DNS', 'DMARC', 'VPN'],
    cert: null,
  },
  {
    id: 'servers', label: 'Servers, storage & cloud', title: 'Boring on purpose.',
    lead: 'Servers, backup and cloud that nobody has to think about. Clear owners, documented accounts and backups that someone has checked.',
    does: [
      'Run Hyper-V and VMware hosts: resource planning and virtual machine moves.',
      'Join Synology NAS storage to the domain. Send NAS alerts to Slack so they do not flood the inbox.',
      'Audit services that run under a former admin’s personal account. Move them to documented service accounts.',
      'Started a backup and recovery review across two offices and wrote DR and BCP notes.',
      'Use AWS S3 Glacier and IAM for archive. Check client retention rules before any deletion.',
      'Operated and maintained AKS clusters and GPU training servers for an AI team. Watched them with Grafana and Prometheus.',
    ],
    practice: 'A Wi-Fi controller only ran while one person was signed in. I moved it to a Windows service.',
    tags: ['Hyper-V', 'VMware', 'Windows Server', 'Synology NAS', 'AWS', 'Azure', 'AKS', 'Azure DevOps', 'Grafana', 'Prometheus', 'Docker', 'GitLab'],
    cert: { code: 'AZ-900', name: 'Azure Fundamentals' },
  },
  {
    id: 'automation', label: 'Automation & AI', title: 'Less repetition. More room to think.',
    lead: 'Scripts and flows for the jobs that repeat. Clear rules for the AI tools people want to use.',
    does: [
      'Write PowerShell for Active Directory, Exchange Online and Entra Connect jobs, compliance checks and reports.',
      'Built an Azure Automation runbook that warns owners before their Azure DevOps tokens expire.',
      'Use Power Automate for recurring IT steps. Send NAS and system alerts to Slack.',
      'Use Python (pandas) for CSV analysis and a migration proof of concept. Bash and Google Apps Script for the rest.',
      'Built SprungHub with the R&D team: an internal hub on the GPT API, with token-usage controls and a Figma MCP link that keeps data in.',
      'Built reports on Dataverse, Power BI and Microsoft Fabric for project and infrastructure planning at Sunia.',
    ],
    practice: 'AI tools came with cost and data-leak controls from the first day, not as an afterthought.',
    tags: ['PowerShell', 'Azure Automation', 'Power Automate', 'Python (pandas)', 'Bash', 'Google Apps Script', 'GPT API', 'MCP', 'Copilot Studio', 'Power BI', 'Dataverse', 'Microsoft Fabric'],
    cert: null,
  },
];

// Role chips pick the tab that fits best.
export const roles = [
  ['Systems Administrator', 'identity'], ['Endpoint Engineer / Specialist', 'endpoints'], ['Intune', 'endpoints'], ['Jamf', 'endpoints'],
  ['Microsoft 365 Administrator', 'm365'], ['Modern Workplace', 'm365'], ['Technical Analyst', 'automation'], ['Infrastructure Analyst', 'servers'],
];

export const domains = [
  ['all', 'All'], ['endpoints', 'Endpoints'], ['identity', 'Identity & Windows'], ['m365', 'Microsoft 365'], ['network', 'Network & security'], ['servers', 'Servers'],
];

export const notes = [
  { domain: 'endpoints', title: 'Big apps fail. Small apps install.', symptom: 'Xcode failed with a vague error on managed Macs. Small apps installed fine.', cause: 'The same Apple VPP token was in two MDMs. Apple revoked the first one.', fix: 'One token per MDM. Renewed it in Jamf and removed it from the other.', tags: ['Jamf Pro', 'Intune', 'Apple Business Manager'] },
  { domain: 'endpoints', title: 'Test build blocked by work policy', symptom: 'A client test APK would not install on managed Android phones.', cause: 'The Intune setting for unknown sources was False. The audit log confirmed it.', fix: 'Set it back to Allow. Suggested Managed Google Play private apps for client builds.', tags: ['Intune', 'Android Enterprise'] },
  { domain: 'endpoints', title: 'A security agent blocked the MDM', symptom: 'On new Macs, a security agent denied permissions in a loop and blocked MDM processes.', cause: 'The agent went on before its system permissions were in place.', fix: 'Set the order: Network Extension, Full Disk Access and PPPC profiles first. Agent last.', tags: ['Bitdefender', 'Jamf Pro', 'PPPC'] },
  { domain: 'identity', title: 'Remote Desktop says NTLM is blocked', symptom: 'Remote Desktop from a Mac failed with an NTLM error.', cause: 'The DOMAIN\\user format forces NTLM. Policy blocks NTLM. The control worked as intended.', fix: 'Users sign in with the UPN (user@domain), so Kerberos is used. The policy stays strict.', tags: ['Active Directory', 'Kerberos', 'Group Policy'] },
  { domain: 'identity', title: 'A password reset caused a sync conflict', symptom: 'Entra Connect showed error 120013 after a password reset.', cause: 'The password was reset in both AD and Entra ID.', fix: 'New rule: reset in AD only, then let sync run (or start a delta cycle).', tags: ['Entra Connect', 'Active Directory'] },
  { domain: 'identity', title: 'WSL fails with a logon error', symptom: 'WSL would not install on domain PCs (error 0x80070569).', cause: 'Group Policy removed the virtual machine group from “Log on as a service” at every boot.', fix: 'Short term: restart the vmcompute service. Long term: add the group to the domain GPO.', tags: ['Group Policy', 'Hyper-V'] },
  { domain: 'identity', title: 'Remote Desktop broke after a reimage', symptom: 'Remote Desktop to a freshly reimaged PC stopped working.', cause: 'An old DNS record stayed behind because of Secure Dynamic Update ownership.', fix: 'Removed the stale record on the domain controller. The PC then registered a fresh one.', tags: ['DNS', 'Active Directory'] },
  { domain: 'm365', title: 'Mailbox rename: “name already in use”', symptom: 'The admin center would not rename a mailbox.', cause: 'It changes only the display name and the primary address.', fix: 'Used Set-Mailbox in PowerShell to change Name and Alias.', tags: ['Exchange Online', 'PowerShell'] },
  { domain: 'm365', title: 'Shared mailboxes would not migrate', symptom: 'Shared mailboxes and Teams groups could not move with the migration tool.', cause: 'The tool moves user mailboxes only.', fix: 'Moved them through a temporary licensed mailbox.', tags: ['Exchange Online', 'Teams', 'Migration'] },
  { domain: 'network', title: 'The firewall kept resetting a chat app', symptom: 'A chat app lost its connections again and again.', cause: 'Its App-ID was not in an allow rule. The catch-all deny rule caught it.', fix: 'Added the App-ID to the internet allow rule. Left the deny rule alone. Checked the config log and commit status.', tags: ['Palo Alto', 'App-ID', 'Change control'] },
  { domain: 'network', title: 'Policy says “Active” but is not applied', symptom: 'Many endpoints showed Active, but the new policy was not in effect.', cause: 'Active means the agent is alive. Applied means the device confirmed the policy version.', fix: 'Force re-pushed the policy. The Applied count recovered.', tags: ['Bitdefender GravityZone'] },
  { domain: 'servers', title: 'A Wi-Fi controller lived on one person’s login', symptom: 'After a former admin left, services started failing and nobody noticed.', cause: 'The Wi-Fi controller and other services ran under a personal account.', fix: 'Moved the controller to a Windows service. Then started moving the rest to documented service accounts in the vault.', tags: ['UniFi', 'Windows Server', 'Bitwarden'], status: 'Resolved · follow-ups scoped' },
];

export const principles = [
  ['Find the cause first.', 'I confirm the root cause before I change anything. Then I write down what I found.'],
  ['Check the vendor first.', 'A status page takes one minute. It can save an hour of troubleshooting.'],
  ['Test small, then go wide.', 'One device first. A backup and a dry run before wipes, bulk deletes or firewall commits.'],
  ['Ask who owns it.', 'A service on a personal account is a risk. I find it and move it to a documented account.'],
  ['Smallest safe fix first.', 'Bigger changes become their own project, with approval.'],
  ['Do not weaken security for comfort.', 'If a control blocks someone, I change the method. I do not switch the control off.'],
  ['Keep secrets in the vault.', 'Passwords do not belong in tickets or shared files.'],
  ['Say what is done.', 'I say what is finished, what is started and what is only planned.'],
];

export const path = [
  ['2020 – 2023', 'Technician', 'Audi Canada', 'EV diagnostics, and the shop’s IT support on the side.'],
  ['2023 – 2025', 'Developer, then IT', 'Renu Bio Health', 'Started in web development. Moved into IT: cloud, Microsoft 365 and networks.'],
  ['2025 – 2026', 'IT infrastructure', 'Sunia Technology', 'Tier 3 for nine offices. Cloud, data platform and AI servers.'],
  ['2026', 'Systems & endpoints', 'Sprung Studios', 'Two studios, two countries. Identity, devices, network and security.'],
];

const esc = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const INITIAL_NOTES = 6;

export function mountSysadmin(root) {
  const tabIds = capabilities.map(c => c.id);
  root.innerHTML = `
    <div class="role-fit">
      <p class="mini-label" id="fit-label">WHERE I FIT · TAP A ROLE</p>
      <ul class="role-chips" aria-labelledby="fit-label">${roles.map(([name, tab]) => `<li><button type="button" class="role-chip" data-tab="${tab}" aria-controls="capability-panel">${esc(name)}</button></li>`).join('')}</ul>
    </div>
    <div class="capability-layout">
      <div class="capability-menu" role="tablist" aria-label="Areas I work in" aria-orientation="vertical">${capabilities.map((c, i) =>
        `<button type="button" role="tab" id="tab-${c.id}" aria-controls="capability-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-capability="${c.id}"><span>0${i + 1}</span> ${esc(c.label)} <b aria-hidden="true">↗</b></button>`).join('')}</div>
      <article id="capability-panel" class="capability-panel" role="tabpanel" tabindex="0" aria-labelledby="tab-endpoints"></article>
    </div>
    <div class="notes-block" id="field-notes">
      <div class="block-head">
        <div><p class="eyebrow">FIELD NOTES</p><h3>Real problems. Plain answers.</h3></div>
        <p>Short write-ups of problems I solved. General terms only: no hostnames, tickets, configs or client details.</p>
      </div>
      <div class="note-filters" role="group" aria-label="Filter field notes">${domains.map(([id, label], i) => `<button type="button" class="note-filter" data-domain="${id}" aria-pressed="${i === 0}">${esc(label)}</button>`).join('')}</div>
      <div class="notes-grid" id="notes-grid"></div>
      <div class="notes-foot"><p id="notes-count" role="status"></p><button type="button" class="more-button" id="notes-more" hidden></button></div>
    </div>
    <div class="principles-block">
      <div class="block-head"><div><p class="eyebrow">HOW I WORK</p><h3>Small habits that stop big problems.</h3></div></div>
      <ol class="principles">${principles.map(([title, text], i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><h4>${esc(title)}</h4><p>${esc(text)}</p></li>`).join('')}</ol>
    </div>
    <div class="path-block">
      <div class="block-head"><div><p class="eyebrow">HOW I GOT HERE</p><h3>From cars to code to computers to whole workplaces.</h3></div></div>
      <ol class="path-strip">${path.map(([years, role, place, text]) => `<li><span class="path-years">${esc(years)}</span><strong>${esc(role)}</strong><em>${esc(place)}</em><p>${esc(text)}</p></li>`).join('')}</ol>
    </div>`;

  /* ----- capability tabs ----- */
  const panel = root.querySelector('#capability-panel');
  const tabs = [...root.querySelectorAll('[data-capability]')];
  function showTab(id, { focus = false } = {}) {
    const item = capabilities.find(c => c.id === id) || capabilities[0];
    for (const tab of tabs) { const on = tab.dataset.capability === item.id; tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1; if (on && focus) tab.focus(); }
    for (const chip of root.querySelectorAll('.role-chip')) chip.classList.toggle('on', chip.dataset.tab === item.id);
    panel.setAttribute('aria-labelledby', `tab-${item.id}`);
    panel.innerHTML = `
      <div class="panel-head"><div class="panel-icon">${ICONS[item.id]}</div><div><h3>${esc(item.title)}</h3><p class="panel-lead">${esc(item.lead)}</p></div></div>
      <ul class="do-list">${item.does.map(text => `<li>${esc(text)}</li>`).join('')}</ul>
      <div class="case-note"><strong>IN PRACTICE</strong><p>${esc(item.practice)}</p></div>
      <div class="tags">${item.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
      ${item.cert ? `<p class="cert-tie"><span class="cert-dot" aria-hidden="true"></span> Certified: <a href="#microsoft">${esc(item.cert.code)} · ${esc(item.cert.name)} ↗</a></p>` : ''}`;
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => showTab(tab.dataset.capability));
    tab.addEventListener('keydown', event => {
      let next;
      if (['ArrowDown', 'ArrowRight'].includes(event.key)) next = (i + 1) % tabs.length;
      if (['ArrowUp', 'ArrowLeft'].includes(event.key)) next = (i + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); showTab(tabIds[next], { focus: true }); }
    });
  });
  root.querySelectorAll('.role-chip').forEach(chip => chip.addEventListener('click', () => showTab(chip.dataset.tab)));
  showTab(tabIds[0]);

  /* ----- field notes ----- */
  const grid = root.querySelector('#notes-grid'), count = root.querySelector('#notes-count'), more = root.querySelector('#notes-more');
  let domain = 'all', expanded = false;
  const labelFor = id => domains.find(([key]) => key === id)?.[1] || id;
  function renderNotes() {
    const all = notes.filter(note => domain === 'all' || note.domain === domain);
    const shown = expanded ? all : all.slice(0, INITIAL_NOTES);
    grid.innerHTML = shown.map(note => `
      <article class="note">
        <header><span class="note-domain">${esc(labelFor(note.domain))}</span><span class="note-status">${esc(note.status || 'Resolved')}</span></header>
        <h4>${esc(note.title)}</h4>
        <dl><div><dt>SYMPTOM</dt><dd>${esc(note.symptom)}</dd></div><div><dt>CAUSE</dt><dd>${esc(note.cause)}</dd></div><div><dt>FIX</dt><dd>${esc(note.fix)}</dd></div></dl>
        <div class="tags">${note.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
      </article>`).join('');
    count.textContent = `Showing ${shown.length} of ${all.length} notes`;
    more.hidden = all.length <= INITIAL_NOTES;
    more.textContent = expanded ? 'Show fewer notes ↑' : `Show all ${all.length} notes ↓`;
    more.setAttribute('aria-expanded', String(expanded));
  }
  root.querySelectorAll('.note-filter').forEach(button => button.addEventListener('click', () => {
    domain = button.dataset.domain; expanded = false;
    root.querySelectorAll('.note-filter').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    renderNotes();
  }));
  more.addEventListener('click', () => { expanded = !expanded; renderNotes(); });
  renderNotes();

  return { showTab };
}
