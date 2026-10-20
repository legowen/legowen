// Client game projects shown under the Sprung Studios entry in the Experience timeline.
// The pictures are original artwork (assets/games/*.svg), not official game art or logos.
// To use a different picture, change `image`. Check the publisher's usage rules before adding official art.
export const clientGames = [
  { client: 'Krafton', title: 'Unannounced project', image: 'assets/games/krafton-unannounced.svg', accent: '#2ee6ff' },
  { client: 'EA', title: 'Plants vs. Zombies 3 series', image: 'assets/games/ea-pvz3.svg', accent: '#4dff9a' },
  { client: 'Mojang Studios (Microsoft)', title: 'Minecraft Dungeons II', image: 'assets/games/mojang-dungeons-ii.svg', accent: '#ffb347' },
];

const NOTE = 'Sprung is a game UX research and playtesting studio. My part was IT, access, and security support for the studio teams working on these projects.';

export function createClientGames() {
  const block = document.createElement('div');
  block.className = 'client-games';
  const heading = document.createElement('h4');
  heading.className = 'client-games-title';
  heading.textContent = 'Client game projects';
  const list = document.createElement('ul');
  list.className = 'client-games-list';
  for (const game of clientGames) {
    const item = document.createElement('li');
    item.className = 'game-card';
    item.style.setProperty('--game-accent', game.accent);
    item.style.setProperty('--game-line', `${game.accent}8c`);
    item.style.setProperty('--game-glow', `${game.accent}40`);
    const art = document.createElement('img');
    art.className = 'game-art';
    art.src = game.image; art.alt = ''; art.width = 640; art.height = 360;
    art.loading = 'lazy'; art.decoding = 'async';
    const text = document.createElement('div');
    text.className = 'game-text';
    const client = document.createElement('span');
    client.className = 'game-client'; client.textContent = game.client;
    const title = document.createElement('strong');
    title.className = 'game-title'; title.textContent = game.title;
    text.append(client, title);
    item.append(art, text);
    list.append(item);
  }
  const note = document.createElement('p');
  note.className = 'client-games-note';
  note.textContent = NOTE;
  block.append(heading, list, note);
  return block;
}
