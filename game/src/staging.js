// Staged screenshot states: ?stage=cover|buy|grenade|defuse&seed=7.
// Each stage sets real match state (round, scores, funds, positions,
// plant progress) through the same fields the live game uses, then the
// tableau loop replays visible fire effects on a fixed schedule so the
// action reads at any capture instant. Inert without parameters.
import { SITES } from './data.js';
import { pushChatter } from './sim.js';
import { spawnTracer, spawnSparks } from './combat.js';

function place(a, x, z, yaw, extra) {
  a.x = x; a.z = z; a.yaw = yaw; a.pitch = 0;
  a.vx = 0; a.vz = 0; a.moving = false;
  if (extra) Object.assign(a, extra);
}
function find(state, name) { return state.actors.find((a) => a.name === name); }

function baseSetup(state) {
  state.started = true;
  state.stageHold = true;
  for (const a of state.actors) {
    a.hp = 100; a.alive = true; a.armour = 0;
    if (a.ai) { a.ai.target = null; a.ai.mode = 'hold'; }
  }
}

export function applyStage(state, name) {
  state.stage = name;
  const p = state.player;
  baseSetup(state);
  if (name === 'cover') {
    state.round = 7; state.scoreA = 6; state.scoreB = 5; state.chapter = 3;
    state.phase = 'live'; state.phaseT = 83;
    p.funds = 1250; p.hp = 78; p.armour = 40; p.kills = 8; p.deaths = 3;
    p.owned = ['nova', 'eclipse', 'ridge']; p.weapon = 'nova';
    p.ammo = { nova: { mag: 24, reserve: 90 }, eclipse: { mag: 12, reserve: 48 }, ridge: { mag: Infinity, reserve: Infinity } };
    p.mag = 24; p.reserve = 90;
    p.utilities = { frag: 1, flash: 0, smoke: 1, flare: 0 }; p.utilSel = 'frag';
    p.spread = 0.03;
    place(p, -9, 6, 0.18);
    state.view.yaw = 0.18; state.view.pitch = 0.02; state.view.third = false;
    place(find(state, 'COLE'), -22.8, -18.6, 2.5, { crouched: true, hasCase: false, planting: 1, kills: 2, deaths: 4 });
    find(state, 'COLE').parts.tag.position.y = 2.55;
    place(find(state, 'MARA'), -6.5, -2.2, 0.5, { kills: 5, deaths: 3 });
    place(find(state, 'TAMS'), -16, -2, 0.45, { kills: 7, deaths: 2 });
    place(find(state, 'RUE'), -12.5, 3.5, 0.9, { alive: false, hp: 0, kills: 3, deaths: 5 });
    place(find(state, 'FENN'), -15.5, -8, -2.71, { hp: 42, kills: 6, deaths: 4 });
    place(find(state, 'ILSA'), 0.5, -9.5, -2.8, { kills: 6, deaths: 3 });
    place(find(state, 'PETRA'), 22, -24, -2.6, { kills: 4, deaths: 4 });
    place(find(state, 'ORIN'), -13, -12.5, -2.2, { hp: 61, kills: 5, deaths: 5 });
    place(find(state, 'DORIN'), -18, -15.5, -2.5, { alive: false, hp: 0, kills: 2, deaths: 6 });
    state.charge = { state: 'planting', site: SITES.A, x: SITES.A.x, z: SITES.A.z, fuse: 0, carrier: find(state, 'COLE'), planted: false };
    state.plant = { active: true, who: find(state, 'COLE'), site: SITES.A, t: 2.52, need: 4 };
    state.killfeed = [
      { killer: 'YOU', victim: 'DORIN', head: true, team: 'alder', t: 0 },
      { killer: 'MARA', victim: 'ORIN', head: false, team: 'alder', t: 0 },
      { killer: 'ILSA', victim: 'RUE', head: true, team: 'birch', t: 0 },
    ];
    state.chatter = [];
    pushChatter(state, 'COLE', 'CARRIER', 'Filing the charter at the plinth — cover me!');
    pushChatter(state, 'MARA', 'SUPPORT', 'Hold the crosswalk. Nobody reaches Cole.');
    pushChatter(state, 'TAMS', 'SNIPER', 'Two on the plaza gate. I have the long lane.');
    state.tableau = {
      t: 0, next: 0.1,
      pairs: [
        { from: 'YOU', to: 'FENN', number: '87 HEADSHOT' },
        { from: 'FENN', to: 'YOU', number: null },
        { from: 'ILSA', to: 'MARA', number: null },
        { from: 'TAMS', to: 'ORIN', number: '34' },
      ],
      vmFire: true,
    };
  } else if (name === 'buy') {
    state.round = 1; state.scoreA = 0; state.scoreB = 0; state.chapter = 1;
    state.phase = 'buy'; state.phaseT = 9;
    p.funds = 4200; p.hp = 100; p.armour = 0; p.kills = 0; p.deaths = 0;
    p.owned = ['eclipse']; p.weapon = 'eclipse';
    p.mag = 12; p.reserve = 48;
    p.utilities = { frag: 0, flash: 0, smoke: 0, flare: 0 };
    place(p, 0, 28, 0);
    state.view.yaw = 0; state.view.pitch = 0; state.view.third = false;
    place(find(state, 'COLE'), -3, 27, 0.2, { hasCase: true });
    place(find(state, 'MARA'), 3, 27, -0.2);
    place(find(state, 'TAMS'), -5, 28.5, 0.1);
    place(find(state, 'RUE'), 5, 28.5, -0.1);
    state.charge.carrier = find(state, 'COLE');
    state.buyOpen = true;
    state.chatter = [];
    pushChatter(state, 'COLE', 'CARRIER', 'Charter case on my back. Two thousand names.');
    pushChatter(state, 'RUE', 'LURKER', 'My bus is the cover. Mind the doors.');
    state.tableau = { t: 0, next: 99, pairs: [], vmFire: false };
  } else if (name === 'grenade') {
    state.round = 5; state.scoreA = 3; state.scoreB = 2; state.chapter = 2;
    state.phase = 'live'; state.phaseT = 65;
    p.funds = 900; p.hp = 92; p.armour = 50; p.kills = 6; p.deaths = 3;
    p.owned = ['comet', 'eclipse']; p.weapon = 'comet';
    p.ammo = { comet: { mag: 28, reserve: 64 }, eclipse: { mag: 12, reserve: 48 } };
    p.mag = 28; p.reserve = 64;
    p.utilities = { frag: 1, flash: 1, smoke: 0, flare: 1 }; p.utilSel = 'smoke';
    place(p, 3, 9, 0.55);
    state.view.yaw = 0.55; state.view.pitch = 0.03; state.view.third = false;
    place(find(state, 'MARA'), -4, 0, 0.7, { kills: 4, deaths: 3 });
    place(find(state, 'TAMS'), 4.5, -3, 0.3, { kills: 5, deaths: 2 });
    place(find(state, 'RUE'), -9, 4, 1.0, { kills: 3, deaths: 3 });
    place(find(state, 'COLE'), 1, 12, 0.3, { hasCase: true, kills: 1, deaths: 3 });
    place(find(state, 'FENN'), -15, -6, -2.4, { kills: 4, deaths: 3 });
    place(find(state, 'ILSA'), -8, -2, -2.36, { kills: 5, deaths: 2 });
    place(find(state, 'ORIN'), -13, -9, -2.5, { kills: 3, deaths: 4 });
    place(find(state, 'PETRA'), 22, -24, -2.6, { kills: 2, deaths: 3 });
    place(find(state, 'DORIN'), 6, -20, 0.2, { kills: 3, deaths: 3 });
    state.effects.smokes = [{ x: -3, z: -4, age: 0.8, life: 12 }];
    state.effects.flares = [{ x: -2, y: 12, z: -16, life: 6 }];
    state.killfeed = [
      { killer: 'TAMS', victim: 'ORIN', head: false, team: 'alder', t: 0 },
      { killer: 'YOU', victim: 'DORIN', head: false, team: 'alder', t: 0 },
    ];
    state.chatter = [];
    pushChatter(state, 'YOU', 'ENTRY', 'Smoke on the crosswalk — pushing mid!');
    pushChatter(state, 'RUE', 'LURKER', 'Flare up. The whole street can see us.');
    pushChatter(state, 'MARA', 'SUPPORT', 'Windows open. The district is watching.');
    state.tableau = {
      t: 0, next: 0.2,
      pairs: [
        { from: 'TAMS', to: 'ILSA', number: null },
        { from: 'ILSA', to: 'MARA', number: null },
        { from: 'FENN', to: 'YOU', number: null },
      ],
      vmFire: false,
    };
  } else if (name === 'defuse') {
    state.round = 8; state.scoreA = 3; state.scoreB = 4; state.chapter = 3;
    state.phase = 'end'; state.phaseT = 0;
    state.winner = 'birch'; state.winReason = 'CHARGE DEFUSED';
    state.banner = 'ROUND TO BIRCH — CHARGE DEFUSED'; state.bannerT = 99;
    p.funds = 2100; p.hp = 34; p.armour = 0; p.kills = 9; p.deaths = 4;
    p.owned = ['nova', 'eclipse']; p.weapon = 'nova';
    p.ammo = { nova: { mag: 11, reserve: 30 }, eclipse: { mag: 12, reserve: 48 } };
    p.mag = 11; p.reserve = 30;
    p.utilities = { frag: 0, flash: 0, smoke: 0, flare: 0 };
    place(p, -19, -18, 1.1);
    state.view.yaw = 1.1; state.view.pitch = 0.05; state.view.third = true;
    place(find(state, 'COLE'), -23.4, -19.2, 2.5, { alive: false, hp: 0, kills: 3, deaths: 5, funds: 950 });
    place(find(state, 'MARA'), -17.5, -21, 1.4, { hp: 56, kills: 6, deaths: 4, funds: 1450 });
    place(find(state, 'TAMS'), -16, -20, 0.9, { alive: false, hp: 0, kills: 8, deaths: 3, funds: 300 });
    place(find(state, 'RUE'), -22, -15.5, 1.1, { alive: false, hp: 0, kills: 4, deaths: 5, funds: 2200 });
    place(find(state, 'FENN'), -24.5, -20.5, 2.6, { hp: 48, kills: 7, deaths: 4, defusing: 0, funds: 1800 });
    place(find(state, 'ILSA'), -8, -14, -2.6, { hp: 71, kills: 8, deaths: 3, funds: 600 });
    place(find(state, 'PETRA'), -27, -17, -2.6, { alive: false, hp: 0, kills: 5, deaths: 4, funds: 2750 });
    place(find(state, 'ORIN'), -15, -17.5, -2.3, { alive: false, hp: 0, kills: 6, deaths: 5, funds: 400 });
    place(find(state, 'DORIN'), -21, -22.5, 2.9, { hp: 83, kills: 4, deaths: 3, funds: 1300 });
    state.charge = { state: 'defused', site: SITES.A, x: SITES.A.x, z: SITES.A.z, fuse: 0, carrier: null, planted: false };
    state.killfeed = [
      { killer: 'FENN', victim: 'COLE', head: false, team: 'birch', t: 0 },
      { killer: 'YOU', victim: 'PETRA', head: true, team: 'alder', t: 0 },
      { killer: 'ILSA', victim: 'TAMS', head: true, team: 'birch', t: 0 },
    ];
    state.chatter = [];
    pushChatter(state, 'FENN', 'ANCHOR', 'Working the case. Keep them off me.');
    pushChatter(state, 'DORIN', 'SUPPORT', 'They filed it — cut the charge, now!');
    state.scoreOpen = true;
    state.tableau = { t: 0, next: 99, pairs: [], vmFire: false };
  }
}

// Tableau effects loop: tracers, muzzle flashes, sparks, and one pinned
// damage number, replayed on a dense fixed schedule so a capture at any
// instant shows live fire. No damage is dealt, so the composition stays
// stable for the screenshot.
export function tickTableau(state, dt, vm, muzzleWorld) {
  const tab = state.tableau;
  if (!tab) return;
  tab.t += dt;
  for (const s of state.effects.smokes) { s.age = Math.min(2, s.age + dt); s.life = 12; }
  for (const f of state.effects.flares) f.life = 6;
  // The cover's pinned hit moment is always on screen, never stacked.
  if (state.stage === 'cover') {
    const fenn = find(state, 'FENN');
    const has = state.effects.numbers.some((n) => n.text === '87 HEADSHOT' && n.t < 0.6);
    if (!has && fenn) {
      state.effects.numbers.push({ x: fenn.x, y: fenn.y + 2.0, z: fenn.z, text: '87 HEADSHOT', head: true, t: 0, life: 1.0 });
    }
    state.hitmarkT = 0.25;
  }
  if (tab.t < tab.next) return;
  tab.next = tab.t + 0.3;
  // Fire every pair each cycle so the exchange is always mid-flight.
  for (const pair of tab.pairs) {
    const from = find(state, pair.from);
    const to = find(state, pair.to);
    if (!from || !to) continue;
    const o = { x: from.x, y: from.y + 1.45, z: from.z };
    const tp = { x: to.x, y: to.y + 1.3, z: to.z };
    if (pair.from === 'YOU' && muzzleWorld) {
      o.x = muzzleWorld.x; o.y = muzzleWorld.y; o.z = muzzleWorld.z;
    }
    spawnTracer(o, tp, from.team, 0.28);
    spawnSparks(tp, 4, pair.from === 'YOU' ? 0xff5040 : 0xffe9a0);
    from.flashT = 0.25;
  }
  for (const pair of tab.pairs) {
    if (pair.number && pair.number !== '87 HEADSHOT') {
      const to = find(state, pair.to);
      if (!to) continue;
      const has = state.effects.numbers.some((n) => n.text === pair.number && n.t < 0.5);
      if (!has) state.effects.numbers.push({ x: to.x, y: to.y + 2.0, z: to.z, text: pair.number, head: false, t: 0, life: 0.9 });
    }
  }
  if (state.stage === 'cover' && vm) vm.fire();
}
