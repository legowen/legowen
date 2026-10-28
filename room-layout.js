// One source of truth for where things stand in the room.
// room3d.js builds the models from it, room-cats.js builds the cats' world from it,
// and the Node tests check that every cat spot can actually be reached.
// x runs right, y up, z toward the camera. The floor is 8.8 wide and 6.1 deep.

export const ROOM = { minX: -4.4, maxX: 4.4, minZ: -3.1, maxZ: 3.0, wallHeight: 3.7 };

// Where cat paws may go. Slightly inside the walls.
export const CAT_BOUNDS = { minX: -4.05, maxX: 4.05, minZ: -2.8, maxZ: 2.6 };

// Floor footprints. Circles use r, boxes use w (x) and d (z).
export const OBSTACLES = [
  { id: 'desk',      x: -1.85, z: -2.45, w: 3.3,  d: 1.0 },
  { id: 'chair',     x: -1.0,  z: -1.45, r: .42 },
  { id: 'arcade',    x: .875,  z: -2.5,  w: .85,  d: .75 },
  { id: 'rack',      x: 3.7,   z: -2.35, w: 1.0,  d: .95 },
  { id: 'plantL',    x: -4.0,  z: -2.55, r: .3 },
  { id: 'tree',      x: -3.3,  z: .6,    w: 1.3,  d: 1.0 },
  { id: 'signpost',  x: -3.6,  z: 2.4,   r: .15 },
  { id: 'bench',     x: 3.2,   z: 2.0,   w: 1.5,  d: .42 },
  { id: 'plantS',    x: 1.9,   z: -2.6,  r: .14 },
  { id: 'kettlebell',x: 2.0,   z: 1.7,   r: .22 },
  { id: 'soccer',    x: -2.05, z: 2.3,   r: .24 },
];

// Floor spots a cat likes. `face` is a point to look toward. `acts` are [animation, weight].
export const POIS = [
  { id: 'bed-right',  x: 2.7,   z: .6,    acts: [['sleep', 5], ['idle', 1], ['groom', 1]], face: { x: 1.5, z: .6 },     weight: 1.2, long: true },
  { id: 'bed-front',  x: .5,    z: 2.05,  acts: [['sleep', 4], ['idle', 1.2], ['groom', 1.2]], face: { x: 1.5, z: 2.05 }, weight: 1,   long: true },
  { id: 'bowls',      x: 3.5,   z: -.45,  acts: [['idle', 3], ['groom', 1]],       face: { x: 4.2, z: -.45 },     weight: .8 },
  { id: 'rug',        x: .1,    z: .5,    acts: [['play', 2], ['stretch', 2], ['groom', 1.2], ['idle', 1]], weight: 1.5 },
  { id: 'post',       x: -2.9,  z: 2.4,   acts: [['stretch', 3], ['idle', 1]],     face: { x: -3.6, z: 2.4 },     weight: 1 },
  { id: 'arcade',     x: .875,  z: -1.55, acts: [['idle', 2], ['play', 1]],        face: { x: .875, z: -2.6 },    weight: .8 },
  { id: 'window',     x: -3.8,  z: -1.2,  acts: [['idle', 3], ['groom', 1]],       face: { x: -4.4, z: -1.2 },    weight: .8 },
  { id: 'rack-front', x: 3.0,   z: -1.35, acts: [['idle', 3], ['play', .6]],       face: { x: 3.7, z: -2.3 },     weight: .5 },
  { id: 'hall',       x: -.35,  z: 1.1,   acts: [['idle', 2], ['groom', 1.4], ['stretch', 1]], weight: .8 },
];

// Furniture cats can jump on. `parent` means "reached from that perch". Root perches are
// reached from the floor `approach` point.
export const PERCHES = [
  { id: 'tree-low',  x: -3.0,  y: .62, z: .6,   parent: null,        approach: { x: -2.2, z: .6 },   acts: [['sleep', 2], ['idle', 2], ['groom', 1.5]], face: { x: -3.9, z: .6 },   weight: 1 },
  { id: 'tree-high', x: -3.6,  y: 1.3, z: .45,  parent: 'tree-low',                                  acts: [['sleep', 3], ['idle', 2], ['groom', 1]],   face: { x: -2.6, z: .6 },   weight: .9 },
  { id: 'chair',     x: -1.0,  y: .6,  z: -1.45, parent: null,       approach: { x: -1.0, z: -.65 }, acts: [['idle', 2], ['groom', 1.5], ['sleep', 1.5]], face: { x: -1.0, z: -2.5 }, weight: .9 },
  { id: 'desk',      x: -.42,  y: 1.1, z: -2.05, parent: 'chair',                                    acts: [['idle', 3], ['groom', 1.5], ['play', 1]],  face: { x: -1.6, z: -2.4 }, weight: .7 },
];

export const CAT_START = [
  { id: 'bomi',  x: .1,   z: .9, seed: 7 },
  { id: 'seoli', x: -1.2, z: 1.4, seed: 21 },
];

// What a click on each hotspot does. The page maps these to scrolling or opening a project.
export const ROUTES = {
  systems: { target: 'sysadmin', label: 'Systems' },
  microsoft: { target: 'microsoft', label: 'Microsoft' },
  projects: { target: 'projects', label: 'Projects' },
  experience: { target: 'experience', label: 'Experience' },
  about: { target: 'about', label: 'About' },
  contact: { target: 'contact', label: 'Contact' },
};
