(() => {
  if (typeof window === 'undefined') return;
  if (typeof window.registerCharacter !== 'function') return;

  const BILL_COLOR = '#eab308';
  const BILL_HP_COLOR = '#a855f7';

  const GRAPPLE_CD = 5.0;
  const SWORD_CD = 5.0;
  const SHOCKWAVE_CD = 20.0;

  const GRAPPLE_MAX_RANGE = 520;
  const BLEED_DURATION = 2;

  const SWORD_RANGE = 110;
  const SWORD_ARC_DEG = 120;
  const SWORD_DAMAGE_MULT = 7;
  const SWORD_STUN_SEC = 0.45;

  const BAT_KNOCKBACK_PX = 110;

  const SHOCKWAVE_R = 260;
  const SHOCKWAVE_DAMAGE_MULT = 12;
  const SHOCKWAVE_STUN_SEC = 1.4;

  const s = {
    spaceCd: 0,
    eCd: 0,
    rCd: 0,
    hookT: 0,
    hookDur: 0,
    hookSX: 0,
    hookSY: 0,
    hookEX: 0,
    hookEY: 0,
    swordT: 0,
    swordDur: 0,
    swordAng: 0
  };

  let hud = {
    root: null,
    spaceRing: null,
    spaceNum: null,
    eRing: null,
    eNum: null,
    rRing: null,
    rNum: null
  };

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function ensureHudRefs() {
    hud.root = document.getElementById('billAbilitiesHud');
    hud.spaceRing = document.getElementById('billAbilityHudSpace');
    hud.spaceNum = document.getElementById('billAbilityNumSpace');
    hud.eRing = document.getElementById('billAbilityHudE');
    hud.eNum = document.getElementById('billAbilityNumE');
    hud.rRing = document.getElementById('billAbilityHudR');
    hud.rNum = document.getElementById('billAbilityNumR');
  }

  function ensureHud(api) {
    ensureHudRefs();
    if (hud.root && hud.spaceRing && hud.spaceNum && hud.eRing && hud.eNum && hud.rRing && hud.rNum) return;

    // If an older HUD exists (from a previous version), replace it instead of duplicating.
    if (hud.root && (!hud.spaceRing || !hud.spaceNum || !hud.eRing || !hud.eNum || !hud.rRing || !hud.rNum)) {
      try { hud.root.remove(); } catch {}
      ensureHudRefs();
    }

    const root = document.createElement('div');
    root.id = 'billAbilitiesHud';
    root.className = 'chance-abilities hidden';
    root.setAttribute('aria-label', 'Basic Bill abilities');
    root.style.right = '16px';
    root.style.bottom = '16px';

    const mkRing = (idRing, idNum, key, label, ringColor) => {
      const ring = document.createElement('div');
      ring.id = idRing;
      ring.className = 'chance-ability';
      ring.setAttribute('aria-label', label);
      ring.setAttribute('data-key', key);
      ring.style.setProperty('--ring', ringColor);

      const inner = document.createElement('div');
      inner.className = 'chance-ability-inner';

      const num = document.createElement('div');
      num.id = idNum;
      num.className = 'chance-ability-num';

      inner.appendChild(num);
      ring.appendChild(inner);
      return { ring, num };
    };

    const sp = mkRing('billAbilityHudSpace', 'billAbilityNumSpace', 'Q', 'Grapple', '#22c55e');
    const e = mkRing('billAbilityHudE', 'billAbilityNumE', 'E', 'Sword of Justice', '#f59e0b');
    const r = mkRing('billAbilityHudR', 'billAbilityNumR', 'R', 'Shockwave', '#60a5fa');

    root.appendChild(sp.ring);
    root.appendChild(e.ring);
    root.appendChild(r.ring);

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

    if (hud.spaceRing && hud.spaceNum) {
      const t = clamp(s.spaceCd || 0, 0, GRAPPLE_CD);
      hud.spaceNum.textContent = (t > 0) ? Math.ceil(t).toString() : '';
      const p = (GRAPPLE_CD <= 0) ? 1 : (1 - (t / GRAPPLE_CD));
      hud.spaceRing.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }

    if (hud.eRing && hud.eNum) {
      const t = clamp(s.eCd || 0, 0, SWORD_CD);
      hud.eNum.textContent = (t > 0) ? Math.ceil(t).toString() : '';
      const p = (SWORD_CD <= 0) ? 1 : (1 - (t / SWORD_CD));
      hud.eRing.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }

    if (hud.rRing && hud.rNum) {
      const t = clamp(s.rCd || 0, 0, SHOCKWAVE_CD);
      hud.rNum.textContent = (t > 0) ? Math.ceil(t).toString() : '';
      const p = (SHOCKWAVE_CD <= 0) ? 1 : (1 - (t / SHOCKWAVE_CD));
      hud.rRing.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    }
  }

  function reset(api) {
    s.spaceCd = 0;
    s.eCd = 0;
    s.rCd = 0;
    s.hookT = 0;
    s.hookDur = 0;
    s.swordT = 0;
    s.swordDur = 0;
    updateHud(api);
  }

  function update(api, dt) {
    if (s.spaceCd > 0) s.spaceCd = Math.max(0, s.spaceCd - dt);
    if (s.eCd > 0) s.eCd = Math.max(0, s.eCd - dt);
    if (s.rCd > 0) s.rCd = Math.max(0, s.rCd - dt);
    if (s.hookT > 0) s.hookT = Math.max(0, s.hookT - dt);
    if (s.swordT > 0) s.swordT = Math.max(0, s.swordT - dt);
    updateHud(api);
  }

  function aimDir(api) {
    const tx = (api.state.controlMode === 'mouse' ? api.input.mouse.x : api.aim.x);
    const ty = (api.state.controlMode === 'mouse' ? api.input.mouse.y : api.aim.y);
    const [nx, ny] = api.norm(tx - api.player.x, ty - api.player.y);
    return { nx, ny };
  }

  function postDraw(api, ctx) {
    if ((s.hookT || 0) <= 0 || (s.hookDur || 0) <= 0) return;
    if (!ctx) return;

    const p = clamp(1 - (s.hookT / s.hookDur), 0, 1);
    const hx = s.hookSX + (s.hookEX - s.hookSX) * p;
    const hy = s.hookSY + (s.hookEY - s.hookSY) * p;

    ctx.save();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(220, 220, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(s.hookSX, s.hookSY);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    const dx = hx - s.hookSX;
    const dy = hy - s.hookSY;
    const ang = Math.atan2(dy, dx);

    // Hook head
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(180, 80, 255, 0.95)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Little prongs
    ctx.strokeStyle = 'rgba(240, 240, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.lineTo(10, -7);
    ctx.moveTo(2, 2);
    ctx.lineTo(10, 7);
    ctx.stroke();

    ctx.restore();
  }

  function postDrawSword(api, ctx) {
    if ((s.swordT || 0) <= 0 || (s.swordDur || 0) <= 0) return;
    if (!ctx) return;

    const p = clamp(1 - (s.swordT / s.swordDur), 0, 1);
    const a = 1 - Math.abs(p - 0.5) * 2;
    const baseAng = s.swordAng || 0;
    const halfArc = (SWORD_ARC_DEG * Math.PI / 180) * 0.5;
    const swingAng = baseAng + (-halfArc + (halfArc * 2) * p);

    const x = api.player.x;
    const y = api.player.y;
    const holdDist = api.player.r + 18;

    ctx.save();
    ctx.globalAlpha = 0.95 * clamp(a, 0, 1);
    ctx.translate(x + Math.cos(baseAng) * holdDist, y + Math.sin(baseAng) * holdDist);
    ctx.rotate(swingAng);

    // Draw a custom bat (no external image required).
    // Coordinate system: origin is player's hands. Positive X points forward.
    const batLen = 86;
    const batThick = 10;
    const gripLen = 22;

    // Wood body gradient
    const grad = ctx.createLinearGradient(0, 0, batLen, 0);
    grad.addColorStop(0, 'rgba(120, 84, 46, 0.98)');
    grad.addColorStop(0.45, 'rgba(168, 120, 72, 0.98)');
    grad.addColorStop(1, 'rgba(214, 170, 110, 0.98)');

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.40)';

    // Main bat body
    ctx.fillStyle = grad;
    ctx.beginPath();
    const x0 = -4;
    const y0 = -batThick / 2;
    const w0 = batLen;
    const h0 = batThick;
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x0, y0, w0, h0, batThick / 2);
    else ctx.rect(x0, y0, w0, h0);
    ctx.fill();
    ctx.stroke();

    // Barrel (thicker end)
    ctx.fillStyle = 'rgba(224, 186, 124, 0.98)';
    ctx.beginPath();
    ctx.ellipse(x0 + w0 - 2, 0, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Grip wrap
    ctx.fillStyle = 'rgba(70, 56, 44, 0.98)';
    ctx.beginPath();
    const gx = x0;
    const gw = gripLen;
    if (typeof ctx.roundRect === 'function') ctx.roundRect(gx, y0 + 1, gw, h0 - 2, (h0 - 2) / 2);
    else ctx.rect(gx, y0 + 1, gw, h0 - 2);
    ctx.fill();
    ctx.stroke();

    // Subtle highlight
    ctx.globalAlpha *= 0.35;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 + 6, -3);
    ctx.lineTo(x0 + w0 - 10, -3);
    ctx.stroke();

    ctx.restore();
  }

  function grapple(api) {
    if (api.state.phase !== 'playing') return false;
    if ((s.spaceCd || 0) > 0) return true;

    let best = null;
    let bestD2 = Infinity;
    for (const e of api.enemies) {
      if (!e || e.hp <= 0) continue;
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      const dx = cx - api.player.x;
      const dy = cy - api.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }

    if (!best) return true;
    const dist = Math.sqrt(bestD2);
    if (dist > GRAPPLE_MAX_RANGE) return true;

    // Start hook animation from player to the current enemy location.
    s.hookDur = 0.18;
    s.hookT = s.hookDur;
    s.hookSX = api.player.x;
    s.hookSY = api.player.y;
    s.hookEX = best.x + best.w / 2;
    s.hookEY = best.y + best.h / 2;

    // Apply Ryan-style bleed immediately to grappled enemies.
    // Ryan uses BLEED_DURATION=2 and total bleed damage = player.damage * 0.25.
    const bleedDamage = (api.player.damage || 1) * 0.25;
    best.bleedTime = BLEED_DURATION;
    best.bleedDps = bleedDamage / BLEED_DURATION;
    best.bleedDropTimer = 0;

    const { nx, ny } = aimDir(api);
    const dropDist = api.player.r + Math.max(best.w, best.h) * 0.6 + 6;
    const tx = api.player.x + nx * dropDist;
    const ty = api.player.y + ny * dropDist;

    best.x = clamp(tx - best.w / 2, 0, api.canvas.width - best.w);
    best.y = clamp(ty - best.h / 2, 0, api.canvas.height - best.h);
    best.stunT = Math.max(best.stunT || 0, 0.35);

    s.spaceCd = GRAPPLE_CD;
    updateHud(api);
    return true;
  }

  function swordOfJustice(api) {
    if (api.state.phase !== 'playing') return false;
    if ((s.eCd || 0) > 0) return true;

    const { nx, ny } = aimDir(api);
    const ang = Math.atan2(ny, nx);

    s.swordDur = 0.16;
    s.swordT = s.swordDur;
    s.swordAng = ang;

    const baseDmg = (api.player.damage || 1) * SWORD_DAMAGE_MULT;
    let instantRecharge = false;
    const halfArc = (SWORD_ARC_DEG * Math.PI / 180) * 0.5;
    for (const e of api.enemies) {
      if (!e || e.hp <= 0) continue;
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      const dx = cx - api.player.x;
      const dy = cy - api.player.y;
      const d = Math.hypot(dx, dy);
      if (d > SWORD_RANGE + Math.max(e.w, e.h) * 0.5) continue;
      const ea = Math.atan2(dy, dx);
      let da = ea - ang;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > halfArc) continue;

      const wasAlive = e.hp > 0;
      const wasBleeding = (e.bleedTime && e.bleedTime > 0);
      e.hp -= baseDmg;
      e.stunT = Math.max(e.stunT || 0, SWORD_STUN_SEC);

      // Knockback: shove enemy in the swing direction.
      const kx = nx * BAT_KNOCKBACK_PX;
      const ky = ny * BAT_KNOCKBACK_PX;
      e.x = clamp((e.x || 0) + kx, 0, api.canvas.width - e.w);
      e.y = clamp((e.y || 0) + ky, 0, api.canvas.height - e.h);

      api.hitTexts.push({ x: cx, y: cy, text: '-' + baseDmg, life: 0.6, vy: -30 });
      if (wasAlive && e.hp <= 0) {
        api.registerKill();
        if (wasBleeding) instantRecharge = true;
      }
    }

    s.eCd = instantRecharge ? 0 : SWORD_CD;
    updateHud(api);
    return true;
  }

  function shockwave(api) {
    if (api.state.phase !== 'playing') return false;
    if ((s.rCd || 0) > 0) return true;

    const x = api.player.x;
    const y = api.player.y;

    if (typeof api.spawnExplosionVfx === 'function') {
      api.spawnExplosionVfx(x, y, SHOCKWAVE_R);
    }

    const base = (api.player.damage || 1) * SHOCKWAVE_DAMAGE_MULT;
    for (const e of api.enemies) {
      if (!e || e.hp <= 0) continue;
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      const d = Math.hypot(cx - x, cy - y);
      if (d <= SHOCKWAVE_R) {
        const wasAlive = e.hp > 0;
        e.hp -= base;
        e.stunT = Math.max(e.stunT || 0, SHOCKWAVE_STUN_SEC);
        api.hitTexts.push({ x: cx, y: cy, text: '-' + base, life: 0.6, vy: -30 });
        if (wasAlive && e.hp <= 0) api.registerKill();
      }
    }

    s.rCd = SHOCKWAVE_CD;
    updateHud(api);
    return true;
  }

  function onKeyDown(api, e) {
    if (api.state.phase === 'title' || api.state.phase === 'character') return false;
    if (e.code === 'KeyQ') return grapple(api);
    if (e.code === 'KeyE') return swordOfJustice(api);
    if (e.code === 'KeyR') return shockwave(api);
    return false;
  }

  window.registerCharacter({
    id: 'bill',
    name: 'Basic Bill',
    color: BILL_COLOR,
    hpColor: BILL_HP_COLOR,
    init: (api) => {
      api.player.damage = 1;
      api.player.shotInterval = 0.16;
      api.player.maxHp = 100;
      api.player.hp = api.player.maxHp;
      ensureHud(api);
      reset(api);
    },
    reset: (api) => {
      // Re-assert the intended baseline for this character.
      api.player.damage = 1;
      api.player.shotInterval = 0.16;
      api.player.maxHp = 100;
      api.player.hp = Math.min(api.player.maxHp, api.player.hp || api.player.maxHp);
      reset(api);
    },
    update: (api, dt) => update(api, dt),
    updateHud: (api) => updateHud(api),
    onKeyDown: (api, e) => onKeyDown(api, e),
    postDraw: (api, ctx) => { postDraw(api, ctx); postDrawSword(api, ctx); }
  });
})();
