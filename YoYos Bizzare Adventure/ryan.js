

(() => {
  if (typeof window === 'undefined') return;
  if (typeof window.registerCharacter !== 'function') return;

  // ==========================================
  // CONFIGURATION
  // ==========================================
  const DASH_DISTANCE = 120;
  const DASH_COOLDOWN_BASE = 5;
  const NANAMI_BUFF_SEC = 10;
  const NANAMI_COOLDOWN_SEC = 20;
  const OVERFLOW_PUDDLE_LIFE = 10;
  const OVERFLOW_PUDDLE_R = 70;
  const OVERFLOW_SLOW_MULT = 0.5;
  const OVERFLOW_TICK_DPS = 2;
  const OVERFLOW_MAX_PER_ROUND = 3;
  const DUMMY_BOMB_LIFE = 3;
  const DUMMY_BOMB_COOLDOWN_SEC = 15;
  const DUMMY_BOMB_R = 18;
  const DUMMY_BOMB_EXPLODE_R = 110;
  const DUMMY_BOMB_DAMAGE_MULT = 8;
  const SWING_COOLDOWN = 0.5;
  const SWING_LIFE = 0.5;
  const BASE_CRIT_CHANCE = 0.20;
  const BLEED_DURATION = 2;
  const SPARK_COUNT = 0;

  const HUD_COOLDOWN_TOTAL = DASH_COOLDOWN_BASE;

  let hud = {
    root: null,
    ring: null,
    num: null,
    nanamiRing: null,
    nanamiNum: null,
    overflowRing: null,
    overflowNum: null,
    dummyRing: null,
    dummyNum: null
  };

  // ==========================================
  // STATE
  // ==========================================
  let slashes = [];
  let puddles = [];
  let overflowUsedThisRound = 0;
  let overflowRound = 0;

  const dummyBomb = {
    active: false,
    x: 0,
    y: 0,
    t: 0,
    cdT: 0
  };

  const nanami = {
    buffT: 0,
    cdT: 0,
    dmgMult: 1,
    intervalMult: 1,
    rangeMult: 1,
    maxHpMult: 1,
    damageTakenMult: 1
  };

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function ensureHudRefs() {
    hud.root = document.getElementById('ryanAbilitiesHud');
    hud.ring = document.getElementById('ryanDashHud');
    hud.num = document.getElementById('ryanDashNum');
    hud.nanamiRing = document.getElementById('ryanNanamiHud');
    hud.nanamiNum = document.getElementById('ryanNanamiNum');
    hud.overflowRing = document.getElementById('ryanOverflowHud');
    hud.overflowNum = document.getElementById('ryanOverflowNum');
    hud.dummyRing = document.getElementById('ryanDummyHud');
    hud.dummyNum = document.getElementById('ryanDummyNum');
  }

  function startOverflow(api) {
    if (api.state.phase !== 'playing') return false;
    if ((api.enemies || []).length <= 0) return false;

    const curRound = Math.max(1, Math.floor(api.state.round || 1));
    if (overflowRound !== curRound) {
      overflowRound = curRound;
      overflowUsedThisRound = 0;
    }
    if (overflowUsedThisRound >= OVERFLOW_MAX_PER_ROUND) return false;

    overflowUsedThisRound += 1;
    const x = api.player.x;
    const y = api.player.y;
    puddles.push({ x, y, r: OVERFLOW_PUDDLE_R, life: OVERFLOW_PUDDLE_LIFE, maxLife: OVERFLOW_PUDDLE_LIFE, seed: Math.random() * 1000 });
    return true;
  }

  function startDummyBomb(api) {
    if (api.state.phase !== 'playing') return false;
    if (dummyBomb.active) return false;
    if ((dummyBomb.cdT || 0) > 0) return false;

    dummyBomb.active = true;
    dummyBomb.x = api.player.x;
    dummyBomb.y = api.player.y;
    dummyBomb.t = DUMMY_BOMB_LIFE;
    dummyBomb.cdT = DUMMY_BOMB_COOLDOWN_SEC;
    updateHud(api);
    return true;
  }

  function applyNanamiMultipliers(api, target) {
    const { player } = api;

    const dmgMult = (typeof target.dmgMult === 'number') ? target.dmgMult : 1;
    const intervalMult = (typeof target.intervalMult === 'number') ? target.intervalMult : 1;
    const rangeMult = (typeof target.rangeMult === 'number') ? target.rangeMult : 1;
    const maxHpMult = (typeof target.maxHpMult === 'number') ? target.maxHpMult : 1;
    const damageTakenMult = (typeof target.damageTakenMult === 'number') ? target.damageTakenMult : 1;

    const dmgFactor = dmgMult / (nanami.dmgMult || 1);
    const intervalFactor = intervalMult / (nanami.intervalMult || 1);
    const rangeFactor = rangeMult / (nanami.rangeMult || 1);
    const maxHpFactor = maxHpMult / (nanami.maxHpMult || 1);
    const damageTakenFactor = damageTakenMult / (nanami.damageTakenMult || 1);

    player.damage *= dmgFactor;
    player.shotInterval = Math.max(0.05, player.shotInterval * intervalFactor);
    player.range *= rangeFactor;

    const prevMax = Math.max(1, player.maxHp || 1);
    const newMax = Math.max(1, prevMax * maxHpFactor);
    const hpRatio = (player.hp || 0) / prevMax;
    player.maxHp = newMax;
    player.hp = Math.min(player.maxHp, Math.max(0, hpRatio * newMax));

    nanami.dmgMult = dmgMult;
    nanami.intervalMult = intervalMult;
    nanami.rangeMult = rangeMult;
    nanami.maxHpMult = maxHpMult;
    nanami.damageTakenMult = damageTakenMult;
    nanami._damageTakenFactor = damageTakenFactor;
  }

  function startNanami(api) {
    if ((nanami.buffT || 0) > 0) return false;
    if ((nanami.cdT || 0) > 0) return false;

    nanami.buffT = NANAMI_BUFF_SEC;
    nanami.cdT = 0;
    applyNanamiMultipliers(api, {
      dmgMult: 1.3,
      intervalMult: 1 / 1.3,
      rangeMult: 1.3,
      maxHpMult: 1.3,
      damageTakenMult: 1 / 1.3
    });
    updateHud(api);
    return true;
  }

  function updateHud(api) {
    ensureHudRefs();
    const { state, player } = api;
    const show = state.phase !== 'title' && state.phase !== 'character';
    if (hud.root) {
      if (show) hud.root.classList.remove('hidden');
      else hud.root.classList.add('hidden');
    }
    if (!show) return;

    if (hud.num && hud.ring) {
      const t = clamp(player.dashCooldown || 0, 0, HUD_COOLDOWN_TOTAL || 0);
      hud.num.textContent = (t > 0) ? Math.ceil(t).toString() : '';
      const p = (HUD_COOLDOWN_TOTAL <= 0) ? 1 : (1 - (t / HUD_COOLDOWN_TOTAL));
      hud.ring.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }

    if (hud.nanamiNum && hud.nanamiRing) {
      const bt = clamp(nanami.buffT || 0, 0, NANAMI_BUFF_SEC);
      const ct = clamp(nanami.cdT || 0, 0, NANAMI_COOLDOWN_SEC);
      const isBuff = bt > 0;
      const isCd = !isBuff && ct > 0;
      const t = isBuff ? bt : (isCd ? ct : 0);
      const total = isBuff ? NANAMI_BUFF_SEC : (isCd ? NANAMI_COOLDOWN_SEC : 0);
      hud.nanamiNum.textContent = (t > 0) ? Math.ceil(t).toString() : '';
      const p = (total <= 0) ? 1 : (1 - (t / total));
      hud.nanamiRing.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }

    if (hud.overflowNum && hud.overflowRing) {
      const curRound = Math.max(1, Math.floor(state.round || 1));
      const used = (overflowRound === curRound) ? overflowUsedThisRound : 0;
      const left = clamp(OVERFLOW_MAX_PER_ROUND - used, 0, OVERFLOW_MAX_PER_ROUND);
      hud.overflowNum.textContent = (left > 0) ? left.toString() : '';
      const p = (OVERFLOW_MAX_PER_ROUND <= 0) ? 1 : (left / OVERFLOW_MAX_PER_ROUND);
      hud.overflowRing.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }

    if (hud.dummyNum && hud.dummyRing) {
      const t = clamp(dummyBomb.cdT || 0, 0, DUMMY_BOMB_COOLDOWN_SEC);
      hud.dummyNum.textContent = (t > 0) ? Math.ceil(t).toString() : '';
      const p = (DUMMY_BOMB_COOLDOWN_SEC <= 0) ? 1 : (1 - (t / DUMMY_BOMB_COOLDOWN_SEC));
      hud.dummyRing.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  const isPointInArc = (px, py, ox, oy, angle, arcRadius, arcAngle) => {
    const dx = px - ox;
    const dy = py - oy;
    const dist = Math.hypot(dx, dy);
    if (dist > arcRadius) return false;
    
    const pointAngle = Math.atan2(dy, dx);
    let angleDiff = pointAngle - angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    return Math.abs(angleDiff) <= arcAngle / 2;
  };

  const getCritChance = (player) => {
    const luckBonus = (player.luck || 0) * 0.002;
    return Math.max(0, BASE_CRIT_CHANCE + (player.critChance || 0) + luckBonus);
  };

  const getCritMultiplier = (player) => {
    return 1.5 + Math.max(0, player.critDamage || 0);
  };

  // ==========================================
  // COMBAT FUNCTIONS
  // ==========================================
  const applySlashDamage = (api, enemy, isCrit, critMult) => {
    const { player, hitTexts, registerKill, vfx, rand } = api;
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.h / 2;
    
    const bleedMult = (enemy.bleedTime && enemy.bleedTime > 0) ? 2 : 1;
    const baseDamage = player.damage * 2;
    const finalDamage = baseDamage * (isCrit ? critMult : 1) * bleedMult;
    
    const wasAlive = enemy.hp > 0;
    enemy.hp -= finalDamage;
    hitTexts.push({ x: cx, y: cy, text: '-' + finalDamage, life: 0.6, vy: -30 });
    
    if (wasAlive && enemy.hp <= 0) registerKill();
    
    // Spawn hit spark
    const ea = Math.atan2(cy - player.y, cx - player.x);
    const sp = rand(40, 200);
    vfx.push({ 
      kind: 'spark', x: cx, y: cy, 
      vx: Math.cos(ea) * sp, vy: Math.sin(ea) * sp, 
      life: rand(0.2, 0.35), maxLife: 0.35, 
      size: rand(1.4, 2.8), color: 'rgba(160,0,0,1)' 
    });
    
    return finalDamage;
  };

  const applyBleedEffect = (api, enemy, isCrit) => {
    if (!isCrit) return;
    const { player, hitTexts } = api;
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.h / 2;
    
    const bleedDamage = player.damage * 0.25;
    enemy.bleedTime = BLEED_DURATION;
    enemy.bleedDps = bleedDamage / BLEED_DURATION;
    hitTexts.push({ x: cx, y: cy - 14, text: 'CRIT', life: 0.6, vy: -18 });
  };

  const applyExplosionDamage = (api, hitEnemy, baseDamage, hitTexts, registerKill) => {
    const { player, enemies, circleRectIntersect, spawnExplosionVfx } = api;
    if (!player.explosionRadius || player.explosionRadius <= 0) return;
    
    const cx = hitEnemy.x + hitEnemy.w / 2;
    const cy = hitEnemy.y + hitEnemy.h / 2;
    spawnExplosionVfx(cx, cy, player.explosionRadius);
    
    for (const ee of enemies) {
      if (!ee || ee === hitEnemy || ee.hp <= 0) continue;
      if (circleRectIntersect(cx, cy, player.explosionRadius, ee.x, ee.y, ee.w, ee.h)) {
        const eeMult = (ee.bleedTime && ee.bleedTime > 0) ? 2 : 1;
        const eeWasAlive = ee.hp > 0;
        const aoe = baseDamage * 0.75 * eeMult;
        ee.hp -= aoe;
        hitTexts.push({ x: ee.x + ee.w / 2, y: ee.y + ee.h / 2, text: '-' + aoe, life: 0.6, vy: -30 });
        if (eeWasAlive && ee.hp <= 0) registerKill();
      }
    }
  };

  // ==========================================
  // MAIN SLASH FUNCTION
  // ==========================================
  const doSlash = (api) => {
    const { player, state, input, aim, enemies, hitTexts, norm, registerKill, rand, vfx, spawnExplosionVfx, circleRectIntersect } = api;
    
    // Calculate slash direction
    const dx = (state.controlMode === 'mouse' ? input.mouse.x : aim.x) - player.x;
    const dy = (state.controlMode === 'mouse' ? input.mouse.y : aim.y) - player.y;
    const [nx, ny] = norm(dx, dy);
    const slashAngle = Math.atan2(ny, nx);
    
    // Calculate slash stats
    const slashRange = Math.max(60, (player.range || 0) * 0.2) + (player.pierce || 0) * 12;
    const slashArc = Math.max(0.001, Math.PI * 0.9 - (60 * Math.PI / 180));
    
    // Roll crit once for this slash
    const critChance = getCritChance(player);
    const critMult = getCritMultiplier(player);
    const isCrit = Math.random() < critChance;
    
    // Track hit enemies to prevent double-hits
    const hitEnemies = new Set();
    const baseDamage = player.damage * 2;
    
    // Check each enemy
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      
      const cx = enemy.x + enemy.w / 2;
      const cy = enemy.y + enemy.h / 2;
      const enemyRadius = Math.max(enemy.w, enemy.h) * 0.5;
      
      // Check if enemy is in slash arc (with padding for enemy radius)
      if (!isPointInArc(cx, cy, player.x, player.y, slashAngle, slashRange + enemyRadius, slashArc)) {
        continue;
      }
      
      if (hitEnemies.has(enemy)) continue;
      hitEnemies.add(enemy);
      
      // Apply damage
      applySlashDamage(api, enemy, isCrit, critMult);
      applyBleedEffect(api, enemy, isCrit);
      applyExplosionDamage(api, enemy, baseDamage, hitTexts, registerKill);
    }
    
    // Create slash visual
    slashes.push({
      ox: player.x, oy: player.y,
      ang: slashAngle, arc: slashArc, r: slashRange,
      life: SWING_LIFE, maxLife: SWING_LIFE
    });
    
    // Set cooldown
    const baseInterval = 0.16;
    const rateMult = Math.max(0.15, (player.shotInterval || baseInterval) / baseInterval);
    player.shotCooldown = Math.max(0.12, SWING_COOLDOWN * rateMult);
    
    // Spawn slash VFX sparks
    for (let i = 0; i < SPARK_COUNT; i++) {
      const a = slashAngle + rand(-slashArc * 0.5, slashArc * 0.5);
      const rr = rand(player.r + 6, slashRange);
      const x = player.x + Math.cos(a) * rr;
      const y = player.y + Math.sin(a) * rr;
      const sp = rand(60, 320);
      vfx.push({
        kind: 'spark', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.18, 0.4), maxLife: 0.4,
        size: rand(1.4, 3.2),
        color: Math.random() < 0.6 ? 'rgba(83,209,255,1)' : 'rgba(245,247,255,1)'
      });
    }
  };

  const dash = (api) => {
    const { player, canvas, clamp, rand, vfx, enemies, circleRectIntersect, damagePlayer } = api;
    if (player.dashCooldown > 0) return false;
    
    const nx = player.moveDirX || 0;
    const ny = player.moveDirY || 0;
    if (nx === 0 && ny === 0) return false;

    const startX = player.x;
    const startY = player.y;

    // Perform dash
    player.x = clamp(player.x + nx * DASH_DISTANCE, player.r, canvas.width - player.r);
    player.y = clamp(player.y + ny * DASH_DISTANCE, player.r, canvas.height - player.r);

    // Calculate dash damage from passing through enemies
    const endX = player.x;
    const endY = player.y;
    const segLen = Math.hypot(endX - startX, endY - startY);
    const steps = Math.max(1, Math.ceil(segLen / 12));
    let dashDamage = 0;
    
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = startX + (endX - startX) * t;
      const py = startY + (endY - startY) * t;
      for (const e of enemies) {
        if (!e || e.hp <= 0) continue;
        if (circleRectIntersect(px, py, player.r, e.x, e.y, e.w, e.h)) {
          dashDamage += (e.contactDps || 0) * (0.10 / steps);
        }
      }
    }
    
    if (dashDamage > 0) damagePlayer(dashDamage, endX, endY - player.r - 8);

    // Dash VFX
    const DASH_SPARK_COUNT = 26;
    for (let i = 0; i < DASH_SPARK_COUNT; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(180, 520);
      vfx.push({ 
        kind: 'spark', x: player.x, y: player.y, 
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, 
        life: rand(0.18, 0.42), maxLife: 0.42, 
        size: rand(1.2, 3.0), 
        color: Math.random() < 0.65 ? 'rgba(83,209,255,1)' : 'rgba(245,247,255,1)' 
      });
    }

    player.dashCooldown = Math.max(0.1, DASH_COOLDOWN_BASE);
    return true;
  };

  const update = (api, dt) => {
    for (let i = slashes.length - 1; i >= 0; i--) {
      slashes[i].life -= dt;
      if (slashes[i].life <= 0) slashes.splice(i, 1);
    }

    if ((dummyBomb.cdT || 0) > 0) dummyBomb.cdT = Math.max(0, (dummyBomb.cdT || 0) - dt);
    if (dummyBomb.active) {
      dummyBomb.t = Math.max(0, (dummyBomb.t || 0) - dt);
      if (dummyBomb.t <= 0) {
        dummyBomb.active = false;
        const dmg = (api.player.damage || 1) * DUMMY_BOMB_DAMAGE_MULT;
        if (typeof api.dealExplosionDamage === 'function') api.dealExplosionDamage(dummyBomb.x, dummyBomb.y, DUMMY_BOMB_EXPLODE_R, dmg);
      }
    }

    const curRound = Math.max(1, Math.floor(api.state.round || 1));
    if (overflowRound !== curRound) {
      overflowRound = curRound;
      overflowUsedThisRound = 0;
    }

    for (let i = puddles.length - 1; i >= 0; i--) {
      const p = puddles[i];
      p.life -= dt;
      if (p.life <= 0) puddles.splice(i, 1);
    }

    for (const e of api.enemies) {
      if (!e || e.hp <= 0) continue;
      let inAny = false;
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      for (const p of puddles) {
        const d = Math.hypot(ex - p.x, ey - p.y);
        if (d <= p.r) { inAny = true; break; }
      }
      if (inAny) {
        e.speedMult = Math.min((typeof e.speedMult === 'number' ? e.speedMult : 1), OVERFLOW_SLOW_MULT);
        const wasAlive = e.hp > 0;
        e.hp -= OVERFLOW_TICK_DPS * dt;
        if (wasAlive && e.hp <= 0) api.registerKill();
      }
    }

    if ((nanami.buffT || 0) > 0) {
      nanami.buffT = Math.max(0, (nanami.buffT || 0) - dt);
      if (nanami.buffT <= 0) {
        nanami.cdT = NANAMI_COOLDOWN_SEC;
        applyNanamiMultipliers(api, {
          dmgMult: 0.7,
          intervalMult: 1 / 0.7,
          rangeMult: 0.7,
          maxHpMult: 0.7,
          damageTakenMult: 1 / 0.7
        });
      }
    } else if ((nanami.cdT || 0) > 0) {
      nanami.cdT = Math.max(0, (nanami.cdT || 0) - dt);
      if (nanami.cdT <= 0) {
        applyNanamiMultipliers(api, {
          dmgMult: 1,
          intervalMult: 1,
          rangeMult: 1,
          maxHpMult: 1,
          damageTakenMult: 1
        });
      }
    }
  };

  function onKeyDown(api, e) {
    if (api.state.phase === 'title' || api.state.phase === 'character') return false;
    if (e.code === 'KeyR') return startNanami(api);
    if (e.code === 'KeyE') return startOverflow(api);
    if (e.code === 'KeyQ') return startDummyBomb(api);
    return false;
  }

  function getEnemyTarget(api, enemy) {
    if (dummyBomb.active) return { x: dummyBomb.x, y: dummyBomb.y };
    return null;
  }

  const draw = (api) => {
    const { ctx, clamp, player } = api;

    if (dummyBomb.active) {
      ctx.save();
      ctx.globalAlpha = 0.95;

      ctx.fillStyle = 'rgba(87,227,154,1)';
      ctx.beginPath();
      ctx.arc(dummyBomb.x, dummyBomb.y, DUMMY_BOMB_R, 0, Math.PI * 2);
      ctx.fill();

      const a = clamp((dummyBomb.t || 0) / DUMMY_BOMB_LIFE, 0, 1);
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(dummyBomb.x, dummyBomb.y, DUMMY_BOMB_R + 7 + (1 - a) * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (puddles.length > 0) {
      ctx.save();
      for (const p of puddles) {
        const a = clamp(p.life / (p.maxLife || 0.001), 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(255,255,255,1)';
        const seed = (typeof p.seed === 'number') ? p.seed : 0;
        const baseR = p.r;
        const lobes = 10;
        ctx.beginPath();
        for (let i = 0; i <= lobes; i++) {
          const t = (i / lobes) * Math.PI * 2;
          const wobble = 0.78 + 0.22 * Math.sin(t * 3 + seed) + 0.10 * Math.sin(t * 7 + seed * 0.37);
          const rr = baseR * wobble;
          const xx = p.x + Math.cos(t) * rr;
          const yy = p.y + Math.sin(t) * rr * 0.78;
          if (i === 0) ctx.moveTo(xx, yy);
          else ctx.lineTo(xx, yy);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (slashes.length === 0) return;
    ctx.save();
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    for (const s of slashes) {
      const a = clamp(s.life / (s.maxLife || 0.001), 0, 1);
      ctx.globalAlpha = a;

      ctx.strokeStyle = 'rgba(83,209,255,0.85)';
      ctx.beginPath();
      ctx.arc(player.x, player.y, s.r, s.ang - s.arc / 2, s.ang + s.arc / 2);
      ctx.stroke();

      ctx.globalAlpha = a * 0.9;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(245,247,255,0.95)';
      ctx.beginPath();
      ctx.arc(player.x, player.y, s.r - 4, s.ang - s.arc / 2, s.ang + s.arc / 2);
      ctx.stroke();

      ctx.lineWidth = 8;
    }
    ctx.restore();
  };

  window.registerCharacter({
    id: 'ryan',
    name: 'Ryan',
    color: '#57e39a',
    hpColor: '#53d1ff',
    init: (api) => { ensureHudRefs(); updateHud(api); },
    fire: (api) => doSlash(api),
    dash: (api) => dash(api),
    update: (api, dt) => update(api, dt),
    draw: (api) => draw(api),
    updateHud: (api) => updateHud(api),
    onKeyDown: (api, e) => onKeyDown(api, e),
    getDamageTakenMult: () => nanami.damageTakenMult,
    getEnemyTarget: (api, e) => getEnemyTarget(api, e)
  });
})();