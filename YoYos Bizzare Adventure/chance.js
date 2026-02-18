(() => {
  if (typeof window === 'undefined') return;
  if (typeof window.registerCharacter !== 'function') return;

  const CHANCE_COIN_COOLDOWN = 2.5;
  const CHANCE_WEAKNESS_DAMAGE_MULT = 1.10;
  const CHANCE_WEAKNESS_SPEED_MULT = 0.90;
  const CHANCE_WEAKNESS_DURATION = 15;

  const CHANCE_ABILITY_MAX_CHARGES = 5;
  const CHANCE_ABILITY_RECHARGE_SEC = 10;
  const CHANCE_ABILITY_RECHARGE3_SEC = CHANCE_ABILITY_RECHARGE_SEC * 1.2;
  const CHANCE_ABILITY_RECHARGE4_SEC = CHANCE_ABILITY_RECHARGE_SEC * 3;

  const CHANCE_ACE_DAMAGE_MULT = 8;
  const CHANCE_ACE_SPEED_MULT = 1.2;
  const CHANCE_ACE_RANGE_MULT = 1.15;
  const CHANCE_ACE_EXPLOSION_RADIUS = 64;

  const CHANCE_MINE_LIFE = 30;
  const CHANCE_MINE_TRIGGER_R = 18;
  const CHANCE_MINE_DAMAGE_MULT = 6;
  const CHANCE_MINE_EXPLOSION_RADIUS = 92;
  const CHANCE_MINE_COLORS = ['#22c55e', '#60a5fa', '#ef4444', '#a855f7'];

  const CHANCE_STEALTH_SEC = 10;
  const CHANCE_COIN_VFX_LIFE = 0.55;

  let hud = {
    abilitiesRoot: null,
    coinRing: null,
    coinNum: null,
    qRing: null,
    qNum: null,
    eRing: null,
    eNum: null,
    rRing: null,
    rNum: null,
    weaknessRoot: null,
    weaknessNum: null,
    weaknessTime: null
  };

  const s = {
    coinCd: 0,
    weaknessStacks: 0,
    weaknessTimer: 0,
    qCharges: 1,
    qRecharge: 0,
    eCharges: 1,
    eRecharge: 0,
    rCharges: 1,
    rRecharge: 0,
    rTails: 0,
    stealthTimer: 0,
    mines: []
  };

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function ensureHudRefs() {
    hud.abilitiesRoot = document.getElementById('chanceAbilitiesHud');
    hud.coinRing = document.getElementById('chanceAbilityHud');
    hud.coinNum = document.getElementById('chanceAbilityNum');
    hud.qRing = document.getElementById('chanceAbilityHud2');
    hud.qNum = document.getElementById('chanceAbilityNum2');
    hud.eRing = document.getElementById('chanceAbilityHud3');
    hud.eNum = document.getElementById('chanceAbilityNum3');
    hud.rRing = document.getElementById('chanceAbilityHud4');
    hud.rNum = document.getElementById('chanceAbilityNum4');
    hud.weaknessRoot = document.getElementById('chanceWeaknessHud');
    hud.weaknessNum = document.getElementById('chanceWeaknessNum');
    hud.weaknessTime = document.getElementById('chanceWeaknessTime');
  }

  function updateHud(api) {
    ensureHudRefs();
    const { state } = api;
    const show = state.phase !== 'title' && state.phase !== 'character';

    if (hud.abilitiesRoot) {
      if (show) hud.abilitiesRoot.classList.remove('hidden');
      else hud.abilitiesRoot.classList.add('hidden');
    }
    if (hud.weaknessRoot) {
      if (show) hud.weaknessRoot.classList.remove('hidden');
      else hud.weaknessRoot.classList.add('hidden');
    }

    if (!show) return;

    if (hud.coinNum && hud.coinRing) {
      const coinT = clamp(s.coinCd || 0, 0, CHANCE_COIN_COOLDOWN);
      hud.coinNum.textContent = (coinT > 0) ? Math.ceil(coinT).toString() : '';
      const coinP = (CHANCE_COIN_COOLDOWN <= 0) ? 1 : (1 - (coinT / CHANCE_COIN_COOLDOWN));
      hud.coinRing.style.setProperty('--p', clamp(coinP, 0, 1).toFixed(3));
    }

    if (hud.qNum && hud.qRing) {
      const charges = clamp(Math.floor(s.qCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
      hud.qNum.textContent = charges.toString();
      const t = clamp(s.qRecharge || 0, 0, CHANCE_ABILITY_RECHARGE_SEC);
      const p = (charges >= CHANCE_ABILITY_MAX_CHARGES) ? 1 : (1 - (t / CHANCE_ABILITY_RECHARGE_SEC));
      hud.qRing.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }

    if (hud.eNum && hud.eRing) {
      const charges = clamp(Math.floor(s.eCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
      hud.eNum.textContent = charges.toString();
      const t = clamp(s.eRecharge || 0, 0, CHANCE_ABILITY_RECHARGE3_SEC);
      const p = (charges >= CHANCE_ABILITY_MAX_CHARGES) ? 1 : (1 - (t / CHANCE_ABILITY_RECHARGE3_SEC));
      hud.eRing.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }

    if (hud.rNum && hud.rRing) {
      const charges = clamp(Math.floor(s.rCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
      hud.rNum.textContent = charges.toString();
      const t = clamp(s.rRecharge || 0, 0, CHANCE_ABILITY_RECHARGE4_SEC);
      const p = (charges >= CHANCE_ABILITY_MAX_CHARGES) ? 1 : (1 - (t / CHANCE_ABILITY_RECHARGE4_SEC));
      hud.rRing.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }

    if (hud.weaknessNum) hud.weaknessNum.textContent = Math.max(0, Math.floor(s.weaknessStacks || 0)).toString();
    if (hud.weaknessTime) {
      const t = Math.max(0, s.weaknessTimer || 0);
      hud.weaknessTime.textContent = (t > 0) ? ('(' + Math.ceil(t) + 's)') : '';
    }
  }

  function onTails() {
    const curQ = clamp(Math.floor(s.qCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
    const curE = clamp(Math.floor(s.eCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
    s.qCharges = clamp(curQ + 1, 0, CHANCE_ABILITY_MAX_CHARGES);
    s.eCharges = clamp(curE + 1, 0, CHANCE_ABILITY_MAX_CHARGES);
    if (s.qCharges >= CHANCE_ABILITY_MAX_CHARGES) s.qRecharge = 0;
    if (s.eCharges >= CHANCE_ABILITY_MAX_CHARGES) s.eRecharge = 0;

    s.rTails = (s.rTails || 0) + 1;
    if (s.rTails >= 3) {
      s.rTails = 0;
      const curR = clamp(Math.floor(s.rCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
      s.rCharges = clamp(curR + 1, 0, CHANCE_ABILITY_MAX_CHARGES);
      if (s.rCharges >= CHANCE_ABILITY_MAX_CHARGES) s.rRecharge = 0;
    }
  }

  function spendCharge(which, api) {
    if (api.state.phase !== 'playing') return false;
    if (which === 'q') {
      const cur = clamp(Math.floor(s.qCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
      if (cur <= 0) return false;
      s.qCharges = cur - 1;
      if (s.qCharges < CHANCE_ABILITY_MAX_CHARGES && (s.qRecharge || 0) <= 0) s.qRecharge = CHANCE_ABILITY_RECHARGE_SEC;
      return true;
    }
    if (which === 'e') {
      const cur = clamp(Math.floor(s.eCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
      if (cur <= 0) return false;
      s.eCharges = cur - 1;
      if (s.eCharges < CHANCE_ABILITY_MAX_CHARGES && (s.eRecharge || 0) <= 0) s.eRecharge = CHANCE_ABILITY_RECHARGE3_SEC;
      return true;
    }
    if (which === 'r') {
      const cur = clamp(Math.floor(s.rCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
      if (cur <= 0) return false;
      s.rCharges = cur - 1;
      if (s.rCharges < CHANCE_ABILITY_MAX_CHARGES && (s.rRecharge || 0) <= 0) s.rRecharge = CHANCE_ABILITY_RECHARGE4_SEC;
      return true;
    }
    return false;
  }

  function tryCoinFlip(api) {
    if (api.state.phase !== 'playing') return false;
    if ((s.coinCd || 0) > 0) return false;

    const { player, hitTexts, vfx } = api;
    const heads = Math.random() < 0.5;
    s.coinCd = CHANCE_COIN_COOLDOWN;

    vfx.push({ kind: 'coin', x: player.x + 26, y: player.y + 6, life: CHANCE_COIN_VFX_LIFE, maxLife: CHANCE_COIN_VFX_LIFE, ang: 0, vy: -22 });

    if (heads) {
      s.weaknessStacks = Math.max(1, (s.weaknessStacks || 0) + 1);
      s.weaknessTimer = CHANCE_WEAKNESS_DURATION;
      hitTexts.push({ x: player.x, y: player.y - player.r - 20, text: 'HEADS', life: 0.9, vy: -22 });
      hitTexts.push({ x: player.x, y: player.y - player.r - 6, text: 'WEAKNESS 1', life: 0.9, vy: -22 });
    } else {
      onTails();
      hitTexts.push({ x: player.x, y: player.y - player.r - 20, text: 'TAILS', life: 0.9, vy: -22 });
      hitTexts.push({ x: player.x, y: player.y - player.r - 6, text: 'RECHARGED', life: 0.9, vy: -22 });
    }
    updateHud(api);
    return true;
  }

  function throwAce(api) {
    const { player, bullets, norm, input, aim, state } = api;
    if (state.phase !== 'playing') return;
    const tx = (state.controlMode === 'mouse' ? input.mouse.x : aim.x);
    const ty = (state.controlMode === 'mouse' ? input.mouse.y : aim.y);
    const d = norm(tx - player.x, ty - player.y);
    const nx = d[0], ny = d[1];
    const muzzle = player.r + 10;
    const speed = player.projectileSpeed * CHANCE_ACE_SPEED_MULT;
    bullets.push({
      kind: 'ace',
      x: player.x + nx * muzzle,
      y: player.y + ny * muzzle,
      r: 10,
      ang: 0,
      vx: nx * speed,
      vy: ny * speed,
      damage: player.damage * CHANCE_ACE_DAMAGE_MULT,
      isCrit: false,
      critMult: 1.5,
      range: player.range * CHANCE_ACE_RANGE_MULT,
      pierce: 0,
      explosionRadius: CHANCE_ACE_EXPLOSION_RADIUS,
      rebound: 0,
      homingDeg: 0
    });
  }

  function dropMine(api) {
    const { player, state } = api;
    if (state.phase !== 'playing') return;
    const idx = Math.floor(Math.random() * CHANCE_MINE_COLORS.length);
    const color = CHANCE_MINE_COLORS[clamp(idx, 0, CHANCE_MINE_COLORS.length - 1)];
    s.mines.push({ x: player.x, y: player.y, r: CHANCE_MINE_TRIGGER_R, life: CHANCE_MINE_LIFE, ang: 0, color });
  }

  function activateStealth(api) {
    if (api.state.phase !== 'playing') return;
    s.stealthTimer = CHANCE_STEALTH_SEC;
  }

  function update(api, dt) {
    if (api.state.phase === 'title' || api.state.phase === 'character') return;

    if (s.coinCd > 0) s.coinCd = Math.max(0, s.coinCd - dt);
    if (s.stealthTimer > 0) s.stealthTimer = Math.max(0, s.stealthTimer - dt);

    if (s.weaknessTimer > 0) {
      s.weaknessTimer = Math.max(0, s.weaknessTimer - dt);
      if (s.weaknessTimer <= 0) s.weaknessStacks = 0;
    }

    const q = clamp(Math.floor(s.qCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
    if (q < CHANCE_ABILITY_MAX_CHARGES) {
      if ((s.qRecharge || 0) <= 0) s.qRecharge = CHANCE_ABILITY_RECHARGE_SEC;
      s.qRecharge = Math.max(0, (s.qRecharge || 0) - dt);
      if (s.qRecharge <= 0) { s.qRecharge = 0; s.qCharges = clamp(q + 1, 0, CHANCE_ABILITY_MAX_CHARGES); }
    } else {
      s.qRecharge = 0;
    }

    const e = clamp(Math.floor(s.eCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
    if (e < CHANCE_ABILITY_MAX_CHARGES) {
      if ((s.eRecharge || 0) <= 0) s.eRecharge = CHANCE_ABILITY_RECHARGE3_SEC;
      s.eRecharge = Math.max(0, (s.eRecharge || 0) - dt);
      if (s.eRecharge <= 0) { s.eRecharge = 0; s.eCharges = clamp(e + 1, 0, CHANCE_ABILITY_MAX_CHARGES); }
    } else {
      s.eRecharge = 0;
    }

    const r = clamp(Math.floor(s.rCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
    if (r < CHANCE_ABILITY_MAX_CHARGES) {
      if ((s.rRecharge || 0) <= 0) s.rRecharge = CHANCE_ABILITY_RECHARGE4_SEC;
      s.rRecharge = Math.max(0, (s.rRecharge || 0) - dt);
      if (s.rRecharge <= 0) { s.rRecharge = 0; s.rCharges = clamp(r + 1, 0, CHANCE_ABILITY_MAX_CHARGES); }
    } else {
      s.rRecharge = 0;
    }

    // Mine update & trigger
    for (let i = s.mines.length - 1; i >= 0; i--) {
      const m = s.mines[i];
      m.life -= dt;
      m.ang = (m.ang || 0) + dt * 1.6;
      if (m.life <= 0) { s.mines.splice(i, 1); continue; }
      let triggered = false;
      for (let k = 0; k < api.enemies.length; k++) {
        const en = api.enemies[k];
        if (!en || en.hp <= 0) continue;
        if (api.circleRectIntersect(m.x, m.y, m.r, en.x, en.y, en.w, en.h)) { triggered = true; break; }
      }
      if (triggered) {
        const dmg = api.player.damage * CHANCE_MINE_DAMAGE_MULT;
        api.dealExplosionDamage(m.x, m.y, CHANCE_MINE_EXPLOSION_RADIUS, dmg);
        s.mines.splice(i, 1);
      }
    }

    // Ace spin
    for (let i = 0; i < api.bullets.length; i++) {
      const b = api.bullets[i];
      if (b && b.kind === 'ace') b.ang = (b.ang || 0) + dt * 18;
    }

    updateHud(api);
  }

  function drawBullet(api, b, ctx) {
    if (!b || b.kind !== 'ace') return false;
    const ang = (b.ang || 0);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(ang);
    const w = 22, h = 28;
    const r = 4;
    ctx.fillStyle = 'rgba(245,247,255,0.98)';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w/2 + r, -h/2);
    ctx.lineTo(w/2 - r, -h/2);
    ctx.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
    ctx.lineTo(w/2, h/2 - r);
    ctx.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
    ctx.lineTo(-w/2 + r, h/2);
    ctx.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
    ctx.lineTo(-w/2, -h/2 + r);
    ctx.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111827';
    ctx.font = '900 12px system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('A♠', -w/2 + 4, -h/2 + 3);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 16px system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif';
    ctx.fillText('♠', 0, 2);
    ctx.restore();
    return true;
  }

  function postDraw(api, ctx) {
    if (!s.mines || s.mines.length === 0) return;
    ctx.save();
    for (const m of s.mines) {
      ctx.save();
      const a = clamp(m.life / (CHANCE_MINE_LIFE || 0.001), 0, 1);
      ctx.globalAlpha = 0.92 * a;
      const r0 = m.r;
      const r1 = r0 * 0.78;
      const r2 = r0 * 0.55;
      ctx.translate(m.x, m.y);
      ctx.rotate(m.ang || 0);

      ctx.fillStyle = m.color || '#a855f7';
      ctx.beginPath();
      ctx.arc(0, 0, r0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.arc(0, 0, r1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = m.color || '#a855f7';
      ctx.beginPath();
      ctx.arc(0, 0, r2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r0 - 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245,247,255,0.55)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 10; i++) {
        const t = (i / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(0, 0, r0 - 2.5, t - 0.06, t + 0.06);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#111827';
      ctx.font = '900 14px system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♣', 0, 1);

      ctx.restore();
    }
    ctx.restore();
  }

  function getMoveSpeedMult() {
    const stacks = Math.max(0, Math.floor(s.weaknessStacks || 0));
    if (stacks <= 0) return 1;
    return Math.pow(CHANCE_WEAKNESS_SPEED_MULT, stacks);
  }

  function getDamageTakenMult() {
    const stacks = Math.max(0, Math.floor(s.weaknessStacks || 0));
    if (stacks <= 0) return 1;
    return Math.pow(CHANCE_WEAKNESS_DAMAGE_MULT, stacks);
  }

  function isInvincible() {
    return (s.stealthTimer || 0) > 0;
  }

  function getPlayerAlpha() {
    return isInvincible() ? 0.15 : 1;
  }

  function reset(api) {
    s.coinCd = 0;
    s.weaknessStacks = 0;
    s.weaknessTimer = 0;
    s.qCharges = 1;
    s.qRecharge = 0;
    s.eCharges = 1;
    s.eRecharge = 0;
    s.rCharges = 1;
    s.rRecharge = 0;
    s.rTails = 0;
    s.stealthTimer = 0;
    s.mines.length = 0;
    updateHud(api);
  }

  function recharge(api) {
    // Keep behavior: allow external "recharge all" to clear cooldowns.
    s.coinCd = 0;
    s.qRecharge = 0;
    s.eRecharge = 0;
    s.rRecharge = 0;
    updateHud(api);
  }

  function onKeyDown(api, e) {
    // Return true if consumed.
    if (api.state.phase === 'title' || api.state.phase === 'character') return false;

    if (e.code === 'Space') {
      api.input.space = true;
      return tryCoinFlip(api);
    }

    if (e.code === 'KeyQ') {
      if (!spendCharge('q', api)) return false;
      throwAce(api);
      updateHud(api);
      return true;
    }

    if (e.code === 'KeyE') {
      if (!spendCharge('e', api)) return false;
      dropMine(api);
      updateHud(api);
      return true;
    }

    if (e.code === 'KeyR') {
      if (api.state.phase === 'message') return false;
      if (!spendCharge('r', api)) return false;
      activateStealth(api);
      updateHud(api);
      return true;
    }

    return false;
  }

  // Chance base firing modifier:
  // - Shoots 2x slower than default
  // - Deals 50% damage
  function fire(api) {
    const { player, fireBullet } = api;
    const originalDamage = player.damage;
    player.damage = originalDamage * 0.5;
    fireBullet();
    player.damage = originalDamage;
    player.shotCooldown = player.shotInterval * 2;
  }

  window.registerCharacter({
    id: 'chance',
    name: 'Chance',
    color: '#ff3b3b',
    hpColor: '#ffffff',
    init: (api) => { ensureHudRefs(); reset(api); },
    reset: (api) => reset(api),
    recharge: (api) => recharge(api),
    update: (api, dt) => update(api, dt),
    updateHud: (api) => updateHud(api),
    onKeyDown: (api, e) => onKeyDown(api, e),
    fire: (api) => fire(api),
    drawBullet: (api, b, ctx) => drawBullet(api, b, ctx),
    postDraw: (api, ctx) => postDraw(api, ctx),
    getMoveSpeedMult: () => getMoveSpeedMult(),
    getDamageTakenMult: () => getDamageTakenMult(),
    isInvincible: () => isInvincible(),
    getPlayerAlpha: () => getPlayerAlpha()
  });
})();
