

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

  const HUD_COOLDOWN_TOTAL = YOYO_ABILITY_COOLDOWN;

  const s = {
    // Track which enemies have been hit recently by our yoyo bullets.
    // key: enemy object reference
    // val: remaining cooldown seconds
    recentHits: new Map(),
    yoyoCd: 0,
    hadYoyoOut: false
  };

  let hud = {
    root: null,
    ring: null,
    num: null,
    qRing: null,
    qNum: null
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
    s.hadYoyoOut = false;
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
      if (!b || api.state.phase !== 'playing') {
        hud.qRing.style.display = 'none';
      } else {
        hud.qRing.style.display = '';
        const used = !!b.walkDog;
        hud.qNum.textContent = used ? '' : '';
        hud.qRing.style.setProperty('--p', used ? '0' : '1');
      }
    }
  }

  function update(api, dt) {
    if (s.yoyoCd > 0) s.yoyoCd = Math.max(0, s.yoyoCd - dt);

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
          b.ang = (b.ang || 0) + dt * 14;
          continue;
        }
        // Hold finished; ensure we retract.
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
        const speed = YOYO_PROJECTILE_SPEED * YOYO_RETURN_SPEED_MULT;
        b.vx = nx * speed;
        b.vy = ny * speed;

        // Remove once it gets back close to player
        const d = Math.hypot(dx, dy);
        if (d <= api.player.r + (b.r || 8) + 6) {
          // Mark as expired; main loop will remove on range<=0. But also hard-remove for safety.
          b.range = 0;
        }
      }

      // Purely visual spin
      b.ang = (b.ang || 0) + dt * 14;
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

    // Cooldown is applied when the yoyo returns (see update()).
    s.hadYoyoOut = true;
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
        b.walkDog = true;
        b.holdT = JOJO_WALK_THE_DOG_HOLD;
        b.returning = true;
        b.vx = 0;
        b.vy = 0;
      }
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
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, b.r || 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

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
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, (b.r || 10) - 4), 0, Math.PI * 2);
    ctx.stroke();

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
