/**
 * Street Grudge — Open-World City Generator, Collisions & Interactive Props
 * Zones: Downtown (West) & Uptown (East), Subways, Library Alley, Office Elevator
 */
window.StreetGrudge = window.StreetGrudge || {};

(function (SG) {
  'use strict';

  class CityWorld {
    constructor() {
      this.buildings = [];
      this.hRoads = [];
      this.vRoads = [];
      this.intersections = [];
      this.landmarks = [];
      this.props = [];
      this.subways = [];
      this.elevators = [];
      this.spawnPoints = [];
      this.trees = [];
      this.trafficPhase = 0; // 0: NS green, 1: NS yellow, 2: EW green, 3: EW yellow
      this.trafficTimer = 0;

      this.buildLayout();
    }

    buildLayout() {
      this.hRoads = [
        { y: 120, h: 170, name: 'NORTH BOULEVARD' },
        { y: 980, h: 190, name: 'MAIN STREET' },
        { y: 1850, h: 170, name: 'SOUTH AVENUE' }
      ];
      this.vRoads = [
        { x: 140, w: 170, name: 'WEST 1ST' },
        { x: 820, w: 160, name: 'LIBRARY AVE' },
        { x: 1440, w: 180, name: 'DIVIDE BLVD' },
        { x: 2140, w: 160, name: 'PLAZA WAY' },
        { x: 2700, w: 160, name: 'UPTOWN EAST' }
      ];

      for (const hr of this.hRoads) {
        for (const vr of this.vRoads) {
          this.intersections.push({
            x: vr.x, y: hr.y, w: vr.w, h: hr.h,
            cx: vr.x + vr.w / 2, cy: hr.y + hr.h / 2
          });
        }
      }

      const addBldg = (x, y, w, h, color, roofColor, label, zone, heightPx = 26) => {
        this.buildings.push({ x, y, w, h, color, roofColor, label, zone, heightPx });
      };

      // --- DOWNTOWN (West) ---
      addBldg(360, 340, 410, 230, '#b45309', '#d97706', 'CENTRAL LIBRARY', 'DOWNTOWN', 30);
      addBldg(360, 680, 185, 250, '#7c2d12', '#9a3412', 'PAWN & BOOKS', 'DOWNTOWN', 24);
      addBldg(585, 680, 185, 250, '#475569', '#64748b', 'ARCADE 1991', 'DOWNTOWN', 28);

      addBldg(1030, 340, 355, 220, '#be123c', '#e11d48', 'DRAGON RAMEN', 'DOWNTOWN', 25);
      addBldg(1030, 610, 175, 320, '#334155', '#475569', 'GYM & DOJO', 'DOWNTOWN', 34);

      addBldg(360, 1230, 200, 560, '#57534e', '#78716c', 'OLD WAREHOUSE', 'DOWNTOWN', 32);
      addBldg(605, 1230, 165, 250, '#991b1b', '#dc2626', 'PIZZA KING', 'DOWNTOWN', 22);
      addBldg(605, 1540, 165, 250, '#1e3a8a', '#2563eb', 'BAIL BONDS', 'DOWNTOWN', 24);

      addBldg(1030, 1230, 355, 210, '#0f766e', '#14b8a6', '24H BODEGA', 'DOWNTOWN', 22);
      addBldg(1030, 1570, 355, 220, '#6b21a8', '#9333ea', 'COMIC VAULT', 'DOWNTOWN', 26);

      // --- UPTOWN (East) ---
      addBldg(1670, 340, 415, 250, '#0284c7', '#38bdf8', 'APEX TOWER', 'UPTOWN', 44);
      addBldg(1670, 725, 190, 205, '#0369a1', '#0ea5e9', 'LATTE LAB', 'UPTOWN', 24);
      addBldg(1895, 725, 190, 205, '#0f766e', '#2dd4bf', 'ZEN SPA', 'UPTOWN', 26);

      addBldg(2355, 340, 290, 280, '#4f46e5', '#818cf8', 'METRO GALLERY', 'UPTOWN', 36);

      addBldg(1670, 1230, 170, 190, '#0891b2', '#22d3ee', 'TECH LOFT', 'UPTOWN', 32);
      addBldg(1915, 1230, 170, 190, '#059669', '#34d399', 'SALAD BAR', 'UPTOWN', 22);
      addBldg(1670, 1600, 415, 190, '#1d4ed8', '#60a5fa', 'GRAND HOTEL', 'UPTOWN', 42);

      addBldg(2355, 1230, 290, 230, '#db2777', '#f472b6', 'SNEAKER BOUTIQUE', 'UPTOWN', 28);
      addBldg(2355, 1560, 290, 230, '#ca8a04', '#facc15', 'GOLD BANK', 'UPTOWN', 36);

      // Linked Subway Express Entrances
      this.subways = [
        {
          id: 'sub_dt', x: 1245, y: 700, w: 135, h: 95,
          targetId: 'sub_ut', exitX: 2500, exitY: 850,
          name: 'DOWNTOWN SUBWAY', zone: 'DOWNTOWN'
        },
        {
          id: 'sub_ut', x: 2430, y: 690, w: 135, h: 95,
          targetId: 'sub_dt', exitX: 1310, exitY: 855,
          name: 'UPTOWN SUBWAY', zone: 'UPTOWN'
        }
      ];

      this.elevators = [
        { x: 1835, y: 580, w: 86, h: 24, openAmt: 0, label: 'APEX ELEVATOR' }
      ];

      this.landmarks = [
        { x: 565, y: 625, name: 'LIBRARY ALLEY', zone: 'DOWNTOWN', color: '#f59e0b' },
        { x: 1310, y: 745, name: 'DT SUBWAY', zone: 'DOWNTOWN', color: '#38bdf8' },
        { x: 1878, y: 645, name: 'ELEVATOR LOBBY', zone: 'UPTOWN', color: '#a855f7' },
        { x: 2500, y: 740, name: 'UT SUBWAY', zone: 'UPTOWN', color: '#38bdf8' },
        { x: 1875, y: 1500, name: 'UPTOWN PLAZA', zone: 'UPTOWN', color: '#22c55e' },
        { x: 1205, y: 1505, name: 'PARKING LOT', zone: 'DOWNTOWN', color: '#94a3b8' },
        { x: 1530, y: 1075, name: 'MAIN & DIVIDE', zone: 'DOWNTOWN', color: '#f43f5e' }
      ];

      this.spawnPoints = [
        { x: 540,  y: 625,  label: 'Alley Behind Central Library', zone: 'DOWNTOWN' },
        { x: 1315, y: 840,  label: 'Downtown Subway Platform',     zone: 'DOWNTOWN' },
        { x: 1875, y: 655,  label: 'Apex Office Elevator Lobby',   zone: 'UPTOWN' },
        { x: 2500, y: 835,  label: 'Uptown Subway Concourse',      zone: 'UPTOWN' },
        { x: 1790, y: 1505, label: 'Uptown Marble Plaza',          zone: 'UPTOWN' },
        { x: 900,  y: 1075, label: 'Busy Downtown Intersection',   zone: 'DOWNTOWN' },
        { x: 1210, y: 1500, label: 'Downtown Bodega Parking Lot',  zone: 'DOWNTOWN' },
        { x: 2220, y: 1480, label: 'Uptown Boutique Corner',       zone: 'UPTOWN' },
        { x: 690,  y: 1510, label: 'Pizza King Side Alley',        zone: 'DOWNTOWN' },
        { x: 2220, y: 520,  label: 'Metro Gallery Sidewalk',       zone: 'UPTOWN' },
        { x: 245,  y: 1075, label: 'West 1st Crosswalk',           zone: 'DOWNTOWN' },
        { x: 2500, y: 1510, label: 'Gold Bank Alleyway',           zone: 'UPTOWN' }
      ];

      this.fountain = { x: 1875, y: 1505, r: 44 };
      const treeCoords = [
        [1650, 1450], [1650, 1555], [2095, 1450], [2095, 1555],
        [2340, 910], [2640, 910], [1655, 915], [2095, 915],
        [2340, 1190], [2655, 1190], [1655, 1190], [2095, 1190],
        [345, 940], [785, 940], [1015, 940]
      ];
      for (const [tx, ty] of treeCoords) {
        this.trees.push({ x: tx, y: ty, r: 22 });
      }

      this.resetProps();
    }

    resetProps() {
      this.props = [];
      const hydrantSpots = [
        [330, 325], [795, 325], [1005, 325], [1415, 955], [795, 955],
        [330, 1195], [795, 1195], [1005, 1195], [1415, 1825], [1645, 955],
        [2115, 955], [2330, 955], [2675, 1195], [1645, 1825], [2115, 1825]
      ];
      for (const [x, y] of hydrantSpots) {
        this.props.push({
          type: 'hydrant', x, y, r: 12, hp: 20, maxHp: 20,
          broken: false, sprayTimer: 0, shake: 0
        });
      }

      const trashSpots = [
        [420, 610], [710, 625], [1020, 580], [1390, 620], [585, 1495],
        [1100, 1465], [1340, 1465], [1710, 695], [2040, 695], [2380, 880],
        [1750, 1470], [2000, 1470], [2420, 1500], [770, 1800], [1410, 1480]
      ];
      for (const [x, y] of trashSpots) {
        this.props.push({
          type: 'trash', x, y, r: 14, hp: 18, maxHp: 18,
          broken: false, shake: 0
        });
      }

      const parkedCars = [
        { x: 1120, y: 1515, w: 66, h: 34, color: '#ef4444' },
        { x: 1280, y: 1515, w: 66, h: 34, color: '#3b82f6' },
        { x: 325,  y: 780,  w: 34, h: 66, color: '#eab308' },
        { x: 1405, y: 450,  w: 34, h: 66, color: '#10b981' },
        { x: 2665, y: 480,  w: 34, h: 66, color: '#ec4899' },
        { x: 2110, y: 1680, w: 34, h: 66, color: '#f97316' }
      ];
      for (const c of parkedCars) {
        this.props.push({
          type: 'parked_car', x: c.x, y: c.y, w: c.w, h: c.h,
          r: 26, color: c.color, hp: 60, maxHp: 60,
          broken: false, alarmTimer: 0, shake: 0
        });
      }
    }

    getZone(x) {
      return x < SG.DOWNTOWN_SPLIT_X ? 'DOWNTOWN' : 'UPTOWN';
    }

    isPointInBuilding(x, y, pad = 0) {
      for (const b of this.buildings) {
        if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) {
          return b;
        }
      }
      return null;
    }

    resolveCircleCollisions(ent) {
      ent.x = Math.max(40, Math.min(SG.WORLD_W - 40, ent.x));
      ent.y = Math.max(40, Math.min(SG.WORLD_H - 40, ent.y));

      for (const b of this.buildings) {
        const cx = Math.max(b.x, Math.min(ent.x, b.x + b.w));
        const cy = Math.max(b.y, Math.min(ent.y, b.y + b.h));
        const dx = ent.x - cx;
        const dy = ent.y - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq < ent.r * ent.r) {
          const dist = Math.sqrt(distSq) || 0.001;
          if (distSq < 0.0001) {
            const dL = ent.x - b.x, dR = b.x + b.w - ent.x;
            const dT = ent.y - b.y, dB = b.y + b.h - ent.y;
            const m = Math.min(dL, dR, dT, dB);
            if (m === dL) ent.x = b.x - ent.r;
            else if (m === dR) ent.x = b.x + b.w + ent.r;
            else if (m === dT) ent.y = b.y - ent.r;
            else ent.y = b.y + b.h + ent.r;
          } else {
            ent.x += (dx / dist) * (ent.r - dist);
            ent.y += (dy / dist) * (ent.r - dist);
          }
        }
      }

      // Fountain collision
      {
        const dx = ent.x - this.fountain.x;
        const dy = ent.y - this.fountain.y;
        const minR = ent.r + this.fountain.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < minR * minR) {
          const d = Math.sqrt(d2) || 0.01;
          ent.x = this.fountain.x + (dx / d) * minR;
          ent.y = this.fountain.y + (dy / d) * minR;
        }
      }

      // Props collision
      for (const p of this.props) {
        if (p.type === 'parked_car') {
          const hw = p.w / 2, hh = p.h / 2;
          const cx = Math.max(p.x - hw, Math.min(ent.x, p.x + hw));
          const cy = Math.max(p.y - hh, Math.min(ent.y, p.y + hh));
          const dx = ent.x - cx, dy = ent.y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 < ent.r * ent.r) {
            const d = Math.sqrt(d2) || 0.01;
            ent.x += (dx / d) * (ent.r - d);
            ent.y += (dy / d) * (ent.r - d);
          }
        } else if (!p.broken) {
          const dx = ent.x - p.x, dy = ent.y - p.y;
          const minR = ent.r + p.r;
          const d2 = dx * dx + dy * dy;
          if (d2 < minR * minR) {
            const d = Math.sqrt(d2) || 0.01;
            ent.x = p.x + (dx / d) * minR;
            ent.y = p.y + (dy / d) * minR;
          }
        }
      }
    }

    update(dt, fighters) {
      this.trafficTimer += dt;
      const durations = [5.5, 1.5, 5.5, 1.5];
      if (this.trafficTimer >= durations[this.trafficPhase]) {
        this.trafficTimer = 0;
        this.trafficPhase = (this.trafficPhase + 1) % 4;
      }

      for (const el of this.elevators) {
        let near = false;
        for (const f of fighters) {
          if (f && !f.ko && Math.hypot(f.x - (el.x + el.w / 2), f.y - (el.y + 30)) < 95) {
            near = true; break;
          }
        }
        el.openAmt += ((near ? 1 : 0) - el.openAmt) * Math.min(1, dt * 6);
      }
    }
  }

  SG.CityWorld = CityWorld;
})(window.StreetGrudge);
