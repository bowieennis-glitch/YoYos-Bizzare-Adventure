

(() => {
  if (typeof window === 'undefined') return;
  if (typeof window.registerCharacter !== 'function') return;

  // ==========================================
  // CONFIGURATION
  // ==========================================
  const DASH_DISTANCE = 120;
  const DASH_COOLDOWN_BASE = 5;
  const NANAMI_NERF_SEC = 10;
  const NANAMI_BUFF_SEC = 20;
  const NANAMI_SHOCKWAVE_R = 120;
  const NANAMI_STUN_SEC = 0.45;
  const DUMMY_BOMB_LIFE = 3;
  const DUMMY_BOMB_COOLDOWN_SEC = 15;
  const DUMMY_BOMB_R = 18;
  const DUMMY_BOMB_EXPLODE_R = 110;
  const DUMMY_BOMB_DAMAGE_MULT = 8;
  const SWING_COOLDOWN = 0.5;
  const SWING_LIFE = 0.28;
  const SWORD_SPEED = 760;
  const SWORD_R = 42;
  const SWORD_DAMAGE_MULT = 3.25;
  const SWORD_HIT_COOLDOWN = 0.18;
  const SWORD_COOLDOWN_SEC = 5;
  const BASE_CRIT_CHANCE = 0.20;
  const BLEED_DURATION = 2;
  const SPARK_COUNT = 0;

  const HUD_COOLDOWN_TOTAL = DASH_COOLDOWN_BASE;

  let hud = {
    root: null,
    ring: null,
    num: null,
    swordRing: null,
    swordNum: null,
    nanamiRing: null,
    nanamiNum: null,
    dummyRing: null,
    dummyNum: null
  };

  // ==========================================
  // STATE
  // ==========================================
  let slashes = [];

  const dummyBomb = {
    active: false,
    x: 0,
    y: 0,
    t: 0,
    cdT: 0
  };

  const nanami = {
    phase: 'none',
    t: 0,
    dmgMult: 1,
    intervalMult: 1,
    rangeMult: 1,
    maxHpMult: 1,
    damageTakenMult: 1
  };

  const sword = {
    active: false,
    phase: 'out',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    dist: 0,
    maxDist: 0,
    ang: 0,
    recentHits: new Map(),
    trail: [],
    cdT: 0
  };

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function ensureHudRefs() {
    hud.root = document.getElementById('ryanAbilitiesHud');
    hud.ring = document.getElementById('ryanDashHud');
    hud.num = document.getElementById('ryanDashNum');
    hud.swordRing = document.getElementById('ryanSwordHud');
    hud.swordNum = document.getElementById('ryanSwordNum');
    hud.nanamiRing = document.getElementById('ryanNanamiHud');
    hud.nanamiNum = document.getElementById('ryanNanamiNum');
    hud.dummyRing = document.getElementById('ryanDummyHud');
    hud.dummyNum = document.getElementById('ryanDummyNum');
  }

  function hasActiveSword() {
    return !!sword.active;
  }

  function startSword(api) {
    if (api.state.phase !== 'playing') return false;
    if (hasActiveSword()) return false;
    if ((sword.cdT || 0) > 0) return false;

    const { player, state, input, aim, norm } = api;
    const dx = (state.controlMode === 'mouse' ? input.mouse.x : aim.x) - player.x;
    const dy = (state.controlMode === 'mouse' ? input.mouse.y : aim.y) - player.y;
    const d = norm(dx, dy);
    const nx = d[0];
    const ny = d[1];
    if (!isFinite(nx) || !isFinite(ny) || (nx === 0 && ny === 0)) return false;

    sword.active = true;
    sword.phase = 'out';
    sword.x = player.x + nx * (player.r + 10);
    sword.y = player.y + ny * (player.r + 10);
    sword.vx = nx * SWORD_SPEED;
    sword.vy = ny * SWORD_SPEED;
    sword.dist = 0;
    sword.maxDist = Math.max(200, (player.range || 0));
    sword.ang = 0;
    sword.recentHits.clear();
    sword.trail.length = 0;
    updateHud(api);
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
    if (nanami.phase !== 'none') return false;

    nanami.phase = 'nerf';
    nanami.t = NANAMI_NERF_SEC;
    applyNanamiMultipliers(api, {
      dmgMult: 0.7,
      intervalMult: 1 / 0.7,
      rangeMult: 0.7,
      maxHpMult: 0.7,
      damageTakenMult: 1 / 0.7
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
      const total = NANAMI_NERF_SEC + NANAMI_BUFF_SEC;
      const t = (nanami.phase === 'none') ? 0 : clamp(nanami.t || 0, 0, total);
      hud.nanamiNum.textContent = (t > 0) ? Math.ceil(t).toString() : '';
      const p = (total <= 0) ? 1 : (1 - (t / total));
      hud.nanamiRing.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }

    if (hud.swordNum && hud.swordRing) {
      if (!hasActiveSword()) {
        const t = clamp(sword.cdT || 0, 0, SWORD_COOLDOWN_SEC);
        hud.swordNum.textContent = (t > 0) ? Math.ceil(t).toString() : '';
        const p = (SWORD_COOLDOWN_SEC <= 0) ? 1 : (1 - (t / SWORD_COOLDOWN_SEC));
        hud.swordRing.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
      } else {
        const p = (sword.maxDist <= 0) ? 0 : clamp(sword.dist / sword.maxDist, 0, 1);
        hud.swordNum.textContent = '';
        hud.swordRing.style.setProperty('--p', (1 - p).toFixed(3));
      }
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

  function doSlash(api) {
    const { player, state, input, aim, norm, enemies, hitTexts, rand, registerKill, vfx } = api;

    // Ryan can't attack while sword is in motion
    if (hasActiveSword()) return;

    // Calculate slash direction
    const dx = (state.controlMode === 'mouse' ? input.mouse.x : aim.x) - player.x;
    const dy = (state.controlMode === 'mouse' ? input.mouse.y : aim.y) - player.y;
    const d = norm(dx, dy);
    const nx = d[0];
    const ny = d[1];
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
      if (!enemy || enemy.hp <= 0) continue;

      const cx = enemy.x + enemy.w / 2;
      const cy = enemy.y + enemy.h / 2;
      const enemyRadius = Math.max(enemy.w, enemy.h) * 0.5;

      // Check if enemy is in slash arc (with padding for enemy radius)
      if (!isPointInArc(cx, cy, player.x, player.y, slashAngle, slashRange + enemyRadius, slashArc)) continue;

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

    // Nanami shockwave: stun nearby enemies after each attack
    if (nanami.phase === 'buff') {
      const x = player.x;
      const y = player.y;
      const life = 0.22;
      vfx.push({
        kind: 'ring', x, y,
        r: 0,
        dr: NANAMI_SHOCKWAVE_R / life,
        life,
        maxLife: life,
        color: 'rgba(255,255,255,0.95)',
        width: 4
      });
      for (const e of enemies) {
        if (!e || e.hp <= 0) continue;
        const cx = e.x + e.w / 2;
        const cy = e.y + e.h / 2;
        const dist = Math.hypot(cx - x, cy - y);
        if (dist <= NANAMI_SHOCKWAVE_R) {
          e.stunT = Math.max(e.stunT || 0, NANAMI_STUN_SEC);
        }
      }
    }

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
  }

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

    // Sword hit cooldown decay
    if (sword.recentHits && sword.recentHits.size > 0) {
      for (const [k, v] of sword.recentHits.entries()) {
        const nv = v - dt;
        if (nv <= 0) sword.recentHits.delete(k);
        else sword.recentHits.set(k, nv);
      }
    }

    if ((sword.cdT || 0) > 0) sword.cdT = Math.max(0, (sword.cdT || 0) - dt);

    // Sword movement + collision
    if (sword.active) {
      const mx = sword.vx * dt;
      const my = sword.vy * dt;
      sword.x += mx;
      sword.y += my;
      sword.dist += Math.hypot(mx, my);
      sword.ang += dt * 14;

      sword.trail.push({ x: sword.x, y: sword.y, a: sword.ang });
      if (sword.trail.length > 14) sword.trail.shift();

      if (sword.phase === 'out' && sword.dist >= sword.maxDist) {
        sword.phase = 'back';
      }

      if (sword.phase === 'back') {
        const dx = api.player.x - sword.x;
        const dy = api.player.y - sword.y;
        const d = Math.hypot(dx, dy) || 1;
        const nx = dx / d;
        const ny = dy / d;
        sword.vx = nx * SWORD_SPEED;
        sword.vy = ny * SWORD_SPEED;
        if (d <= api.player.r + 30) {
          sword.active = false;
          sword.cdT = SWORD_COOLDOWN_SEC;
          updateHud(api);
        }
      }

      // Damage enemies on contact
      for (const e of api.enemies) {
        if (!e || e.hp <= 0) continue;
        const key = e;
        if ((sword.recentHits.get(key) || 0) > 0) continue;
        if (api.circleRectIntersect(sword.x, sword.y, SWORD_R, e.x, e.y, e.w, e.h)) {
          const wasAlive = e.hp > 0;
          const dmg = (api.player.damage || 1) * SWORD_DAMAGE_MULT;
          e.hp -= dmg;
          api.hitTexts.push({ x: sword.x, y: sword.y, text: '-' + dmg, life: 0.6, vy: -30 });
          if (wasAlive && e.hp <= 0) api.registerKill();
          sword.recentHits.set(key, SWORD_HIT_COOLDOWN);
        }
      }
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

    if (nanami.phase !== 'none') {
      nanami.t = Math.max(0, (nanami.t || 0) - dt);
      if (nanami.t <= 0) {
        if (nanami.phase === 'nerf') {
          nanami.phase = 'buff';
          nanami.t = NANAMI_BUFF_SEC;
          applyNanamiMultipliers(api, {
            dmgMult: 1.3,
            intervalMult: 1 / 1.3,
            rangeMult: 1.3,
            maxHpMult: 1.3,
            damageTakenMult: 1 / 1.3
          });
        } else {
          nanami.phase = 'none';
          nanami.t = 0;
          applyNanamiMultipliers(api, {
            dmgMult: 1,
            intervalMult: 1,
            rangeMult: 1,
            maxHpMult: 1,
            damageTakenMult: 1
          });
        }
        updateHud(api);
      }
    }

    updateHud(api);
  };

  function onKeyDown(api, e) {
    if (api.state.phase === 'title' || api.state.phase === 'character') return false;
    if (e.code === 'KeyR') return startNanami(api);
    if (e.code === 'KeyE') return startSword(api);
    if (e.code === 'KeyQ') return startDummyBomb(api);
    return false;
  }

  function getEnemyTarget(api, enemy) {
    if (dummyBomb.active) return { x: dummyBomb.x, y: dummyBomb.y };
    return null;
  }

  const draw = (api) => {
    const { ctx, clamp, player } = api;

    if (sword.active) {
      if (sword.trail && sword.trail.length > 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < sword.trail.length; i++) {
          const t = sword.trail[i];
          const a = (i + 1) / sword.trail.length;
          ctx.globalAlpha = 0.05 + a * 0.22;
          ctx.strokeStyle = 'rgba(83,209,255,1)';
          ctx.lineWidth = 2 + a * 6;
          ctx.beginPath();
          ctx.arc(t.x, t.y, SWORD_R * 0.55, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(sword.x, sword.y);
      ctx.rotate(sword.ang);
      ctx.globalCompositeOperation = 'lighter';

      // outer glow
      ctx.globalAlpha = 0.55;
      ctx.shadowColor = 'rgba(83,209,255,0.9)';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = 'rgba(83,209,255,0.85)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, SWORD_R * 0.55, -Math.PI * 0.22, Math.PI * 0.22);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, SWORD_R * 0.55, Math.PI - Math.PI * 0.22, Math.PI + Math.PI * 0.22);
      ctx.stroke();

      // blade
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.98;
      ctx.strokeStyle = 'rgba(245,247,255,0.95)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-SWORD_R * 0.95, 0);
      ctx.lineTo(SWORD_R * 0.95, 0);
      ctx.stroke();

      // inner cross flare
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = 'rgba(83,209,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -SWORD_R * 0.75);
      ctx.lineTo(0, SWORD_R * 0.75);
      ctx.stroke();

      // spinning ring
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = 'rgba(245,247,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, SWORD_R * 0.9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

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
    init: (api) => {
      api.player.damage *= 3;
      api.player.shotInterval = Math.max(0.05, api.player.shotInterval / 0.2);
      ensureHudRefs();
      updateHud(api);
    },
    fire: (api) => { if (!hasActiveSword()) doSlash(api); },
    dash: (api) => dash(api),
    update: (api, dt) => update(api, dt),
    draw: (api) => draw(api),
    updateHud: (api) => updateHud(api),
    onKeyDown: (api, e) => onKeyDown(api, e),
    getDamageTakenMult: () => nanami.damageTakenMult,
    getEnemyTarget: (api, e) => getEnemyTarget(api, e)
  });
})();