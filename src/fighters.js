/**
 * Street Grudge — Fighter Entity & Character-Specific Special Attack Archetypes
 */
window.StreetGrudge = window.StreetGrudge || {};

(function (SG) {
  'use strict';

  class Fighter {
    constructor(cfg) {
      this.id = cfg.id;
      this.name = cfg.name;
      this.isPlayer = !!cfg.isPlayer;
      this.playerNum = cfg.playerNum || 0; // 1 for P1, 2 for P2, 0 for AI
      this.x = cfg.x;
      this.y = cfg.y;
      this.vx = 0;
      this.vy = 0;
      this.angle = 0;
      this.r = cfg.r || 20;
      this.maxHp = cfg.maxHp || 120;
      this.hp = this.maxHp;
      this.speed = cfg.speed || 235;
      this.giColor = cfg.giColor || '#f8fafc';
      this.trimColor = cfg.trimColor || '#dc2626';
      this.skinColor = cfg.skinColor || '#f5cfa0';
      this.hairColor = cfg.hairColor || '#1e1b18';
      this.bandanaColor = cfg.bandanaColor || '#ef4444';
      this.specialKind = cfg.specialKind || 'fireball';
      this.specialName = cfg.specialName || 'PETTY HADOU-WAVE!';
      this.specialColor = cfg.specialColor || '#f97316';
      this.taunts = cfg.taunts || [];

      // Signature Grudge / Calming Down Meter (0..100)
      this.grudge = 100;
      this.ko = false;
      this.koTimer = 0;

      // Combat State
      this.attackType = null; // 'punch' | 'kick' | 'special'
      this.attackTimer = 0;
      this.attackDuration = 0;
      this.attackHitApplied = false;
      this.comboStep = 0;
      this.comboResetTimer = 0;
      this.attackCooldown = 0;
      this.specialCooldown = 0;
      this.dashTimer = 0;
      this.dashCooldown = 0;
      this.dashDirX = 0;
      this.dashDirY = 0;
      this.spinAngle = 0;
      this.blocking = false;
      this.hitstun = 0;
      this.flashTimer = 0;
      this.invulnTimer = 0;
      this.walkCycle = 0;
      this.subwayCooldown = 0;
      this.lowGrudgeMutterTimer = 3.5;

      // Speech Bubble
      this.speech = '';
      this.speechTimer = 0;
      this.shoutCooldown = 0;

      // AI Finite State Machine (for Rival AI)
      this.aiState = SG.AI_STATES.WANDER;
      this.aiTimer = 0;
      this.homeX = cfg.x;
      this.homeY = cfg.y;
      this.targetX = cfg.x;
      this.targetY = cfg.y;
      this.investigateX = 0;
      this.investigateY = 0;
      this.aiAttackDelay = 0.5;
      this.aiStrafeDir = Math.random() < 0.5 ? 1 : -1;
      this.aiCalmRate = 0.48 + Math.random() * 0.25;
      this.spawnLabel = '';
    }

    say(text, duration = 2.6) {
      this.speech = text;
      this.speechTimer = duration;
    }

    getDamageMultiplier() {
      if (this.grudge >= 70) return 1.35;
      if (this.grudge >= 35) return 1.0;
      return 0.75;
    }

    startAttack(type, game) {
      if (this.ko || this.hitstun > 0 || this.attackTimer > 0 || this.attackCooldown > 0 || this.dashTimer > 0) {
        return false;
      }

      if (type === 'special') {
        if (this.specialCooldown > 0) return false;
        if (this.isPlayer && this.grudge < 40) {
          this.say(SG.currentLang === 'tr' ? 'Öfkem yetmiyor! (>%40)' : 'Not mad enough! (>40%)', 1.6);
          return false;
        }
        this.attackType = 'special';
        this.attackDuration = 0.44;
        this.attackTimer = 0.44;
        this.attackCooldown = 0.24;
        this.specialCooldown = this.isPlayer ? 2.6 : 4.6;
        this.attackHitApplied = false;
        this.say(this.specialName, 1.35);
        game.executeCharacterSpecial(this);
        return true;
      }

      if (type === 'punch') {
        this.comboStep = (this.comboResetTimer > 0) ? ((this.comboStep + 1) % 3) : 0;
        this.comboResetTimer = 0.65;
        this.attackType = 'punch';
        this.attackDuration = 0.19;
        this.attackTimer = 0.19;
        this.attackCooldown = 0.08;
        this.attackHitApplied = false;
        game.sfx.punchSwing();
        return true;
      }

      if (type === 'kick') {
        this.attackType = 'kick';
        this.attackDuration = 0.28;
        this.attackTimer = 0.28;
        this.attackCooldown = 0.16;
        this.attackHitApplied = false;
        game.sfx.punchSwing();
        return true;
      }

      return false;
    }

    startDash(dirX, dirY, game) {
      if (this.ko || this.hitstun > 0 || this.dashTimer > 0 || this.dashCooldown > 0) return false;
      const len = Math.hypot(dirX, dirY);
      this.dashDirX = len > 0.01 ? dirX / len : Math.cos(this.angle);
      this.dashDirY = len > 0.01 ? dirY / len : Math.sin(this.angle);
      this.dashTimer = 0.16;
      this.dashCooldown = 0.62;
      this.invulnTimer = 0.18;
      game.sfx.dash();
      return true;
    }
  }

  SG.Fighter = Fighter;
})(window.StreetGrudge);
