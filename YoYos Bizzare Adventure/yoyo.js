

(() => {
  if (typeof window === 'undefined') return;
  if (typeof window.registerCharacter !== 'function') return;

  const YOYO_BODY_COLOR = '#ff8a2a';
  const YOYO_HP_COLOR = '#2f7bff';

  const YOYO_PROJECTILE_SPEED = 320;
  const YOYO_OUT_DISTANCE = 260;
  const YOYO_RETURN_SPEED_MULT = 1.35;
  const YOYO_DAMAGE_MULT = 6.0;
  const YOYO_HIT_COOLDOWN = 0.18;
  const YOYO_ABILITY_COOLDOWN = 2.0;
  const JOJO_WALK_THE_DOG_HOLD = 5.0;
  const JOJO_WALK_THE_DOG_COOLDOWN = 10.0;
  const JOJO_SLINGSHOT_CHARGE_TIME = JOJO_WALK_THE_DOG_HOLD;
  const JOJO_SLINGSHOT_CHARGE_SPEED_MULT = 1.25;
  const JOJO_LOCK_COOLDOWN = 20.0;
  const JOJO_LOCK_ORBIT_SPEED = 10.0;

  const HUD_COOLDOWN_TOTAL = YOYO_ABILITY_COOLDOWN;

  const s = {
    // Track which enemies have been hit recently by our yoyo bullets.
    // key: enemy object reference
    // val: remaining cooldown seconds
    recentHits: new Map(),
    yoyoCd: 0,
    walkDogCd: 0,
    lockCd: 0
  };

  let hud = {
    root: null,
    ring: null,
    num: null,
    qRing: null,
    qNum: null,
    eRing: null,
    eNum: null,
    rRing: null,
    rNum: null
  };

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function fmt1(n) {
    const x = (typeof n === 'number') ? n : Number(n);
    if (!isFinite(x)) return '0.0';
    return (Math.round(x * 10) / 10).toFixed(1);
  }

  function reset(api) {
    s.recentHits.clear();
    s.yoyoCd = 0;
    s.walkDogCd = 0;
    s.lockCd = 0;
    updateHud(api);
  }

  function hasActiveYoyo(api) {
    for (let i = 0; i < api.bullets.length; i++) {
      const b = api.bullets[i];
      if (b && b.kind === 'yoyo') return true;
    }
    return false;
  }

  function getActiveYoyo(api) {
    for (let i = 0; i < api.bullets.length; i++) {
      const b = api.bullets[i];
      if (b && b.kind === 'yoyo') return b;
    }
    return null;
  }

  function ensureHudRefs() {
    hud.root = document.getElementById('yoyoAbilitiesHud');
    hud.ring = document.getElementById('yoyoAbilityHud');
    hud.num = document.getElementById('yoyoAbilityNum');
    hud.qRing = document.getElementById('yoyoAbilityHud2');
    hud.qNum = document.getElementById('yoyoAbilityNum2');
    hud.eRing = document.getElementById('yoyoAbilityHud3');
    hud.eNum = document.getElementById('yoyoAbilityNum3');
    hud.rRing = document.getElementById('yoyoAbilityHud4');
    hud.rNum = document.getElementById('yoyoAbilityNum4');
  }

  function ensureHud(api) {
    ensureHudRefs();
    if (hud.root && hud.ring && hud.num) return;

    // Keep all YoYo UI contained in this file: create HUD dynamically.
    const root = document.createElement('div');
    root.id = 'yoyoAbilitiesHud';
    root.className = 'chance-abilities hidden';
    root.setAttribute('aria-label', 'YoYo abilities');
    // Match the general placement pattern of other HUDs.
    root.style.right = '16px';
    root.style.bottom = '16px';

    const ring = document.createElement('div');
    ring.id = 'yoyoAbilityHud';
    ring.className = 'chance-ability';
    ring.setAttribute('aria-label', 'YoYo yoyo cooldown');
    ring.setAttribute('data-key', 'SPACE');
    ring.style.setProperty('--ring', '#ff8a2a');

    const inner = document.createElement('div');
    inner.className = 'chance-ability-inner';

    const num = document.createElement('div');
    num.id = 'yoyoAbilityNum';
    num.className = 'chance-ability-num';

    inner.appendChild(num);
    ring.appendChild(inner);
    root.appendChild(ring);

    const qRing = document.createElement('div');
    qRing.id = 'yoyoAbilityHud2';
    qRing.className = 'chance-ability';
    qRing.setAttribute('aria-label', 'Walk the Dog');
    qRing.setAttribute('data-key', 'Q');
    qRing.style.setProperty('--ring', '#ffdc5a');

    const qInner = document.createElement('div');
    qInner.className = 'chance-ability-inner';

    const qNum = document.createElement('div');
    qNum.id = 'yoyoAbilityNum2';
    qNum.className = 'chance-ability-num';

    qInner.appendChild(qNum);
    qRing.appendChild(qInner);
    root.appendChild(qRing);

    const eRing = document.createElement('div');
    eRing.id = 'yoyoAbilityHud3';
    eRing.className = 'chance-ability';
    eRing.setAttribute('aria-label', 'Slingshot');
    eRing.setAttribute('data-key', 'E');
    eRing.style.setProperty('--ring', '#60a5fa');

    const eInner = document.createElement('div');
    eInner.className = 'chance-ability-inner';

    const eNum = document.createElement('div');
    eNum.id = 'yoyoAbilityNum3';
    eNum.className = 'chance-ability-num';

    eInner.appendChild(eNum);
    eRing.appendChild(eInner);
    root.appendChild(eRing);

    const rRing = document.createElement('div');
    rRing.id = 'yoyoAbilityHud4';
    rRing.className = 'chance-ability';
    rRing.setAttribute('aria-label', 'Lock');
    rRing.setAttribute('data-key', 'R');
    rRing.style.setProperty('--ring', '#ffffff');

    const rInner = document.createElement('div');
    rInner.className = 'chance-ability-inner';

    const rNum = document.createElement('div');
    rNum.id = 'yoyoAbilityNum4';
    rNum.className = 'chance-ability-num';

    rInner.appendChild(rNum);
    rRing.appendChild(rInner);
    root.appendChild(rRing);
    document.body.appendChild(root);

    ensureHudRefs();
    updateHud(api);
  }

  function updateHud(api) {
    ensureHud(api);
    ensureHudRefs();

    const { state } = api;
    const show = state.phase !== 'title' && state.phase !== 'character';
    if (hud.root) {
      if (show) hud.root.classList.remove('hidden');
      else hud.root.classList.add('hidden');
    }
    if (!show) return;

    if (hud.num && hud.ring) {
      const t = clamp(s.yoyoCd || 0, 0, HUD_COOLDOWN_TOTAL || 0);
      hud.num.textContent = (t > 0) ? Math.ceil(t).toString() : '';
      const p = (HUD_COOLDOWN_TOTAL <= 0) ? 1 : (1 - (t / HUD_COOLDOWN_TOTAL));
      hud.ring.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }

    if (hud.qRing && hud.qNum) {
      const b = getActiveYoyo(api);
      const holding = !!b && (b.holdT || 0) > 0;
      const enabled = !!b && api.state.phase === 'playing' && (holding || (s.walkDogCd || 0) <= 0);
      hud.qRing.style.display = '';
      hud.qRing.style.opacity = enabled ? '1' : '0.35';
      hud.qNum.textContent = '';
      const p = holding ? 1 : clamp(1 - (s.walkDogCd || 0) / JOJO_WALK_THE_DOG_COOLDOWN, 0, 1);
      hud.qRing.style.setProperty('--p', enabled ? String(p) : '0');
    }

    if (hud.eRing && hud.eNum) {
      const b = getActiveYoyo(api);
      const enabled = !!b && api.state.phase === 'playing' && !b.slingshotQueued && (
        (!!b.returning && (b.holdT || 0) <= 0) || ((b.holdT || 0) > 0)
      );
      hud.eRing.style.display = '';
      hud.eRing.style.opacity = enabled ? '1' : '0.35';
      hud.eNum.textContent = '';
      hud.eRing.style.setProperty('--p', enabled ? '1' : '0');
    }

    if (hud.rRing && hud.rNum) {
      const b = getActiveYoyo(api);
      const enabled = !!b && api.state.phase === 'playing' && (b.holdT || 0) > 0 && (s.lockCd || 0) <= 0;
      hud.rRing.style.display = '';
      hud.rRing.style.opacity = enabled ? '1' : '0.35';
      const t = clamp(s.lockCd || 0, 0, JOJO_LOCK_COOLDOWN || 0);
      hud.rNum.textContent = (t > 0) ? Math.ceil(t).toString() : '';
      const p = (JOJO_LOCK_COOLDOWN <= 0) ? 1 : (1 - (t / JOJO_LOCK_COOLDOWN));
      hud.rRing.style.setProperty('--p', enabled ? clamp(p, 0, 1).toFixed(3) : '0');
    }
  }

  function update(api, dt) {
    if (s.yoyoCd > 0) s.yoyoCd = Math.max(0, s.yoyoCd - dt);
    if (s.walkDogCd > 0) s.walkDogCd = Math.max(0, s.walkDogCd - dt);
    if (s.lockCd > 0) s.lockCd = Math.max(0, s.lockCd - dt);

    // Decay recent hit cooldowns
    for (const [e, t] of s.recentHits.entries()) {
      const nt = (t || 0) - dt;
      if (nt <= 0) s.recentHits.delete(e);
      else s.recentHits.set(e, nt);
    }

    // Update yoyo bullets (out then return)
    for (let i = 0; i < api.bullets.length; i++) {
      const b = api.bullets[i];
      if (!b || b.kind !== 'yoyo') continue;

      b.life = (b.life || 0) + dt;

      // Walk the Dog: pause the yoyo in place for a short duration, then retract.
      if ((b.holdT || 0) > 0) {
        b.holdT = Math.max(0, (b.holdT || 0) - dt);
        b.vx = 0;
        b.vy = 0;
        if ((b.holdT || 0) > 0) {
          // Stay frozen; do not advance other movement state.
          if (b.slingshotQueued) {
            b.slingshotCharge = Math.min(JOJO_SLINGSHOT_CHARGE_TIME, (b.slingshotCharge || 0) + dt);
          }

          if (b.locked) {
            const px = api.player.x;
            const py = api.player.y;
            const dx = px - b.x;
            const dy = py - b.y;
            const r = Math.max(12, b.lockRadius || Math.hypot(dx, dy) || 60);
            b.lockRadius = r;
            b.lockAng = (b.lockAng != null) ? b.lockAng : Math.atan2(dy, dx);
            const spin = (b.ang || 0);
            const orbitSpd = JOJO_LOCK_ORBIT_SPEED + Math.abs(spin) * 0.0;
            b.lockAng += dt * orbitSpd;
            const nx = Math.cos(b.lockAng);
            const ny = Math.sin(b.lockAng);
            api.player.x = clamp(b.x + nx * r, api.player.r, api.canvas.width - api.player.r);
            api.player.y = clamp(b.y + ny * r, api.player.r, api.canvas.height - api.player.r);
          }

          const boostSpin = (b.slingshotBoost ? 2.6 : 1);
          const speed = Math.hypot(b.vx || 0, b.vy || 0);
          const spinRate = (6 + speed * 0.05) * boostSpin;
          b.ang = (b.ang || 0) + dt * spinRate;
          continue;
        }
        // Hold finished; ensure we retract.
        b.locked = false;
        b.lockRadius = 0;
        b.lockAng = 0;
        b.returning = true;
      }

      if (!b.returning) {
        b.outLeft = (b.outLeft || 0) - YOYO_PROJECTILE_SPEED * dt;
        if ((b.outLeft || 0) <= 0) {
          b.outLeft = 0;
          b.returning = true;
        }
      }

      // If we approach the screen edge, start returning.
      // (main.js removes bullets that touch the bounds unless rebound>0)
      if (!b.returning) {
        const r = b.r || 10;
        if (b.x - r < 2 || b.x + r > api.canvas.width - 2 || b.y - r < 2 || b.y + r > api.canvas.height - 2) {
          b.holdT = 0;
          b.returning = true;
        }
      }

      if (b.returning) {
        const dx = api.player.x - b.x;
        const dy = api.player.y - b.y;
        const [nx, ny] = api.norm(dx, dy);
        const boost = b.slingshotBoost ? 2.8 : 1;
        const speed = YOYO_PROJECTILE_SPEED * YOYO_RETURN_SPEED_MULT * boost;
        b.vx = nx * speed;
        b.vy = ny * speed;

        // Remove once it gets back close to player
        const d = Math.hypot(dx, dy);
        const hitDist = api.player.r + (b.r || 8) + 6;
        if (d <= hitDist) {
          if (b.slingshotQueued && b.slingshotDir) {
            const aimDx = (api.state.controlMode === 'mouse' ? api.input.mouse.x : api.aim.x) - api.player.x;
            const aimDy = (api.state.controlMode === 'mouse' ? api.input.mouse.y : api.aim.y) - api.player.y;
            const [aimNx, aimNy] = api.norm(aimDx, aimDy);
            const dir = b.slingshotDir;
            const outNx = (aimNx || 0) || (dir.x || 0);
            const outNy = (aimNy || 0) || (dir.y || 0);
            const muzzle = api.player.r + (b.r || 8) + 8;
            b.x = api.player.x + outNx * muzzle;
            b.y = api.player.y + outNy * muzzle;
            const charge01 = clamp((b.slingshotCharge || 0) / JOJO_SLINGSHOT_CHARGE_TIME, 0, 1);
            const outSpeed = YOYO_PROJECTILE_SPEED * 2 * (1 + JOJO_SLINGSHOT_CHARGE_SPEED_MULT * charge01);
            b.vx = outNx * outSpeed;
            b.vy = outNy * outSpeed;
            b.returning = false;
            b.outLeft = YOYO_OUT_DISTANCE;
            b.holdT = 0;
            b.walkDog = false;
            b.slingshotQueued = false;
            b.slingshotDir = null;
            b.slingshotBoost = false;
            b.slingshotCharge = 0;
          } else {
            // Mark as expired; main loop will remove on range<=0. But also hard-remove for safety.
            b.range = 0;
          }
        }
      }

      // Purely visual spin
      const boostSpin = (b.slingshotBoost ? 2.6 : 1);
      const speed = Math.hypot(b.vx || 0, b.vy || 0);
      const spinRate = (6 + speed * 0.05) * boostSpin;
      b.ang = (b.ang || 0) + dt * spinRate;
    }

    updateHud(api);
  }

  function throwYoyo(api) {
    const { player } = api;

    // Only allow one active yoyo at a time to make the mechanic readable.
    if (hasActiveYoyo(api)) return;

    const dx = (api.state.controlMode === 'mouse' ? api.input.mouse.x : api.aim.x) - player.x;
    const dy = (api.state.controlMode === 'mouse' ? api.input.mouse.y : api.aim.y) - player.y;
    const d = api.norm(dx, dy);
    const nx = d[0];
    const ny = d[1];

    const muzzle = player.r + 8;
    const baseDamage = player.damage * YOYO_DAMAGE_MULT;

    api.bullets.push({
      kind: 'yoyo',
      x: player.x + nx * muzzle,
      y: player.y + ny * muzzle,
      r: 20,
      vx: nx * YOYO_PROJECTILE_SPEED,
      vy: ny * YOYO_PROJECTILE_SPEED,
      damage: baseDamage,
      isCrit: false,
      critMult: 1,
      range: 999999,
      pierce: 999,
      explosionRadius: 0,
      rebound: 999,
      homingDeg: 0,
      returning: false,
      holdT: 0,
      walkDog: false,
      outLeft: YOYO_OUT_DISTANCE,
      ang: 0
    });
  }

  function onKeyDown(api, e) {
    if (api.state.phase === 'title' || api.state.phase === 'character') return false;
    if (e.code === 'Space') {
      if ((s.yoyoCd || 0) > 0) return true;
      if (hasActiveYoyo(api)) return true;
      throwYoyo(api);
      s.yoyoCd = YOYO_ABILITY_COOLDOWN;
      return true;
    }
    if (e.code === 'KeyQ') {
      const b = getActiveYoyo(api);
      if (!b) return false;
      if ((b.holdT || 0) > 0) {
        b.holdT = 0;
        b.returning = true;
      } else {
        if ((s.walkDogCd || 0) > 0) return true;
        b.walkDog = true;
        b.holdT = JOJO_WALK_THE_DOG_HOLD;
        b.returning = true;
        b.vx = 0;
        b.vy = 0;
        s.walkDogCd = JOJO_WALK_THE_DOG_COOLDOWN;
      }
      return true;
    }
    if (e.code === 'KeyE') {
      const b = getActiveYoyo(api);
      if (!b) return false;
      if (b.slingshotQueued) return true;

      // If slingshot is pressed during Walk-the-Dog hold, queue it but keep holding.
      if ((b.holdT || 0) > 0) {
        const [dnx, dny] = api.norm(b.x - api.player.x, b.y - api.player.y);
        b.slingshotQueued = true;
        b.slingshotDir = { x: dnx, y: dny };
        b.slingshotCharge = 0;
        return true;
      }

      if (!b.returning) return true;

      const [dnx, dny] = api.norm(b.x - api.player.x, b.y - api.player.y);
      b.slingshotQueued = true;
      b.slingshotDir = { x: dnx, y: dny };
      b.slingshotCharge = 0;
      return true;
    }
    if (e.code === 'KeyR') {
      const b = getActiveYoyo(api);
      if (!b) return false;
      if (api.state.phase !== 'playing') return true;
      if ((b.holdT || 0) <= 0) return true;
      if ((s.lockCd || 0) > 0) return true;

      b.locked = true;
      b.lockRadius = 0;
      b.lockAng = null;
      s.lockCd = JOJO_LOCK_COOLDOWN;
      return true;
    }
    return false;
  }

  function fire(api) {
    const { player, fireBullet } = api;
    const originalDamage = player.damage;
    player.damage = originalDamage * 0.5;
    fireBullet();
    player.damage = originalDamage;
  }

  function drawBullet(api, b, ctx) {
    if (!b || b.kind !== 'yoyo') return false;

    // Draw string
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(api.player.x, api.player.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    // Draw yoyo body
    ctx.translate(b.x, b.y);
    ctx.rotate(b.ang || 0);

    if ((b.holdT || 0) > 0) {
      const t = (b.life || 0) * 6;
      const pulse = 1 + 0.06 * Math.sin(t);
      const br = ((b.r || 10) + 10) * pulse;
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,220,90,0.75)';
      ctx.beginPath();
      ctx.arc(0, 0, br, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, br - 4, 0, Math.PI * 2);
      ctx.stroke();
      if (b.slingshotQueued) {
        const charge01 = clamp((b.slingshotCharge || 0) / JOJO_SLINGSHOT_CHARGE_TIME, 0, 1);
        const blueR = br + 4 + 18 * charge01;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(96,165,250,0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, blueR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    } else if (!b.returning) {
      const t = (b.life || 0) * 6;
      const pulse = 1 + 0.05 * Math.sin(t);
      const br = ((b.r || 10) + 8) * pulse;
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,138,42,0.55)';
      ctx.beginPath();
      ctx.arc(0, 0, br, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(255,180,60,0.95)';
    ctx.strokeStyle = (b.slingshotBoost || b.slingshotQueued) ? 'rgba(96,165,250,0.95)' : 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, b.r || 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White cross detail
    const cr = Math.max(4, (b.r || 10) * 0.55);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(2, Math.round((b.r || 10) * 0.18));
    ctx.beginPath();
    ctx.moveTo(-cr, 0);
    ctx.lineTo(cr, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -cr);
    ctx.lineTo(0, cr);
    ctx.stroke();
    ctx.restore();

    // Spinning stripes
    const rr = Math.max(2, (b.r || 10) - 5);
    ctx.lineWidth = Math.max(2, Math.round((b.r || 10) * 0.15));
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    for (let k = 0; k < 4; k++) {
      const a0 = (b.ang || 0) * 1.3 + k * (Math.PI / 2);
      ctx.beginPath();
      ctx.arc(0, 0, rr, a0, a0 + Math.PI / 3);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    const innerR = Math.max(2, (b.r || 10) - 4);
    const gapCount = 5;
    const gap = 0.22;
    const seg = (Math.PI * 2 - gapCount * gap) / gapCount;
    for (let k = 0; k < gapCount; k++) {
      const a0 = k * (seg + gap);
      ctx.beginPath();
      ctx.arc(0, 0, innerR, a0, a0 + seg);
      ctx.stroke();
    }

    ctx.restore();
    return true;
  }

  function onBulletEnemyHit(api, b, e, bulletIndex, enemyIndex) {
    if (!b || b.kind !== 'yoyo') return false;
    if (!e || e.hp <= 0) return true;

    // Prevent the default handler from deleting our yoyo bullet.
    // Also prevent multi-hit every frame while overlapping.
    const cd = s.recentHits.get(e) || 0;
    if (cd > 0) return true;
    s.recentHits.set(e, YOYO_HIT_COOLDOWN);

    const wasAlive = e.hp > 0;
    const dmg = b.damage;
    e.hp -= dmg;
    api.hitTexts.push({ x: b.x, y: b.y, text: '-' + fmt1(dmg), life: 0.6, vy: -30 });
    if (wasAlive && e.hp <= 0) api.registerKill();

    // Small recoil: reverse direction briefly if still going out.
    if (!b.returning) b.returning = true;

    return true;
  }

  window.registerCharacter({
    id: 'jojo',
    name: 'Jojo',
    color: YOYO_BODY_COLOR,
    hpColor: YOYO_HP_COLOR,
    init: (api) => { ensureHud(api); reset(api); },
    reset: (api) => reset(api),
    update: (api, dt) => update(api, dt),
    updateHud: (api) => updateHud(api),
    onKeyDown: (api, e) => onKeyDown(api, e),
    fire: (api) => fire(api),
    drawBullet: (api, b, ctx) => drawBullet(api, b, ctx),
    onBulletEnemyHit: (api, b, e, bulletIndex, enemyIndex) => onBulletEnemyHit(api, b, e, bulletIndex, enemyIndex)
  });
})();
