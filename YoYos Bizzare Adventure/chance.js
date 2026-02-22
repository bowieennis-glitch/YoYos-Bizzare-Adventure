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

  const CHANCE_ACE_IMG = new Image();
  CHANCE_ACE_IMG.src = 'data:image/jpeg;base64,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';

  const CHANCE_MINE_LIFE = 30;
  const CHANCE_MINE_TRIGGER_R = 18;
  const CHANCE_MINE_DAMAGE_MULT = 6;
  const CHANCE_MINE_EXPLOSION_RADIUS = 92;
  const CHANCE_MINE_COLORS = ['#22c55e', '#60a5fa', '#ef4444', '#a855f7'];

  const CHANCE_MINE_IMG = new Image();
  CHANCE_MINE_IMG.src = 'data:image/png;base64,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';

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
    headStreak: 0,
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
      const charges = clamp(Math.floor(s.eCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
      hud.qNum.textContent = charges.toString();
      const t = clamp(s.eRecharge || 0, 0, CHANCE_ABILITY_RECHARGE3_SEC);
      const p = (charges >= CHANCE_ABILITY_MAX_CHARGES) ? 1 : (1 - (t / CHANCE_ABILITY_RECHARGE3_SEC));
      hud.qRing.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }

    if (hud.eNum && hud.eRing) {
      const charges = clamp(Math.floor(s.qCharges || 0), 0, CHANCE_ABILITY_MAX_CHARGES);
      hud.eNum.textContent = charges.toString();
      const t = clamp(s.qRecharge || 0, 0, CHANCE_ABILITY_RECHARGE_SEC);
      const p = (charges >= CHANCE_ABILITY_MAX_CHARGES) ? 1 : (1 - (t / CHANCE_ABILITY_RECHARGE_SEC));
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
    const tailsChance = 0.5 + (((s.headStreak || 0) >= 3) ? 0.025 : 0);
    const heads = Math.random() >= tailsChance;
    s.coinCd = CHANCE_COIN_COOLDOWN;

    vfx.push({ kind: 'coin', x: player.x + 26, y: player.y + 6, life: CHANCE_COIN_VFX_LIFE, maxLife: CHANCE_COIN_VFX_LIFE, ang: 0, vy: -22 });

    if (heads) {
      s.headStreak = (s.headStreak || 0) + 1;
      s.weaknessStacks = Math.max(1, (s.weaknessStacks || 0) + 1);
      s.weaknessTimer = CHANCE_WEAKNESS_DURATION;
      hitTexts.push({ x: player.x, y: player.y - player.r - 20, text: 'HEADS', life: 0.9, vy: -22 });
      hitTexts.push({ x: player.x, y: player.y - player.r - 6, text: 'WEAKNESS 1', life: 0.9, vy: -22 });
    } else {
      s.headStreak = 0;
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
    const w = 28;
    const h = 28;
    if (CHANCE_ACE_IMG && CHANCE_ACE_IMG.complete && CHANCE_ACE_IMG.naturalWidth > 0) {
      ctx.drawImage(CHANCE_ACE_IMG, -w / 2, -h / 2, w, h);
    } else {
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
    }
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
      ctx.translate(m.x, m.y);
      ctx.rotate(m.ang || 0);

      const size = (m.r || CHANCE_MINE_TRIGGER_R) * 2.4;
      if (CHANCE_MINE_IMG && CHANCE_MINE_IMG.complete && CHANCE_MINE_IMG.naturalWidth > 0) {
        ctx.drawImage(CHANCE_MINE_IMG, -size / 2, -size / 2, size, size);
      } else {
        ctx.fillStyle = m.color || '#a855f7';
        ctx.beginPath();
        ctx.arc(0, 0, (m.r || CHANCE_MINE_TRIGGER_R), 0, Math.PI * 2);
        ctx.fill();
      }

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
      if (!spendCharge('e', api)) return false;
      dropMine(api);
      updateHud(api);
      return true;
    }

    if (e.code === 'KeyE') {
      if (!spendCharge('q', api)) return false;
      throwAce(api);
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
