// PILLAR COURT — data tables: weapons, utilities, buy menu, crews, story.
// Original names only. No real-world weapon or game names are used anywhere.
export const WEAPONS = {
  nova: { id: 'nova', name: 'NOVA-9', kind: 'rifle', auto: true, damage: 26, headMult: 2.0, rpm: 600, mag: 30, reserve: 90, spread: 0.012, recoil: 0.011, range: 60, price: 2700, desc: 'Crew assault rifle. Full-auto, steady at mid range.' },
  zenith: { id: 'zenith', name: 'ZENITH DMR', kind: 'rifle', auto: false, damage: 62, headMult: 2.2, rpm: 170, mag: 10, reserve: 30, spread: 0.004, recoil: 0.030, range: 90, price: 3200, desc: 'Surveyor long rifle. Slow, heavy, rewards a still aim.' },
  comet: { id: 'comet', name: 'COMET SMG', kind: 'smg', auto: true, damage: 19, headMult: 1.8, rpm: 800, mag: 32, reserve: 96, spread: 0.020, recoil: 0.008, range: 35, price: 1500, desc: 'Fast close-quarters spray. Wild past the crosswalk.' },
  eclipse: { id: 'eclipse', name: 'ECLIPSE', kind: 'sidearm', auto: false, damage: 24, headMult: 2.0, rpm: 350, mag: 12, reserve: 48, spread: 0.014, recoil: 0.014, range: 40, price: 500, desc: 'Sidearm every crew member carries. Reliable backup.' },
  ridge: { id: 'ridge', name: 'RIDGE BLADE', kind: 'blade', auto: false, damage: 45, headMult: 1.0, rpm: 95, mag: Infinity, reserve: Infinity, spread: 0, recoil: 0.004, range: 2.3, price: 400, desc: 'Quiet steel. Silent, close, final.' },
};
export const UTILITIES = {
  frag: { id: 'frag', name: 'FRAG GRENADE', price: 300, desc: 'Heavy burst. Clears a corner before you round it.' },
  flash: { id: 'flash', name: 'SUNBURST FLASH', price: 200, desc: 'White burst. Blinds anyone facing it.' },
  smoke: { id: 'smoke', name: 'SMOKE', price: 300, desc: 'Thick grey bloom. Blocks sight for seconds.' },
  flare: { id: 'flare', name: 'SIGNAL FLARE', price: 150, desc: 'Red sky flare. Marks a push for the whole crew.' },
};
export const BUY_ITEMS = [
  { id: 'nova', label: 'NOVA-9', price: 2700, tag: 'RIFLE · AUTO', desc: WEAPONS.nova.desc },
  { id: 'zenith', label: 'ZENITH DMR', price: 3200, tag: 'RIFLE · SEMI', desc: WEAPONS.zenith.desc },
  { id: 'comet', label: 'COMET SMG', price: 1500, tag: 'SMG · AUTO', desc: WEAPONS.comet.desc },
  { id: 'eclipse', label: 'ECLIPSE', price: 500, tag: 'SIDEARM', desc: WEAPONS.eclipse.desc },
  { id: 'ridge', label: 'RIDGE BLADE', price: 400, tag: 'MELEE', desc: WEAPONS.ridge.desc },
  { id: 'frag', label: 'FRAG GRENADE', price: 300, tag: 'UTILITY', desc: UTILITIES.frag.desc },
  { id: 'flash', label: 'SUNBURST FLASH', price: 200, tag: 'UTILITY', desc: UTILITIES.flash.desc },
  { id: 'smoke', label: 'SMOKE', price: 300, tag: 'UTILITY', desc: UTILITIES.smoke.desc },
  { id: 'flare', label: 'SIGNAL FLARE', price: 150, tag: 'UTILITY', desc: UTILITIES.flare.desc },
  { id: 'vest', label: 'PLATED VEST', price: 650, tag: 'ARMOUR', desc: 'Ceramic plates. Halves damage until broken.' },
  { id: 'kit', label: 'DEFUSE KIT', price: 400, tag: 'GEAR', desc: 'Crew standard issue. Faster work on a live charge.' },
  { id: 'ammo', label: 'AMMO CRATE', price: 250, tag: 'SUPPLY', desc: 'Refills every reserve magazine you carry.' },
  { id: 'med', label: 'MED PATCH', price: 350, tag: 'SUPPLY', desc: 'Field dressing. Restores 50 health at once.' },
];
export const CREW = [
  { name: 'MARA', role: 'SUPPORT', bio: 'runs the corner bakery' },
  { name: 'TAMS', role: 'SNIPER', bio: 'the surveyor who mapped the streets' },
  { name: 'RUE', role: 'LURKER', bio: 'drives the stalled #12 bus' },
  { name: 'COLE', role: 'CARRIER', bio: 'the archivist carrying the charter case' },
];
export const FOES = [
  { name: 'FENN', role: 'ANCHOR' },
  { name: 'ILSA', role: 'SNIPER' },
  { name: 'PETRA', role: 'ANCHOR' },
  { name: 'ORIN', role: 'ROAMER' },
  { name: 'DORIN', role: 'SUPPORT' },
];
export const CHAPTERS = [
  { id: 1, title: 'CHAPTER I — THE CREW ARRIVES', plan: 'SPLIT A — YOU: ENTRY', line: 'The crew arrives at dawn. The fence is already up.' },
  { id: 2, title: 'CHAPTER II — THE DISTRICT PUSHES BACK', plan: 'PUSH MID — BUS COVER, THEN PLAZA A', line: 'Windows open. The district is watching the crew now.' },
  { id: 3, title: 'CHAPTER III — EVERYTHING ON THE MONUMENT', plan: 'ALL IN ON THE MONUMENT — PLANT THE CHARTER', line: 'Everything the district saved rides on one filing.' },
];
export const ENDINGS = {
  win: 'THE PLAZA STANDS — the charter is filed at the plinth. On Saturday the market opens, and the #12 bus runs again.',
  lose: 'THE FENCE STAYS UP — the charter never reached the plinth. The crew walks home past the bus, and plans for dawn.',
};
export const CHATTER = {
  buy: [
    ['MARA', 'SUPPORT', 'Bakery opens at seven. Let us be done by then.'],
    ['TAMS', 'SNIPER', 'Streets mapped. I hold the long sightline.'],
    ['RUE', 'LURKER', 'My bus is the cover. Mind the doors.'],
    ['COLE', 'CARRIER', 'Charter case on my back. Two thousand names.'],
  ],
  plant: [
    ['COLE', 'CARRIER', 'Filing the charter at the plinth — cover me!'],
    ['MARA', 'SUPPORT', 'Hold the crosswalk. Nobody reaches Cole.'],
  ],
  defuse: [
    ['FENN', 'ANCHOR', 'Working the case. Keep them off me.'],
    ['DORIN', 'SUPPORT', 'They filed it — cut the charge, now!'],
  ],
  clutch: [
    ['TAMS', 'SNIPER', 'Last one standing is still a crew.'],
    ['RUE', 'LURKER', 'Bus route is clear. Bring it home.'],
  ],
};
export const TEAM = {
  alder: { name: 'ALDER', color: 0xf5a623, css: '#f5a623', dark: 0x8a5a10 },
  birch: { name: 'BIRCH', color: 0x3fa9ff, css: '#3fa9ff', dark: 0x144a7a },
};
export const SITES = {
  A: { id: 'A', name: 'PLAZA A', label: 'MONUMENT', x: -26, z: -21, radius: 4.2 },
  B: { id: 'B', name: 'COURT B', label: 'GARDEN', x: 26, z: -21, radius: 4.2 },
};
export const ECONOMY = { start: 800, win: 3250, loss: 1900, kill: 300, plant: 300, defuse: 300 };
export const ROUND = { buyTime: 12, liveTime: 100, endTime: 4, plantTime: 4, defuseTime: 5, fuseTime: 35, winAt: 7, maxRounds: 13 };
