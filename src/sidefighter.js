/**
 * Street Grudge v3 — SIDE-VIEW SPLIT-SCREEN "STREET FIGHTER SEARCH" ENGINE
 *
 * Classic 2D Side-View Street Fighter combat meets satirical open-city search!
 * - Left Screen: Player 1 starts on the WEST side and travels RIGHT (→)
 * - Right Screen: Rival (AI or P2) starts on the EAST side and travels LEFT (←)
 * - 3 Interconnected Vertical Floors: Underground Subway (0), City Street (1), Skybridge/Offices (2)
 * - Use [W] / [↑] at glowing Stairs & Elevators to switch floors and intercept your rival!
 * - The moment both fighters meet on the same floor, the split-screen SHATTERS into
 *   a classic single-screen 2D Street Fighter arena!
 * - If either fighter's Grudge Meter hits 0% before KO, they shrug & cancel the fight!
 */
window.StreetGrudge = window.StreetGrudge || {};

(function (SG) {
  'use strict';

  const STAGE_W = 5000;
  const GROUND_Y = 0; // Relative floor ground offset inside each floor band
  const GRAVITY = 1580;

  class SideFighterEngine {
    constructor(game) {
      this.game = game;
      this.active = false;
      this.is2P = false;
      this.merged = false;
      this.mergedEver = false;
      this.mergeFlash = 0;
      this.splitCrack = 0;

      this.p1 = null;
      this.p2 = null;
      this.cam1X = 400;
      this.cam2X = STAGE_W - 400;
      this.camMergedX = STAGE_W / 2;
      this.shake = 0;

      this.connectors = []; // Stairs & Elevators linking floors 0 <-> 1 <-> 2
      this.props = [];      // Destructible hydrants, trash cans, espresso carts
      this.projectiles = [];
      this.particles = [];
      this.popups = [];
      this.bgCars = [];
      this.peds = [];
      this.subwayTrainX = -600;
      this.roundTime = 0;
    }

    start(is2P, p1Template, p2Template) {
      this.active = true;
      this.is2P = is2P;
      this.merged = false;
      this.mergedEver = false;
      this.mergeFlash = 0;
      this.shake = 0;
      this.roundTime = 0;
      this.projectiles = [];
      this.particles = [];
      this.popups = [];

      // Floor 0 = Metro (Subway), Floor 1 = Sokak (Street), Floor 2 = Ofis/Üst Geçit (Skybridge)
      const p1StartFloor = Math.random() < 0.7 ? 1 : (Math.random() < 0.5 ? 0 : 2);
      const p2StartFloor = Math.random() < 0.55 ? 1 : (p1StartFloor === 1 ? (Math.random() < 0.5 ? 0 : 2) : 1);

      const p1StartX = 280 + Math.random() * 480;
      const p2StartX = STAGE_W - (280 + Math.random() * 480);

      this.p1 = this.createSideFighter(p1Template, 1, p1StartX, p1StartFloor, 1);
      this.p2 = this.createSideFighter(p2Template, is2P ? 2 : 0, p2StartX, p2StartFloor, -1);

      this.cam1X = this.p1.x;
      this.cam2X = this.p2.x;
      this.camMergedX = (this.p1.x + this.p2.x) / 2;

      this.buildStage();

      const floorNames = this.getFloorNames();
      this.p1.say(
        SG.currentLang === 'tr'
          ? `SAĞA DOĞRU GİDİYORUM! (${floorNames[this.p1.floor]})`
          : `HEADING RIGHT! (${floorNames[this.p1.floor]})`,
        3.0
      );
      this.p2.say(
        SG.currentLang === 'tr'
          ? `SOLA DOĞRU GELİYORUM! (${floorNames[this.p2.floor]})`
          : `HEADING LEFT! (${floorNames[this.p2.floor]})`,
        3.0
      );
    }

    getFloorNames() {
      return SG.currentLang === 'tr'
        ? ['KAT 0: METRO TÜNELİ', 'KAT 1: ANA CADDE', 'KAT 2: OFİS & ÜST GEÇİT']
        : ['FL 0: SUBWAY TUNNEL', 'FL 1: MAIN STREET', 'FL 2: OFFICE SKYBRIDGE'];
    }

    createSideFighter(tpl, playerNum, x, floor, facing) {
      return {
        id: tpl.id,
        name: playerNum === 1 ? tpl.name : (playerNum === 2 ? `P2 ${tpl.short || tpl.name}` : tpl.name),
        short: tpl.short || tpl.name.slice(0, 4),
        playerNum, // 1 = P1, 2 = P2, 0 = AI
        isPlayer: playerNum > 0,
        x,
        y: 0, // Height above ground (0 = on floor, negative = jumping in air!)
        vx: 0,
        vy: 0,
        floor,
        facing, // 1 = right, -1 = left
        w: 44,
        h: 88,
        maxHp: tpl.maxHp || 130,
        hp: tpl.maxHp || 130,
        speed: (tpl.speed || 255) * 1.18,
        powerMult: tpl.powerMult || 1.0,
        giColor: tpl.giColor || '#f8fafc',
        trimColor: tpl.trimColor || '#111111',
        skinColor: tpl.skinColor || '#f5cfa0',
        hairColor: tpl.hairColor || '#1c1917',
        bandanaColor: tpl.bandanaColor || '#ef4444',
        specialKind: tpl.specialKind || 'fireball',
        specialName: tpl.specialNameTr && SG.currentLang === 'tr' ? tpl.specialNameTr : (tpl.specialNameEn || tpl.specialName || 'HADOUKEN!'),
        specialColor: tpl.specialColor || '#f97316',
        taunts: tpl.taunts || ['NEREDESİN?!', 'BURAYA GEL!', 'HADOUKEN!!'],

        grudge: 100,
        superMeter: 0,
        caffeineTimer: 0,
        ko: false,
        crouching: false,
        blocking: false,
        wasBlocking: false,
        parryWindow: 0,

        attackType: null, // 'punch' | 'kick' | 'sweep' | 'uppercut' | 'fireball' | 'super'
        attackTimer: 0,
        attackDuration: 0,
        attackHit: false,
        comboStep: 0,
        comboTimer: 0,
        cooldown: 0,
        specialCd: 0,
        dashTimer: 0,
        dashCd: 0,
        dashDir: 1,
        hitstun: 0,
        knockdown: 0,
        flashTimer: 0,
        invulnTimer: 0,
        floorSwitchCd: 0,
        walkCycle: 0,

        speech: '',
        speechTimer: 0,
        shoutCd: 0,
        mutterTimer: 4.0,

        // AI state
        aiState: SG.AI_STATES.WANDER,
        aiDecisionTimer: 0.6,
        aiDistractTimer: 0
      };
    }

    buildStage() {
      // Stairs (Floor 0 <-> 1) and Elevators (Floor 1 <-> 2) spread across the 5000px city!
      this.connectors = [
        { x: 680,  from: 0, to: 1, kind: 'metro',    label: 'METRO MERDİVENİ' },
        { x: 1580, from: 0, to: 1, kind: 'metro',    label: 'METRO MERDİVENİ' },
        { x: 2500, from: 0, to: 1, kind: 'metro',    label: 'MERKEZ METRO' },
        { x: 3420, from: 0, to: 1, kind: 'metro',    label: 'UPTOWN METRO' },
        { x: 4320, from: 0, to: 1, kind: 'metro',    label: 'DOĞU METRO' },

        { x: 1120, from: 1, to: 2, kind: 'elevator', label: 'ASANSÖR (KAT 2)' },
        { x: 2060, from: 1, to: 2, kind: 'elevator', label: 'KÜTÜPHANE ASANSÖRÜ' },
        { x: 2960, from: 1, to: 2, kind: 'elevator', label: 'APEX ASANSÖR' },
        { x: 3920, from: 1, to: 2, kind: 'elevator', label: 'PLAZA ASANSÖRÜ' }
      ];

      // Street props across floors (hydrants, trash cans, espresso stands)
      this.props = [];
      for (let x = 520; x < STAGE_W - 400; x += 480) {
        this.props.push({ type: 'hydrant', x, floor: 1, broken: false, sprayTimer: 0 });
        this.props.push({ type: 'trash', x: x + 230, floor: 1, broken: false });
      }
      // Espresso refill kiosks on every floor!
      this.props.push({ type: 'espresso', x: 1840, floor: 1, cd: 0 });
      this.props.push({ type: 'espresso', x: 3180, floor: 1, cd: 0 });
      this.props.push({ type: 'espresso', x: 2500, floor: 2, cd: 0 });
      this.props.push({ type: 'espresso', x: 2240, floor: 0, cd: 0 });

      // Background street cars & pedestrians on Floor 1
      this.bgCars = [];
      const carCols = ['#ef4444', '#facc15', '#3b82f6', '#22c55e', '#f97316', '#a855f7'];
      for (let i = 0; i < 8; i++) {
        this.bgCars.push({
          x: Math.random() * STAGE_W,
          dir: i % 2 === 0 ? 1 : -1,
          speed: 170 + Math.random() * 110,
          color: carCols[i % carCols.length],
          isTaxi: i % 3 === 0
        });
      }

      this.peds = [];
      const shirtCols = ['#38bdf8', '#f472b6', '#fde047', '#34d399', '#e2e8f0'];
      for (let i = 0; i < 24; i++) {
        this.peds.push({
          x: 200 + Math.random() * (STAGE_W - 400),
          floor: i % 5 === 0 ? 0 : (i % 5 === 1 ? 2 : 1),
          dir: Math.random() < 0.5 ? 1 : -1,
          speed: 35 + Math.random() * 35,
          color: shirtCols[i % shirtCols.length],
          panic: 0,
          phase: Math.random() * 6
        });
      }
    }

    say(f, txt, dur = 2.4) {
      f.speech = txt;
      f.speechTimer = dur;
    }

    handleKeyDown(code) {
      if (!this.active || this.game.gameOver) return;
      const g = this.game;

      if (!this.is2P) {
        // 1P Controls (WASD / Arrows + J/K/L/U/Space/E)
        if (code === 'KeyW' || code === 'ArrowUp') this.tryUseConnectorOrJump(this.p1);
        else if (code === 'KeyJ' || code === 'KeyZ') this.startAttack(this.p1, 'punch');
        else if (code === 'KeyK' || code === 'KeyX') this.startAttack(this.p1, this.p1.crouching ? 'sweep' : 'kick');
        else if (code === 'KeyU' || code === 'KeyQ') this.startSpecial(this.p1);
        else if (code === 'Space') this.startDash(this.p1);
        else if (code === 'KeyE') this.shout(this.p1, this.p2);
      } else {
        // 2P Local Controls
        // P1: WASD + F(Punch) G(Kick) H(Block) T(Special) Space(Dash) E(Shout)
        if (code === 'KeyW') this.tryUseConnectorOrJump(this.p1);
        else if (code === 'KeyF') this.startAttack(this.p1, 'punch');
        else if (code === 'KeyG') this.startAttack(this.p1, this.p1.crouching ? 'sweep' : 'kick');
        else if (code === 'KeyT') this.startSpecial(this.p1);
        else if (code === 'Space') this.startDash(this.p1);
        else if (code === 'KeyE') this.shout(this.p1, this.p2);

        // P2: Arrows + J(Punch) K(Kick) L(Block) U(Special) Enter/RShift(Dash) O(Shout)
        if (code === 'ArrowUp') this.tryUseConnectorOrJump(this.p2);
        else if (code === 'KeyJ') this.startAttack(this.p2, 'punch');
        else if (code === 'KeyK') this.startAttack(this.p2, this.p2.crouching ? 'sweep' : 'kick');
        else if (code === 'KeyU') this.startSpecial(this.p2);
        else if (code === 'Enter' || code === 'ShiftRight') this.startDash(this.p2);
        else if (code === 'KeyO') this.shout(this.p2, this.p1);
      }
    }

    tryUseConnectorOrJump(f) {
      if (f.ko || f.hitstun > 0 || f.knockdown > 0) return;
      // Check if standing in front of a Subway Stair or Office Elevator!
      if (f.y === 0 && f.floorSwitchCd <= 0) {
        for (const c of this.connectors) {
          if (Math.abs(f.x - c.x) < 62 && (f.floor === c.from || f.floor === c.to)) {
            f.floor = (f.floor === c.from) ? c.to : c.from;
            f.floorSwitchCd = 0.55;
            this.game.sfx.subway();
            const names = this.getFloorNames();
            this.spawnPopup(f.x, -95, names[f.floor], '#38bdf8', 0.85, f.floor);
            return;
          }
        }
      }
      // Otherwise perform classic Street Fighter Jump!
      if (f.y === 0) {
        f.vy = -660;
        this.game.sfx.dash();
      }
    }

    startDash(f) {
      if (f.ko || f.hitstun > 0 || f.knockdown > 0 || f.dashTimer > 0 || f.dashCd > 0) return;
      f.dashDir = f.facing;
      f.dashTimer = 0.16;
      f.dashCd = 0.58;
      f.invulnTimer = 0.16;
      this.game.sfx.dash();
      this.game.speedlineTimer = Math.max(this.game.speedlineTimer, 0.16);
    }

    startAttack(f, type) {
      if (f.ko || f.hitstun > 0 || f.knockdown > 0 || f.attackTimer > 0 || f.cooldown > 0) return;
      if (type === 'punch') {
        f.comboStep = f.comboTimer > 0 ? ((f.comboStep + 1) % 3) : 0;
        f.comboTimer = 0.65;
        f.attackType = 'punch';
        f.attackDuration = 0.19;
        f.attackTimer = 0.19;
        f.cooldown = 0.06;
      } else if (type === 'sweep') {
        f.attackType = 'sweep';
        f.attackDuration = 0.30;
        f.attackTimer = 0.30;
        f.cooldown = 0.16;
      } else {
        f.attackType = 'kick';
        f.attackDuration = 0.27;
        f.attackTimer = 0.27;
        f.cooldown = 0.13;
      }
      f.attackHit = false;
      this.game.sfx.punchSwing();
    }

    startSpecial(f) {
      if (f.ko || f.hitstun > 0 || f.knockdown > 0 || f.attackTimer > 0) return;

      // ULTRA PETTY SUPER ART when Super Meter == 100%!
      if (f.superMeter >= 100) {
        f.superMeter = 0;
        f.attackType = 'super';
        f.attackDuration = 0.52;
        f.attackTimer = 0.52;
        f.invulnTimer = 0.45;
        f.attackHit = false;
        this.game.sfx.ultraSuper();
        this.game.speedlineTimer = 0.7;
        this.game.screenFlash = 0.4;
        this.game.flashColor = 'rgba(255, 225, 53, ';
        this.shake = 16;
        this.say(f, SG.t('superBanner'), 1.8);
        this.game.showBanner(SG.t('superBanner'), f.name, 1.5);
        // Launch giant 3-hit Mega Hadouken Barrage!
        for (let i = 0; i < 3; i++) {
          this.projectiles.push({
            owner: f,
            x: f.x + f.facing * (35 + i * 34),
            y: -46,
            vx: f.facing * (660 + i * 40),
            floor: f.floor,
            r: 26,
            color: '#ffe135',
            dmg: Math.round(18 * f.powerMult),
            life: 1.1,
            heavy: true
          });
        }
        return;
      }

      if (f.specialCd > 0) return;
      if (f.isPlayer && f.grudge < 40) {
        this.say(f, SG.currentLang === 'tr' ? 'Öfkem yetmiyor! (>%40)' : 'Not mad enough! (>40%)', 1.5);
        return;
      }

      f.specialCd = 2.1;
      // Holding UP or jumping -> SHORYUKEN RISING UPPERCUT!
      const holdingUp = f.playerNum === 1
        ? (this.game.keys['KeyW'] || (!this.is2P && this.game.keys['ArrowUp']))
        : (f.playerNum === 2 && this.game.keys['ArrowUp']);

      if (holdingUp || f.y < -10 || f.specialKind === 'cyclone') {
        f.attackType = 'uppercut';
        f.attackDuration = 0.40;
        f.attackTimer = 0.40;
        f.attackHit = false;
        f.vy = -560;
        f.vx = f.facing * 260;
        f.invulnTimer = 0.25;
        this.game.sfx.special();
        this.say(f, 'SHORYU-KİN!!', 1.2);
        this.shake = 9;
      } else {
        // Classic Street Fighter HADOUKEN Energy Wave!
        f.attackType = 'fireball';
        f.attackDuration = 0.34;
        f.attackTimer = 0.34;
        f.attackHit = true;
        this.game.sfx.special();
        this.say(f, f.specialName, 1.2);
        this.projectiles.push({
          owner: f,
          x: f.x + f.facing * 42,
          y: -48,
          vx: f.facing * 590,
          floor: f.floor,
          r: 22,
          color: f.specialColor,
          dmg: Math.round(22 * f.powerMult * (f.grudge >= 70 ? 1.35 : 1)),
          life: 1.05,
          heavy: false
        });
      }
    }

    shout(shouter, target) {
      if (shouter.ko || shouter.shoutCd > 0) return;
      shouter.shoutCd = 2.6;
      const lines = SG.t('playerShoutLines');
      this.say(shouter, lines[Math.floor(Math.random() * lines.length)], 2.0);
      this.game.sfx.shout();
      shouter.grudge = Math.min(100, shouter.grudge + 3);
      if (target && !target.ko) {
        const dirTr = target.x > shouter.x ? 'SAĞDA →' : '← SOLDA';
        const flNames = this.getFloorNames();
        const distM = Math.round(Math.abs(target.x - shouter.x) / 10);
        this.game.showSoundCue(`♪ ${target.short}: ${distM}m ${dirTr} • ${flNames[target.floor]}`);
        if (!target.isPlayer) {
          target.aiState = SG.AI_STATES.SEARCH;
          this.say(target, target.taunts[Math.floor(Math.random() * target.taunts.length)], 2.0);
        }
      }
    }

    spawnPopup(x, y, text, color, scale, floor) {
      this.popups.push({ x, y, vy: -58, text, color, scale, floor, life: 0.9, maxLife: 0.9 });
    }

    spawnParticles(x, y, color, count, floor) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 90 + Math.random() * 220;
        this.particles.push({
          x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 60,
          color, size: 4 + Math.random() * 4, floor, life: 0.35 + Math.random() * 0.25, maxLife: 0.6
        });
      }
    }

    applyHit(attacker, defender, type, customDmg = null) {
      if (defender.ko || defender.invulnTimer > 0 || attacker.floor !== defender.floor) return;

      const mult = attacker.powerMult * (attacker.grudge >= 70 ? 1.35 : (attacker.grudge < 35 ? 0.75 : 1.0));
      let dmg = customDmg !== null ? customDmg : Math.round((type === 'punch' ? 10 : (type === 'uppercut' ? 22 : 16)) * mult);

      // PERFECT PARRY CHECK!
      if (defender.blocking && defender.parryWindow > 0) {
        this.game.sfx.parry();
        this.game.hitstop = 0.09;
        this.game.screenFlash = 0.28;
        this.game.flashColor = 'rgba(255, 225, 53, ';
        defender.grudge = Math.min(100, defender.grudge + 12);
        defender.superMeter = Math.min(100, defender.superMeter + 24);
        attacker.hitstun = 0.55;
        attacker.vx = -attacker.facing * 240;
        this.spawnPopup(defender.x, defender.y - 95, 'PARRY!!', '#ffe135', 1.35, defender.floor);
        this.spawnParticles(defender.x, defender.y - 50, '#ffe135', 16, defender.floor);
        return;
      }

      // Guard / Block check (Sweeps hit low unless crouching block!)
      const blocked = defender.blocking && !(type === 'sweep' && !defender.crouching);
      if (blocked) {
        dmg = Math.max(2, Math.round(dmg * 0.22));
        this.game.sfx.block();
        defender.vx = attacker.facing * 140;
        this.spawnPopup(defender.x, defender.y - 85, 'BLOCK!', '#38bdf8', 0.95, defender.floor);
        this.spawnParticles(defender.x, defender.y - 50, '#93c5fd', 8, defender.floor);
      } else {
        const heavy = (type === 'kick' || type === 'sweep' || type === 'uppercut' || type === 'super' || attacker.comboStep === 2);
        if (heavy) {
          this.game.sfx.hitHeavy();
          this.shake = 12;
          this.game.hitstop = 0.06;
          const words = ['WHAM!!', 'KRAK!!', 'SMASH!!', 'POW!!'];
          this.spawnPopup(defender.x, defender.y - 92, words[Math.floor(Math.random() * words.length)], '#ffe135', 1.3, defender.floor);
        } else {
          this.game.sfx.hitLight();
          this.shake = 6;
          this.game.hitstop = 0.032;
          this.spawnPopup(defender.x, defender.y - 84, 'POW!', '#fb923c', 1.0, defender.floor);
        }
        this.spawnParticles(defender.x, defender.y - 50, '#fde047', 12, defender.floor);
        defender.hitstun = heavy ? 0.34 : 0.20;
        defender.vx = attacker.facing * (heavy ? 360 : 170);
        if (type === 'uppercut' || type === 'sweep') {
          defender.vy = type === 'uppercut' ? -460 : -240;
          defender.knockdown = 0.55;
        }
      }

      defender.hp = Math.max(0, defender.hp - dmg);
      defender.flashTimer = 0.14;
      attacker.grudge = Math.min(100, attacker.grudge + 3.5);
      attacker.superMeter = Math.min(100, attacker.superMeter + (blocked ? 6 : 16));
      defender.superMeter = Math.min(100, defender.superMeter + 10);

      if (attacker.playerNum === 1) {
        this.game.comboCount++;
        this.game.comboTimer = 2.0;
        this.game.score += dmg * 15 * Math.min(5, this.game.comboCount);
      }

      if (defender.hp <= 0) {
        defender.ko = true;
        this.game.hitstop = 0.18;
        this.shake = 18;
        this.game.screenFlash = 0.45;
        this.game.sfx.koFanfare();
        this.game.showBanner('K.O.!!', `${attacker.name} WINS!`, 2.2);
        setTimeout(() => {
          if (!this.game.gameOver) {
            if (this.is2P) this.game.endDay(attacker === this.p1 ? 'p1_win' : 'p2_win');
            else this.game.endDay(attacker === this.p1 ? 'victory' : 'defeat');
          }
        }, 1250);
      }
    }

    update(dt) {
      if (!this.active) return;
      this.roundTime += dt;
      this.shake = Math.max(0, this.shake - dt * 36);
      this.mergeFlash = Math.max(0, this.mergeFlash - dt);

      // Update background street cars & subway train
      this.subwayTrainX += 760 * dt;
      if (this.subwayTrainX > STAGE_W + 900) this.subwayTrainX = -900;
      for (const c of this.bgCars) {
        c.x += c.dir * c.speed * dt;
        if (c.x > STAGE_W + 140) c.x = -140;
        if (c.x < -140) c.x = STAGE_W + 140;
      }
      for (const ped of this.peds) {
        ped.phase += dt * 7;
        ped.x += ped.dir * ped.speed * dt;
        if (ped.x < 120 || ped.x > STAGE_W - 120) ped.dir *= -1;
      }

      this.updateFighter(this.p1, this.p2, dt);
      if (this.is2P) this.updateFighter(this.p2, this.p1, dt);
      else this.updateAiRival(this.p2, this.p1, dt);

      // Check Split-Screen <-> Merged Street Fighter Arena transition!
      const sameFloor = this.p1.floor === this.p2.floor;
      const distX = Math.abs(this.p1.x - this.p2.x);
      const mergeRange = Math.min(540, this.game.viewW * 0.62);

      if (sameFloor && distX <= mergeRange) {
        if (!this.merged) {
          this.merged = true;
          this.mergeFlash = 0.55;
          this.shake = 12;
          this.game.sfx.challenger();
          if (!this.mergedEver) {
            this.mergedEver = true;
            this.game.showBanner(SG.t('mergedBanner'), SG.t('mergedSub'), 2.1);
          }
        }
        // Auto-face each other in true Street Fighter combat!
        if (this.p1.attackTimer <= 0 && this.p1.dashTimer <= 0) {
          this.p1.facing = this.p2.x >= this.p1.x ? 1 : -1;
        }
        if (this.p2.attackTimer <= 0 && this.p2.dashTimer <= 0) {
          this.p2.facing = this.p1.x >= this.p2.x ? 1 : -1;
        }
        const midX = (this.p1.x + this.p2.x) / 2;
        this.camMergedX += (midX - this.camMergedX) * Math.min(1, dt * 10);
      } else {
        this.merged = false;
        this.cam1X += (this.p1.x - this.cam1X) * Math.min(1, dt * 9);
        this.cam2X += (this.p2.x - this.cam2X) * Math.min(1, dt * 9);
      }

      // Adaptive BGM intensity!
      const musicMode = this.merged ? 'combat' : (this.p1.grudge < 30 ? 'chill' : 'explore');
      this.game.sfx.updateMusic(dt, musicMode);

      // Update props (hydrant water & espresso kiosks)
      for (const pr of this.props) {
        if (pr.cd > 0) pr.cd = Math.max(0, pr.cd - dt);
        if (pr.type === 'hydrant' && pr.broken && pr.sprayTimer > 0) {
          pr.sprayTimer -= dt;
          if (Math.random() < dt * 24) {
            this.particles.push({
              x: pr.x, y: -24, vx: (Math.random() - 0.5) * 90, vy: -260 - Math.random() * 140,
              color: '#38bdf8', size: 5, floor: pr.floor, life: 0.45, maxLife: 0.45
            });
          }
        }
        if (pr.type === 'espresso' && pr.cd <= 0) {
          for (const f of [this.p1, this.p2]) {
            if (!f.ko && f.floor === pr.floor && Math.abs(f.x - pr.x) < 55) {
              pr.cd = 16;
              f.grudge = Math.min(100, f.grudge + 24);
              f.caffeineTimer = 5.5;
              this.game.sfx.pickup();
              this.spawnPopup(f.x, -100, '+24% GRUDGE! ☕', '#f97316', 1.15, f.floor);
            }
          }
        }
      }

      // Projectiles (Hadoukens & Ultra Beams!)
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.x += pr.vx * dt;
        pr.life -= dt;
        if (Math.random() < dt * 35) {
          this.particles.push({
            x: pr.x, y: pr.y, vx: -pr.vx * 0.15, vy: (Math.random() - 0.5) * 40,
            color: pr.color, size: 5, floor: pr.floor, life: 0.2, maxLife: 0.2
          });
        }
        const target = pr.owner === this.p1 ? this.p2 : this.p1;
        if (!target.ko && target.floor === pr.floor && Math.abs(target.x - pr.x) < pr.r + 24) {
          const targetTop = target.y - (target.crouching ? 48 : 88);
          const targetBot = target.y;
          if (pr.y >= targetTop && pr.y <= targetBot) {
            this.applyHit(pr.owner, target, pr.heavy ? 'super' : 'fireball', pr.dmg);
            this.spawnParticles(pr.x, pr.y, pr.color, 14, pr.floor);
            this.projectiles.splice(i, 1);
            continue;
          }
        }
        if (pr.life <= 0 || pr.x < 0 || pr.x > STAGE_W) this.projectiles.splice(i, 1);
      }

      // Particles & Popups
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 420 * dt; pt.life -= dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.popups.length - 1; i >= 0; i--) {
        const pp = this.popups[i];
        pp.y += pp.vy * dt; pp.life -= dt;
        if (pp.life <= 0) this.popups.splice(i, 1);
      }
    }

    updateFighter(f, opponent, dt) {
      f.cooldown = Math.max(0, f.cooldown - dt);
      f.specialCd = Math.max(0, f.specialCd - dt);
      f.dashCd = Math.max(0, f.dashCd - dt);
      f.comboTimer = Math.max(0, f.comboTimer - dt);
      f.hitstun = Math.max(0, f.hitstun - dt);
      f.knockdown = Math.max(0, f.knockdown - dt);
      f.flashTimer = Math.max(0, f.flashTimer - dt);
      f.invulnTimer = Math.max(0, f.invulnTimer - dt);
      f.speechTimer = Math.max(0, f.speechTimer - dt);
      f.shoutCd = Math.max(0, f.shoutCd - dt);
      f.floorSwitchCd = Math.max(0, f.floorSwitchCd - dt);
      f.caffeineTimer = Math.max(0, f.caffeineTimer - dt);
      f.parryWindow = Math.max(0, f.parryWindow - dt);

      if (f.playerNum === 1 && this.game.comboTimer > 0) {
        this.game.comboTimer -= dt;
        if (this.game.comboTimer <= 0) this.game.comboCount = 0;
      }

      if (f.ko) {
        this.applyPhysics(f, dt);
        return;
      }

      // Player input (only for human-controlled fighters)
      if (f.isPlayer) {
        const keys = this.game.keys;
        let moveX = 0;
        let crouch = false;
        let block = false;

        if (!this.is2P) {
          if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
          if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;
          crouch = !!(keys['KeyS'] || keys['ArrowDown']);
          block = !!(keys['KeyL'] || keys['ShiftLeft'] || keys['ShiftRight']);
        } else if (f.playerNum === 1) {
          if (keys['KeyA']) moveX -= 1;
          if (keys['KeyD']) moveX += 1;
          crouch = !!keys['KeyS'];
          block = !!keys['KeyH'];
        } else {
          if (keys['ArrowLeft']) moveX -= 1;
          if (keys['ArrowRight']) moveX += 1;
          crouch = !!keys['ArrowDown'];
          block = !!keys['KeyL'];
        }

        f.crouching = crouch && f.y === 0 && f.attackTimer <= 0;
        if (block && !f.wasBlocking && f.attackTimer <= 0) {
          f.parryWindow = 0.22; // Fresh block tap triggers Perfect Parry window!
        }
        f.wasBlocking = block;
        f.blocking = block && f.attackTimer <= 0 && f.dashTimer <= 0;

        if (f.hitstun <= 0 && f.knockdown <= 0 && f.dashTimer <= 0) {
          const spd = (f.caffeineTimer > 0 ? f.speed * 1.25 : f.speed) * (f.blocking ? 0.3 : (f.crouching ? 0.2 : (f.attackTimer > 0 ? 0.25 : 1)));
          if (moveX !== 0) {
            f.x += moveX * spd * dt;
            if (!this.merged) f.facing = moveX > 0 ? 1 : -1;
            f.walkCycle += dt * 13;
            this.game.walkedDist += Math.abs(moveX * spd * dt);
          }
        }
      }

      if (f.dashTimer > 0) {
        f.dashTimer -= dt;
        f.x += f.dashDir * 680 * dt;
      }

      this.applyPhysics(f, dt);

      // Melee Attack Hitbox Check!
      if (f.attackTimer > 0) {
        f.attackTimer -= dt;
        if (!f.attackHit && f.attackTimer <= f.attackDuration * 0.6) {
          f.attackHit = true;
          const reach = f.attackType === 'kick' || f.attackType === 'sweep' ? 88 : 74;
          if (opponent && !opponent.ko && opponent.floor === f.floor) {
            const dx = (opponent.x - f.x) * f.facing;
            const dy = Math.abs(opponent.y - f.y);
            if (dx > -16 && dx <= reach && dy < 72) {
              this.applyHit(f, opponent, f.attackType);
            }
          }
          // Hit street props (hydrants & trash cans)
          for (const pr of this.props) {
            if (pr.broken || pr.floor !== f.floor) continue;
            if ((pr.type === 'hydrant' || pr.type === 'trash') && Math.abs(pr.x - (f.x + f.facing * 45)) < 48) {
              pr.broken = true;
              this.game.propsSmashed++;
              this.game.score += 150;
              if (pr.type === 'hydrant') {
                pr.sprayTimer = 12;
                this.game.sfx.hydrant();
                this.spawnPopup(pr.x, -60, 'SPLASH!!', '#38bdf8', 1.1, pr.floor);
              } else {
                this.game.sfx.trashCan();
                f.grudge = Math.min(100, f.grudge + 12);
                f.hp = Math.min(f.maxHp, f.hp + 14);
                this.spawnPopup(pr.x, -60, '+12% GRUDGE! ☕', '#f97316', 1.0, pr.floor);
              }
            }
          }
        }
      }

      // GRUDGE / CALMING DOWN DRAIN!
      const drainRate = this.merged ? 0.25 : 1.50;
      f.grudge = Math.max(0, f.grudge - drainRate * dt);

      if (f.grudge < 35 && f.grudge > 0) {
        f.mutterTimer -= dt;
        if (f.mutterTimer <= 0 && f.speechTimer <= 0) {
          f.mutterTimer = 4.0;
          const lines = SG.t('playerLowGrudgeLines');
          this.say(f, lines[Math.floor(Math.random() * lines.length)], 2.3);
        }
      }

      // GRUDGE HITS 0% -> FIGHT CANCELED ("FORGOT WHY YOU WERE MAD!")
      if (f.grudge <= 0 && !this.game.gameOver) {
        this.say(f, SG.currentLang === 'tr' ? 'Niye sinirlenmiştim ki? 🤷' : 'Wait... why was I mad? 🤷', 4.0);
        this.game.endDay('forgot');
      }
    }

    updateAiRival(r, p1, dt) {
      this.updateFighter(r, p1, dt);
      if (r.ko || r.hitstun > 0 || r.knockdown > 0) return;

      r.aiDecisionTimer -= dt;
      const dx = p1.x - r.x;
      const absDx = Math.abs(dx);

      if (!this.merged) {
        // AI walks LEFT (or toward player's floor/position!) while occasionally getting distracted!
        r.blocking = false;
        r.crouching = false;

        if (r.floor !== p1.floor) {
          r.aiState = SG.AI_STATES.SEARCH;
          // Find nearest connector that moves toward P1's floor
          let bestC = null, bestD = Infinity;
          for (const c of this.connectors) {
            const leadsCloser = (r.floor === c.from && Math.abs(c.to - p1.floor) < Math.abs(r.floor - p1.floor))
                             || (r.floor === c.to && Math.abs(c.from - p1.floor) < Math.abs(r.floor - p1.floor));
            if (leadsCloser) {
              const d = Math.abs(c.x - r.x);
              if (d < bestD) { bestD = d; bestC = c; }
            }
          }
          if (bestC) {
            if (bestD < 34 && r.floorSwitchCd <= 0) {
              this.tryUseConnectorOrJump(r);
            } else {
              const dir = bestC.x > r.x ? 1 : -1;
              r.facing = dir;
              r.x += dir * (r.speed * 0.72) * dt;
              r.walkCycle += dt * 10;
            }
          }
        } else {
          // Same floor: march LEFT (toward P1)!
          r.aiState = SG.AI_STATES.SEARCH;
          const dir = dx >= 0 ? 1 : -1;
          r.facing = dir;
          r.x += dir * (r.speed * 0.68) * dt;
          r.walkCycle += dt * 10;
        }
      } else {
        // MERGED STREET FIGHTER COMBAT AI!
        r.aiState = SG.AI_STATES.COMBAT;
        r.facing = dx >= 0 ? 1 : -1;

        if (r.aiDecisionTimer <= 0) {
          r.aiDecisionTimer = 0.35 + Math.random() * 0.45;
          r.blocking = p1.attackTimer > 0 && absDx < 120 && Math.random() < 0.45;
          if (!r.blocking) {
            if (absDx < 85) {
              const roll = Math.random();
              if (roll < 0.45) this.startAttack(r, 'punch');
              else if (roll < 0.75) this.startAttack(r, 'kick');
              else if (roll < 0.90) this.startAttack(r, 'sweep');
              else this.startSpecial(r);
            } else if (absDx > 160 && absDx < 360 && r.specialCd <= 0 && Math.random() < 0.38) {
              this.startSpecial(r);
            } else if (absDx > 140 && Math.random() < 0.22 && r.y === 0) {
              r.vy = -640; // Jump-in attack!
            }
          }
        }

        if (!r.blocking && r.attackTimer <= 0 && absDx > 68) {
          r.x += r.facing * (r.speed * 0.82) * dt;
          r.walkCycle += dt * 11;
        }
      }
    }

    applyPhysics(f, dt) {
      f.x += f.vx * dt;
      f.vx *= Math.pow(0.002, dt);
      f.x = Math.max(60, Math.min(STAGE_W - 60, f.x));

      if (f.y < 0 || f.vy !== 0) {
        f.y += f.vy * dt;
        f.vy += GRAVITY * dt;
        if (f.y >= 0) {
          f.y = 0;
          f.vy = 0;
        }
      }
    }

    /* =======================================================================
       SIDE-VIEW COMIC-BOOK STREET FIGHTER RENDERER (SPLIT-SCREEN + MERGED)
       ======================================================================= */
    render(ctx, vw, vh) {
      ctx.clearRect(0, 0, vw, vh);

      if (!this.merged) {
        const halfW = Math.floor(vw / 2);

        // LEFT SCREEN: P1 marching RIGHT (→)
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, halfW, vh);
        ctx.clip();
        this.renderSideViewport(ctx, 0, 0, halfW, vh, this.cam1X, this.p1.floor);
        this.drawScreenTag(ctx, 14, vh - 42, `SOL EKRAN: ${this.p1.short} →`, '#ffe135', '#dc2626');
        ctx.restore();

        // RIGHT SCREEN: Rival / P2 marching LEFT (←)
        ctx.save();
        ctx.beginPath();
        ctx.rect(halfW, 0, vw - halfW, vh);
        ctx.clip();
        this.renderSideViewport(ctx, halfW, 0, vw - halfW, vh, this.cam2X, this.p2.floor);
        this.drawScreenTag(ctx, vw - 224, vh - 42, `← SAĞ EKRAN: ${this.p2.short}`, '#38bdf8', '#1e3a8a');
        ctx.restore();

        // Bold Jagged Comic Split Divider + Live Distance Radar!
        ctx.fillStyle = '#111';
        ctx.fillRect(halfW - 4, 0, 8, vh);
        ctx.fillStyle = '#ffe135';
        ctx.fillRect(halfW - 1.5, 0, 3, vh);

        const distM = Math.round(Math.abs(this.p2.x - this.p1.x) / 10);
        const sameFl = this.p1.floor === this.p2.floor;
        const badgeW = 190, badgeH = 44;
        ctx.fillStyle = sameFl ? '#16a34a' : '#dc2626';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.fillRect(halfW - badgeW / 2, 118, badgeW, badgeH);
        ctx.strokeRect(halfW - badgeW / 2, 118, badgeW, badgeH);
        ctx.fillStyle = '#ffe135';
        ctx.font = '900 16px Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`MESAFE: ${distM}m`, halfW, 138);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px "Courier New", monospace';
        ctx.fillText(
          sameFl
            ? (SG.currentLang === 'tr' ? 'AYNI KATTASINIZ! YAKLAŞIN!' : 'SAME FLOOR! CLOSE IN!')
            : (SG.currentLang === 'tr' ? 'FARKLI KAT! [W] MERDİVEN/ASANSÖR' : 'DIFF FLOOR! [W] STAIRS/LIFT'),
          halfW, 154
        );
        ctx.textAlign = 'left';
      } else {
        // MERGED CLASSIC SINGLE-SCREEN STREET FIGHTER ARENA!
        this.renderSideViewport(ctx, 0, 0, vw, vh, this.camMergedX, this.p1.floor);
      }

      // Dynamic Time-of-Day atmosphere & Speedlines
      this.game.renderer.drawTimeOfDayOverlay(ctx, vw, vh, this.game.dayMinutes);
      if (this.game.speedlineTimer > 0) {
        this.game.renderer.drawComicSpeedlines(ctx, vw, vh, this.game.speedlineTimer);
      }

      if (this.mergeFlash > 0) {
        ctx.fillStyle = `rgba(255, 225, 53, ${this.mergeFlash * 0.7})`;
        ctx.fillRect(0, 0, vw, vh);
      }

      // Draw linear Side-View Radar Map in the bottom-right Minimap box!
      this.drawLinearMinimap();
    }

    drawScreenTag(ctx, x, y, text, bg, fg) {
      ctx.fillStyle = bg;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.fillRect(x, y, 210, 28);
      ctx.strokeRect(x, y, 210, 28);
      ctx.fillStyle = fg;
      ctx.font = '900 14px Impact, sans-serif';
      ctx.fillText(text, x + 10, y + 19);
    }

    renderSideViewport(ctx, vx, vy, vw, vh, camX, floor) {
      const sx = (Math.random() - 0.5) * this.shake;
      const sy = (Math.random() - 0.5) * this.shake;
      const groundScreenY = vy + Math.floor(vh * 0.77) + sy;

      ctx.save();
      // Sky / Tunnel / Office Wall Backdrop per Floor!
      if (floor === 0) {
        // FLOOR 0: UNDERGROUND METRO SUBWAY TUNNEL
        const g = ctx.createLinearGradient(0, vy, 0, groundScreenY);
        g.addColorStop(0, '#0f172a');
        g.addColorStop(1, '#1e293b');
        ctx.fillStyle = g;
        ctx.fillRect(vx, vy, vw, vh);

        // Subway wall tiles + flickering fluorescent lights (parallax)
        const tileOff = -(camX * 0.7) % 160;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = 2;
        for (let tx = vx + tileOff - 160; tx < vx + vw + 160; tx += 160) {
          ctx.fillStyle = '#334155';
          ctx.fillRect(tx, vy + 95, 148, groundScreenY - vy - 115);
          ctx.strokeRect(tx, vy + 95, 148, groundScreenY - vy - 115);
          // Fluorescent ceiling bar
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(tx + 35, vy + 105, 80, 8);
          // Metro stripe
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(tx, groundScreenY - 120, 160, 18);
        }

        // Passing Express Subway Train in Background!
        const trainScreenX = vx + vw / 2 + (this.subwayTrainX - camX);
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.fillRect(trainScreenX, groundScreenY - 155, 620, 120);
        ctx.strokeRect(trainScreenX, groundScreenY - 155, 620, 120);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(trainScreenX, groundScreenY - 82, 620, 16);
        for (let w = 0; w < 6; w++) {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(trainScreenX + 26 + w * 96, groundScreenY - 138, 66, 42);
          ctx.strokeRect(trainScreenX + 26 + w * 96, groundScreenY - 138, 66, 42);
        }

        // Subway concrete platform floor + yellow safety line
        ctx.fillStyle = '#475569';
        ctx.fillRect(vx, groundScreenY, vw, vh - groundScreenY);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(vx, groundScreenY, vw, 10);
      } else if (floor === 2) {
        // FLOOR 2: UPTOWN OFFICE SKYBRIDGE / GLASS ATRIUM
        const g = ctx.createLinearGradient(0, vy, 0, groundScreenY);
        g.addColorStop(0, '#38bdf8');
        g.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = g;
        ctx.fillRect(vx, vy, vw, vh);

        // Glass window mullions & skyline silhouettes
        const winOff = -(camX * 0.45) % 180;
        for (let wx = vx + winOff - 180; wx < vx + vw + 180; wx += 180) {
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(wx + 20, groundScreenY - 220, 75, 220);
          ctx.fillStyle = '#64748b';
          ctx.fillRect(wx + 100, groundScreenY - 165, 65, 165);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(wx, vy); ctx.lineTo(wx, groundScreenY); ctx.stroke();
        }
        // Polished office marble floor
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(vx, groundScreenY, vw, vh - groundScreenY);
        ctx.fillStyle = '#111';
        ctx.fillRect(vx, groundScreenY, vw, 5);
      } else {
        // FLOOR 1: CLASSIC STREET FIGHTER CITY STREET!
        const g = ctx.createLinearGradient(0, vy, 0, groundScreenY);
        g.addColorStop(0, '#0284c7');
        g.addColorStop(0.55, '#7dd3fc');
        g.addColorStop(1, '#fef3c7');
        ctx.fillStyle = g;
        ctx.fillRect(vx, vy, vw, vh);

        // Distant City Skyline Parallax
        const skyOff = -(camX * 0.25) % 240;
        for (let bx = vx + skyOff - 240; bx < vx + vw + 240; bx += 240) {
          ctx.fillStyle = '#334155';
          ctx.fillRect(bx, groundScreenY - 270, 95, 270);
          ctx.fillStyle = '#475569';
          ctx.fillRect(bx + 105, groundScreenY - 210, 115, 210);
        }

        // Foreground Iconic Comic Storefronts (Library, Ramen, Arcade, Coffee, Bank)
        const shops = [
          { col: '#d97706', name: 'CENTRAL LIBRARY' },
          { col: '#e11d48', name: 'DRAGON RAMEN' },
          { col: '#4f46e5', name: 'ARCADE 1991' },
          { col: '#0ea5e9', name: 'LATTE LAB' },
          { col: '#db2777', name: 'SNEAKER SHOP' },
          { col: '#0f766e', name: '24H BODEGA' }
        ];
        const shopW = 340;
        const startIdx = Math.max(0, Math.floor((camX - vw) / shopW));
        const endIdx = Math.min(Math.ceil(STAGE_W / shopW), Math.ceil((camX + vw) / shopW) + 1);
        for (let i = startIdx; i <= endIdx; i++) {
          const shop = shops[i % shops.length];
          const bx = vx + vw / 2 + (i * shopW - camX) + sx;
          ctx.fillStyle = shop.col;
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 3;
          ctx.fillRect(bx, groundScreenY - 195, shopW - 22, 195);
          ctx.strokeRect(bx, groundScreenY - 195, shopW - 22, 195);
          // Storefront Sign
          ctx.fillStyle = '#111';
          ctx.fillRect(bx + 24, groundScreenY - 172, shopW - 70, 32);
          ctx.fillStyle = '#ffe135';
          ctx.font = '900 16px Impact, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(shop.name, bx + (shopW - 22) / 2, groundScreenY - 150);
          ctx.textAlign = 'left';
          // Windows
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(bx + 26, groundScreenY - 115, 92, 72);
          ctx.strokeRect(bx + 26, groundScreenY - 115, 92, 72);
          ctx.fillRect(bx + 195, groundScreenY - 115, 92, 72);
          ctx.strokeRect(bx + 195, groundScreenY - 115, 92, 72);
        }

        // Background Street Cars zooming behind the sidewalk!
        for (const car of this.bgCars) {
          const cx = vx + vw / 2 + (car.x - camX) + sx;
          if (cx < vx - 120 || cx > vx + vw + 120) continue;
          ctx.fillStyle = car.color;
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 2.5;
          ctx.fillRect(cx - 46, groundScreenY - 46, 92, 34);
          ctx.strokeRect(cx - 46, groundScreenY - 46, 92, 34);
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(cx - 26, groundScreenY - 64, 52, 20);
          ctx.strokeRect(cx - 26, groundScreenY - 64, 52, 20);
          ctx.fillStyle = '#111';
          ctx.beginPath(); ctx.arc(cx - 26, groundScreenY - 12, 10, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + 26, groundScreenY - 12, 10, 0, Math.PI * 2); ctx.fill();
        }

        // Sidewalk + Asphalt Road foreground
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(vx, groundScreenY, vw, 34);
        ctx.fillStyle = '#334155';
        ctx.fillRect(vx, groundScreenY + 34, vw, vh - groundScreenY - 34);
        ctx.fillStyle = '#111';
        ctx.fillRect(vx, groundScreenY, vw, 4);
        ctx.fillRect(vx, groundScreenY + 34, vw, 4);
      }

      // Draw Stairs & Elevators on this floor!
      for (const c of this.connectors) {
        if (c.from !== floor && c.to !== floor) continue;
        const cx = vx + vw / 2 + (c.x - camX) + sx;
        if (cx < vx - 90 || cx > vx + vw + 90) continue;
        const goUp = floor === c.from;
        ctx.fillStyle = c.kind === 'metro' ? '#0284c7' : '#7c3aed';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.fillRect(cx - 42, groundScreenY - 108, 84, 108);
        ctx.strokeRect(cx - 42, groundScreenY - 108, 84, 108);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx - 32, groundScreenY - 94, 64, 94);
        ctx.fillStyle = '#ffe135';
        ctx.font = '900 12px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(goUp ? '▲ [W] YUKARI' : '▼ [W] AŞAĞI', cx, groundScreenY - 116);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px "Courier New", monospace';
        ctx.fillText(c.kind === 'metro' ? 'METRO' : 'ASANSÖR', cx, groundScreenY - 52);
        ctx.textAlign = 'left';
      }

      // Draw Floor Pedestrians
      for (const ped of this.peds) {
        if (ped.floor !== floor) continue;
        const px = vx + vw / 2 + (ped.x - camX) + sx;
        if (px < vx - 40 || px > vx + vw + 40) continue;
        ctx.fillStyle = ped.color;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.fillRect(px - 10, groundScreenY - 46, 20, 28);
        ctx.strokeRect(px - 10, groundScreenY - 46, 20, 28);
        ctx.fillStyle = '#f5cfa0';
        ctx.beginPath(); ctx.arc(px, groundScreenY - 56, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }

      // Draw Props on this floor (Hydrants, Trash Cans, Espresso Stands)
      for (const pr of this.props) {
        if (pr.floor !== floor) continue;
        const px = vx + vw / 2 + (pr.x - camX) + sx;
        if (px < vx - 60 || px > vx + vw + 60) continue;
        if (pr.type === 'hydrant') {
          ctx.fillStyle = pr.broken ? '#991b1b' : '#ef4444';
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 2.5;
          ctx.fillRect(px - 10, groundScreenY - (pr.broken ? 14 : 34), 20, pr.broken ? 14 : 34);
          ctx.strokeRect(px - 10, groundScreenY - (pr.broken ? 14 : 34), 20, pr.broken ? 14 : 34);
        } else if (pr.type === 'trash' && !pr.broken) {
          ctx.fillStyle = '#64748b';
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 2.5;
          ctx.fillRect(px - 15, groundScreenY - 38, 30, 38);
          ctx.strokeRect(px - 15, groundScreenY - 38, 30, 38);
        } else if (pr.type === 'espresso') {
          ctx.fillStyle = pr.cd <= 0 ? '#f97316' : '#64748b';
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 3;
          ctx.fillRect(px - 28, groundScreenY - 62, 56, 62);
          ctx.strokeRect(px - 28, groundScreenY - 62, 56, 62);
          ctx.fillStyle = '#ffe135';
          ctx.font = 'bold 11px "Courier New", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(pr.cd <= 0 ? '☕ ESPRESSO' : `${Math.ceil(pr.cd)}s`, px, groundScreenY - 70);
          ctx.textAlign = 'left';
        }
      }

      // Draw Fighters on this floor!
      if (this.p2.floor === floor) this.drawSideFighterSprite(ctx, this.p2, vx + vw / 2 + (this.p2.x - camX) + sx, groundScreenY);
      if (this.p1.floor === floor) this.drawSideFighterSprite(ctx, this.p1, vx + vw / 2 + (this.p1.x - camX) + sx, groundScreenY);

      // Draw Hadouken Projectiles
      for (const pr of this.projectiles) {
        if (pr.floor !== floor) continue;
        const px = vx + vw / 2 + (pr.x - camX) + sx;
        const py = groundScreenY + pr.y;
        ctx.fillStyle = pr.color;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, py, pr.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(px + (pr.vx > 0 ? 5 : -5), py, pr.r * 0.48, 0, Math.PI * 2); ctx.fill();
      }

      // Particles
      for (const pt of this.particles) {
        if (pt.floor !== floor) continue;
        const px = vx + vw / 2 + (pt.x - camX) + sx;
        const py = groundScreenY + pt.y;
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px, py, pt.size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      // Popups ("POW!", "PARRY!!", "KRAK!!")
      for (const pp of this.popups) {
        if (pp.floor !== floor) continue;
        const px = vx + vw / 2 + (pp.x - camX) + sx;
        const py = groundScreenY + pp.y;
        ctx.save();
        ctx.globalAlpha = Math.max(0, pp.life / pp.maxLife);
        ctx.font = `900 ${Math.round(26 * pp.scale)}px Impact, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#111';
        ctx.strokeText(pp.text, px, py);
        ctx.fillStyle = pp.color;
        ctx.fillText(pp.text, px, py);
        ctx.restore();
      }

      ctx.restore();
    }

    drawSideFighterSprite(ctx, f, sx, groundY) {
      const fy = groundY + f.y;
      ctx.save();

      // Ground shadow
      const shadowScale = Math.max(0.45, 1 + f.y / 280);
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(sx, groundY + 4, 26 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(sx, fy);

      // KO flat on floor
      if (f.ko) {
        ctx.fillStyle = f.giColor;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.fillRect(-44, -22, 88, 22);
        ctx.strokeRect(-44, -22, 88, 22);
        ctx.fillStyle = f.skinColor;
        ctx.beginPath(); ctx.arc(-44, -12, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
        return;
      }

      ctx.scale(f.facing, 1);

      const crouchOffset = f.crouching ? 24 : 0;
      const hitWhite = f.flashTimer > 0;
      const stride = Math.sin(f.walkCycle) * 14;

      // Fuming Rage Flame Aura when Grudge >= 70%
      if (f.grudge >= 70) {
        ctx.strokeStyle = f.playerNum === 2 ? 'rgba(56,189,248,0.65)' : 'rgba(239,68,68,0.65)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, -45 + crouchOffset * 0.5, 32, 48 - crouchOffset * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Legs
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.fillStyle = hitWhite ? '#fff' : f.giColor;
      // Back leg
      ctx.fillRect(-14 - stride * 0.6, -34 + crouchOffset * 0.4, 14, 34 - crouchOffset * 0.4);
      ctx.strokeRect(-14 - stride * 0.6, -34 + crouchOffset * 0.4, 14, 34 - crouchOffset * 0.4);

      // Front leg (extends during Kick / Sweep!)
      if (f.attackTimer > 0 && (f.attackType === 'kick' || f.attackType === 'sweep')) {
        const ky = f.attackType === 'sweep' ? -14 : -42;
        ctx.fillStyle = hitWhite ? '#fff' : f.trimColor;
        ctx.fillRect(6, ky, 52, 15);
        ctx.strokeRect(6, ky, 52, 15);
      } else {
        ctx.fillRect(2 + stride * 0.6, -34 + crouchOffset * 0.4, 14, 34 - crouchOffset * 0.4);
        ctx.strokeRect(2 + stride * 0.6, -34 + crouchOffset * 0.4, 14, 34 - crouchOffset * 0.4);
      }

      // Martial Arts Gi Torso
      ctx.fillStyle = hitWhite ? '#fff' : f.giColor;
      ctx.fillRect(-18, -72 + crouchOffset, 36, 42 - crouchOffset * 0.3);
      ctx.strokeRect(-18, -72 + crouchOffset, 36, 42 - crouchOffset * 0.3);

      // Belt
      ctx.fillStyle = f.trimColor;
      ctx.fillRect(-19, -40 + crouchOffset * 0.7, 38, 8);
      ctx.strokeRect(-19, -40 + crouchOffset * 0.7, 38, 8);

      // Head + Hair + Fluttering Headband
      const headY = -86 + crouchOffset;
      ctx.fillStyle = hitWhite ? '#fff' : f.skinColor;
      ctx.beginPath(); ctx.arc(2, headY, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.fillStyle = hitWhite ? '#fff' : f.hairColor;
      ctx.beginPath(); ctx.arc(0, headY - 4, 15, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Headband + trailing tails
      const flutter = Math.sin(performance.now() * 0.016) * 5;
      ctx.fillStyle = f.bandanaColor;
      ctx.fillRect(-13, headY - 7, 30, 6);
      ctx.strokeRect(-13, headY - 7, 30, 6);
      ctx.strokeStyle = f.bandanaColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-13, headY - 4);
      ctx.quadraticCurveTo(-26, headY - 2 + flutter, -38, headY + 4 + flutter);
      ctx.stroke();

      // Expressive Angry vs Sleepy Eyes!
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2.5;
      if (f.grudge >= 35) {
        // Furrowed Street Fighter angry brow!
        ctx.beginPath(); ctx.moveTo(6, headY - 2); ctx.lineTo(14, headY + 1); ctx.stroke();
      } else {
        // Sleepy/bored line when calming down!
        ctx.beginPath(); ctx.moveTo(6, headY + 1); ctx.lineTo(14, headY + 1); ctx.stroke();
      }

      // Punching / Uppercutting / Blocking Arms!
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      const gloveColor = hitWhite ? '#fff' : (f.playerNum === 1 ? '#ef4444' : (f.playerNum === 2 ? '#38bdf8' : '#f59e0b'));
      if (f.attackTimer > 0 && (f.attackType === 'punch' || f.attackType === 'fireball' || f.attackType === 'super')) {
        ctx.fillStyle = f.skinColor;
        ctx.fillRect(10, -64 + crouchOffset, 42, 12);
        ctx.strokeRect(10, -64 + crouchOffset, 42, 12);
        ctx.fillStyle = gloveColor;
        ctx.beginPath(); ctx.arc(54, -58 + crouchOffset, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (f.attackTimer > 0 && f.attackType === 'uppercut') {
        // Flaming Shoryuken Fist!
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(6, -118 + crouchOffset, 16, 54);
        ctx.strokeRect(6, -118 + crouchOffset, 16, 54);
        ctx.fillStyle = '#ffe135';
        ctx.beginPath(); ctx.arc(14, -122 + crouchOffset, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (f.blocking) {
        ctx.fillStyle = gloveColor;
        ctx.beginPath(); ctx.arc(18, -62 + crouchOffset, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = f.parryWindow > 0 ? '#ffe135' : '#38bdf8';
        ctx.lineWidth = f.parryWindow > 0 ? 6 : 4;
        ctx.beginPath();
        ctx.arc(22, -55 + crouchOffset, 28, -1.1, 1.1);
        ctx.stroke();
      } else {
        ctx.fillStyle = gloveColor;
        ctx.beginPath(); ctx.arc(18, -56 + crouchOffset, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }

      ctx.restore();

      // Speech bubble (unflipped!)
      if (f.speechTimer > 0 && f.speech) {
        ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
        const tw = ctx.measureText(f.speech).width;
        const bw = tw + 18, bh = 24;
        const bx = sx - bw / 2, by = fy - 134;
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2.5;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = '#111';
        ctx.textAlign = 'center';
        ctx.fillText(f.speech, sx, by + 16);
        ctx.textAlign = 'left';
      }
    }

    drawLinearMinimap() {
      const mctx = this.game.renderer.miniCtx;
      const mw = this.game.renderer.miniCanvas.width;
      const mh = this.game.renderer.miniCanvas.height;
      mctx.clearRect(0, 0, mw, mh);

      // 3 Horizontal Floor Bands (Top = Fl 2 Office, Mid = Fl 1 Street, Bot = Fl 0 Metro)
      const bandH = mh / 3;
      const colors = ['#1e3a5f', '#334155', '#0f172a']; // Fl 2, Fl 1, Fl 0
      const labels = ['FL2 OFİS', 'FL1 SOKAK', 'FL0 METRO'];
      for (let i = 0; i < 3; i++) {
        mctx.fillStyle = colors[i];
        mctx.fillRect(0, i * bandH, mw, bandH);
        mctx.strokeStyle = '#475569';
        mctx.strokeRect(0, i * bandH, mw, bandH);
        mctx.fillStyle = 'rgba(255,255,255,0.45)';
        mctx.font = 'bold 8px "Courier New", monospace';
        mctx.fillText(labels[i], 4, i * bandH + 11);
      }

      const floorToY = (fl) => (2 - fl) * bandH + bandH * 0.58;
      // Connectors as vertical cyan/purple ticks
      for (const c of this.connectors) {
        const cx = (c.x / STAGE_W) * mw;
        mctx.strokeStyle = c.kind === 'metro' ? '#38bdf8' : '#c084fc';
        mctx.lineWidth = 2;
        mctx.beginPath();
        mctx.moveTo(cx, floorToY(c.from));
        mctx.lineTo(cx, floorToY(c.to));
        mctx.stroke();
      }

      // P1 Yellow Dot & P2/Rival Red Dot
      const drawDot = (f, col) => {
        const dx = (f.x / STAGE_W) * mw;
        const dy = floorToY(f.floor);
        mctx.fillStyle = col;
        mctx.strokeStyle = '#111';
        mctx.lineWidth = 1.5;
        mctx.beginPath(); mctx.arc(dx, dy, 5, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
      };
      drawDot(this.p2, '#ef4444');
      drawDot(this.p1, '#ffe135');
    }
  }

  SG.SideFighterEngine = SideFighterEngine;
})(window.StreetGrudge);
