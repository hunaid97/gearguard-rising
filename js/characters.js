// The cast (all original robots), factory parts, and movement stats.
const HEROES = 'GEARGUARD', VILLAINS = 'DREADBOTS';

const PART_OPTIONS = {
  head: ['hero', 'leader', 'scout', 'seeker', 'brute', 'knight', 'horns', 'dome'],
  torso: ['cockpit', 'grille', 'racer', 'jet', 'tank', 'armor'],
  arms: ['std', 'blaster', 'claw', 'hammer', 'thin'],
  legs: ['std', 'wheels', 'thruster', 'heavy', 'treads'],
  extra: ['none', 'stacks', 'doors', 'wings', 'cannon', 'jetpack', 'spikes', 'shield'],
  vehicle: ['car', 'truck', 'jet', 'tank'],
};
const PART_NAMES = {
  hero: 'HERO', leader: 'LEADER', scout: 'SCOUT', seeker: 'SEEKER', brute: 'BRUTE', knight: 'KNIGHT', horns: 'HORNED', dome: 'DOME',
  cockpit: 'COCKPIT', grille: 'TRUCK', racer: 'RACER', jet: 'JET', tank: 'TANK', armor: 'ARMOR',
  std: 'STANDARD', blaster: 'BLASTER', claw: 'CLAWS', hammer: 'HAMMERS', thin: 'SLEEK',
  wheels: 'WHEELS', thruster: 'THRUSTERS', heavy: 'HEAVY', treads: 'TREADS',
  none: 'NONE', stacks: 'EXHAUSTS', doors: 'DOORS', wings: 'WINGS', cannon: 'CANNON', jetpack: 'JETPACK', spikes: 'SPIKES', shield: 'SHIELD',
};
const VEHICLE_NAMES = { car: 'SPORTS CAR', truck: 'BIG TRUCK', jet: 'JET PLANE', tank: 'TANK' };
const PALETTE = ['#e03030', '#ff7a1a', '#ffd21f', '#2ecc71', '#1fd3e0', '#2f6fff', '#9b59ff', '#ff5fb4',
  '#ffffff', '#9aa0a8', '#3a3f4b', '#8b5a2b', '#1a1c22'];
const EYE_PALETTE = ['#7fd8ff', '#ff3030', '#ffd21f', '#4dff88', '#ff5fb4', '#ffffff', '#b07bff'];
const PART_LABELS = ['HELMET', 'CHEST ARMOR', 'LEFT ARM', 'RIGHT ARM', 'LEFT LEG', 'RIGHT LEG', 'SPARK CORE'];

const CHARS = {
  // the wise leader of the Gearguard
  titan: { id: 'titan', name: 'TITAN', head: 'leader', torso: 'grille', arms: 'std', legs: 'heavy', extra: 'stacks',
    c1: '#e8a317', c2: '#3b4352', c3: '#6ff3ff', vehicle: 'truck', scale: 1.25 },
  // Qumayl's speedy best friend
  zip: { id: 'zip', name: 'ZIP', head: 'scout', torso: 'racer', arms: 'std', legs: 'std', extra: 'doors',
    c1: '#19c3b3', c2: '#f4f4f4', c3: '#ffe14d', vehicle: 'car', scale: 1 },
  // sneaky flying villain
  skysnarl: { id: 'skysnarl', name: 'SKYSNARL', head: 'seeker', torso: 'jet', arms: 'thin', legs: 'thruster', extra: 'wings',
    c1: '#7446c4', c2: '#9be33b', c3: '#ff3d3d', vehicle: 'jet', scale: 1.1 },
  // the big bad boss
  dreadcore: { id: 'dreadcore', name: 'DREADCORE', head: 'brute', torso: 'tank', arms: 'blaster', legs: 'heavy', extra: 'spikes',
    c1: '#454b58', c2: '#b3202a', c3: '#ffb020', vehicle: 'tank', scale: 1.35 },
  drone: { id: 'drone', name: 'DREAD DRONE', head: 'knight', torso: 'armor', arms: 'std', legs: 'std', extra: 'none',
    c1: '#6b3a8a', c2: '#2d2440', c3: '#ff3366', vehicle: 'car', scale: 0.9 },
  qsuit: { id: 'qsuit', name: PERSONAL.name, head: 'hero', torso: 'cockpit', arms: 'blaster', legs: 'std', extra: 'jetpack',
    c1: PERSONAL.suit.c1, c2: PERSONAL.suit.c2, c3: PERSONAL.suit.c3, vehicle: PERSONAL.suit.vehicle, scale: 1.1 },
};

const STATS = {
  kid: { w: 8, h: 19, speed: 1.6, jump: 5.1 },
  robot: { w: 14, h: 31, speed: 2.2, jump: 6.1 },
  car: { w: 28, h: 13, speed: 4.8, jump: 5.0 },
  truck: { w: 30, h: 22, speed: 3.8, jump: 4.6 },
  jet: { w: 30, h: 12, speed: 4.0, jump: 0 },
  tank: { w: 28, h: 16, speed: 2.3, jump: 4.0 },
};

const SPEAKERS = {
  titan: { name: 'TITAN', color: '#ffc23d', cfg: () => CHARS.titan },
  zip: { name: 'ZIP', color: '#3ee8d6', cfg: () => CHARS.zip },
  skysnarl: { name: 'SKYSNARL', color: '#c9a0ff', cfg: () => CHARS.skysnarl },
  dreadcore: { name: 'DREADCORE', color: '#ff6b5a', cfg: () => CHARS.dreadcore },
  qumayl: { name: PERSONAL.name, color: '#7fb2ff', kid: true },
};

const NAME_A = ['TURBO', 'ROCKET', 'THUNDER', 'BLAZE', 'STEEL', 'NITRO', 'LASER', 'STORM', 'MEGA', 'SPARK', 'IRON', 'HYPER', 'SKY', 'ROAD', 'STAR', 'BOLT'];
const NAME_B = ['BLAST', 'WING', 'FIST', 'CLAW', 'TRON', 'STRIKE', 'RIDER', 'HORN', 'FLASH', 'RACER', 'HAMMER', 'JET', 'ZOOM', 'SHOCK'];
function randomName() { return pick(NAME_A) + pick(NAME_B); }
function randomBot() {
  const c1 = pick(PALETTE);
  let c2 = pick(PALETTE);
  while (c2 === c1) c2 = pick(PALETTE);
  return {
    name: randomName(),
    head: pick(PART_OPTIONS.head), torso: pick(PART_OPTIONS.torso), arms: pick(PART_OPTIONS.arms),
    legs: pick(PART_OPTIONS.legs), extra: pick(PART_OPTIONS.extra), vehicle: pick(PART_OPTIONS.vehicle),
    c1, c2, c3: pick(EYE_PALETTE), scale: 1.1,
  };
}
// robots saved before the redesign may use old part names
const PART_MIGRATE = { prime: 'leader', tyrant: 'brute', truck: 'grille', car: 'racer' };
function fixCfg(c) {
  const o = { ...c };
  if (PART_MIGRATE[o.head]) o.head = PART_MIGRATE[o.head];
  if (o.torso === 'truck' || o.torso === 'car') o.torso = PART_MIGRATE[o.torso];
  for (const k of ['head', 'torso', 'arms', 'legs', 'extra', 'vehicle']) if (!PART_OPTIONS[k].includes(o[k])) o[k] = PART_OPTIONS[k][0];
  return o;
}

const Roster = {
  load() { try { return JSON.parse(localStorage.getItem('qa_roster') || '[]').map(fixCfg); } catch (e) { return []; } },
  save(list) { try { localStorage.setItem('qa_roster', JSON.stringify(list)); } catch (e) {} },
  add(cfg) { const l = this.load(); l.push(cfg); while (l.length > 12) l.shift(); this.save(l); },
  remove(i) { const l = this.load(); l.splice(i, 1); this.save(l); },
};
