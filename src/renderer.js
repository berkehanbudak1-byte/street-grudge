/**
 * Street Grudge — Cel-Shaded Comic-Book 2D Top-Down Renderer
 * Supports single-screen camera AND automatic 2P split-screen -> merged brawl camera!
 */
window.StreetGrudge = window.StreetGrudge || {};

(function (SG) {
  'use strict';

  class ComicRenderer {
    constructor(canvas, miniCanvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.miniCanvas = miniCanvas;
      this.miniCtx = miniCanvas.getContext('2d');
    }

    render(game) {
      const ctx = this.ctx;
      const vw = game.viewW;
      const vh = game.viewH;
      ctx.clearRect(0, 0, vw, vh);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, vw, vh);

      if (game.running && game.mode === '2p' && game.isSplitScreen) {
        const halfW = Math.floor(vw / 2);

        // Left Viewport: Player 1
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, halfW, vh);
        ctx.clip();
        this.renderWorldViewport(ctx, game, game.cam1, 0, 0, halfW, vh);
        this.drawViewportBadge(ctx, 14, vh - 36, 'P1 CAM', '#ffe135', '#dc2626');
        ctx.restore();

        // Right Viewport: Player 2
        ctx.save();
        ctx.beginPath();
        ctx.rect(halfW, 0, vw - halfW, vh);
        ctx.clip();
        this.renderWorldViewport(ctx, game, game.cam2, halfW, 0, vw - halfW, vh);
        this.drawViewportBadge(ctx, vw - 98, vh - 36, 'P2 CAM', '#38bdf8', '#1d4ed8');
        ctx.restore();

        // Bold Comic Ink Split-Screen Divider
        ctx.fillStyle = '#111111';
        ctx.fillRect(halfW - 3, 0, 6, vh);
        ctx.fillStyle = '#ffe135';
        ctx.fillRect(halfW - 1, 0, 2, vh);
      } else {
        this.renderWorldViewport(ctx, game, game.cam, 0, 0, vw, vh);
      }

      if (game.running && game.player) {
        if (game.mode === '1p') {
          this.drawOffscreenRivalPointers(ctx, game);
        }
        this.drawMinimap(game);
      }

      // Subway Express Animated Comic Overlay
      if (game.subwayOverlayTimer > 0) {
        this.drawSubwayExpressTransition(ctx, vw, vh, game.subwayOverlayTimer);
      }

      // KO / Hit White Comic Flash
      if (game.screenFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${game.screenFlash * 0.65})`;
        ctx.fillRect(0, 0, vw, vh);
      }
    }

    drawViewportBadge(ctx, x, y, label, bg, fg) {
      ctx.fillStyle = bg;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2.5;
      ctx.fillRect(x, y, 82, 24);
      ctx.strokeRect(x, y, 82, 24);
      ctx.fillStyle = fg;
      ctx.font = '900 13px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + 41, y + 17);
      ctx.textAlign = 'left';
    }

    drawSubwayExpressTransition(ctx, vw, vh, timer) {
      const alpha = Math.min(1, timer * 2.5);
      ctx.save();
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, vh * 0.40, vw, vh * 0.20);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, vh * 0.40, vw, vh * 0.20);

      // Animated streaking subway train cars
      const progress = 1 - Math.min(1, timer / 0.65);
      const trainX = -320 + progress * (vw + 640);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.fillRect(trainX, vh * 0.43, 300, vh * 0.14);
      ctx.strokeRect(trainX, vh * 0.43, 300, vh * 0.14);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(trainX, vh * 0.49, 300, 12);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(trainX + 20 + i * 68, vh * 0.445, 48, 22);
        ctx.strokeRect(trainX + 20 + i * 68, vh * 0.445, 48, 22);
      }
      ctx.restore();
    }

    renderWorldViewport(ctx, game, cam, vx, vy, vw, vh) {
      ctx.save();
      const shakeX = (Math.random() - 0.5) * cam.shake;
      const shakeY = (Math.random() - 0.5) * cam.shake;
      ctx.translate(vx + vw / 2 + shakeX, vy + vh / 2 + shakeY);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      this.drawCityGround(ctx, game.world);
      this.drawRoadsAndTrafficLights(ctx, game.world);
      this.drawSubwaysAndElevators(ctx, game.world);
      this.drawProps(ctx, game.world);
      this.drawPickups(ctx, game.pickups);
      this.drawSoundRings(ctx, game.soundRings);
      this.drawAfterimages(ctx, game.afterimages);
      this.drawPedestrians(ctx, game.pedestrians);
      this.drawCars(ctx, game.cars);

      for (const r of game.rivals) this.drawFighter(ctx, r, game.showAiDebug);
      if (game.player2) this.drawFighter(ctx, game.player2, game.showAiDebug);
      if (game.player) this.drawFighter(ctx, game.player, game.showAiDebug);

      this.drawProjectiles(ctx, game.projectiles);
      this.drawBuildings3DRoof(ctx, game.world, cam);
      this.drawTrees(ctx, game.world);
      this.drawParticles(ctx, game.particles);
      this.drawSpeechBubbles(ctx, game);
      this.drawPopups(ctx, game.popups);

      ctx.restore();
    }

    drawCityGround(ctx, world) {
      ctx.fillStyle = '#d6d3d1';
      ctx.fillRect(0, 0, SG.DOWNTOWN_SPLIT_X, SG.WORLD_H);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(SG.DOWNTOWN_SPLIT_X, 0, SG.WORLD_W - SG.DOWNTOWN_SPLIT_X, SG.WORLD_H);

      ctx.strokeStyle = 'rgba(17, 17, 17, 0.08)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= SG.WORLD_W; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SG.WORLD_H); ctx.stroke();
      }
      for (let y = 0; y <= SG.WORLD_H; y += 64) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SG.WORLD_W, y); ctx.stroke();
      }

      // Uptown Marble Plaza + Animated Fountain
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.fillRect(1660, 1425, 435, 165);
      ctx.strokeRect(1660, 1425, 435, 165);

      const f = world.fountain;
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r - 8, 0, Math.PI * 2); ctx.fill();
      const ripple = (performance.now() * 0.03) % (f.r - 12);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, 6 + ripple, 0, Math.PI * 2); ctx.stroke();

      // Downtown Parking Lot
      ctx.fillStyle = '#475569';
      ctx.fillRect(1040, 1455, 335, 105);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      for (let x = 1070; x <= 1350; x += 70) {
        ctx.beginPath(); ctx.moveTo(x, 1465); ctx.lineTo(x, 1545); ctx.stroke();
      }

      // Library Back Alley
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(360, 575, 410, 100);
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillStyle = 'rgba(220, 38, 38, 0.55)';
      ctx.fillText('← LIBRARY ALLEY — NO LOITERING', 405, 632);

      // Street Floor Landmarks
      ctx.font = '900 13px "Courier New", monospace';
      ctx.textAlign = 'center';
      for (const lm of world.landmarks) {
        ctx.fillStyle = 'rgba(17, 17, 17, 0.42)';
        ctx.fillText(lm.name, lm.x, lm.y + 52);
      }
      ctx.textAlign = 'left';
    }

    drawRoadsAndTrafficLights(ctx, world) {
      ctx.fillStyle = '#334155';
      for (const hr of world.hRoads) {
        ctx.fillRect(0, hr.y, SG.WORLD_W, hr.h);
        ctx.fillStyle = '#111';
        ctx.fillRect(0, hr.y, SG.WORLD_W, 4);
        ctx.fillRect(0, hr.y + hr.h - 4, SG.WORLD_W, 4);
        ctx.fillStyle = '#334155';
      }
      for (const vr of world.vRoads) {
        ctx.fillRect(vr.x, 0, vr.w, SG.WORLD_H);
        ctx.fillStyle = '#111';
        ctx.fillRect(vr.x, 0, 4, SG.WORLD_H);
        ctx.fillRect(vr.x + vr.w - 4, 0, 4, SG.WORLD_H);
        ctx.fillStyle = '#334155';
      }

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.setLineDash([24, 20]);
      for (const hr of world.hRoads) {
        ctx.beginPath(); ctx.moveTo(0, hr.y + hr.h / 2); ctx.lineTo(SG.WORLD_W, hr.y + hr.h / 2); ctx.stroke();
      }
      for (const vr of world.vRoads) {
        ctx.beginPath(); ctx.moveTo(vr.x + vr.w / 2, 0); ctx.lineTo(vr.x + vr.w / 2, SG.WORLD_H); ctx.stroke();
      }
      ctx.setLineDash([]);

      for (const inter of world.intersections) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(inter.x + 4, inter.y + 4, inter.w - 8, inter.h - 8);
        ctx.fillStyle = '#f8fafc';
        for (let s = 16; s < inter.w - 16; s += 20) {
          ctx.fillRect(inter.x + s, inter.y - 14, 11, 16);
          ctx.fillRect(inter.x + s, inter.y + inter.h - 2, 11, 16);
        }
        for (let s = 16; s < inter.h - 16; s += 20) {
          ctx.fillRect(inter.x - 14, inter.y + s, 16, 11);
          ctx.fillRect(inter.x + inter.w - 2, inter.y + s, 16, 11);
        }
        const nsColor = world.trafficPhase === 0 ? '#22c55e' : (world.trafficPhase === 1 ? '#facc15' : '#ef4444');
        const ewColor = world.trafficPhase === 2 ? '#22c55e' : (world.trafficPhase === 3 ? '#facc15' : '#ef4444');
        this.drawTrafficLightPost(ctx, inter.x - 14, inter.y - 14, nsColor);
        this.drawTrafficLightPost(ctx, inter.x + inter.w + 14, inter.y + inter.h + 14, ewColor);
      }

      ctx.save();
      ctx.font = '900 18px Impact, sans-serif';
      ctx.fillStyle = 'rgba(255, 225, 53, 0.55)';
      ctx.translate(1530, 680);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('◄ DOWNTOWN   |   UPTOWN ►', -100, 6);
      ctx.restore();
    }

    drawTrafficLightPost(ctx, x, y, lightColor) {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = lightColor;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    }

    drawSubwaysAndElevators(ctx, world) {
      for (const sub of world.subways) {
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.fillRect(sub.x, sub.y, sub.w, sub.h);
        ctx.strokeRect(sub.x, sub.y, sub.w, sub.h);

        for (let i = 0; i < 6; i++) {
          const shade = 210 - i * 28;
          ctx.fillStyle = `rgb(${shade},${shade},${shade + 10})`;
          ctx.fillRect(sub.x + 8, sub.y + 8 + i * 13, sub.w - 16, 10);
        }

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(sub.x - 4, sub.y - 20, sub.w + 8, 22);
        ctx.strokeRect(sub.x - 4, sub.y - 20, sub.w + 8, 22);
        ctx.fillStyle = '#ffe135';
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`M ${sub.name}`, sub.x + sub.w / 2, sub.y - 5);
        ctx.fillStyle = '#0284c7';
        ctx.font = 'bold 10px "Courier New", monospace';
        ctx.fillText('WALK IN: EXPRESS LINE', sub.x + sub.w / 2, sub.y + sub.h + 14);
        ctx.textAlign = 'left';
      }

      for (const el of world.elevators) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(el.x, el.y, el.w, el.h);
        const halfW = (el.w / 2) * (1 - el.openAmt * 0.85);
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2.5;
        ctx.fillRect(el.x, el.y, halfW, el.h);
        ctx.strokeRect(el.x, el.y, halfW, el.h);
        ctx.fillRect(el.x + el.w - halfW, el.y, halfW, el.h);
        ctx.strokeRect(el.x + el.w - halfW, el.y, halfW, el.h);
        ctx.fillStyle = '#7c3aed';
        ctx.fillRect(el.x + 6, el.y + el.h + 4, el.w - 12, 22);
        ctx.strokeRect(el.x + 6, el.y + el.h + 4, el.w - 12, 22);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ELEVATOR', el.x + el.w / 2, el.y + el.h + 18);
        ctx.textAlign = 'left';
      }
    }

    drawProps(ctx, world) {
      for (const p of world.props) {
        const sx = p.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
        const sy = p.shake > 0 ? (Math.random() - 0.5) * 6 : 0;

        if (p.type === 'hydrant') {
          if (p.broken) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
            ctx.beginPath(); ctx.arc(p.x, p.y, 28, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#b91c1c';
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.beginPath(); ctx.arc(p.x + 3, p.y + 4, 11, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(p.x + sx, p.y + sy, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fde047';
            ctx.beginPath(); ctx.arc(p.x + sx, p.y + sy, 4, 0, Math.PI * 2); ctx.fill();
          }
        } else if (p.type === 'trash') {
          if (p.broken) {
            ctx.fillStyle = '#64748b';
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            ctx.fillRect(p.x - 10, p.y - 6, 20, 12);
            ctx.strokeRect(p.x - 10, p.y - 6, 20, 12);
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.beginPath(); ctx.arc(p.x + 3, p.y + 4, 13, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#64748b';
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(p.x + sx, p.y + sy, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath(); ctx.arc(p.x + sx, p.y + sy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
        } else if (p.type === 'parked_car') {
          this.drawCarShape(ctx, p.x + sx, p.y + sy, p.w, p.h, p.color, false, p.alarmTimer > 0);
        }
      }
    }

    drawCarShape(ctx, x, y, w, h, color, isTaxi = false, alarmOn = false) {
      const hw = w / 2, hh = h / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x - hw + 5, y - hh + 6, w, h);

      ctx.fillStyle = color;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - hw, y - hh, w, h, 7);
      else ctx.rect(x - hw, y - hh, w, h);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - hw * 0.58, y - hh * 0.65, w * 0.58, h * 0.65);
      ctx.fillStyle = color;
      ctx.fillRect(x - hw * 0.34, y - hh * 0.45, w * 0.34, h * 0.45);
      ctx.strokeRect(x - hw * 0.58, y - hh * 0.65, w * 0.58, h * 0.65);

      if (isTaxi) {
        ctx.fillStyle = '#111';
        ctx.fillRect(x - 6, y - 4, 12, 8);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(x - 4, y - 2, 8, 4);
      }

      if (alarmOn && Math.floor(performance.now() / 130) % 2 === 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.65)';
        ctx.beginPath(); ctx.arc(x - hw, y - hh, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + hw, y + hh, 10, 0, Math.PI * 2); ctx.fill();
      }
    }

    drawCars(ctx, cars) {
      for (const c of cars) this.drawCarShape(ctx, c.x, c.y, c.w, c.h, c.color, c.isTaxi, false);
    }

    drawPedestrians(ctx, peds) {
      for (const ped of peds) {
        ctx.save();
        ctx.translate(ped.x, ped.y);
        ctx.rotate(ped.angle);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.ellipse(2, 4, 11, 9, 0, 0, Math.PI * 2); ctx.fill();

        const swing = Math.sin(ped.walkPhase) * 3;
        ctx.fillStyle = ped.color;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.ellipse(0, 0, 9, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        ctx.fillStyle = ped.skin;
        ctx.beginPath(); ctx.arc(6 + swing, -10, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(6 - swing, 10, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        ctx.fillStyle = ped.skin;
        ctx.beginPath(); ctx.arc(2, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ped.hair;
        ctx.beginPath(); ctx.arc(0, 0, 6.5, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
        ctx.restore();

        if (ped.panicTimer > 0) {
          ctx.fillStyle = '#ef4444';
          ctx.font = '900 15px Impact, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', ped.x, ped.y - 18);
          ctx.textAlign = 'left';
        }
      }
    }

    drawPickups(ctx, pickups) {
      for (const pk of pickups) {
        const yOff = Math.sin(pk.bob) * 4;
        ctx.save();
        ctx.translate(pk.x, pk.y + yOff);
        ctx.fillStyle = pk.kind === 'espresso' ? '#f97316' : '#22c55e';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pk.kind === 'espresso' ? '☕' : '🌮', 0, 1);
        ctx.restore();
      }
    }

    drawFighter(ctx, f, showAiDebug) {
      ctx.save();
      ctx.translate(f.x, f.y);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
      ctx.beginPath();
      ctx.ellipse(3, 6, f.r * 1.05, f.r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!f.ko && f.grudge >= 70 && (f.isPlayer || f.aiState === SG.AI_STATES.COMBAT)) {
        const pulse = 1 + Math.sin(performance.now() * 0.015) * 0.12;
        ctx.strokeStyle = f.playerNum === 2 ? 'rgba(56, 189, 248, 0.78)' : 'rgba(239, 68, 68, 0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, (f.r + 7) * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (f.blocking && !f.ko) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, f.r + 8, f.angle - 1.0, f.angle + 1.0);
        ctx.stroke();
      }

      if (f.ko) {
        ctx.rotate(f.angle + 0.8);
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = f.giColor;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-f.r * 1.2, -f.r * 0.6, f.r * 2.4, f.r * 1.2, 8);
        else ctx.rect(-f.r * 1.2, -f.r * 0.6, f.r * 2.4, f.r * 1.2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = f.skinColor;
        ctx.beginPath(); ctx.arc(f.r * 0.9, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const tNow = performance.now() * 0.005;
        ctx.fillStyle = '#ffe135';
        for (let i = 0; i < 3; i++) {
          const a = tNow + i * (Math.PI * 2 / 3);
          ctx.beginPath();
          ctx.arc(f.r * 0.9 + Math.cos(a) * 14, Math.sin(a) * 10, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        return;
      }

      const drawAngle = f.attackTimer > 0 && f.attackType === 'special' && (f.specialKind === 'cyclone' || f.specialKind === 'lariat')
        ? f.angle + (1 - f.attackTimer / f.attackDuration) * Math.PI * 6
        : f.angle;
      ctx.rotate(drawAngle);

      const swing = Math.sin(f.walkCycle) * 5;
      let leftArmX = 6 + swing, leftArmY = -f.r * 0.85;
      let rightArmX = 6 - swing, rightArmY = f.r * 0.85;
      let kickExtend = 0;

      if (f.attackTimer > 0) {
        const prog = 1 - (f.attackTimer / f.attackDuration);
        const thrust = Math.sin(prog * Math.PI);
        if (f.attackType === 'punch') {
          if (f.comboStep % 2 === 0) { rightArmX += thrust * 26; rightArmY -= thrust * 6; }
          else { leftArmX += thrust * 26; leftArmY += thrust * 6; }
          ctx.strokeStyle = f.grudge >= 70 ? '#ffe135' : '#ffffff';
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(10, 0, f.r + 16, -0.75, 0.75); ctx.stroke();
        } else if (f.attackType === 'kick') {
          kickExtend = thrust * 30;
          ctx.strokeStyle = '#fb923c';
          ctx.lineWidth = 7;
          ctx.beginPath(); ctx.arc(8, 0, f.r + 24, -1.1, 1.1); ctx.stroke();
        } else if (f.attackType === 'special') {
          leftArmX += 18; rightArmX += 18;
          leftArmY = -8; rightArmY = 8;
          ctx.fillStyle = f.specialColor;
          ctx.globalAlpha = 0.65;
          ctx.beginPath(); ctx.arc(22, 0, 16 + thrust * 12, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else if (f.blocking) {
        leftArmX = 14; leftArmY = -8;
        rightArmX = 14; rightArmY = 8;
      }

      const hitWhite = f.flashTimer > 0;
      const flutter = Math.sin(performance.now() * 0.015 + f.x * 0.05) * 4;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, -3); ctx.quadraticCurveTo(-18, -7 + flutter, -26, -4 + flutter * 1.4);
      ctx.moveTo(-8, 3);  ctx.quadraticCurveTo(-18, 7 + flutter, -25, 6 + flutter * 1.2);
      ctx.stroke();
      ctx.strokeStyle = f.bandanaColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      if (kickExtend > 2) {
        ctx.fillStyle = hitWhite ? '#ffffff' : f.trimColor;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(12 + kickExtend, 6, 11, 7, 0.2, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }

      ctx.fillStyle = hitWhite ? '#ffffff' : f.giColor;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, f.r * 0.72, f.r * 1.05, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.strokeStyle = hitWhite ? '#ffffff' : f.trimColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(4, -f.r * 0.55); ctx.lineTo(10, 0); ctx.lineTo(4, f.r * 0.55);
      ctx.stroke();

      ctx.fillStyle = hitWhite ? '#ffffff' : (f.playerNum === 1 ? '#ef4444' : (f.playerNum === 2 ? '#38bdf8' : f.skinColor));
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.arc(leftArmX, leftArmY, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(rightArmX, rightArmY, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.fillStyle = hitWhite ? '#ffffff' : f.skinColor;
      ctx.beginPath(); ctx.arc(2, 0, f.r * 0.56, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.fillStyle = hitWhite ? '#ffffff' : f.hairColor;
      ctx.beginPath();
      ctx.arc(0, 0, f.r * 0.54, Math.PI * 0.5, Math.PI * 1.5);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.strokeStyle = f.bandanaColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(2, 0, f.r * 0.53, -0.8, 0.8);
      ctx.stroke();

      ctx.restore();

      // Overhead tags
      if (!f.isPlayer) {
        const barW = 46;
        ctx.fillStyle = '#111';
        ctx.fillRect(f.x - barW / 2 - 1, f.y - f.r - 17, barW + 2, 7);
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(f.x - barW / 2, f.y - f.r - 16, barW, 5);
        ctx.fillStyle = f.aiState === SG.AI_STATES.CALMED ? '#38bdf8' : '#facc15';
        ctx.fillRect(f.x - barW / 2, f.y - f.r - 16, barW * (f.hp / f.maxHp), 5);

        if (f.aiState === SG.AI_STATES.CALMED) {
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('☕🤷', f.x, f.y - f.r - 22);
          ctx.textAlign = 'left';
        } else if (showAiDebug) {
          ctx.font = 'bold 10px "Courier New", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#111';
          ctx.fillRect(f.x - 56, f.y - f.r - 32, 112, 13);
          ctx.fillStyle = f.aiState === SG.AI_STATES.COMBAT ? '#f87171' : '#a7f3d0';
          ctx.fillText(f.aiState, f.x, f.y - f.r - 22);
          ctx.textAlign = 'left';
        }
      } else {
        const markerColor = f.playerNum === 2 ? '#38bdf8' : '#ffe135';
        ctx.fillStyle = markerColor;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y - f.r - 10);
        ctx.lineTo(f.x - 7, f.y - f.r - 20);
        ctx.lineTo(f.x + 7, f.y - f.r - 20);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.font = '900 10px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#111';
        ctx.fillText(`P${f.playerNum}`, f.x, f.y - f.r - 22);
        ctx.textAlign = 'left';
      }
    }

    drawBuildings3DRoof(ctx, world, cam) {
      for (const b of world.buildings) {
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        const ox = Math.max(-28, Math.min(28, (cx - cam.x) * 0.055));
        const oy = Math.max(-28, Math.min(28, (cy - cam.y) * 0.055));
        const rx = b.x + ox;
        const ry = b.y + oy;

        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(b.x + 10, b.y + 12, b.w, b.h);

        ctx.fillStyle = b.color;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        const quad = (x1, y1, x2, y2, x3, y3, x4, y4) => {
          ctx.beginPath();
          ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        };
        quad(b.x, b.y, rx, ry, rx + b.w, ry, b.x + b.w, b.y);
        quad(b.x, b.y + b.h, rx, ry + b.h, rx + b.w, ry + b.h, b.x + b.w, b.y + b.h);
        quad(b.x, b.y, rx, ry, rx, ry + b.h, b.x, b.y + b.h);
        quad(b.x + b.w, b.y, rx + b.w, ry, rx + b.w, ry + b.h, b.x + b.w, b.y + b.h);

        ctx.fillStyle = b.roofColor;
        ctx.fillRect(rx, ry, b.w, b.h);
        ctx.strokeRect(rx, ry, b.w, b.h);

        ctx.strokeStyle = 'rgba(17,17,17,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx + 12, ry + 12, b.w - 24, b.h - 24);

        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.fillRect(rx + 22, ry + 22, 34, 24);
        ctx.strokeRect(rx + 22, ry + 22, 34, 24);

        ctx.font = '900 17px Impact, "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#111';
        ctx.fillText(b.label, rx + b.w / 2 + 2, ry + b.h / 2 + 2);
        ctx.fillStyle = '#fef08a';
        ctx.fillText(b.label, rx + b.w / 2, ry + b.h / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    }

    drawTrees(ctx, world) {
      for (const tr of world.trees) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.arc(tr.x + 5, tr.y + 6, tr.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#16a34a';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath(); ctx.arc(tr.x - 5, tr.y - 5, tr.r * 0.52, 0, Math.PI * 2); ctx.fill();
      }
    }

    drawProjectiles(ctx, projectiles) {
      for (const pr of projectiles) {
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.fillStyle = pr.color;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    drawSoundRings(ctx, rings) {
      for (const sr of rings) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sr.alpha);
        ctx.strokeStyle = sr.color;
        ctx.lineWidth = sr.lineWidth || 4;
        ctx.beginPath(); ctx.arc(sr.x, sr.y, sr.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }

    drawAfterimages(ctx, afterimages) {
      for (const ai of afterimages) {
        ctx.save();
        ctx.globalAlpha = ai.alpha;
        ctx.fillStyle = ai.color;
        ctx.beginPath(); ctx.arc(ai.x, ai.y, 18, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    drawParticles(ctx, particles) {
      for (const pt of particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }

    drawSpeechBubbles(ctx, game) {
      const speakers = [game.player, game.player2, ...game.rivals, ...game.pedestrians]
        .filter((s) => s && s.speechTimer > 0 && s.speech);
      ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
      for (const s of speakers) {
        const padX = 10;
        const textW = ctx.measureText(s.speech).width;
        const bw = textW + padX * 2;
        const bh = 24;
        const bx = s.x - bw / 2;
        const by = s.y - (s.r || 16) - 46;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 8);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill(); ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(s.x - 5, by + bh);
        ctx.lineTo(s.x, by + bh + 7);
        ctx.lineTo(s.x + 5, by + bh);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#111';
        ctx.textAlign = 'center';
        ctx.fillText(s.speech, s.x, by + 16);
        ctx.textAlign = 'left';
      }
    }

    drawPopups(ctx, popups) {
      for (const pp of popups) {
        ctx.save();
        ctx.translate(pp.x, pp.y);
        ctx.rotate(pp.rot);
        ctx.globalAlpha = Math.max(0, pp.life / pp.maxLife);
        ctx.font = `900 ${Math.round(24 * pp.scale)}px Impact, "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#111';
        ctx.strokeText(pp.text, 0, 0);
        ctx.fillStyle = pp.color;
        ctx.fillText(pp.text, 0, 0);
        ctx.restore();
      }
    }

    drawOffscreenRivalPointers(ctx, game) {
      const margin = 52;
      for (const r of game.rivals) {
        if (r.ko || r.aiState === SG.AI_STATES.CALMED) continue;
        const sx = (r.x - game.cam.x) * game.cam.zoom + game.viewW / 2;
        const sy = (r.y - game.cam.y) * game.cam.zoom + game.viewH / 2;
        if (sx > 20 && sx < game.viewW - 20 && sy > 20 && sy < game.viewH - 20) continue;

        const dist = Math.hypot(r.x - game.player.x, r.y - game.player.y);
        if (dist > 1100) continue;

        const ang = Math.atan2(sy - game.viewH / 2, sx - game.viewW / 2);
        const px = Math.max(margin, Math.min(game.viewW - margin, game.viewW / 2 + Math.cos(ang) * (game.viewW * 0.44)));
        const py = Math.max(105, Math.min(game.viewH - margin, game.viewH / 2 + Math.sin(ang) * (game.viewH * 0.40)));

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.fillStyle = dist < 500 ? '#ef4444' : '#f97316';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(14, 0); ctx.lineTo(-9, -9); ctx.lineTo(-5, 0); ctx.lineTo(-9, 9);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }

    drawMinimap(game) {
      const mctx = this.miniCtx;
      const mw = this.miniCanvas.width;
      const mh = this.miniCanvas.height;
      const sx = mw / SG.WORLD_W;
      const sy = mh / SG.WORLD_H;

      mctx.clearRect(0, 0, mw, mh);
      mctx.fillStyle = '#334155';
      mctx.fillRect(0, 0, SG.DOWNTOWN_SPLIT_X * sx, mh);
      mctx.fillStyle = '#1e3a5f';
      mctx.fillRect(SG.DOWNTOWN_SPLIT_X * sx, 0, (SG.WORLD_W - SG.DOWNTOWN_SPLIT_X) * sx, mh);

      mctx.fillStyle = '#0f172a';
      for (const hr of game.world.hRoads) mctx.fillRect(0, hr.y * sy, mw, hr.h * sy);
      for (const vr of game.world.vRoads) mctx.fillRect(vr.x * sx, 0, vr.w * sx, mh);

      mctx.fillStyle = '#64748b';
      for (const b of game.world.buildings) mctx.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);

      for (const sub of game.world.subways) {
        mctx.fillStyle = '#38bdf8';
        mctx.fillRect(sub.x * sx, sub.y * sy, Math.max(6, sub.w * sx), Math.max(6, sub.h * sy));
      }

      const pulse = 3 + Math.sin(performance.now() * 0.01) * 1.3;
      for (const r of game.rivals) {
        const rx = r.x * sx, ry = r.y * sy;
        if (r.ko) {
          mctx.fillStyle = '#475569';
          mctx.fillRect(rx - 2, ry - 2, 4, 4);
        } else if (r.aiState === SG.AI_STATES.CALMED) {
          mctx.fillStyle = '#94a3b8';
          mctx.beginPath(); mctx.arc(rx, ry, 3, 0, Math.PI * 2); mctx.fill();
        } else {
          mctx.fillStyle = r.aiState === SG.AI_STATES.COMBAT ? '#ef4444' : '#fb923c';
          mctx.beginPath(); mctx.arc(rx, ry, pulse, 0, Math.PI * 2); mctx.fill();
        }
      }

      // P2 Cyan Dot (in 2P mode)
      if (game.player2) {
        mctx.fillStyle = '#38bdf8';
        mctx.strokeStyle = '#111';
        mctx.lineWidth = 1.5;
        mctx.beginPath();
        mctx.arc(game.player2.x * sx, game.player2.y * sy, 4.4, 0, Math.PI * 2);
        mctx.fill(); mctx.stroke();
      }

      // P1 Yellow Dot
      if (game.player) {
        mctx.fillStyle = '#ffe135';
        mctx.strokeStyle = '#111';
        mctx.lineWidth = 1.5;
        mctx.beginPath();
        mctx.arc(game.player.x * sx, game.player.y * sy, 4.4, 0, Math.PI * 2);
        mctx.fill(); mctx.stroke();
      }
    }
  }

  SG.ComicRenderer = ComicRenderer;
})(window.StreetGrudge);
