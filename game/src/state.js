// Single shared state object. Every module reads and writes this one
// object; nothing keeps a second copy of match, round, or actor state.
import { ECONOMY, ROUND } from './data.js';
import { makeRng } from './rng.js';

export function makeActor(name, role, team, weapon) {
  return {
    name, role, team, weapon,
    x: 0, z: 0, y: 0, yaw: 0, pitch: 0,
    vx: 0, vz: 0, hp: 100, armour: 0, alive: true,
    crouched: false, onGround: true, moving: false,
    mag: 0, reserve: 0, reloading: 0, fireCd: 0, spread: 0,
    kills: 0, deaths: 0, funds: ECONOMY.start,
    hasCase: false, planting: 0, defusing: 0,
    blind: 0, utilities: { frag: 0, flash: 0, smoke: 0, flare: 0 },
    utilSel: 'frag', vest: false, kit: false,
    mesh: null, tag: null, walkPhase: 0, muzzleT: 0, flashT: 0,
    ai: null, lastSeen: 0, spotted: 0, aimYaw: 0, hearT: 0,
  };
}

export function createState(seed) {
  return {
    seed, rng: makeRng(seed), tick: 0, time: 0,
    phase: 'menu', // menu | buy | live | end | over
    phaseT: 0, round: 1, scoreA: 0, scoreB: 0,
    chapter: 1, stage: null, frozen: false,
    player: null, bots: [], actors: [],
    charge: { state: 'carried', site: null, x: 0, z: 0, fuse: 0, carrier: null, planted: false },
    plant: { active: false, who: null, site: null, t: 0, need: ROUND.plantTime },
    defuse: { active: false, who: null, t: 0, need: ROUND.defuseTime },
    effects: { tracers: [], sparks: [], numbers: [], smokes: [], flares: [], flashes: [] },
    killfeed: [], chatter: [], banner: null, bannerT: 0,
    winner: null, winReason: '', matchOver: false,
    kills: [], lastKillT: -99,
    input: { keys: {}, lookX: 0, lookY: 0, firing: false, fireEdge: false },
    view: { third: false, yaw: 0, pitch: 0, recoil: 0, kick: 0, bob: 0, fovKick: 0 },
    stats: { shots: 0, hits: 0, headshots: 0 },
    buyOpen: false, scoreOpen: false, started: false,
    hitmarkT: 0, damageT: 0, flashOverlay: 0,
    grenades: [],
  };
}
