/**
 * Street Grudge — Core Game Engine, 1P Open-World & 2P Split-Screen Local Brawl
 * Handles main loop, AI Finite State Machines, combat hitboxes, Grudge Meter & HUD.
 */
window.StreetGrudge = window.StreetGrudge || {};

(function (SG) {
  'use strict';

  const t = (key) => SG.t(key);
  const AI_STATES = SG.AI_STATES;

  class StreetGrudgeGame {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.miniCanvas = document.getElementById('minimapCanvas');
      this.renderer = new SG.ComicRenderer(this.canvas, this.miniCanvas);
      this.sfx = new SG.SoundEngine();
      this.world = new SG.CityWorld();

      this.keys = {};
      this.mode = '1p'; // '1p' | '2p'
      this.running = false;
      this.gameOver = false;
      this.showAiDebug = false;
      this.isSplitScreen = false;
      this.mergedOnce = false;

      this.player = null;
      this.player2 = null;
      this.rivals = [];
      this.activeRival = null;
      this.pedestrians = [];
      this.cars = [];
      this.particles = [];
      this.popups = [];
      this.projectiles = [];
      this.pickups = [];
      this.soundRings = [];
      this.afterimages = [];

      this.cam = { x: 1500, y: 1100, shake: 0, zoom: 1 };
      this.cam1 = { x: 1000, y: 1100, shake: 0, zoom: 0.96 };
      this.cam2 = { x: 2000, y: 1100, shake: 0, zoom: 0.96 };

      this.hitstop = 0;
      this.score = 0;
      this.comboCount = 0;
      this.comboTimer = 0;
      this.walkedDist = 0;
      this.propsSmashed = 0;
      this.dayMinutes = 9 * 60;
      this.grudgeReasonIdx = 0;
      this.grudgeReason = '';
      this.ambientSirenTimer = 8;
      this.bannerTimer = 0;
      this.screenFlash = 0;
      this.subwayOverlayTimer = 0;

      this.resize();
      this.bindEvents();
      this.syncLanguageUI();
      this.initPreviewScene();

      this.lastTime = performance.now();
      requestAnimationFrame((ts) => this.loop(ts));
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.viewW = window.innerWidth;
      this.viewH = window.innerHeight;
      this.canvas.width = Math.floor(this.viewW * dpr);
      this.canvas.height = Math.floor(this.viewH * dpr);
      this.renderer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    bindEvents() {
      window.addEventListener('resize', () => this.resize());

      window.addEventListener('keydown', (e) => {
        this.sfx.unlock();
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
          e.preventDefault();
        }
        this.keys[e.code] = true;

        if (e.code === 'KeyR' && (this.running || this.gameOver)) {
          this.startNewDay();
          return;
        }
        if (e.code === 'KeyM') { this.toggleMute(); return; }
        if (e.code === 'Tab') { e.preventDefault(); this.toggleAiDebug(); return; }

        if (!this.running || this.gameOver || !this.player) return;

        if (this.mode === '1p') {
          if (e.code === 'KeyJ' || e.code === 'KeyZ') this.player.startAttack('punch', this);
          else if (e.code === 'KeyK' || e.code === 'KeyX') this.player.startAttack('kick', this);
          else if (e.code === 'KeyU' || e.code === 'KeyQ') this.player.startAttack('special', this);
          else if (e.code === 'Space') {
            const { dx, dy } = this.getMoveInput(1);
            this.player.startDash(dx, dy, this);
          } else if (e.code === 'KeyE') {
            this.triggerPlayerShout(this.player);
          }
        } else {
          // 2P LOCAL CONTROLS
          // P1: WASD + F(Punch) G(Kick) H(Block) T(Special) Space(Dash) E(Shout)
          if (e.code === 'KeyF') this.player.startAttack('punch', this);
          else if (e.code === 'KeyG') this.player.startAttack('kick', this);
          else if (e.code === 'KeyT') this.player.startAttack('special', this);
          else if (e.code === 'Space') {
            const { dx, dy } = this.getMoveInput(1);
            this.player.startDash(dx, dy, this);
          } else if (e.code === 'KeyE') {
            this.triggerPlayerShout(this.player);
          }

          // P2: Arrows + J(Punch) K(Kick) L(Block) U(Special) Enter/RShift(Dash) O(Shout)
          if (this.player2) {
            if (e.code === 'KeyJ') this.player2.startAttack('punch', this);
            else if (e.code === 'KeyK') this.player2.startAttack('kick', this);
            else if (e.code === 'KeyU') this.player2.startAttack('special', this);
            else if (e.code === 'Enter' || e.code === 'ShiftRight') {
              const { dx, dy } = this.getMoveInput(2);
              this.player2.startDash(dx, dy, this);
            } else if (e.code === 'KeyO') {
              this.triggerPlayerShout(this.player2);
            }
          }
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });

      this.canvas.addEventListener('mousedown', (e) => {
        this.sfx.unlock();
        if (!this.running || this.gameOver || !this.player || this.mode !== '1p') return;
        if (e.button === 0) this.player.startAttack('punch', this);
        if (e.button === 2) this.player.startAttack('kick', this);
      });
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      // Mode selectors on Start Modal
      document.getElementById('btnMode1P').addEventListener('click', () => this.selectMode('1p'));
      document.getElementById('btnMode2P').addEventListener('click', () => this.selectMode('2p'));

      document.getElementById('btnStartGame').addEventListener('click', () => {
        this.sfx.unlock();
        this.startNewDay();
      });
      document.getElementById('btnPlayAgain').addEventListener('click', () => {
        this.sfx.unlock();
        this.startNewDay();
      });
      document.getElementById('btnBackTitle').addEventListener('click', () => {
        document.getElementById('endModal').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('startModal').classList.remove('hidden');
        this.running = false;
        this.gameOver = false;
      });
      document.getElementById('btnRestartHud').addEventListener('click', () => {
        this.sfx.unlock();
        this.startNewDay();
      });
      document.getElementById('btnMute').addEventListener('click', () => this.toggleMute());
      document.getElementById('btnDebugAi').addEventListener('click', () => this.toggleAiDebug());
      document.getElementById('btnLang').addEventListener('click', () => this.toggleLang());
      document.getElementById('startLangBtn').addEventListener('click', () => this.toggleLang());

      // Touch Controls
      document.querySelectorAll('.touch-btn').forEach((btn) => {
        const code = btn.dataset.key;
        const down = (ev) => {
          ev.preventDefault();
          this.sfx.unlock();
          this.keys[code] = true;
          if (!this.running || this.gameOver || !this.player) return;
          if (code === 'KeyJ') this.player.startAttack('punch', this);
          if (code === 'KeyK') this.player.startAttack('kick', this);
          if (code === 'KeyU') this.player.startAttack('special', this);
          if (code === 'KeyE') this.triggerPlayerShout(this.player);
          if (code === 'Space') {
            const { dx, dy } = this.getMoveInput(1);
            this.player.startDash(dx, dy, this);
          }
        };
        const up = (ev) => { ev.preventDefault(); this.keys[code] = false; };
        btn.addEventListener('touchstart', down, { passive: false });
        btn.addEventListener('touchend', up, { passive: false });
        btn.addEventListener('mousedown', down);
        btn.addEventListener('mouseup', up);
        btn.addEventListener('mouseleave', up);
      });
    }

    selectMode(m) {
      this.mode = m;
      document.getElementById('btnMode1P').classList.toggle('mode-active', m === '1p');
      document.getElementById('btnMode2P').classList.toggle('mode-active', m === '2p');
      this.updateControlsLegend();
    }

    updateControlsLegend() {
      const startCtrl = document.getElementById('startControlsBox');
      const hudCtrl = document.getElementById('controlsStrip');
      if (this.mode === '1p') {
        const html = `
          <span><span class="keycap">WASD/Arrows</span> Move</span>
          <span><span class="keycap">J</span> Punch</span>
          <span><span class="keycap">K</span> Kick</span>
          <span><span class="keycap">Space</span> Dash</span>
          <span><span class="keycap">L</span> Block</span>
          <span><span class="keycap">U</span> Special</span>
          <span><span class="keycap">E</span> Shout</span>`;
        startCtrl.innerHTML = html;
        hudCtrl.innerHTML = html;
      } else {
        const html = `
          <span style="color:#ffe135"><b>P1:</b> <span class="keycap">WASD</span> <span class="keycap">F</span>Punch <span class="keycap">G</span>Kick <span class="keycap">H</span>Blk <span class="keycap">T</span>Spec <span class="keycap">Space</span>Dash <span class="keycap">E</span>Yell</span>
          <span style="color:#38bdf8"><b>P2:</b> <span class="keycap">Arrows</span> <span class="keycap">J</span>Punch <span class="keycap">K</span>Kick <span class="keycap">L</span>Blk <span class="keycap">U</span>Spec <span class="keycap">Enter</span>Dash <span class="keycap">O</span>Yell</span>`;
        startCtrl.innerHTML = html;
        hudCtrl.innerHTML = html;
      }
    }

    toggleMute() {
      this.sfx.muted = !this.sfx.muted;
      document.getElementById('btnMute').textContent = this.sfx.muted ? 'SFX: OFF' : 'SFX: ON';
    }

    toggleAiDebug() {
      this.showAiDebug = !this.showAiDebug;
      document.getElementById('btnDebugAi').textContent = this.showAiDebug ? 'AI FSM: ON' : 'AI FSM: OFF';
    }

    toggleLang() {
      SG.currentLang = SG.currentLang === 'en' ? 'tr' : 'en';
      this.syncLanguageUI();
    }

    syncLanguageUI() {
      document.getElementById('startSubtitle').textContent = t('subtitle');
      document.getElementById('startPitch').innerHTML = t('pitch');
      document.getElementById('card1Title').textContent = t('card1Title');
      document.getElementById('card1Body').innerHTML = t('card1Body');
      document.getElementById('card2Title').textContent = t('card2Title');
      document.getElementById('card2Body').innerHTML = t('card2Body');
      document.getElementById('card3Title').textContent = t('card3Title');
      document.getElementById('card3Body').innerHTML = t('card3Body');
      document.getElementById('btnMode1P').textContent = t('mode1p');
      document.getElementById('btnMode2P').textContent = t('mode2p');
      document.getElementById('btnStartGame').textContent = t('startBtn');
      document.getElementById('btnPlayAgain').textContent = t('playAgainBtn');
      document.getElementById('p1Name').textContent = t('p1Name');
      document.getElementById('grudgeLabel').textContent = t('grudge');
      const reasons = t('reasons');
      this.grudgeReason = reasons[this.grudgeReasonIdx % reasons.length];
      this.updateControlsLegend();
    }

    initPreviewScene() {
      this.spawnTrafficAndPedestrians();
      this.cam.x = 1350;
      this.cam.y = 1020;
    }

    startNewDay() {
      this.world.resetProps();
      this.particles = [];
      this.popups = [];
      this.projectiles = [];
      this.pickups = [];
      this.soundRings = [];
      this.afterimages = [];

      this.score = 0;
      this.comboCount = 0;
      this.comboTimer = 0;
      this.walkedDist = 0;
      this.propsSmashed = 0;
      this.dayMinutes = 9 * 60;
      this.activeRival = null;
      this.mergedOnce = false;
      this.subwayOverlayTimer = 0;
      this.gameOver = false;
      this.running = true;

      const reasons = t('reasons');
      this.grudgeReasonIdx = Math.floor(Math.random() * reasons.length);
      this.grudgeReason = reasons[this.grudgeReasonIdx];

      const spots = [...this.world.spawnPoints].sort(() => Math.random() - 0.5);

      // In 2P mode, ensure P1 and P2 start far apart (opposite ends of city!)
      let p1Spot = spots[0];
      let p2Spot = spots[1];
      if (this.mode === '2p') {
        const dtSpots = spots.filter((s) => s.zone === 'DOWNTOWN');
        const utSpots = spots.filter((s) => s.zone === 'UPTOWN');
        p1Spot = dtSpots[0] || spots[0];
        p2Spot = utSpots[0] || spots[1];
      }

      this.player = new SG.Fighter({
        id: 'player1',
        name: t('p1Name'),
        isPlayer: true,
        playerNum: 1,
        x: p1Spot.x,
        y: p1Spot.y,
        r: 20,
        maxHp: 120,
        speed: 255,
        giColor: '#f8fafc',
        trimColor: '#111111',
        skinColor: '#f5cfa0',
        hairColor: '#271c15',
        bandanaColor: '#ef4444',
        specialKind: 'fireball',
        specialName: SG.currentLang === 'tr' ? 'KİN DALGASI!!' : 'PETTY HADOU-BLAST!!',
        specialColor: '#f97316'
      });

      this.rivals = [];
      this.player2 = null;

      if (this.mode === '2p') {
        this.player2 = new SG.Fighter({
          id: 'player2',
          name: t('p2Name'),
          isPlayer: true,
          playerNum: 2,
          x: p2Spot.x,
          y: p2Spot.y,
          r: 20,
          maxHp: 120,
          speed: 255,
          giColor: '#38bdf8',
          trimColor: '#fde047',
          skinColor: '#f3caa0',
          hairColor: '#111827',
          bandanaColor: '#fde047',
          specialKind: 'cyclone',
          specialName: SG.currentLang === 'tr' ? 'KİN KASIRGASI!!' : 'GRUDGE CYCLONE!!',
          specialColor: '#38bdf8'
        });
        this.cam1.x = this.player.x; this.cam1.y = this.player.y;
        this.cam2.x = this.player2.x; this.cam2.y = this.player2.y;
        this.isSplitScreen = true;
        this.player2.say(`${p2Spot.label}`, 3.0);
      } else {
        this.isSplitScreen = false;
        const usedSpots = spots.filter((s) => s !== p1Spot);
        for (let i = 0; i < SG.RIVAL_ROSTER.length; i++) {
          const tpl = SG.RIVAL_ROSTER[i];
          const sp = usedSpots[i % usedSpots.length];
          const rival = new SG.Fighter({ ...tpl, isPlayer: false, x: sp.x, y: sp.y });
          rival.homeX = sp.x; rival.homeY = sp.y;
          rival.targetX = sp.x; rival.targetY = sp.y;
          rival.spawnLabel = sp.label;
          this.rivals.push(rival);
        }
      }

      this.spawnTrafficAndPedestrians();
      this.cam.x = this.player.x;
      this.cam.y = this.player.y;
      this.cam.zoom = 1;

      document.getElementById('startModal').classList.add('hidden');
      document.getElementById('endModal').classList.add('hidden');
      document.getElementById('hud').classList.remove('hidden');
      document.getElementById('touchControls').classList.toggle('active', this.mode === '1p');

      this.player.say(
        SG.currentLang === 'tr'
          ? `NEREDESİN?! (${p1Spot.label})`
          : `WHERE ARE THEY?! (${p1Spot.label})`,
        3.2
      );
      this.showBanner(
        SG.currentLang === 'tr' ? 'GÜN BAŞLADI!' : 'DAY STARTED!',
        `${SG.currentLang === 'tr' ? 'SEBEP' : 'GRUDGE'}: "${this.grudgeReason}"`,
        2.8
      );
      this.sfx.challenger();
    }

    spawnTrafficAndPedestrians() {
      this.pedestrians = [];
      const shirtColors = ['#38bdf8', '#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#e2e8f0'];
      const panicLines = ['NOT AGAIN!', 'MY LATTE!', 'WHOA!!', 'CALL 911!', 'I\'M LATE!', 'HEY!!'];
      for (let i = 0; i < 30; i++) {
        let px, py, tries = 0;
        do {
          px = 180 + Math.random() * (SG.WORLD_W - 360);
          py = 180 + Math.random() * (SG.WORLD_H - 360);
          tries++;
        } while (this.world.isPointInBuilding(px, py, 24) && tries < 40);
        this.pedestrians.push({
          x: px, y: py, r: 12,
          angle: Math.random() * Math.PI * 2,
          speed: 55 + Math.random() * 35,
          color: shirtColors[i % shirtColors.length],
          skin: i % 3 === 0 ? '#d9a06c' : '#f5cfa0',
          hair: i % 2 === 0 ? '#1f2937' : '#78350f',
          panicTimer: 0,
          turnTimer: 1 + Math.random() * 3,
          speech: '',
          speechTimer: 0,
          panicLine: panicLines[i % panicLines.length],
          walkPhase: Math.random() * 6
        });
      }

      this.cars = [];
      const carColors = ['#ef4444', '#eab308', '#3b82f6', '#22c55e', '#f97316', '#f8fafc', '#06b6d4'];
      for (let i = 0; i < 6; i++) {
        const hr = this.world.hRoads[i % this.world.hRoads.length];
        const dir = i % 2 === 0 ? 1 : -1;
        const laneY = dir === 1 ? hr.y + hr.h * 0.72 : hr.y + hr.h * 0.28;
        this.cars.push({
          x: 200 + Math.random() * (SG.WORLD_W - 400),
          y: laneY, axis: 'h', dir,
          speed: 145 + Math.random() * 45, curSpeed: 150,
          w: 68, h: 36,
          color: i % 3 === 0 ? '#facc15' : carColors[i % carColors.length],
          isTaxi: i % 3 === 0, honkCooldown: 0
        });
      }
      for (let i = 0; i < 6; i++) {
        const vr = this.world.vRoads[i % this.world.vRoads.length];
        const dir = i % 2 === 0 ? 1 : -1;
        const laneX = dir === 1 ? vr.x + vr.w * 0.28 : vr.x + vr.w * 0.72;
        this.cars.push({
          x: laneX,
          y: 200 + Math.random() * (SG.WORLD_H - 400), axis: 'v', dir,
          speed: 140 + Math.random() * 40, curSpeed: 140,
          w: 36, h: 68,
          color: carColors[(i + 2) % carColors.length],
          isTaxi: i === 2, honkCooldown: 0
        });
      }
    }

    getMoveInput(playerNum) {
      let dx = 0, dy = 0;
      if (this.mode === '1p') {
        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
      } else if (playerNum === 1) {
        if (this.keys['KeyW']) dy -= 1;
        if (this.keys['KeyS']) dy += 1;
        if (this.keys['KeyA']) dx -= 1;
        if (this.keys['KeyD']) dx += 1;
      } else {
        if (this.keys['ArrowUp']) dy -= 1;
        if (this.keys['ArrowDown']) dy += 1;
        if (this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['ArrowRight']) dx += 1;
      }
      const len = Math.hypot(dx, dy);
      if (len > 0) { dx /= len; dy /= len; }
      return { dx, dy };
    }

    showBanner(title, sub = '', duration = 1.9) {
      const el = document.getElementById('eventBanner');
      const subEl = document.getElementById('eventSubBanner');
      el.textContent = title;
      el.classList.remove('hidden', 'banner-slam');
      void el.offsetWidth;
      el.classList.add('banner-slam');
      if (sub) {
        subEl.textContent = sub;
        subEl.classList.remove('hidden');
      } else {
        subEl.classList.add('hidden');
      }
      this.bannerTimer = duration;
    }

    triggerPlayerShout(shouter) {
      if (!shouter || shouter.ko || shouter.shoutCooldown > 0) return;
      shouter.shoutCooldown = 2.6;
      const lines = t('playerShoutLines');
      shouter.say(lines[Math.floor(Math.random() * lines.length)], 2.0);
      this.sfx.shout();
      this.soundRings.push({ x: shouter.x, y: shouter.y, r: 20, maxR: 460, color: '#ffe135', alpha: 0.9 });
      shouter.grudge = Math.min(100, shouter.grudge + 2.5);

      if (this.mode === '2p') {
        const other = shouter === this.player ? this.player2 : this.player;
        if (other && !other.ko) {
          const d = Math.hypot(other.x - shouter.x, other.y - shouter.y);
          const dir = this.getCompassDirection(shouter.x, shouter.y, other.x, other.y);
          this.soundRings.push({ x: other.x, y: other.y, r: 16, maxR: 260, color: '#38bdf8', alpha: 0.95 });
          this.showSoundCue(`♪ ${other.name}: ${dir} (~${Math.round(d / 10)}m, ${this.world.getZone(other.x)})`);
        }
        return;
      }

      let nearest = null;
      let nearestDist = Infinity;
      for (const r of this.rivals) {
        if (r.ko) continue;
        const d = Math.hypot(r.x - shouter.x, r.y - shouter.y);
        if (d < 850 && r.aiState !== AI_STATES.CALMED && r.aiState !== AI_STATES.COMBAT) {
          r.aiState = AI_STATES.SEARCH;
          r.investigateX = shouter.x;
          r.investigateY = shouter.y;
          r.aiTimer = 6.5;
        }
        if (d < nearestDist && r.aiState !== AI_STATES.CALMED) {
          nearestDist = d;
          nearest = r;
        }
      }

      if (nearest) {
        this.soundRings.push({ x: nearest.x, y: nearest.y, r: 16, maxR: 260, color: '#ef4444', alpha: 0.95 });
        nearest.say(nearest.taunts[Math.floor(Math.random() * nearest.taunts.length)], 2.5);
        const dirLabel = this.getCompassDirection(shouter.x, shouter.y, nearest.x, nearest.y);
        this.showSoundCue(`♪ "${nearest.name}" ${dirLabel} (~${Math.round(nearestDist / 10)}m)`);
      }
    }

    getCompassDirection(x1, y1, x2, y2) {
      const ang = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
      if (ang >= -22.5 && ang < 22.5) return 'E';
      if (ang >= 22.5 && ang < 67.5) return 'SE';
      if (ang >= 67.5 && ang < 112.5) return 'S';
      if (ang >= 112.5 && ang < 157.5) return 'SW';
      if (ang >= 157.5 || ang < -157.5) return 'W';
      if (ang >= -157.5 && ang < -112.5) return 'NW';
      if (ang >= -112.5 && ang < -67.5) return 'N';
      return 'NE';
    }

    showSoundCue(text) {
      const pill = document.getElementById('soundCuePill');
      pill.textContent = text;
      pill.classList.remove('hidden');
      clearTimeout(this._cueTimeout);
      this._cueTimeout = setTimeout(() => pill.classList.add('hidden'), 3600);
    }

    /* =======================================================================
       CHARACTER-SPECIFIC SPECIAL ATTACK ARCHETYPES
       ======================================================================= */
    executeCharacterSpecial(attacker) {
      const kind = attacker.specialKind || 'fireball';
      const dmg = Math.round(26 * attacker.getDamageMultiplier());
      const targets = this.getOpponentsOf(attacker);

      if (kind === 'shockwave') {
        // Brutus's radial Asphalt Slam shockwave!
        this.sfx.shockwave();
        this.soundRings.push({ x: attacker.x, y: attacker.y, r: 16, maxR: 175, color: attacker.specialColor, alpha: 1, lineWidth: 9 });
        this.spawnParticles(attacker.x, attacker.y, attacker.specialColor, 22, 240, 6);
        this.shakeAllCams(14);
        for (const tgt of targets) {
          if (Math.hypot(tgt.x - attacker.x, tgt.y - attacker.y) < 155) {
            this.applyMeleeHit(attacker, tgt, 'kick');
          }
        }
        this.hitNearbyProps(attacker, 130);
        return;
      }

      if (kind === 'cyclone' || kind === 'lariat') {
        // Chun-Liquid's Tornado Spin & El Dorado's Diving Lariat lunge!
        this.sfx.special();
        attacker.vx += Math.cos(attacker.angle) * 520;
        attacker.vy += Math.sin(attacker.angle) * 520;
        attacker.invulnTimer = 0.25;
        this.soundRings.push({ x: attacker.x, y: attacker.y, r: 16, maxR: 120, color: attacker.specialColor, alpha: 0.9, lineWidth: 6 });
        this.shakeAllCams(9);
        for (const tgt of targets) {
          if (Math.hypot(tgt.x - attacker.x, tgt.y - attacker.y) < 115) {
            this.applyMeleeHit(attacker, tgt, 'kick');
          }
        }
        this.hitNearbyProps(attacker, 95);
        return;
      }

      if (kind === 'triple_flame') {
        // Kenji's 3-way Flame Spread!
        this.sfx.special();
        for (const spread of [-0.26, 0, 0.26]) {
          const a = attacker.angle + spread;
          this.projectiles.push({
            owner: attacker,
            x: attacker.x + Math.cos(a) * 26,
            y: attacker.y + Math.sin(a) * 26,
            vx: Math.cos(a) * 490,
            vy: Math.sin(a) * 490,
            r: 17, color: attacker.specialColor, life: 0.55, dmg: Math.round(dmg * 0.72)
          });
        }
        this.shakeAllCams(9);
        return;
      }

      // Default 'fireball' & 'psycho_beam'
      this.sfx.special();
      const speed = kind === 'psycho_beam' ? 680 : 540;
      this.projectiles.push({
        owner: attacker,
        x: attacker.x + Math.cos(attacker.angle) * 28,
        y: attacker.y + Math.sin(attacker.angle) * 28,
        vx: Math.cos(attacker.angle) * speed,
        vy: Math.sin(attacker.angle) * speed,
        r: kind === 'psycho_beam' ? 24 : 21,
        color: attacker.specialColor,
        life: 0.68,
        dmg
      });
      this.soundRings.push({ x: attacker.x, y: attacker.y, r: 15, maxR: 130, color: attacker.specialColor, alpha: 0.9 });
      this.shakeAllCams(9);
    }

    getOpponentsOf(attacker) {
      if (this.mode === '2p') {
        const other = attacker === this.player ? this.player2 : this.player;
        return other && !other.ko ? [other] : [];
      }
      return attacker.isPlayer ? this.rivals.filter((r) => !r.ko) : (this.player && !this.player.ko ? [this.player] : []);
    }

    shakeAllCams(amount) {
      this.cam.shake = Math.max(this.cam.shake, amount);
      this.cam1.shake = Math.max(this.cam1.shake, amount);
      this.cam2.shake = Math.max(this.cam2.shake, amount);
    }

    spawnComicPopup(x, y, text, color = '#ffe135', scale = 1) {
      this.popups.push({
        x, y, vy: -52, text, color, scale, life: 0.85, maxLife: 0.85,
        rot: (Math.random() - 0.5) * 0.35
      });
    }

    spawnParticles(x, y, color, count = 10, speed = 160, size = 5) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = speed * (0.35 + Math.random() * 0.8);
        this.particles.push({
          x, y,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          size: size * (0.6 + Math.random() * 0.8),
          color, life: 0.3 + Math.random() * 0.35, maxLife: 0.65
        });
      }
    }

    applyMeleeHit(attacker, target, type) {
      if (target.ko || target.invulnTimer > 0) return;

      let baseDmg = type === 'punch' ? (attacker.comboStep === 2 ? 15 : 10) : 18;
      let kb = type === 'punch' ? (attacker.comboStep === 2 ? 260 : 140) : 340;
      let dmg = Math.round(baseDmg * attacker.getDamageMultiplier());

      const blocked = target.blocking && !target.ko && target.hitstun <= 0;
      if (blocked && type !== 'kick') {
        dmg = Math.max(2, Math.round(dmg * 0.25));
        kb *= 0.4;
        this.sfx.block();
        this.spawnComicPopup(target.x, target.y - 26, 'BLOCK!', '#38bdf8', 0.95);
        this.spawnParticles(target.x, target.y, '#93c5fd', 8, 130, 4);
      } else {
        if (blocked && type === 'kick') {
          this.spawnComicPopup(target.x, target.y - 34, 'GUARD BREAK!', '#f97316', 1.15);
          target.blocking = false;
        }
        if (type === 'kick' || attacker.comboStep === 2) {
          this.sfx.hitHeavy();
          this.shakeAllCams(10);
          this.hitstop = 0.055;
          const words = ['WHAM!!', 'KRAK!!', 'SMASH!!', 'BOOM!!'];
          this.spawnComicPopup(target.x, target.y - 28, words[Math.floor(Math.random() * words.length)], '#ffe135', 1.25);
        } else {
          this.sfx.hitLight();
          this.shakeAllCams(5);
          this.hitstop = 0.032;
          const words = ['POW!', 'BAP!', 'ZAP!', 'THWACK!'];
          this.spawnComicPopup(target.x, target.y - 26, words[Math.floor(Math.random() * words.length)], '#fb923c', 1.0);
        }
        this.spawnParticles(target.x, target.y, '#fde047', 12, 210, 5);
        target.hitstun = type === 'kick' ? 0.34 : 0.20;
      }

      target.hp = Math.max(0, target.hp - dmg);
      target.flashTimer = 0.14;
      const ang = Math.atan2(target.y - attacker.y, target.x - attacker.x);
      target.vx += Math.cos(ang) * kb;
      target.vy += Math.sin(ang) * kb;

      this.panicNearbyPedestrians(target.x, target.y, 260);

      if (attacker.isPlayer) {
        attacker.grudge = Math.min(100, attacker.grudge + (type === 'kick' ? 3.5 : 2.0));
        if (attacker.playerNum === 1) {
          this.comboCount++;
          this.comboTimer = 2.0;
          this.score += dmg * 10 * Math.min(5, this.comboCount);
        }
        if (!target.isPlayer) {
          if (target.aiState !== AI_STATES.CALMED) {
            target.aiState = AI_STATES.COMBAT;
            target.grudge = Math.min(100, target.grudge + 12);
          } else {
            const lines = t('calmedRivalLines');
            target.say(lines[Math.floor(Math.random() * lines.length)], 2.4);
          }
        }
      }

      if (target.hp <= 0) this.handleKO(attacker, target);
    }

    handleKO(attacker, target) {
      target.ko = true;
      target.koTimer = 0;
      this.hitstop = 0.14;
      this.shakeAllCams(16);
      this.screenFlash = 0.35;

      if (this.mode === '2p') {
        this.sfx.koFanfare();
        this.spawnParticles(target.x, target.y, '#ef4444', 24, 260, 6);
        this.endDay(target === this.player2 ? 'p1_win' : 'p2_win');
        return;
      }

      if (target.isPlayer) {
        this.sfx.hitHeavy();
        this.endDay('defeat');
      } else {
        this.sfx.koFanfare();
        this.score += 1500 + Math.round(this.player.grudge * 15);
        this.player.grudge = Math.min(100, this.player.grudge + 26);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
        this.showBanner(t('koBanner'), `${target.name} — ${t('koSub')}`, 2.1);
        this.spawnParticles(target.x, target.y, '#ef4444', 24, 260, 6);

        const remaining = this.rivals.filter((r) => !r.ko && r.aiState !== AI_STATES.CALMED);
        if (remaining.length === 0) {
          setTimeout(() => { if (!this.gameOver) this.endDay('victory'); }, 1300);
        }
      }
    }

    hitNearbyProps(attacker, range) {
      const hx = attacker.x + Math.cos(attacker.angle) * (range * 0.72);
      const hy = attacker.y + Math.sin(attacker.angle) * (range * 0.72);
      for (const p of this.world.props) {
        if (p.broken) continue;
        if (Math.hypot(p.x - hx, p.y - hy) < p.r + 32) {
          p.hp -= 20;
          p.shake = 0.2;
          if (p.type === 'parked_car') {
            this.sfx.carHorn();
            p.alarmTimer = 5.0;
            this.soundRings.push({ x: p.x, y: p.y, r: 20, maxR: 420, color: '#ef4444', alpha: 0.9 });
            this.spawnComicPopup(p.x, p.y - 24, 'WEE-WOO!', '#ef4444', 1.0);
            this.spawnParticles(p.x, p.y, p.color, 10, 160, 4);
            for (const r of this.rivals) {
              if (!r.ko && r.aiState === AI_STATES.WANDER && Math.hypot(r.x - p.x, r.y - p.y) < 620) {
                r.aiState = AI_STATES.SEARCH;
                r.investigateX = p.x; r.investigateY = p.y;
                r.aiTimer = 6.0;
                r.say('?!', 1.6);
              }
            }
          }
          if (p.hp <= 0) {
            p.broken = true;
            this.propsSmashed++;
            this.score += 150;
            if (p.type === 'hydrant') {
              p.sprayTimer = 14.0;
              this.sfx.hydrant();
              this.spawnComicPopup(p.x, p.y - 24, 'SPLASH!!', '#38bdf8', 1.1);
              this.spawnParticles(p.x, p.y, '#38bdf8', 18, 220, 5);
            } else if (p.type === 'trash') {
              this.sfx.trashCan();
              this.spawnComicPopup(p.x, p.y - 24, 'CLANG!', '#cbd5e1', 1.0);
              this.spawnParticles(p.x, p.y, '#94a3b8', 14, 190, 5);
              if (Math.random() < 0.65) {
                this.pickups.push({
                  x: p.x, y: p.y,
                  kind: Math.random() < 0.6 ? 'espresso' : 'taco',
                  bob: 0, life: 25
                });
              }
            }
          }
        }
      }
    }

    panicNearbyPedestrians(x, y, radius) {
      for (const ped of this.pedestrians) {
        if (Math.hypot(ped.x - x, ped.y - y) < radius) {
          ped.panicTimer = 3.5;
          ped.angle = Math.atan2(ped.y - y, ped.x - x) + (Math.random() - 0.5) * 0.6;
          if (ped.speechTimer <= 0 && Math.random() < 0.45) {
            ped.speech = ped.panicLine;
            ped.speechTimer = 1.8;
          }
        }
      }
    }

    endDay(outcome) {
      this.gameOver = true;
      this.running = false;
      const modal = document.getElementById('endModal');
      const badge = document.getElementById('endBadge');
      const title = document.getElementById('endTitle');
      const quote = document.getElementById('endQuote');

      const kos = this.mode === '2p' ? (outcome === 'forgot' ? 0 : 1) : this.rivals.filter((r) => r.ko).length;
      const total = this.mode === '2p' ? 1 : this.rivals.length;
      document.getElementById('statScore').textContent = this.score.toLocaleString();
      document.getElementById('statKos').textContent = `${kos} / ${total}`;
      document.getElementById('statDist').textContent = `${Math.round(this.walkedDist / 10)}m`;
      document.getElementById('statProps').textContent = this.propsSmashed;
      document.getElementById('endForgottenReason').textContent =
        `${SG.currentLang === 'tr' ? 'Günün Sebebi' : 'Today\'s Grudge'}: "${this.grudgeReason}"`;

      if (outcome === 'forgot') {
        this.sfx.forgotTrombone();
        badge.style.background = '#64748b';
        badge.textContent = t('forgotBadge');
        title.style.color = '#475569';
        title.textContent = t('forgotTitle');
        const qs = t('forgotQuotes');
        quote.textContent = qs[Math.floor(Math.random() * qs.length)];
      } else if (outcome === 'defeat') {
        badge.style.background = '#dc2626';
        badge.textContent = t('defeatBadge');
        title.style.color = '#ef4444';
        title.textContent = t('defeatTitle');
        quote.textContent = t('defeatQuote');
      } else if (outcome === 'p1_win' || outcome === 'p2_win') {
        badge.style.background = outcome === 'p1_win' ? '#f59e0b' : '#0284c7';
        badge.textContent = 'LOCAL VERSUS K.O.!';
        title.style.color = outcome === 'p1_win' ? '#f97316' : '#38bdf8';
        title.textContent = outcome === 'p1_win' ? t('p1WinTitle') : t('p2WinTitle');
        quote.textContent = t('vsWinQuote');
      } else {
        badge.style.background = '#16a34a';
        badge.textContent = t('victoryBadge');
        title.style.color = '#f59e0b';
        title.textContent = t('victoryTitle');
        quote.textContent = t('victoryQuote');
      }

      modal.classList.remove('hidden');
    }

    /* =======================================================================
       SIMULATION UPDATE LOOP
       ======================================================================= */
    update(dt) {
      if (this.hitstop > 0) { this.hitstop -= dt; return; }
      if (this.screenFlash > 0) this.screenFlash = Math.max(0, this.screenFlash - dt);
      if (this.subwayOverlayTimer > 0) this.subwayOverlayTimer = Math.max(0, this.subwayOverlayTimer - dt);
      if (this.bannerTimer > 0) {
        this.bannerTimer -= dt;
        if (this.bannerTimer <= 0) {
          document.getElementById('eventBanner').classList.add('hidden');
          document.getElementById('eventSubBanner').classList.add('hidden');
        }
      }

      this.updateTrafficAndPedestrians(dt);

      if (!this.running || this.gameOver || !this.player) {
        this.cam.x = 1480 + Math.sin(performance.now() * 0.00025) * 320;
        this.cam.y = 1040 + Math.cos(performance.now() * 0.0002) * 220;
        return;
      }

      this.dayMinutes += dt * 1.8;
      this.world.update(dt, [this.player, this.player2, ...this.rivals]);

      this.updatePlayerFighter(this.player, dt);
      if (this.mode === '2p' && this.player2) {
        this.updatePlayerFighter(this.player2, dt);
        this.update2PCameras(dt);
      } else {
        this.updateRivals(dt);
        this.update1PCamera(dt);
      }

      this.updateWorldEntities(dt);

      // Ambient city siren & rival rumor cues (1P mode)
      if (this.mode === '1p') {
        this.ambientSirenTimer -= dt;
        if (this.ambientSirenTimer <= 0) {
          this.ambientSirenTimer = 9 + Math.random() * 8;
          this.sfx.distantSiren(0.035);
          const alive = this.rivals.filter((r) => !r.ko && r.aiState !== AI_STATES.CALMED);
          if (alive.length > 0 && !this.activeRival) {
            const pick = alive[Math.floor(Math.random() * alive.length)];
            const dir = this.getCompassDirection(this.player.x, this.player.y, pick.x, pick.y);
            this.soundRings.push({ x: pick.x, y: pick.y, r: 12, maxR: 200, color: '#fb923c', alpha: 0.75 });
            this.showSoundCue(`♪ Rumor: ${pick.name} spotted ${dir} (${this.world.getZone(pick.x)})`);
          }
        }
      }

      this.updateHUD();
    }

    update1PCamera(dt) {
      const inCombat = !!(this.activeRival && this.activeRival.aiState === AI_STATES.COMBAT && !this.activeRival.ko);
      const targetZoom = inCombat ? 1.07 : 0.96;
      this.cam.zoom += (targetZoom - this.cam.zoom) * Math.min(1, dt * 3.5);
      const focusX = inCombat ? (this.player.x * 0.68 + this.activeRival.x * 0.32) : this.player.x;
      const focusY = inCombat ? (this.player.y * 0.68 + this.activeRival.y * 0.32) : this.player.y;
      this.cam.x += (focusX - this.cam.x) * Math.min(1, dt * 7);
      this.cam.y += (focusY - this.cam.y) * Math.min(1, dt * 7);
      this.cam.shake = Math.max(0, this.cam.shake - dt * 36);
    }

    update2PCameras(dt) {
      const dist = Math.hypot(this.player.x - this.player2.x, this.player.y - this.player2.y);
      const mergeThreshold = Math.min(480, this.viewW * 0.48);

      if (dist <= mergeThreshold) {
        if (this.isSplitScreen) {
          this.isSplitScreen = false;
          if (!this.mergedOnce) {
            this.mergedOnce = true;
            this.sfx.challenger();
            this.showBanner(t('mergedBanner'), t('mergedSub'), 2.0);
          }
        }
        const midX = (this.player.x + this.player2.x) / 2;
        const midY = (this.player.y + this.player2.y) / 2;
        this.cam.x += (midX - this.cam.x) * Math.min(1, dt * 8);
        this.cam.y += (midY - this.cam.y) * Math.min(1, dt * 8);
        const targetZoom = Math.max(0.86, Math.min(1.08, 1.12 - dist / 1400));
        this.cam.zoom += (targetZoom - this.cam.zoom) * Math.min(1, dt * 4);
      } else {
        this.isSplitScreen = true;
        this.cam1.x += (this.player.x - this.cam1.x) * Math.min(1, dt * 8);
        this.cam1.y += (this.player.y - this.cam1.y) * Math.min(1, dt * 8);
        this.cam2.x += (this.player2.x - this.cam2.x) * Math.min(1, dt * 8);
        this.cam2.y += (this.player2.y - this.cam2.y) * Math.min(1, dt * 8);
      }
      this.cam.shake = Math.max(0, this.cam.shake - dt * 36);
      this.cam1.shake = Math.max(0, this.cam1.shake - dt * 36);
      this.cam2.shake = Math.max(0, this.cam2.shake - dt * 36);
    }

    updatePlayerFighter(p, dt) {
      p.attackCooldown = Math.max(0, p.attackCooldown - dt);
      p.specialCooldown = Math.max(0, p.specialCooldown - dt);
      p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      p.comboResetTimer = Math.max(0, p.comboResetTimer - dt);
      p.hitstun = Math.max(0, p.hitstun - dt);
      p.flashTimer = Math.max(0, p.flashTimer - dt);
      p.invulnTimer = Math.max(0, p.invulnTimer - dt);
      p.speechTimer = Math.max(0, p.speechTimer - dt);
      p.shoutCooldown = Math.max(0, p.shoutCooldown - dt);
      p.subwayCooldown = Math.max(0, p.subwayCooldown - dt);

      if (p.playerNum === 1 && this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.comboCount = 0;
      }

      const blockPressed = this.mode === '1p'
        ? !!(this.keys['KeyL'] || this.keys['ShiftLeft'] || this.keys['ShiftRight'])
        : (p.playerNum === 1 ? !!this.keys['KeyH'] : !!this.keys['KeyL']);
      p.blocking = blockPressed && p.attackTimer <= 0 && p.dashTimer <= 0;

      const prevX = p.x, prevY = p.y;
      if (p.dashTimer > 0) {
        p.dashTimer -= dt;
        p.x += p.dashDirX * 640 * dt;
        p.y += p.dashDirY * 640 * dt;
        this.afterimages.push({ x: p.x, y: p.y, angle: p.angle, color: p.playerNum === 2 ? '#38bdf8' : '#fb923c', alpha: 0.45 });
      } else if (p.hitstun <= 0) {
        const { dx, dy } = this.getMoveInput(p.playerNum);
        const moveScale = p.blocking ? 0.35 : (p.attackTimer > 0 ? 0.32 : 1.0);
        p.x += dx * p.speed * moveScale * dt;
        p.y += dy * p.speed * moveScale * dt;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          p.angle = Math.atan2(dy, dx);
          p.walkCycle += dt * 13 * moveScale;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.001, dt);
      p.vy *= Math.pow(0.001, dt);

      this.world.resolveCircleCollisions(p);
      this.walkedDist += Math.hypot(p.x - prevX, p.y - prevY);

      // Subway Express Fast-Travel (+5% Commuter Rage!)
      if (p.subwayCooldown <= 0) {
        for (const sub of this.world.subways) {
          if (p.x > sub.x + 15 && p.x < sub.x + sub.w - 15 && p.y > sub.y + 15 && p.y < sub.y + sub.h - 15) {
            p.x = sub.exitX;
            p.y = sub.exitY;
            p.grudge = Math.min(100, p.grudge + 5);
            p.subwayCooldown = 3.2;
            if (p.playerNum === 1) { this.cam.x = p.x; this.cam.y = p.y; this.cam1.x = p.x; this.cam1.y = p.y; }
            else { this.cam2.x = p.x; this.cam2.y = p.y; }
            this.subwayOverlayTimer = 0.65;
            this.sfx.subway();
            this.showBanner(t('subwayBanner'), t('subwaySub'), 1.6);
            break;
          }
        }
      }

      // Active Melee Hitbox Frame
      if (p.attackTimer > 0) {
        p.attackTimer -= dt;
        if (!p.attackHitApplied && p.attackTimer <= p.attackDuration * 0.58) {
          p.attackHitApplied = true;
          if (p.attackType === 'punch' || p.attackType === 'kick') {
            const opponents = this.getOpponentsOf(p);
            let closest = null, bestD = 92;
            for (const o of opponents) {
              const d = Math.hypot(o.x - p.x, o.y - p.y);
              if (d < bestD) { bestD = d; closest = o; }
            }
            if (closest) p.angle = Math.atan2(closest.y - p.y, closest.x - p.x);

            const range = p.attackType === 'kick' ? 68 : 56;
            for (const o of opponents) {
              const dx = o.x - p.x, dy = o.y - p.y;
              if (Math.hypot(dx, dy) <= range + o.r) {
                let diff = Math.abs(Math.atan2(dy, dx) - p.angle);
                if (diff > Math.PI) diff = Math.PI * 2 - diff;
                if (diff < 1.15) this.applyMeleeHit(p, o, p.attackType);
              }
            }
            this.hitNearbyProps(p, range);
          }
        }
      }

      // Signature Grudge / Calming Down Meter
      const inCloseFight = this.mode === '2p'
        ? (this.player2 && Math.hypot(this.player.x - this.player2.x, this.player.y - this.player2.y) < 340)
        : !!(this.activeRival && !this.activeRival.ko && this.activeRival.aiState === AI_STATES.COMBAT);
      const drainRate = inCloseFight ? 0.22 : 1.55;
      p.grudge = Math.max(0, p.grudge - drainRate * dt);

      if (p.grudge >= 70 && Math.random() < dt * 6) {
        this.particles.push({
          x: p.x + (Math.random() - 0.5) * 16, y: p.y - 18,
          vx: (Math.random() - 0.5) * 18, vy: -35 - Math.random() * 25,
          size: 4, color: p.playerNum === 2 ? '#38bdf8' : '#ef4444',
          life: 0.45, maxLife: 0.45
        });
      }

      if (p.grudge < 35 && p.grudge > 0) {
        p.lowGrudgeMutterTimer -= dt;
        if (p.lowGrudgeMutterTimer <= 0 && p.speechTimer <= 0) {
          p.lowGrudgeMutterTimer = 4.2;
          const lines = t('playerLowGrudgeLines');
          p.say(lines[Math.floor(Math.random() * lines.length)], 2.4);
        }
      }

      if (p.grudge <= 0 && !this.gameOver) {
        p.say(SG.currentLang === 'tr' ? 'Niye sinirlenmiştim ki? 🤷' : 'Wait... why was I mad? 🤷', 4.0);
        for (const r of this.rivals) { if (!r.ko) r.aiState = AI_STATES.CALMED; }
        this.endDay('forgot');
      }
    }

    /* =======================================================================
       ENEMY AI FINITE STATE MACHINE (1P MODE)
       ======================================================================= */
    updateRivals(dt) {
      const p = this.player;
      let closestEngaged = null;
      let closestDist = Infinity;

      for (const r of this.rivals) {
        r.speechTimer = Math.max(0, r.speechTimer - dt);
        r.flashTimer = Math.max(0, r.flashTimer - dt);
        r.hitstun = Math.max(0, r.hitstun - dt);
        r.invulnTimer = Math.max(0, r.invulnTimer - dt);
        r.attackCooldown = Math.max(0, r.attackCooldown - dt);
        r.specialCooldown = Math.max(0, r.specialCooldown - dt);
        r.dashCooldown = Math.max(0, r.dashCooldown - dt);

        if (r.ko) {
          r.koTimer += dt;
          r.x += r.vx * dt; r.y += r.vy * dt;
          r.vx *= Math.pow(0.002, dt); r.vy *= Math.pow(0.002, dt);
          this.world.resolveCircleCollisions(r);
          continue;
        }

        const distToPlayer = Math.hypot(p.x - r.x, p.y - r.y);

        if (r.aiState !== AI_STATES.COMBAT && r.aiState !== AI_STATES.CALMED) {
          r.grudge = Math.max(0, r.grudge - r.aiCalmRate * dt);
          if (r.grudge <= 0) {
            r.aiState = AI_STATES.CALMED;
            const lines = t('calmedRivalLines');
            r.say(lines[Math.floor(Math.random() * lines.length)], 2.8);
          }
        }

        if (distToPlayer < 420 && distToPlayer < closestDist) {
          closestDist = distToPlayer;
          closestEngaged = r;
        }

        if (r.attackTimer > 0) {
          r.attackTimer -= dt;
          if (!r.attackHitApplied && r.attackTimer <= r.attackDuration * 0.52) {
            r.attackHitApplied = true;
            if (r.attackType === 'punch' || r.attackType === 'kick') {
              const range = r.attackType === 'kick' ? 62 : 52;
              if (distToPlayer <= range + p.r) this.applyMeleeHit(r, p, r.attackType);
            }
          }
        }

        if (r.hitstun <= 0) {
          if (r.dashTimer > 0) {
            r.dashTimer -= dt;
            r.x += r.dashDirX * 520 * dt;
            r.y += r.dashDirY * 520 * dt;
          } else {
            switch (r.aiState) {
              case AI_STATES.WANDER: this.aiStepWander(r, distToPlayer, dt); break;
              case AI_STATES.SEARCH: this.aiStepSearch(r, distToPlayer, dt); break;
              case AI_STATES.COMBAT: this.aiStepCombat(r, distToPlayer, dt); break;
              case AI_STATES.CALMED: this.aiStepCalmed(r, distToPlayer, dt); break;
            }
          }
        }

        r.x += r.vx * dt; r.y += r.vy * dt;
        r.vx *= Math.pow(0.001, dt); r.vy *= Math.pow(0.001, dt);
        this.world.resolveCircleCollisions(r);
      }

      if (closestEngaged && closestEngaged !== this.activeRival && closestEngaged.aiState === AI_STATES.COMBAT) {
        this.showBanner(t('challengerBanner'), `${closestEngaged.name} — ${t('fightSub')}`, 1.7);
        this.sfx.challenger();
      }
      this.activeRival = closestEngaged;
    }

    aiStepWander(r, distToPlayer, dt) {
      r.blocking = false;
      r.aiTimer -= dt;
      if (distToPlayer < 210) {
        r.aiState = AI_STATES.COMBAT;
        r.say(r.taunts[Math.floor(Math.random() * r.taunts.length)], 2.2);
        return;
      }
      if (distToPlayer < 350) {
        r.aiState = AI_STATES.SEARCH;
        r.investigateX = this.player.x; r.investigateY = this.player.y;
        r.aiTimer = 4.5;
        r.say('WAIT... IS THAT HIM?!', 1.8);
        return;
      }
      if (Math.hypot(r.targetX - r.x, r.targetY - r.y) < 24 || r.aiTimer <= 0) {
        r.aiTimer = 3.0 + Math.random() * 3.5;
        const ang = Math.random() * Math.PI * 2;
        const rad = 110 + Math.random() * 230;
        const nx = Math.max(90, Math.min(SG.WORLD_W - 90, r.homeX + Math.cos(ang) * rad));
        const ny = Math.max(90, Math.min(SG.WORLD_H - 90, r.homeY + Math.sin(ang) * rad));
        if (!this.world.isPointInBuilding(nx, ny, 28)) { r.targetX = nx; r.targetY = ny; }
      } else {
        const ang = Math.atan2(r.targetY - r.y, r.targetX - r.x);
        r.angle = ang;
        r.x += Math.cos(ang) * (r.speed * 0.48) * dt;
        r.y += Math.sin(ang) * (r.speed * 0.48) * dt;
        r.walkCycle += dt * 7;
      }
    }

    aiStepSearch(r, distToPlayer, dt) {
      r.blocking = false;
      r.aiTimer -= dt;
      if (distToPlayer < 225) {
        r.aiState = AI_STATES.COMBAT;
        r.say(r.taunts[Math.floor(Math.random() * r.taunts.length)], 2.2);
        return;
      }
      const dx = r.investigateX - r.x, dy = r.investigateY - r.y;
      const d = Math.hypot(dx, dy);
      if (d > 28) {
        const ang = Math.atan2(dy, dx);
        r.angle = ang;
        r.x += Math.cos(ang) * (r.speed * 0.78) * dt;
        r.y += Math.sin(ang) * (r.speed * 0.78) * dt;
        r.walkCycle += dt * 10;
      }
      if (r.aiTimer <= 0 || d <= 28) {
        r.aiState = AI_STATES.WANDER;
        r.say('Must\'ve been the wind...', 1.7);
      }
    }

    aiStepCombat(r, distToPlayer, dt) {
      const p = this.player;
      const angToPlayer = Math.atan2(p.y - r.y, p.x - r.x);
      r.angle = angToPlayer;
      if (distToPlayer > 520) {
        r.aiState = AI_STATES.SEARCH;
        r.investigateX = p.x; r.investigateY = p.y;
        r.aiTimer = 5.0;
        r.say('HEY! COME BACK HERE!', 1.8);
        return;
      }
      r.aiAttackDelay -= dt;
      r.aiTimer -= dt;
      if (r.aiTimer <= 0) {
        r.aiTimer = 0.8 + Math.random() * 1.1;
        r.aiStrafeDir = Math.random() < 0.5 ? 1 : -1;
        r.blocking = p.attackTimer > 0 && distToPlayer < 95 && Math.random() < 0.42;
      }
      if (r.attackTimer <= 0) {
        if (distToPlayer > 72) {
          const weave = angToPlayer + r.aiStrafeDir * 0.35;
          const spd = r.blocking ? r.speed * 0.4 : r.speed * 0.92;
          r.x += Math.cos(weave) * spd * dt;
          r.y += Math.sin(weave) * spd * dt;
          r.walkCycle += dt * 11;
        } else {
          const perp = angToPlayer + r.aiStrafeDir * (Math.PI / 2);
          r.x += Math.cos(perp) * (r.speed * 0.36) * dt;
          r.y += Math.sin(perp) * (r.speed * 0.36) * dt;
          r.walkCycle += dt * 6;
        }
      }
      if (r.aiAttackDelay <= 0) {
        if (distToPlayer < 72) {
          r.blocking = false;
          const roll = Math.random();
          if (roll < 0.58) r.startAttack('punch', this);
          else if (roll < 0.88) r.startAttack('kick', this);
          else r.startAttack('special', this);
          r.aiAttackDelay = 0.52 + Math.random() * 0.55;
        } else if (distToPlayer > 140 && distToPlayer < 290 && r.specialCooldown <= 0 && Math.random() < 0.35) {
          r.blocking = false;
          r.startAttack('special', this);
          r.aiAttackDelay = 1.1;
        } else if (distToPlayer > 120 && r.dashCooldown <= 0 && Math.random() < 0.25) {
          r.startDash(Math.cos(angToPlayer), Math.sin(angToPlayer), this);
          r.aiAttackDelay = 0.45;
        } else {
          r.aiAttackDelay = 0.35;
        }
      }
    }

    aiStepCalmed(r, distToPlayer, dt) {
      r.blocking = false;
      if (distToPlayer < 95 && r.speechTimer <= 0) {
        const lines = t('calmedRivalLines');
        r.say(lines[Math.floor(Math.random() * lines.length)], 2.8);
      }
      r.aiTimer -= dt;
      if (Math.hypot(r.targetX - r.x, r.targetY - r.y) < 20 || r.aiTimer <= 0) {
        r.aiTimer = 4 + Math.random() * 4;
        const ang = Math.random() * Math.PI * 2;
        const nx = Math.max(100, Math.min(SG.WORLD_W - 100, r.x + Math.cos(ang) * 140));
        const ny = Math.max(100, Math.min(SG.WORLD_H - 100, r.y + Math.sin(ang) * 140));
        if (!this.world.isPointInBuilding(nx, ny, 28)) { r.targetX = nx; r.targetY = ny; }
      } else {
        const ang = Math.atan2(r.targetY - r.y, r.targetX - r.x);
        r.angle = ang;
        r.x += Math.cos(ang) * 52 * dt;
        r.y += Math.sin(ang) * 52 * dt;
        r.walkCycle += dt * 4;
      }
    }

    updateTrafficAndPedestrians(dt) {
      for (const ped of this.pedestrians) {
        ped.speechTimer = Math.max(0, ped.speechTimer - dt);
        if (ped.panicTimer > 0) {
          ped.panicTimer -= dt;
          ped.x += Math.cos(ped.angle) * (ped.speed * 2.4) * dt;
          ped.y += Math.sin(ped.angle) * (ped.speed * 2.4) * dt;
          ped.walkPhase += dt * 16;
        } else {
          ped.turnTimer -= dt;
          if (ped.turnTimer <= 0) {
            ped.turnTimer = 2.0 + Math.random() * 3.5;
            ped.angle += (Math.random() - 0.5) * 1.8;
          }
          ped.x += Math.cos(ped.angle) * ped.speed * dt;
          ped.y += Math.sin(ped.angle) * ped.speed * dt;
          ped.walkPhase += dt * 7;
        }
        if (this.world.isPointInBuilding(ped.x, ped.y, ped.r + 4) || ped.x < 50 || ped.x > SG.WORLD_W - 50 || ped.y < 50 || ped.y > SG.WORLD_H - 50) {
          ped.angle += Math.PI * 0.75;
          this.world.resolveCircleCollisions(ped);
        }
      }

      const activeFighters = [this.player, this.player2, ...this.rivals].filter((f) => f && !f.ko);
      for (const car of this.cars) {
        car.honkCooldown = Math.max(0, car.honkCooldown - dt);
        let shouldStop = false;
        const redForCar = (car.axis === 'v' && (this.world.trafficPhase === 2 || this.world.trafficPhase === 3))
                       || (car.axis === 'h' && (this.world.trafficPhase === 0 || this.world.trafficPhase === 1));
        if (redForCar) {
          for (const inter of this.world.intersections) {
            if (car.axis === 'h') {
              const distFront = car.dir === 1 ? (inter.x - (car.x + 34)) : ((car.x - 34) - (inter.x + inter.w));
              if (distFront > 0 && distFront < 42 && Math.abs(car.y - inter.cy) < inter.h * 0.6) { shouldStop = true; break; }
            } else {
              const distFront = car.dir === 1 ? (inter.y - (car.y + 34)) : ((car.y - 34) - (inter.y + inter.h));
              if (distFront > 0 && distFront < 42 && Math.abs(car.x - inter.cx) < inter.w * 0.6) { shouldStop = true; break; }
            }
          }
        }
        if (!shouldStop) {
          for (const f of activeFighters) {
            const fx = car.axis === 'h' ? car.x + car.dir * 52 : car.x;
            const fy = car.axis === 'v' ? car.y + car.dir * 52 : car.y;
            if (Math.hypot(f.x - fx, f.y - fy) < 42) {
              shouldStop = true;
              if (car.honkCooldown <= 0 && this.player && Math.hypot(car.x - this.player.x, car.y - this.player.y) < 480) {
                car.honkCooldown = 2.4;
                this.sfx.carHorn();
                this.spawnComicPopup(car.x, car.y - 24, 'HONK!', '#ffe135', 0.85);
              }
              break;
            }
          }
        }
        const targetSpd = shouldStop ? 0 : car.speed;
        car.curSpeed += (targetSpd - car.curSpeed) * Math.min(1, dt * 6);
        if (car.axis === 'h') {
          car.x += car.dir * car.curSpeed * dt;
          if (car.x > SG.WORLD_W + 90) car.x = -90;
          if (car.x < -90) car.x = SG.WORLD_W + 90;
        } else {
          car.y += car.dir * car.curSpeed * dt;
          if (car.y > SG.WORLD_H + 90) car.y = -90;
          if (car.y < -90) car.y = SG.WORLD_H + 90;
        }
      }
    }

    updateWorldEntities(dt) {
      for (const p of this.world.props) {
        if (p.shake > 0) p.shake = Math.max(0, p.shake - dt);
        if (p.alarmTimer > 0) p.alarmTimer = Math.max(0, p.alarmTimer - dt);
        if (p.type === 'hydrant' && p.broken && p.sprayTimer > 0) {
          p.sprayTimer -= dt;
          if (Math.random() < dt * 28) {
            this.particles.push({
              x: p.x + (Math.random() - 0.5) * 6, y: p.y,
              vx: (Math.random() - 0.5) * 120, vy: -90 - Math.random() * 90,
              size: 4 + Math.random() * 3,
              color: Math.random() < 0.4 ? '#e0f2fe' : '#38bdf8',
              life: 0.45, maxLife: 0.45
            });
          }
        }
      }

      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
        this.particles.push({
          x: pr.x, y: pr.y,
          vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40,
          size: 6, color: pr.color, life: 0.2, maxLife: 0.2
        });
        let hit = !!this.world.isPointInBuilding(pr.x, pr.y, 6);
        const targets = this.getOpponentsOf(pr.owner);
        for (const tgt of targets) {
          if (Math.hypot(tgt.x - pr.x, tgt.y - pr.y) < pr.r + tgt.r) {
            this.applyMeleeHit(pr.owner, tgt, 'kick');
            hit = true; break;
          }
        }
        if (hit || pr.life <= 0) {
          this.spawnParticles(pr.x, pr.y, pr.color, 14, 220, 5);
          this.projectiles.splice(i, 1);
        }
      }

      const collectors = [this.player, this.player2].filter((f) => f && !f.ko);
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const pk = this.pickups[i];
        pk.bob += dt * 5; pk.life -= dt;
        if (pk.life <= 0) { this.pickups.splice(i, 1); continue; }
        for (const col of collectors) {
          if (Math.hypot(col.x - pk.x, col.y - pk.y) < col.r + 18) {
            this.sfx.pickup();
            if (pk.kind === 'espresso') {
              col.grudge = Math.min(100, col.grudge + 22);
              col.hp = Math.min(col.maxHp, col.hp + 12);
              this.spawnComicPopup(pk.x, pk.y - 20, '+22% GRUDGE! ☕', '#f97316', 1.15);
            } else {
              col.hp = Math.min(col.maxHp, col.hp + 30);
              this.spawnComicPopup(pk.x, pk.y - 20, '+30 HP! 🌮', '#22c55e', 1.15);
            }
            this.pickups.splice(i, 1);
            break;
          }
        }
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt; pt.y += pt.vy * dt;
        pt.vx *= Math.pow(0.05, dt); pt.vy *= Math.pow(0.05, dt);
        pt.life -= dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.popups.length - 1; i >= 0; i--) {
        const pp = this.popups[i];
        pp.y += pp.vy * dt; pp.life -= dt;
        if (pp.life <= 0) this.popups.splice(i, 1);
      }
      for (let i = this.soundRings.length - 1; i >= 0; i--) {
        const sr = this.soundRings[i];
        sr.r += 420 * dt; sr.alpha -= dt * 1.1;
        if (sr.r >= sr.maxR || sr.alpha <= 0) this.soundRings.splice(i, 1);
      }
      for (let i = this.afterimages.length - 1; i >= 0; i--) {
        this.afterimages[i].alpha -= dt * 2.6;
        if (this.afterimages[i].alpha <= 0) this.afterimages.splice(i, 1);
      }
    }

    updateHUD() {
      const p = this.player;
      const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
      document.getElementById('p1HealthFill').style.width = `${hpPct}%`;
      document.getElementById('p1HealthTrail').style.width = `${hpPct}%`;
      document.getElementById('p1HpText').textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;

      const kos = this.rivals.filter((r) => r.ko).length;
      document.getElementById('koCountText').textContent = this.mode === '2p'
        ? `ZONE: ${this.world.getZone(p.x)}`
        : `RIVALS KO: ${kos}/${this.rivals.length}`;
      document.getElementById('scoreDisplay').textContent = `SCORE ${String(this.score).padStart(6, '0')}`;

      const gPct = Math.max(0, Math.min(100, p.grudge));
      const gFill = document.getElementById('grudgeFill');
      gFill.style.width = `${gPct}%`;
      const statusBadge = document.getElementById('p1StatusBadge');
      const gStateText = document.getElementById('grudgeStateText');
      document.getElementById('grudgePctText').textContent = `${Math.ceil(gPct)}%`;

      if (gPct >= 70) {
        gFill.style.backgroundColor = '#ef4444'; statusBadge.style.backgroundColor = '#ef4444';
        statusBadge.textContent = t('fuming'); gStateText.textContent = t('grudgeHigh');
      } else if (gPct >= 35) {
        gFill.style.backgroundColor = '#f59e0b'; statusBadge.style.backgroundColor = '#f59e0b';
        statusBadge.textContent = t('annoyed'); gStateText.textContent = t('grudgeMid');
      } else if (gPct > 0) {
        gFill.style.backgroundColor = '#38bdf8'; statusBadge.style.backgroundColor = '#38bdf8';
        statusBadge.textContent = t('cooling'); gStateText.textContent = t('grudgeLow');
      } else {
        gFill.style.backgroundColor = '#64748b'; statusBadge.style.backgroundColor = '#64748b';
        statusBadge.textContent = t('calm'); gStateText.textContent = t('grudgeZero');
      }

      const zone = this.world.getZone(p.x);
      const zoneBadge = document.getElementById('zoneBadge');
      zoneBadge.textContent = this.mode === '2p' ? (this.isSplitScreen ? 'SPLIT CAM' : 'BRAWL!') : zone;
      zoneBadge.style.color = zone === 'DOWNTOWN' ? '#fb923c' : '#38bdf8';
      zoneBadge.style.borderColor = zone === 'DOWNTOWN' ? '#fb923c' : '#38bdf8';

      const hrs = Math.floor(this.dayMinutes / 60) % 24;
      const mins = Math.floor(this.dayMinutes % 60);
      document.getElementById('clockText').textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      // Right Panel: Player 2 in 2P Mode OR Active AI Rival in 1P Mode
      if (this.mode === '2p' && this.player2) {
        const p2 = this.player2;
        document.getElementById('rivalName').textContent = t('p2Name');
        const p2Pct = Math.max(0, (p2.hp / p2.maxHp) * 100);
        document.getElementById('rivalHealthFill').style.width = `${p2Pct}%`;
        document.getElementById('rivalHealthTrail').style.width = `${p2Pct}%`;
        document.getElementById('rivalHpText').textContent = `${Math.ceil(p2.hp)}/${p2.maxHp}`;
        document.getElementById('rivalStateTag').textContent = this.world.getZone(p2.x);
        document.getElementById('rivalZoneHint').textContent = `P2 GRUDGE: ${Math.ceil(p2.grudge)}%`;
        document.getElementById('rivalGrudgeFill').style.width = `${p2.grudge}%`;
        document.getElementById('grudgeReasonHud').textContent =
          `P2 ${t('grudge')}: ${Math.ceil(p2.grudge)}% • ${this.grudgeReason}`;
      } else {
        const r = this.activeRival;
        document.getElementById('grudgeReasonHud').textContent =
          `${SG.currentLang === 'tr' ? 'KİN' : 'GRUDGE'}: ${this.grudgeReason}`;
        if (r && !r.ko) {
          document.getElementById('rivalName').textContent = r.name;
          const rPct = (r.hp / r.maxHp) * 100;
          document.getElementById('rivalHealthFill').style.width = `${rPct}%`;
          document.getElementById('rivalHealthTrail').style.width = `${rPct}%`;
          document.getElementById('rivalHpText').textContent = `${Math.ceil(r.hp)}/${r.maxHp}`;
          document.getElementById('rivalStateTag').textContent = r.aiState;
          document.getElementById('rivalZoneHint').textContent = `${this.world.getZone(r.x)} • GRUDGE ${Math.ceil(r.grudge)}%`;
          document.getElementById('rivalGrudgeFill').style.width = `${r.grudge}%`;
        } else {
          document.getElementById('rivalName').textContent = t('noRival');
          document.getElementById('rivalHealthFill').style.width = '0%';
          document.getElementById('rivalHealthTrail').style.width = '0%';
          document.getElementById('rivalHpText').textContent = '--';
          document.getElementById('rivalStateTag').textContent = t('searchingCity');
          document.getElementById('rivalZoneHint').textContent = t('roamHint');
          document.getElementById('rivalGrudgeFill').style.width = '0%';
        }
      }

      const comboBox = document.getElementById('comboBox');
      if (this.comboCount >= 2) {
        comboBox.classList.remove('hidden');
        document.getElementById('comboCountText').textContent = `${this.comboCount} HITS!`;
      } else {
        comboBox.classList.add('hidden');
      }
    }

    loop(ts) {
      const dt = Math.min(0.05, (ts - this.lastTime) / 1000);
      this.lastTime = ts;
      this.update(dt);
      this.renderer.render(this);
      requestAnimationFrame((nextTs) => this.loop(nextTs));
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.streetGrudgeGame = new StreetGrudgeGame();
  });
})(window.StreetGrudge);
