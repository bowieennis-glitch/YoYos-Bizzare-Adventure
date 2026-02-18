(() => {
  // ==========================================
  // CONSTANTS & CONFIGURATION
  // ==========================================
  const CANVAS_ID = 'game';
  const DEFAULT_SETTINGS = { controlMode: 'mouse', testMode: false, pinStats: false };
  const ENEMY_BASE_SPEED = 74;
  const ENEMY_BASE_HP = 6;
  const ENEMY_BASE_CONTACT_DPS = 18;
  const PLAYER_BASE_SPEED = 336;
  const PLAYER_BASE_RANGE = 24 * 18;
  const PLAYER_BASE_PROJECTILE_SPEED = 560;
  const PLAYER_BASE_SHOT_INTERVAL = 0.16;

  // ==========================================
  // DOM ELEMENT REFERENCES
  // ==========================================
  const canvas = document.getElementById(CANVAS_ID);
  const ctx = canvas.getContext('2d');

  // HUD Elements
  const hudHp = document.getElementById('hp');
  const hudRound = document.getElementById('round');
  const hudRemaining = document.getElementById('remaining');
  const hudEl = document.getElementById('hud');

  // Overlay Elements
  const upgradeOptionsEl = document.getElementById('upgradeOptions');
  const messageOverlay = document.getElementById('messageOverlay');
  const messageTitle = document.getElementById('messageTitle');
  const messageSubtitle = document.getElementById('messageSubtitle');
  const restartBtn = document.getElementById('restartBtn');

  // Title Screen Elements
  const titleOverlay = document.getElementById('titleOverlay');
  const titlePanel = document.getElementById('titlePanel');
  const titleOptionsPanel = document.getElementById('titleOptionsPanel');
  const titleManualPanel = document.getElementById('titleManualPanel');
  const titlePlayBtn = document.getElementById('titlePlayBtn');
  const titleManualBtn = document.getElementById('titleManualBtn');
  const titleOptionsBtn = document.getElementById('titleOptionsBtn');
  const titleQuitBtn = document.getElementById('titleQuitBtn');
  const titleOptionsBackBtn = document.getElementById('titleOptionsBackBtn');
  const titleManualBackBtn = document.getElementById('titleManualBackBtn');
  const titleDefaultTestMode = document.getElementById('titleDefaultTestMode');
  const titleDefaultPinStats = document.getElementById('titleDefaultPinStats');

  // Character Select Elements
  const characterOverlay = document.getElementById('characterOverlay');
  const characterOptionsEl = document.getElementById('characterOptions');
  const characterBackBtn = document.getElementById('characterBackBtn');

  // Dynamic Elements (created at runtime)
  let endlessBtn = null;
  let pinnedStatsEl = null;

  // Pause Overlay Elements (created in createPauseOverlay)
  let pauseOverlay = null;
  let resumeBtn = null;
  let statHpEl = null;
  let statRoundEl = null;
  let statRemainingEl = null;
  let statKillsEl = null;
  let statTimeEl = null;
  let controlRadioMouse = null;
  let controlRadioArrow = null;
  let testModeCheckbox = null;
  let testPanel = null;
  let testRoundInput = null;
  let testGoRoundBtn = null;
  let testSpawnNormalBtn = null;
  let testSpawnTankBtn = null;
  let testClearEnemiesBtn = null;
  let testUpgradeSelect = null;
  let testUpgradeTimesInput = null;
  let testApplyUpgradeBtn = null;
  let pinStatsCheckbox = null;

  // ==========================================
  // GAME STATE
  // ==========================================
  const state = { phase: 'title', round: 1, kills: 0, elapsed: 0, controlMode: 'mouse', testMode: false, mode: 'normal', pinStats: false, roundKills: 0, roundTotal: 0, spawnPlan: null };

  const CHARACTERS = Object.create(null);
  function registerCharacter(c) {
    if (!c || !c.id) return;
    CHARACTERS[c.id] = c;
  }

  function fmt1(n) {
    const x = (typeof n === 'number') ? n : Number(n);
    if (!isFinite(x)) return '0.0';
    return (Math.round(x * 10) / 10).toFixed(1);
  }
  window.registerCharacter = registerCharacter;

  let currentCharacter = null;


  function rechargeAllAbilities() {
    player.dashCooldown = 0;
    player.shotCooldown = 0;
    if (currentCharacter && typeof currentCharacter.recharge === 'function') currentCharacter.recharge(getGameApi());
  }

  function getAimDir() {
    const tx = (state.controlMode === 'mouse' ? input.mouse.x : aim.x);
    const ty = (state.controlMode === 'mouse' ? input.mouse.y : aim.y);
    return norm(tx - player.x, ty - player.y);
  }

  function getMoveSpeedMult() {
    if (currentCharacter && typeof currentCharacter.getMoveSpeedMult === 'function') {
      const m = currentCharacter.getMoveSpeedMult(getGameApi());
      if (typeof m === 'number' && isFinite(m) && m > 0) return m;
    }
    return 1;
  }

  function getDamageTakenMult() {
    if (currentCharacter && typeof currentCharacter.getDamageTakenMult === 'function') {
      const m = currentCharacter.getDamageTakenMult(getGameApi());
      if (typeof m === 'number' && isFinite(m) && m > 0) return m;
    }
    return 1;
  }

  function isPlayerInvincible() {
    if (currentCharacter && typeof currentCharacter.isInvincible === 'function') {
      return !!currentCharacter.isInvincible(getGameApi());
    }
    return false;
  }

  function dealExplosionDamage(x, y, radius, baseDamage) {
    spawnExplosionVfx(x, y, radius);
    for (let k = enemies.length - 1; k >= 0; k--) {
      const e = enemies[k];
      if (!e || e.hp <= 0) continue;
      if (!circleRectIntersect(x, y, radius, e.x, e.y, e.w, e.h)) continue;
      const wasAlive = e.hp > 0;
      const dmg = baseDamage * ((e.bleedTime && e.bleedTime > 0) ? 2 : 1);
      e.hp -= dmg;
      hitTexts.push({ x: e.x + e.w/2, y: e.y + e.h/2, text: '-' + fmt1(dmg), life: 0.6, vy: -30 });
      if (wasAlive && e.hp <= 0) { registerKill(); }
    }
  }


  function loadOptionalScript(src) {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  function loadCharacters() {
    return Promise.all([
      loadOptionalScript('ryan.js'),
      loadOptionalScript('chance.js'),
      loadOptionalScript('jojo.js')
    ]);
  }

  function showCharacterSelect() {
    state.phase = 'character';
    if (characterOptionsEl) characterOptionsEl.innerHTML = '';
    if (characterOverlay) characterOverlay.classList.remove('hidden');
    if (titleOverlay) titleOverlay.classList.add('hidden');
    if (hudEl) hudEl.classList.add('hidden');
  }
  function hideCharacterSelect() {
    if (characterOverlay) characterOverlay.classList.add('hidden');
  }
  function startWithCharacter(characterId) {
    const c = CHARACTERS[characterId] || Object.values(CHARACTERS)[0];
    currentCharacter = c || null;
    if (c && c.color) player.color = c.color;
    if (c && c.hpColor) player.hpColor = c.hpColor;
    state.phase = 'playing';
    hideCharacterSelect();
    const s = loadSettings();
    reset();
    if (currentCharacter && typeof currentCharacter.init === 'function') currentCharacter.init(getGameApi());
    applySettings(s);
    hideTitle();
    updateHUD();
    updatePauseStats();
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem('cvsq_settings');
      if (!raw) return { ...DEFAULT_SETTINGS };
      const obj = JSON.parse(raw);
      return {
        controlMode: (obj && (obj.controlMode === 'arrow' || obj.controlMode === 'mouse')) ? obj.controlMode : DEFAULT_SETTINGS.controlMode,
        testMode: !!(obj && obj.testMode),
        pinStats: !!(obj && obj.pinStats)
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
  function saveSettings(settings) {
    try { localStorage.setItem('cvsq_settings', JSON.stringify(settings)); } catch {}
  }
  function applySettings(settings) {
    state.controlMode = settings.controlMode;
    state.testMode = !!settings.testMode;
    state.pinStats = !!settings.pinStats;
    updateTestUI();
    setPinnedStats(state.pinStats);
  }

  function showTitle() {
    state.phase = 'title';
    if (titleOverlay) titleOverlay.classList.remove('hidden');
    if (titlePanel) titlePanel.classList.remove('hidden');
    if (titleOptionsPanel) titleOptionsPanel.classList.add('hidden');
    if (titleManualPanel) titleManualPanel.classList.add('hidden');
    if (hudEl) hudEl.classList.add('hidden');
    if (pinnedStatsEl) pinnedStatsEl.classList.add('hidden');
  }
  function hideTitle() {
    if (titleOverlay) titleOverlay.classList.add('hidden');
    if (hudEl) hudEl.classList.remove('hidden');
  }
  function openTitleOptions() {
    if (!titleOverlay) return;
    const s = loadSettings();
    const radios = document.querySelectorAll('input[name="titleControlMode"]');
    radios.forEach(r => { r.checked = (r.value === s.controlMode); });
    if (titleDefaultTestMode) titleDefaultTestMode.checked = !!s.testMode;
    if (titleDefaultPinStats) titleDefaultPinStats.checked = !!s.pinStats;
    if (titlePanel) titlePanel.classList.add('hidden');
    if (titleManualPanel) titleManualPanel.classList.add('hidden');
    if (titleOptionsPanel) titleOptionsPanel.classList.remove('hidden');
  }
  function closeTitleOptions() {
    if (titlePanel) titlePanel.classList.remove('hidden');
    if (titleOptionsPanel) titleOptionsPanel.classList.add('hidden');
  }

  function openTitleManual() {
    if (!titleOverlay) return;
    if (titlePanel) titlePanel.classList.add('hidden');
    if (titleOptionsPanel) titleOptionsPanel.classList.add('hidden');
    if (titleManualPanel) titleManualPanel.classList.remove('hidden');
  }
  function closeTitleManual() {
    if (titlePanel) titlePanel.classList.remove('hidden');
    if (titleManualPanel) titleManualPanel.classList.add('hidden');
  }
  function startFromTitle() {
    showCharacterSelect();
    loadCharacters().then(() => {
      const list = Object.values(CHARACTERS);
      if (list.length === 0) {
        hideCharacterSelect();
        showMessage('Missing character files', 'Could not load ryan.js or jojo.js. Make sure at least one character file exists.');
        return;
      }
      if (!characterOptionsEl) return;
      characterOptionsEl.innerHTML = '';
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      for (const c of list) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = c.name || c.id;
        btn.addEventListener('click', () => startWithCharacter(c.id));
        characterOptionsEl.appendChild(btn);
      }
    });
  }

  const input = {
    w: false, a: false, s: false, d: false,
    arrows: { up: false, down: false, left: false, right: false },
    space: false,
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2, down: false }
  };

  let aim = { x: window.innerWidth / 2, y: window.innerHeight / 2, dirX: 1, dirY: 0, radius: 120 };

  const player = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    r: 16,
    speed: 336,
    color: '#57e39a',
    hpColor: '#70ffa6',
    moveDirX: 1,
    moveDirY: 0,
    hp: 100,
    maxHp: 100,
    alive: true,
    shotCooldown: 0,
    shotInterval: 0.16,
    damage: 1,
    critChance: 0,
    critDamage: 0,
    projectileSpeed: 560,
    range: 24 * 18,
    pierce: 0,
    explosionRadius: 0,
    rebound: 0,
    homingDeg: 0,
    regenPerTick: 0,
    regenTimer: 0,
    lifeStealPerKill: 0,
    luck: 0,
    dashCooldown: 0,
    dashQueued: false
  };

  if (window.Upgrades && typeof window.Upgrades.init === 'function') {
    window.Upgrades.init(() => ({ player, currentCharacter }));
  }

  function grantFiveRoundMaxHpBonus(fromRoundExclusive, toRoundInclusive) {
    const a = Math.max(0, Math.floor(fromRoundExclusive || 0));
    const b = Math.max(0, Math.floor(toRoundInclusive || 0));
    if (b <= a) return;
    for (let r = a + 1; r <= b; r++) {
      if (r > 0 && (r % 5) === 0) {
        const oldMax = player.maxHp;
        const newMax = Math.max(oldMax, Math.ceil(oldMax * 1.10));
        if (newMax !== oldMax) {
          player.maxHp = newMax;
          player.hp = Math.min(player.maxHp, player.hp + (newMax - oldMax));
        }
      }
    }
  }

  function fillUpgradeSelect(selectEl) {
    if (window.Upgrades && typeof window.Upgrades.fillUpgradeSelect === 'function') {
      window.Upgrades.fillUpgradeSelect(selectEl);
    }
  }

  let bullets = [];
  let enemies = [];
  let hitTexts = [];
  let vfx = [];
  let bloodStains = [];
  let playerDamageAccum = 0;
  let playerDamageTicker = 0;

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('keydown', (e) => {
    if (state.phase === 'title') {
      if (e.code === 'Escape') {
        if (titleManualPanel && !titleManualPanel.classList.contains('hidden')) closeTitleManual();
        else closeTitleOptions();
        e.preventDefault();
      }
      return;
    }
    if (state.phase === 'character') return;
    if (e.code === 'KeyW') input.w = true;
    if (e.code === 'KeyA') input.a = true;
    if (e.code === 'KeyS') input.s = true;
    if (e.code === 'KeyD') input.d = true;
    if (e.code === 'ArrowUp') { input.arrows.up = true; e.preventDefault(); }
    if (e.code === 'ArrowDown') { input.arrows.down = true; e.preventDefault(); }
    if (e.code === 'ArrowLeft') { input.arrows.left = true; e.preventDefault(); }
    if (e.code === 'ArrowRight') { input.arrows.right = true; e.preventDefault(); }
    if (currentCharacter && typeof currentCharacter.onKeyDown === 'function') {
      const consumed = !!currentCharacter.onKeyDown(getGameApi(), e);
      if (consumed) {
        e.preventDefault();
        return;
      }
    }

    if (e.code === 'Space') {
      input.space = true;
      if (currentCharacter && typeof currentCharacter.dash === 'function' && player.dashCooldown <= 0) player.dashQueued = true;
      e.preventDefault();
    }
    if (e.code === 'KeyC') toggleControlMode();
    if (e.code === 'Escape') togglePause();
    if (e.code === 'KeyR') {
      if (state.phase === 'message') {
        restartGame();
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') input.w = false;
    if (e.code === 'KeyA') input.a = false;
    if (e.code === 'KeyS') input.s = false;
    if (e.code === 'KeyD') input.d = false;
    if (e.code === 'ArrowUp') { input.arrows.up = false; e.preventDefault(); }
    if (e.code === 'ArrowDown') { input.arrows.down = false; e.preventDefault(); }
    if (e.code === 'ArrowLeft') { input.arrows.left = false; e.preventDefault(); }
    if (e.code === 'ArrowRight') { input.arrows.right = false; e.preventDefault(); }
    if (e.code === 'Space') { input.space = false; e.preventDefault(); }
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = e.clientX - rect.left;
    input.mouse.y = e.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', () => input.mouse.down = true);
  window.addEventListener('mouseup', () => input.mouse.down = false);

  restartBtn.addEventListener('click', () => restartGame());

  if (titlePlayBtn) titlePlayBtn.addEventListener('click', () => startFromTitle());
  if (titleManualBtn) titleManualBtn.addEventListener('click', () => openTitleManual());
  if (titleOptionsBtn) titleOptionsBtn.addEventListener('click', () => openTitleOptions());
  if (titleOptionsBackBtn) titleOptionsBackBtn.addEventListener('click', () => closeTitleOptions());
  if (titleManualBackBtn) titleManualBackBtn.addEventListener('click', () => closeTitleManual());
  if (characterBackBtn) characterBackBtn.addEventListener('click', () => { hideCharacterSelect(); showTitle(); });
  if (titleQuitBtn) titleQuitBtn.addEventListener('click', () => {
    try {
      window.close();
    } catch {}
    showMessage('Quit', 'Your browser may block closing the tab. You can close it manually.');
  });

  const titleControlRadios = document.querySelectorAll('input[name="titleControlMode"]');
  titleControlRadios.forEach(r => r.addEventListener('change', () => {
    const s = loadSettings();
    s.controlMode = r.value === 'arrow' ? 'arrow' : 'mouse';
    saveSettings(s);
  }));
  if (titleDefaultTestMode) titleDefaultTestMode.addEventListener('change', () => {
    const s = loadSettings();
    s.testMode = !!titleDefaultTestMode.checked;
    saveSettings(s);
  });
  if (titleDefaultPinStats) titleDefaultPinStats.addEventListener('change', () => {
    const s = loadSettings();
    s.pinStats = !!titleDefaultPinStats.checked;
    saveSettings(s);
  });

  showTitle();

  endlessBtn = document.createElement('button');
  endlessBtn.id = 'endlessBtn';
  endlessBtn.className = 'btn';
  endlessBtn.textContent = 'Endless Mode';
  endlessBtn.style.marginLeft = '10px';
  endlessBtn.style.display = 'none';
  restartBtn.parentElement.appendChild(endlessBtn);
  endlessBtn.addEventListener('click', () => startEndlessMode());

  function createPauseOverlay() {
    if (pauseOverlay) return;
    pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pauseOverlay';
    pauseOverlay.className = 'overlay hidden';

    const panel = document.createElement('div');
    panel.className = 'panel';

    const h2 = document.createElement('h2');
    h2.textContent = 'Paused';
    panel.appendChild(h2);

    const stats = document.createElement('div');
    stats.className = 'stats';
    stats.innerHTML = `
      <div>HP: <span id="statHp">100</span></div>
      <div>Round: <span id="statRound">1</span></div>
      <div>Enemies: <span id="statRemaining">0</span></div>
      <div>Kills: <span id="statKills">0</span></div>
      <div>Time: <span id="statTime">0:00</span></div>
      <div>Controls:
        <label><input type="radio" name="controlMode" value="mouse" checked> Mouse Aim</label>
        <label><input type="radio" name="controlMode" value="arrow"> Arrow Aim</label>
      </div>
      <div>Stats Panel:
        <label><input type="checkbox" id="pinStats"> Pin on screen</label>
      </div>
      <div>Test Mode:
        <label><input type="checkbox" id="testMode"> Enable</label>
      </div>
    `;
    panel.appendChild(stats);

    testPanel = document.createElement('div');
    testPanel.id = 'testPanel';
    testPanel.style.display = 'none';
    testPanel.style.gap = '8px';
    testPanel.style.marginTop = '10px';
    testPanel.style.paddingTop = '10px';
    testPanel.style.borderTop = '1px solid rgba(255,255,255,0.10)';
    testPanel.innerHTML = `
      <div style="font-weight:800; letter-spacing:.3px;">Test Tools</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <button class="btn" id="testSpawnNormal">Spawn Enemy</button>
        <button class="btn" id="testSpawnTank">Spawn Tank</button>
      </div>
      <button class="btn" id="testClearEnemies">Clear Enemies</button>
      <div style="display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center;">
        <input id="testRound" type="number" min="1" step="1" value="1" style="padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background:#1a2030; color:var(--text); font-weight:700;" />
        <button class="btn" id="testGoRound">Go Round</button>
      </div>
      <div style="display:grid; grid-template-columns:1fr 110px auto; gap:8px; align-items:center;">
        <select id="testUpgrade" style="padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background:#1a2030; color:var(--text); font-weight:700;"></select>
        <input id="testUpgradeTimes" type="number" min="1" step="1" value="1" style="padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background:#1a2030; color:var(--text); font-weight:700;" />
        <button class="btn" id="testApplyUpgrade">Apply</button>
      </div>
    `;
    panel.appendChild(testPanel);

    const actions = document.createElement('div');
    actions.className = 'actions';
    resumeBtn = document.createElement('button');
    resumeBtn.id = 'resumeBtn';
    resumeBtn.className = 'btn';
    resumeBtn.textContent = 'Resume';
    actions.appendChild(resumeBtn);
    panel.appendChild(actions);

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Esc: Resume • C: Toggle controls';
    panel.appendChild(hint);

    pauseOverlay.appendChild(panel);
    document.body.appendChild(pauseOverlay);

    statHpEl = stats.querySelector('#statHp');
    statRoundEl = stats.querySelector('#statRound');
    statRemainingEl = stats.querySelector('#statRemaining');
    statKillsEl = stats.querySelector('#statKills');
    statTimeEl = stats.querySelector('#statTime');
    controlRadioMouse = stats.querySelector('input[value="mouse"]');
    controlRadioArrow = stats.querySelector('input[value="arrow"]');
    pinStatsCheckbox = stats.querySelector('#pinStats');
    testModeCheckbox = stats.querySelector('#testMode');

    testRoundInput = testPanel.querySelector('#testRound');
    testGoRoundBtn = testPanel.querySelector('#testGoRound');
    testSpawnNormalBtn = testPanel.querySelector('#testSpawnNormal');
    testSpawnTankBtn = testPanel.querySelector('#testSpawnTank');
    testClearEnemiesBtn = testPanel.querySelector('#testClearEnemies');
    testUpgradeSelect = testPanel.querySelector('#testUpgrade');
    testUpgradeTimesInput = testPanel.querySelector('#testUpgradeTimes');
    testApplyUpgradeBtn = testPanel.querySelector('#testApplyUpgrade');

    fillUpgradeSelect(testUpgradeSelect);

    controlRadioMouse.addEventListener('change', () => { if (controlRadioMouse.checked) setControlMode('mouse'); });
    controlRadioArrow.addEventListener('change', () => { if (controlRadioArrow.checked) setControlMode('arrow'); });
    resumeBtn.addEventListener('click', () => { if (state.phase === 'paused') togglePause(); });

    pinStatsCheckbox.addEventListener('change', () => setPinnedStats(pinStatsCheckbox.checked));

    testModeCheckbox.addEventListener('change', () => setTestMode(testModeCheckbox.checked));
    testGoRoundBtn.addEventListener('click', () => gotoRound(parseInt(testRoundInput.value || '1', 10)));
    testSpawnNormalBtn.addEventListener('click', () => spawnTestEnemy(false));
    testSpawnTankBtn.addEventListener('click', () => spawnTestEnemy(true));
    testClearEnemiesBtn.addEventListener('click', () => { enemies = []; updateHUD(); updatePauseStats(); });
    testApplyUpgradeBtn.addEventListener('click', () => {
      const id = parseInt(testUpgradeSelect.value || '1', 10);
      const times = clamp(parseInt(testUpgradeTimesInput.value || '1', 10), 1, 999);
      for (let i = 0; i < times; i++) applyUpgrade(id);
      updateHUD();
      updatePauseStats();
    });

    updateTestUI();
  }

  function setPinnedStats(enabled) {
    state.pinStats = !!enabled;
    if (!pinnedStatsEl) {
      pinnedStatsEl = document.createElement('div');
      pinnedStatsEl.id = 'pinnedStats';
      pinnedStatsEl.className = 'hud';
      pinnedStatsEl.style.left = 'auto';
      pinnedStatsEl.style.right = '16px';
      pinnedStatsEl.style.top = '16px';
      pinnedStatsEl.style.minWidth = '220px';
      pinnedStatsEl.style.pointerEvents = 'none';
      document.body.appendChild(pinnedStatsEl);
    }
    pinnedStatsEl.style.display = state.pinStats ? 'grid' : 'none';
    updatePinnedStats();
    updatePauseStats();
  }

  function updatePinnedStats() {
    if (!pinnedStatsEl || !state.pinStats) return;
    const fireRate = (1 / Math.max(0.001, player.shotInterval));
    pinnedStatsEl.innerHTML =
      '<div>DMG: ' + player.damage + '</div>' +
      '<div>Fire: ' + fireRate.toFixed(1) + '/s</div>' +
      '<div>Move: ' + Math.round(player.speed) + '</div>' +
      '<div>Proj: ' + Math.round(player.projectileSpeed) + '</div>' +
      '<div>Range: ' + Math.round(player.range) + '</div>' +
      '<div>Pierce: ' + player.pierce + '</div>' +
      '<div>Explode: ' + Math.round(player.explosionRadius) + '</div>' +
      '<div>Rebound: ' + player.rebound + '</div>' +
      '<div>Homing: ' + player.homingDeg + '°</div>' +
      '<div>Max HP: ' + player.maxHp + '</div>' +
      '<div>Regen: ' + player.regenPerTick + '/2s</div>' +
      '<div>Life Steal: ' + player.lifeStealPerKill + '/kill</div>';
  }

  function setTestMode(enabled) {
    state.testMode = !!enabled;
    updateTestUI();
    updatePauseStats();
  }

  function updateTestUI() {
    if (testModeCheckbox) testModeCheckbox.checked = state.testMode;
    if (testPanel) testPanel.style.display = state.testMode ? 'grid' : 'none';
  }

  function getNormalEnemyStatsForRound(round) {
    const r = Math.max(1, Math.floor(round || 1));
    const s = getRoundScaling(r);
    const hp = Math.max(1, Math.round(6 * s.hpMult));
    const contactDps = 18 * s.hpMult;
    const baseEnemySpeed = 74;
    const speed = Math.min(player.speed, baseEnemySpeed * s.speedMult);
    return { hp, contactDps, speed };
  }

  function spawnTestEnemy(isTank) {
    if (!state.testMode) return;
    const normalSize = 24;
    const tankSize = normalSize * 2.5;
    const size = isTank ? tankSize : normalSize;
    const pos = edgeSpawnPosition(size);

    const s = getNormalEnemyStatsForRound(state.round);
    const hp = isTank ? Math.max(1, Math.round(s.hp * 6)) : s.hp;

    enemies.push({
      x: pos.x, y: pos.y,
      w: size, h: size,
      hp,
      maxHp: hp,
      speed: s.speed,
      color: '#ff4b4b',
      contactDps: s.contactDps,
      isBoss: false
    });

    updateHUD();
    updatePauseStats();
  }

  function gotoRound(round) {
    if (!state.testMode) return;
    const r = Math.max(1, Math.floor(round || 1));
    const prev = state.round;
    state.round = r;
    grantFiveRoundMaxHpBonus(prev, state.round);
    spawnRound(state.round);
    updateHUD();
    updatePauseStats();
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function norm(dx, dy) { const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
  function circleRectIntersect(cx, cy, r, rx, ry, rw, rh) {
    const nx = clamp(cx, rx, rx + rw);
    const ny = clamp(cy, ry, ry + rh);
    const dx = cx - nx, dy = cy - ny;
    return (dx * dx + dy * dy) <= r * r;
  }

  function reset() {
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.moveDirX = 1;
    player.moveDirY = 0;
    player.speed = 336;
    player.maxHp = 100;
    player.hp = player.maxHp;
    player.alive = true;
    player.shotCooldown = 0;
    player.dashCooldown = 0;
    player.dashQueued = false;
    input.space = false;
    player.damage = 1;
    player.critChance = 0;
    player.critDamage = 0;
    player.shotInterval = 0.16;
    player.projectileSpeed = 560;
    player.range = 24 * 18;
    player.pierce = 0;
    player.explosionRadius = 0;
    player.rebound = 0;
    player.homingDeg = 0;
    player.regenPerTick = 0;
    player.regenTimer = 0;
    player.lifeStealPerKill = 0;
    player.luck = 0;
    bullets.length = 0;
    enemies.length = 0;
    hitTexts.length = 0;
    vfx.length = 0;
    bloodStains.length = 0;
    playerDamageAccum = 0;
    playerDamageTicker = 0;
    state.round = 1;
    state.kills = 0;
    state.elapsed = 0;
    state.controlMode = 'mouse';
    state.testMode = false;
    state.mode = 'normal';
    state.pinStats = false;
    aim.dirX = 1; aim.dirY = 0; aim.x = player.x + aim.dirX * aim.radius; aim.y = player.y + aim.dirY * aim.radius;
    state.phase = (state.phase === 'title') ? 'title' : 'playing';
    hideUpgrade();
    hideMessage();
    spawnRound(state.round);
    updateHUD();
    updateTestUI();
    if (pinnedStatsEl) pinnedStatsEl.style.display = 'none';
  }

  function getGameApi() {
    return {
      canvas,
      ctx,
      state,
      player,
      input,
      aim,
      bullets,
      enemies,
      hitTexts,
      vfx,
      clamp,
      norm,
      rand,
      circleRectIntersect,
      registerKill,
      damagePlayer,
      dealExplosionDamage,
      spawnExplosionVfx,
      fireBullet
    };
  }

  function restartGame() {
    reset();
    state.phase = 'playing';
  }

  function updateHUD() {
    hudHp.textContent = Math.max(0, Math.ceil(player.hp)).toString();
    hudRound.textContent = state.round.toString();
    hudRemaining.textContent = enemies.length.toString();
    updatePinnedStats();
    if (currentCharacter && typeof currentCharacter.updateHud === 'function') currentCharacter.updateHud(getGameApi());
  }

  function showUpgrade() {
    state.phase = 'choosing';
    upgradeOptionsEl.innerHTML = '';
    const picks = (window.Upgrades && typeof window.Upgrades.getOfferIds === 'function')
      ? window.Upgrades.getOfferIds(3)
      : [];

    picks.forEach(num => {
      const btn = document.createElement('button');
      const meta = upgradeMeta(num);
      btn.dataset.rarity = meta.rarity || 'common';
      const rarityLabel = (meta.rarity || 'common').charAt(0).toUpperCase() + (meta.rarity || 'common').slice(1);
      btn.innerHTML = '<div class="up-rarity">' + rarityLabel + '</div>' +
                      '<div class="up-title">' + meta.title + '</div>' +
                      '<div class="up-desc">' + meta.desc + '</div>';
      btn.addEventListener('click', () => {
        applyUpgrade(num);
        hideUpgrade();
        const continueAfterUpgrade = () => {
          const prev = state.round;
          state.round += 1;
          grantFiveRoundMaxHpBonus(prev, state.round);
          if (state.mode === 'endless') {
            spawnRound(state.round);
            state.phase = 'playing';
          } else if (state.round <= 20) {
            spawnRound(state.round);
            state.phase = 'playing';
          }
          updateHUD();
        };
        continueAfterUpgrade();
      });
      upgradeOptionsEl.appendChild(btn);
    });
    document.getElementById('upgradeOverlay').classList.remove('hidden');
  }

  function hideUpgrade() {
    document.getElementById('upgradeOverlay').classList.add('hidden');
    upgradeOptionsEl.innerHTML = '';
  }

  function applyUpgrade(id) {
    if (window.Upgrades && typeof window.Upgrades.applyUpgrade === 'function') window.Upgrades.applyUpgrade(id);
  }

  function upgradeMeta(id) {
    if (window.Upgrades && typeof window.Upgrades.upgradeMeta === 'function') return window.Upgrades.upgradeMeta(id);
    return { title: 'Unknown', desc: '', rarity: 'common' };
  }

  function registerKill() {
    state.kills += 1;
    state.roundKills = (state.roundKills || 0) + 1;
    if (player.lifeStealPerKill > 0 && player.alive) {
      player.hp = Math.min(player.maxHp, player.hp + player.lifeStealPerKill);
    }
  }

  function damagePlayer(amount, atX, atY) {
    if (!player.alive) return;
    if (isPlayerInvincible()) return;
    const dmg = Math.max(0, (amount || 0) * getDamageTakenMult());
    if (dmg <= 0) return;
    player.hp -= dmg;
    const x = (typeof atX === 'number') ? atX : player.x;
    const y = (typeof atY === 'number') ? atY : (player.y - player.r - 8);
    hitTexts.push({ x, y, text: '-' + fmt1(dmg), life: 0.7, vy: -26 });
    if (player.hp <= 0 && player.alive) {
      player.alive = false;
      player.hp = 0;
      showMessage('Game Over', 'You were overwhelmed by the squares.');
    }
  }

  function showMessage(title, subtitle) {
    messageTitle.textContent = title;
    messageSubtitle.textContent = subtitle;
    if (endlessBtn) endlessBtn.style.display = 'none';
    messageOverlay.classList.remove('hidden');
    state.phase = 'message';
  }
  function hideMessage() { messageOverlay.classList.add('hidden'); }

  function showEndlessPrompt() {
    messageTitle.textContent = 'You Win!';
    messageSubtitle.textContent = 'You cleared round 20. Continue in Endless Mode?';
    if (endlessBtn) endlessBtn.style.display = '';
    messageOverlay.classList.remove('hidden');
    state.phase = 'message';
  }

  function startEndlessMode() {
    state.mode = 'endless';
    hideMessage();
    state.phase = 'playing';
    const prev = state.round;
    state.round = Math.max(21, state.round + 1);
    grantFiveRoundMaxHpBonus(prev, state.round);
    spawnRound(state.round);
    updateHUD();
  }

  function effectiveRoundForScaling(round) {
    const r = Math.max(1, Math.floor(round || 1));
    const k = state.mode === 'endless' ? 1.25 : 1;
    return 1 + (r - 1) * k;
  }

  function getRoundScaling(round) {
    const er = effectiveRoundForScaling(round);
    const hpMult = Math.pow(1.1, Math.max(0, er - 1));
    const speedMult = Math.pow(1.02, Math.max(0, er - 1));
    return { er, hpMult, speedMult };
  }

  function edgeSpawnPosition(size) {
    const margin = 40 + size;
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = Math.random() * canvas.width; y = -margin; }
    else if (side === 1) { x = canvas.width + margin; y = Math.random() * canvas.height; }
    else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + margin; }
    else { x = -margin; y = Math.random() * canvas.height; }
    return {x, y};
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function spawnExplosionVfx(x, y, radius) {
    const r = Math.max(10, radius || 0);
    const outerLife = 0.28;
    const innerLife = 0.22;
    vfx.push({ kind: 'ring', x, y, r: 0, dr: r / outerLife, life: outerLife, maxLife: outerLife, color: 'rgba(255,166,77,1)', width: 4 });
    vfx.push({ kind: 'ring', x, y, r: 0, dr: r / innerLife, life: innerLife, maxLife: innerLife, color: 'rgba(255,255,255,0.9)', width: 2 });
    const count = clamp(Math.floor(r / 3), 12, 42);
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(120, 520);
      vfx.push({
        kind: 'spark',
        x: x + Math.cos(a) * rand(0, r * 0.15),
        y: y + Math.sin(a) * rand(0, r * 0.15),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.25, 0.5),
        maxLife: 0.5,
        size: rand(1.4, 3.2),
        color: Math.random() < 0.5 ? 'rgba(255,166,77,1)' : 'rgba(245,247,255,1)'
      });
    }
  }

  function updateVfx(dt) {
    for (let i = vfx.length - 1; i >= 0; i--) {
      const p = vfx[i];
      p.life -= dt;
      if (p.life <= 0) { vfx.splice(i, 1); continue; }
      if (p.kind === 'spark') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(0.01, dt);
        p.vy *= Math.pow(0.01, dt);
      } else if (p.kind === 'coin') {
        p.ang = (p.ang || 0) + dt * 18;
        p.y += (p.vy || -12) * dt;
      } else if (p.kind === 'ring') {
        p.r += p.dr * dt;
      }
    }
  }

  function drawVfx() {
    for (const p of vfx) {
      if (p.kind === 'spark') {
        const a = clamp(p.life / (p.maxLife || 0.001), 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'coin') {
        const a = clamp(p.life / (p.maxLife || 0.001), 0, 1);
        ctx.globalAlpha = a;
        const squish = Math.abs(Math.cos(p.ang || 0));
        const scaleX = 0.45 + squish * 0.55;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(scaleX, 1);
        ctx.font = 'bold 22px system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd166';
        ctx.fillText('🪙', 0, 0);
        ctx.restore();
      } else if (p.kind === 'ring') {
        const a = clamp(p.life / (p.maxLife || 0.001), 0, 1);
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width || 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function spawnRound(round) {
    enemies = [];
    state.roundKills = 0;
    state.roundTotal = 0;
    state.spawnPlan = null;
    const s = getRoundScaling(round);
    const er = s.er;
    const isBossRound = (Math.floor(round) % 10) === 0;
    if (!isBossRound) {
      const baseCount = 4 + Math.round(er * 3);
      const normalSize = 24;
      const hpMult = s.hpMult;
      const speedMult = s.speedMult;
      const baseNormalHp = 6;
      const normalHp = Math.max(1, Math.round(baseNormalHp * hpMult));
      const tankSize = normalSize * 2.5;
      const tankHp = Math.max(1, Math.round(normalHp * 6));
      const baseContactDps = 18;
      const contactDps = baseContactDps * hpMult;
      const baseEnemySpeed = 74;
      const enemySpeed = Math.min(player.speed, baseEnemySpeed * speedMult);
      const planned = [];
      let i = 0;
      while (i < baseCount) {
        if (round >= 4 && i <= baseCount - 2 && Math.random() < 0.10) {
          const pos = edgeSpawnPosition(tankSize);
          planned.push({
            x: pos.x, y: pos.y,
            w: tankSize, h: tankSize,
            hp: tankHp,
            maxHp: tankHp,
            speed: enemySpeed,
            color: '#ff4b4b',
            contactDps,
            isBoss: false
          });
          i += 2;
        } else {
          const pos = edgeSpawnPosition(normalSize);
          planned.push({
            x: pos.x, y: pos.y,
            w: normalSize, h: normalSize,
            hp: normalHp,
            maxHp: normalHp,
            speed: enemySpeed,
            color: '#ff4b4b',
            contactDps,
            isBoss: false
          });
          i += 1;
        }
      }

      state.roundTotal = planned.length;
      const wave1 = Math.max(0, Math.floor(planned.length / 3));
      const wave2 = Math.max(0, Math.floor(planned.length / 3));
      state.spawnPlan = {
        pending: planned,
        wave: 1,
        wave1,
        wave2
      };
      for (let n = 0; n < wave1 && state.spawnPlan.pending.length > 0; n++) {
        enemies.push(state.spawnPlan.pending.shift());
      }
    } else {
      const size = Math.min(canvas.width, canvas.height) * 0.15;
      const pos = edgeSpawnPosition(size);
      const hpMult = s.hpMult;
      const speedMult = s.speedMult;
      const hp = Math.max(1, Math.round(6 * hpMult));
      state.roundTotal = 1;
      enemies.push({
        x: pos.x, y: pos.y,
        w: size, h: size,
        hp: hp,
        maxHp: hp,
        speed: Math.min(player.speed, 80 * speedMult),
        color: '#ff2d2d',
        contactDps: 35 * hpMult,
        isBoss: true
      });
    }
  }

  function progressRoundSpawns() {
    const plan = state.spawnPlan;
    if (!plan || !plan.pending || plan.pending.length === 0) return;
    const total = Math.max(1, state.roundTotal || 0);
    const pct = (state.roundKills || 0) / total;

    if (plan.wave === 1 && pct >= 0.20) {
      for (let n = 0; n < plan.wave2 && plan.pending.length > 0; n++) {
        enemies.push(plan.pending.shift());
      }
      plan.wave = 2;
    }

    if (plan.wave === 2 && pct >= 0.50) {
      while (plan.pending.length > 0) enemies.push(plan.pending.shift());
      plan.wave = 3;
    }
  }

  function fireBullet() {
    const dx = (state.controlMode === 'mouse' ? input.mouse.x : aim.x) - player.x;
    const dy = (state.controlMode === 'mouse' ? input.mouse.y : aim.y) - player.y;
    const [nx, ny] = norm(dx, dy);
    const speed = player.projectileSpeed;
    const muzzle = player.r + 6;
    const critChance = Math.max(0, player.critChance || 0);
    const critMult = 1.5 + Math.max(0, player.critDamage || 0);
    const isCrit = Math.random() < critChance;
    bullets.push({
      x: player.x + nx * muzzle,
      y: player.y + ny * muzzle,
      r: 4,
      vx: nx * speed,
      vy: ny * speed,
      damage: player.damage,
      isCrit,
      critMult,
      range: player.range,
      pierce: player.pierce,
      explosionRadius: player.explosionRadius,
      rebound: player.rebound,
      homingDeg: player.homingDeg
    });
    player.shotCooldown = player.shotInterval;
  }

  function update(dt) {
    if (state.phase === 'title') return;
    if (state.phase === 'character') return;
    if (state.phase === 'message') return;
    if (state.phase === 'paused') { updatePauseStats(); return; }
    updateVfx(dt);

    for (let i = bloodStains.length - 1; i >= 0; i--) {
      const b = bloodStains[i];
      b.life -= dt;
      if (b.life <= 0) bloodStains.splice(i, 1);
    }

    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (player.dashQueued) {
      player.dashQueued = false;
      if (currentCharacter && typeof currentCharacter.dash === 'function') currentCharacter.dash(getGameApi());
    }

    if (currentCharacter && typeof currentCharacter.update === 'function') currentCharacter.update(getGameApi(), dt);

    for (const e of enemies) {
      if (!e || e.hp <= 0) continue;
      if (e.bleedTime && e.bleedTime > 0) {
        const prev = e.bleedTime;
        e.bleedTime -= dt;
        const dmg = (e.bleedDps || 0) * dt;
        if (dmg > 0) {
          const wasAlive = e.hp > 0;
          e.hp -= dmg;
          if (wasAlive && e.hp <= 0) registerKill();
        }
        e.bleedDropTimer = (e.bleedDropTimer || 0) - dt;
        if (e.bleedDropTimer <= 0) {
          const cx = e.x + e.w / 2;
          const cy = e.y + e.h / 2;
          bloodStains.push({ x: cx, y: cy, r: rand(3, 8), life: rand(8, 14), maxLife: 14 });
          e.bleedDropTimer = rand(0.14, 0.32);
        }
        if (prev > 0 && e.bleedTime <= 0) {
          e.bleedTime = 0;
        }
      }
    }

    if (player.regenPerTick > 0 && player.alive) {
      player.regenTimer += dt;
      while (player.regenTimer >= 2) {
        player.regenTimer -= 2;
        player.hp = Math.min(player.maxHp, player.hp + player.regenPerTick);
      }
    }

    let mx = 0, my = 0;
    if (input.w) my -= 1; if (input.s) my += 1; if (input.a) mx -= 1; if (input.d) mx += 1;
    if (mx !== 0 || my !== 0) {
      const [nx, ny] = norm(mx, my);
      player.moveDirX = nx;
      player.moveDirY = ny;
      const sp = player.speed * getMoveSpeedMult();
      player.x += nx * sp * dt;
      player.y += ny * sp * dt;
    }

    player.x = clamp(player.x, player.r, canvas.width - player.r);
    player.y = clamp(player.y, player.r, canvas.height - player.r);

    if (state.controlMode === 'mouse') {
      aim.x = input.mouse.x; aim.y = input.mouse.y;
    } else {
      let ax = 0, ay = 0;
      if (input.arrows.up) ay -= 1; if (input.arrows.down) ay += 1; if (input.arrows.left) ax -= 1; if (input.arrows.right) ax += 1;
      if (ax !== 0 || ay !== 0) { const d = norm(ax, ay); aim.dirX = d[0]; aim.dirY = d[1]; }
      aim.x = player.x + aim.dirX * aim.radius; aim.y = player.y + aim.dirY * aim.radius;
    }

    if (player.shotCooldown > 0) player.shotCooldown -= dt;
    const arrowPressed = input.arrows.up || input.arrows.down || input.arrows.left || input.arrows.right;
    const wantFire = state.controlMode === 'mouse' ? input.mouse.down : arrowPressed;
    if (state.phase === 'playing' && wantFire && player.shotCooldown <= 0) {
      if (currentCharacter && typeof currentCharacter.fire === 'function') currentCharacter.fire(getGameApi());
      else fireBullet();
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (b.homingDeg && b.homingDeg > 0 && enemies.length > 0) {
        let tx = null, ty = null, bestD2 = Infinity;
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
          const dx = cx - b.x, dy = cy - b.y; const d2 = dx*dx + dy*dy;
          if (d2 < bestD2) { bestD2 = d2; tx = cx; ty = cy; }
        }
        if (tx !== null) {
          const speed = Math.hypot(b.vx, b.vy) || player.projectileSpeed;
          const cur = Math.atan2(b.vy, b.vx);
          const tgt = Math.atan2(ty - b.y, tx - b.x);
          let da = tgt - cur;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          const maxTurn = (b.homingDeg * Math.PI / 180) * dt;
          if (da > maxTurn) da = maxTurn; if (da < -maxTurn) da = -maxTurn;
          const ang = cur + da;
          b.vx = Math.cos(ang) * speed;
          b.vy = Math.sin(ang) * speed;
        }
      }
      const mx = b.vx * dt, my = b.vy * dt;
      b.x += mx; b.y += my; b.range -= Math.hypot(mx, my);
      if (b.x - b.r < 0) {
        if (b.rebound > 0) { b.x = b.r; b.vx = Math.abs(b.vx); b.rebound--; }
        else { bullets.splice(i, 1); continue; }
      }
      if (b.x + b.r > canvas.width) {
        if (b.rebound > 0) { b.x = canvas.width - b.r; b.vx = -Math.abs(b.vx); b.rebound--; }
        else { bullets.splice(i, 1); continue; }
      }
      if (b.y - b.r < 0) {
        if (b.rebound > 0) { b.y = b.r; b.vy = Math.abs(b.vy); b.rebound--; }
        else { bullets.splice(i, 1); continue; }
      }
      if (b.y + b.r > canvas.height) {
        if (b.rebound > 0) { b.y = canvas.height - b.r; b.vy = -Math.abs(b.vy); b.rebound--; }
        else { bullets.splice(i, 1); continue; }
      }
      if (b.range <= 0) { bullets.splice(i, 1); continue; }
    }

    for (let e of enemies) {
      if (!e || e.hp <= 0) continue;
      e.speedMult = 1;
    }

    for (let e of enemies) {
      if (e.hp > 0) {
        let tx = player.x;
        let ty = player.y;
        if (currentCharacter && typeof currentCharacter.getEnemyTarget === 'function') {
          const tgt = currentCharacter.getEnemyTarget(getGameApi(), e);
          if (tgt && typeof tgt.x === 'number' && typeof tgt.y === 'number' && isFinite(tgt.x) && isFinite(tgt.y)) {
            tx = tgt.x;
            ty = tgt.y;
          }
        }

        const dx = tx - (e.x + e.w/2);
        const dy = ty - (e.y + e.h/2);
        const [nx, ny] = norm(dx, dy);
        const sm = (typeof e.speedMult === 'number' && isFinite(e.speedMult) && e.speedMult > 0) ? e.speedMult : 1;
        e.x += nx * e.speed * sm * dt; e.y += ny * e.speed * sm * dt;
      }
    }

    for (let a = 0; a < enemies.length; a++) {
      const ea = enemies[a];
      if (!ea || ea.hp <= 0) continue;
      const ar = Math.max(ea.w, ea.h) * 0.5;
      const acx = ea.x + ea.w / 2;
      const acy = ea.y + ea.h / 2;
      for (let b = a + 1; b < enemies.length; b++) {
        const eb = enemies[b];
        if (!eb || eb.hp <= 0) continue;
        const br = Math.max(eb.w, eb.h) * 0.5;
        const bcx = eb.x + eb.w / 2;
        const bcy = eb.y + eb.h / 2;
        const dx = bcx - acx;
        const dy = bcy - acy;
        const d = Math.hypot(dx, dy);
        const minD = ar + br;
        if (d > 0.0001 && d < minD) {
          const push = (minD - d) * 0.5;
          const nx = dx / d;
          const ny = dy / d;
          ea.x -= nx * push;
          ea.y -= ny * push;
          eb.x += nx * push;
          eb.y += ny * push;
        } else if (d <= 0.0001) {
          const jitter = 0.5;
          ea.x -= jitter;
          eb.x += jitter;
        }
      }
    }

    for (let e of enemies) {
      if (!e || e.hp <= 0) continue;
      e.x = clamp(e.x, 0, canvas.width - e.w);
      e.y = clamp(e.y, 0, canvas.height - e.h);
    }

    let contactDamage = 0;
    for (let e of enemies) {
      if (e.hp > 0) {
        if (circleRectIntersect(player.x, player.y, player.r, e.x, e.y, e.w, e.h)) {
          contactDamage += e.contactDps * dt;
        }
      }
    }
    if (contactDamage > 0) {
      if (isPlayerInvincible()) contactDamage = 0;
    }
    if (contactDamage > 0) {
      const applied = contactDamage * getDamageTakenMult();
      player.hp -= applied;
      if (player.hp <= 0 && player.alive) { player.alive = false; player.hp = 0; showMessage('Game Over', 'You were overwhelmed by the squares.'); }
      playerDamageAccum += applied;
      playerDamageTicker -= dt;
      if (playerDamageTicker <= 0 && playerDamageAccum > 0) {
        const amt = Math.round(playerDamageAccum * 10) / 10;
        hitTexts.push({ x: player.x, y: player.y - player.r - 8, text: '-' + fmt1(amt), life: 0.7, vy: -26 });
        playerDamageAccum = 0;
        playerDamageTicker = 0.2;
      }
    } else {
      playerDamageTicker -= dt;
      if (playerDamageTicker <= 0 && playerDamageAccum > 0) {
        const amt = Math.round(playerDamageAccum * 10) / 10;
        hitTexts.push({ x: player.x, y: player.y - player.r - 8, text: '-' + fmt1(amt), life: 0.7, vy: -26 });
        playerDamageAccum = 0;
        playerDamageTicker = 0.2;
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.hp <= 0) continue;
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (circleRectIntersect(b.x, b.y, b.r, e.x, e.y, e.w, e.h)) {
          const baseDmg = b.damage * (b.isCrit ? (b.critMult || 1.5) : 1);
          const dmg = baseDmg * ((e.bleedTime && e.bleedTime > 0) ? 2 : 1);
          const wasAlive = e.hp > 0;
          e.hp -= dmg;
          hitTexts.push({ x: b.x, y: b.y, text: '-' + fmt1(dmg), life: 0.6, vy: -30 });

          if (b.explosionRadius && b.explosionRadius > 0) {
            spawnExplosionVfx(b.x, b.y, b.explosionRadius);
            for (let k = enemies.length - 1; k >= 0; k--) {
              if (k === i) continue;
              const ee = enemies[k];
              if (ee.hp <= 0) continue;
              if (circleRectIntersect(b.x, b.y, b.explosionRadius, ee.x, ee.y, ee.w, ee.h)) {
                const eeWasAlive = ee.hp > 0;
                const edmg = baseDmg * ((ee.bleedTime && ee.bleedTime > 0) ? 2 : 1);
                ee.hp -= edmg;
                hitTexts.push({ x: ee.x + ee.w/2, y: ee.y + ee.h/2, text: '-' + fmt1(edmg), life: 0.6, vy: -30 });
                if (eeWasAlive && ee.hp <= 0) { registerKill(); }
              }
            }
          }

          if (wasAlive && e.hp <= 0) { registerKill(); break; }

          let removeBullet = false;
          if (b.pierce && b.pierce > 0) { b.pierce -= 1; b.damage *= 0.5; }
          else { removeBullet = true; }
          if (removeBullet) bullets.splice(j, 1);
          if (e.hp <= 0) { break; }
        }
      }
    }

    enemies = enemies.filter(e => e.hp > 0);

    progressRoundSpawns();

    if (state.phase === 'playing' && enemies.length === 0) {
      if (state.mode === 'normal' && state.round === 20) showEndlessPrompt();
      else showUpgrade();
    }

    state.elapsed += dt;
    for (let i = hitTexts.length - 1; i >= 0; i--) {
      const h = hitTexts[i];
      h.y += h.vy * dt;
      h.life -= dt;
      if (h.life <= 0) hitTexts.splice(i, 1);
    }
    updateHUD();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackgroundGrid();

    if (bloodStains.length > 0) {
      ctx.save();
      for (const b of bloodStains) {
        const a = clamp(b.life / (b.maxLife || 0.001), 0, 1);
        ctx.globalAlpha = 0.55 * a;
        ctx.fillStyle = 'rgba(160,0,0,1)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawPlayer();

    ctx.fillStyle = '#f5f7ff';
    for (const b of bullets) {
      if (currentCharacter && typeof currentCharacter.drawBullet === 'function') {
        const handled = !!currentCharacter.drawBullet(getGameApi(), b, ctx);
        if (handled) continue;
      }
      {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    if (currentCharacter && typeof currentCharacter.postDraw === 'function') currentCharacter.postDraw(getGameApi(), ctx);

    if (currentCharacter && typeof currentCharacter.draw === 'function') currentCharacter.draw(getGameApi());

    for (const e of enemies) {
      const damageRatio = 1 - (Math.max(0, e.hp) / e.maxHp);
      const iw = e.w * Math.min(1, damageRatio);
      const ih = e.h * Math.min(1, damageRatio);
      const ix = e.x + (e.w - iw) / 2;
      const iy = e.y + (e.h - ih) / 2;
      ctx.fillStyle = (e.bleedTime && e.bleedTime > 0) ? '#ff1f1f' : e.color;
      ctx.beginPath();
      ctx.rect(e.x, e.y, e.w, e.h);
      if (iw > 0 && ih > 0) {
        ctx.rect(ix, iy, iw, ih);
        ctx.fill('evenodd');
      } else {
        ctx.fill();
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawVfx();
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 14px system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const h of hitTexts) {
      const a = Math.max(0, h.life / 0.6);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffa64d';
      ctx.fillText(h.text, h.x, h.y);
    }
    ctx.restore();

    drawGunBarrel();
  }

  function drawBackgroundGrid() {
    const s = 40;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x < canvas.width; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = 0; y < canvas.height; y += s) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();
  }

  function drawPlayer() {
    if (currentCharacter && typeof currentCharacter.getPlayerAlpha === 'function') {
      const a = currentCharacter.getPlayerAlpha(getGameApi());
      if (typeof a === 'number' && isFinite(a) && a >= 0 && a <= 1) ctx.globalAlpha = a;
    }
    ctx.fillStyle = player.color; ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
    const pct = player.hp / player.maxHp; ctx.strokeStyle = player.hpColor || '#70ffa6'; ctx.lineWidth = 3; ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 6, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * pct); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawGunBarrel() {
    const dx = (state.controlMode === 'mouse' ? input.mouse.x : aim.x) - player.x;
    const dy = (state.controlMode === 'mouse' ? input.mouse.y : aim.y) - player.y;
    const [nx, ny] = norm(dx, dy);
    const start = { x: player.x + nx * (player.r - 2), y: player.y + ny * (player.r - 2) };
    const end = { x: player.x + nx * (player.r + 14), y: player.y + ny * (player.r + 14) };
    ctx.strokeStyle = '#e6f2ff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
  }

  function formatTime(sec) {
    const s = Math.floor(sec % 60);
    const m = Math.floor(sec / 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function updatePauseStats() {
    if (!pauseOverlay) return;
    if (statHpEl) statHpEl.textContent = Math.max(0, Math.ceil(player.hp)).toString();
    if (statRoundEl) statRoundEl.textContent = state.round.toString();
    if (statRemainingEl) statRemainingEl.textContent = enemies.length.toString();
    if (statKillsEl) statKillsEl.textContent = state.kills.toString();
    if (statTimeEl) statTimeEl.textContent = formatTime(state.elapsed);
    if (controlRadioMouse) controlRadioMouse.checked = state.controlMode === 'mouse';
    if (controlRadioArrow) controlRadioArrow.checked = state.controlMode === 'arrow';
    if (pinStatsCheckbox) pinStatsCheckbox.checked = state.pinStats;
    if (testModeCheckbox) testModeCheckbox.checked = state.testMode;
    if (testRoundInput) testRoundInput.value = state.round.toString();
  }

  function showPause() {
    if (!pauseOverlay) createPauseOverlay();
    updatePauseStats();
    pauseOverlay.classList.remove('hidden');
  }

  function hidePause() {
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
  }

  function togglePause() {
    if (state.phase === 'message' || state.phase === 'choosing') return;
    if (state.phase === 'paused') {
      state.phase = 'playing';
      hidePause();
    } else if (state.phase === 'playing') {
      state.phase = 'paused';
      showPause();
    }
  }

  function setControlMode(mode) {
    state.controlMode = mode === 'arrow' ? 'arrow' : 'mouse';
  }

  function toggleControlMode() {
    setControlMode(state.controlMode === 'mouse' ? 'arrow' : 'mouse');
    updatePauseStats();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    update(dt); draw(); requestAnimationFrame(frame);
  }

  createPauseOverlay();
  reset(); requestAnimationFrame(frame);
})();
