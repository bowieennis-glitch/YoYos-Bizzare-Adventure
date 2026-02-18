(() => {
  if (typeof window === 'undefined') return;

  const UPGRADES = [
    { id: 1, title: 'Damage', desc: '+1 damage per shot', rarity: 'common', apply: (player) => { player.damage += 1; } },
    { id: 2, title: 'Fire Rate', desc: '+2 shots/s', rarity: 'common', apply: (player) => { player.shotInterval = Math.max(0.05, player.shotInterval - 0.04); } },
    { id: 3, title: 'Player Speed', desc: '+4 movement speed', rarity: 'common', apply: (player) => { player.speed += 4; } },
    { id: 4, title: 'Range', desc: '+20 range', rarity: 'common', apply: (player) => { player.range += 20; } },
    { id: 5, title: 'Projectile Speed', desc: '+5 projectile speed', rarity: 'common', apply: (player) => { player.projectileSpeed += 5; } },
    { id: 25, title: 'Crit Chance', desc: '+5% crit chance', rarity: 'common', apply: (player) => { player.critChance += 0.05; } },
    { id: 26, title: 'Crit Damage', desc: '+20% crit damage', rarity: 'common', apply: (player) => { player.critDamage += 0.20; } },

    { id: 27, title: 'Crit Chance', desc: '+8% crit chance', rarity: 'uncommon', apply: (player) => { player.critChance += 0.08; } },
    { id: 28, title: 'Crit Damage', desc: '+35% crit damage', rarity: 'uncommon', apply: (player) => { player.critDamage += 0.35; } },

    { id: 29, title: 'Crit Chance', desc: '+12% crit chance', rarity: 'rare', apply: (player) => { player.critChance += 0.12; } },
    { id: 30, title: 'Crit Damage', desc: '+50% crit damage', rarity: 'rare', apply: (player) => { player.critDamage += 0.50; } },

    { id: 15, title: 'Damage', desc: '+2 damage per shot', rarity: 'uncommon', apply: (player) => { player.damage += 2; } },
    { id: 16, title: 'Fire Rate', desc: '+3 shots/s', rarity: 'uncommon', apply: (player) => { player.shotInterval = Math.max(0.05, player.shotInterval - 0.06); } },
    { id: 17, title: 'Player Speed', desc: '+6 movement speed', rarity: 'uncommon', apply: (player) => { player.speed += 6; } },
    { id: 18, title: 'Range', desc: '+30 range', rarity: 'uncommon', apply: (player) => { player.range += 30; } },
    { id: 19, title: 'Projectile Speed', desc: '+8 projectile speed', rarity: 'uncommon', apply: (player) => { player.projectileSpeed += 8; } },

    { id: 20, title: 'Damage', desc: '+3 damage per shot', rarity: 'rare', apply: (player) => { player.damage += 3; } },
    { id: 21, title: 'Fire Rate', desc: '+4 shots/s', rarity: 'rare', apply: (player) => { player.shotInterval = Math.max(0.05, player.shotInterval - 0.076); } },
    { id: 22, title: 'Player Speed', desc: '+8 movement speed', rarity: 'rare', apply: (player) => { player.speed += 8; } },
    { id: 23, title: 'Range', desc: '+38 range', rarity: 'rare', apply: (player) => { player.range += 38; } },
    { id: 24, title: 'Projectile Speed', desc: '+10 projectile speed', rarity: 'rare', apply: (player) => { player.projectileSpeed += 10; } },

    { id: 6, title: 'Pierce', desc: '+1 pierce (50% damage after pierce)', rarity: 'uncommon', apply: (player) => { player.pierce += 1; } },
    { id: 7, title: 'Explosion Radius', desc: '+24 explosion radius (enables explosions)', rarity: 'rare', apply: (player) => { player.explosionRadius += 24; } },
    { id: 8, title: 'Rebound', desc: '+1 wall bounce', rarity: 'uncommon', apply: (player) => { player.rebound += 1; } },
    { id: 9, title: 'Homing', desc: '+10° homing turn rate', rarity: 'uncommon', apply: (player) => { player.homingDeg += 10; } },
    { id: 11, title: 'Max Health', desc: '+10 max HP', rarity: 'uncommon', apply: (player) => { player.maxHp += 10; player.hp = Math.min(player.maxHp, player.hp + 10); } },
    { id: 12, title: 'Regeneration', desc: '+1 HP every 2 seconds', rarity: 'rare', apply: (player) => { player.regenPerTick += 1; } },
    { id: 13, title: 'Life Steal', desc: '+1 HP per kill', rarity: 'legendary', apply: (player) => { player.lifeStealPerKill += 1; } },
    { id: 14, title: 'Luck', desc: 'Common -10%. Other rarities split +10%', rarity: 'uncommon', apply: (player) => { player.luck += 1; } }
  ];

  const UPGRADE_BY_ID = Object.create(null);
  for (const u of UPGRADES) UPGRADE_BY_ID[u.id] = u;

  let ctx = null;

  function init(getCtx) {
    ctx = (typeof getCtx === 'function') ? getCtx : null;
  }

  function getContext() {
    if (!ctx) return null;
    try { return ctx(); } catch { return null; }
  }

  function getRarityWeights(player) {
    const l = Math.max(0, Math.floor((player && player.luck) || 0));
    const common = Math.max(0, 150 - 30 * l);
    const uncommon = 75 + 10 * l;
    const rare = 45 + 10 * l;
    const legendary = 30 + 10 * l;
    return { common, uncommon, rare, legendary, total: common + uncommon + rare + legendary };
  }

  function rollRarity(player) {
    const w = getRarityWeights(player);
    if (w.total <= 0) return 'common';
    let r = Math.random() * w.total;
    if ((r -= w.common) < 0) return 'common';
    if ((r -= w.uncommon) < 0) return 'uncommon';
    if ((r -= w.rare) < 0) return 'rare';
    return 'legendary';
  }

  function getCharacterFilteredIds(available, currentCharacter) {
    const isRyan = !!(currentCharacter && currentCharacter.id === 'ryan');
    if (!isRyan) return available;
    return available.filter(id => !(id === 6 || id === 5 || id === 19 || id === 24 || id === 9));
  }

  function getOfferIds(count) {
    const c = getContext();
    const player = c && c.player;
    const currentCharacter = c && c.currentCharacter;

    let available = UPGRADES.map(u => u.id);
    available = getCharacterFilteredIds(available, currentCharacter);

    const picks = [];
    const targetRarities = [];
    while (targetRarities.length < count) targetRarities.push(rollRarity(player));

    for (const rar of targetRarities) {
      let pool = available.filter(id => {
        const u = UPGRADE_BY_ID[id];
        return u && u.rarity === rar;
      });
      if (pool.length === 0) pool = available;
      const i = Math.floor(Math.random() * pool.length);
      const id = pool[i];
      picks.push(id);
      const chosen = UPGRADE_BY_ID[id];
      const chosenTitle = (chosen && chosen.title) ? chosen.title : null;
      available = available.filter(xid => {
        if (xid === id) return false;
        if (!chosenTitle) return true;
        const u = UPGRADE_BY_ID[xid];
        return !(u && u.title === chosenTitle);
      });
    }

    return picks;
  }

  function fillUpgradeSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    for (const u of UPGRADES) {
      const rarity = (u && u.rarity) ? u.rarity : 'common';
      const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);
      const opt = document.createElement('option');
      opt.value = String(u.id);
      opt.textContent = '[' + rarityLabel + '] ' + u.title;
      selectEl.appendChild(opt);
    }
  }

  function applyUpgrade(id) {
    const c = getContext();
    const player = c && c.player;
    const up = UPGRADE_BY_ID[id];
    if (up && typeof up.apply === 'function' && player) up.apply(player);
  }

  function upgradeMeta(id) {
    const up = UPGRADE_BY_ID[id];
    if (!up) return { title: 'Unknown', desc: '', rarity: 'common' };
    return { title: up.title, desc: up.desc, rarity: up.rarity || 'common' };
  }

  window.Upgrades = {
    init,
    getOfferIds,
    fillUpgradeSelect,
    applyUpgrade,
    upgradeMeta
  };
})();
