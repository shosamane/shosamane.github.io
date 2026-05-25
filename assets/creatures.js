/* ─────────────────────────────────────────────────────────────────────
 * creatures.js — Walking figures + 10 choreographed scenarios.
 * Vanilla port of creatures.jsx + scenarios.jsx from the prototype.
 *
 * Performance:
 *   • All motion is GPU-composited CSS animations / transitions.
 *   • JS only schedules class toggles for the scenario choreography.
 *   • Skipped entirely under prefers-reduced-motion.
 *   • All animations pause when the tab is hidden.
 *   • Loaded ONLY on index.qmd via its front matter include-in-header.
 *
 * Footprint: ~20 KB unminified, no dependencies.
 * ───────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────
  const MAX_VW_PER_SEC = 7;
  const GAIT_REF = 1.05;
  const ROBOT_GLYPHS = ['#', '@', '%', '&', '*', '§', '#@', '%&'];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Gait period from speed: slower → shuffle, faster → stride.
  function gaitDurForSpeed(vwPerSec) {
    if (vwPerSec <= 0.2) return 1.8;
    return Math.max(0.7, Math.min(1.8, Math.sqrt(4 / vwPerSec)));
  }

  // ── SVG markup helpers ────────────────────────────────────────────
  function humanSVG(size) {
    const w = (size * 24) / 40;
    return '<svg class="creature human flip" viewBox="0 0 24 40" width="' + w +
           '" height="' + size + '" aria-hidden="true">' +
      '<g class="profile">' +
        '<g class="torso-bob">' +
          '<circle cx="12" cy="5" r="3" stroke-width="1.1"/>' +
          '<line x1="12" y1="8" x2="12" y2="24" stroke-width="1.1"/>' +
          '<g class="arm-l"><line x1="12" y1="13" x2="12" y2="22" stroke-width="1.1"/></g>' +
          '<g class="arm-r"><line x1="12" y1="13" x2="12" y2="22" stroke-width="1.1"/></g>' +
        '</g>' +
        '<g class="leg-l"><line x1="12" y1="24" x2="12" y2="38" stroke-width="1.1"/></g>' +
        '<g class="leg-r"><line x1="12" y1="24" x2="12" y2="38" stroke-width="1.1"/></g>' +
      '</g>' +
      '<g class="frontal">' +
        '<circle cx="12" cy="5" r="3" stroke-width="1.1"/>' +
        '<line x1="12" y1="8" x2="12" y2="24" stroke-width="1.1"/>' +
        '<line x1="12" y1="12" x2="7"  y2="21" stroke-width="1.1"/>' +
        '<line x1="12" y1="12" x2="17" y2="21" stroke-width="1.1"/>' +
        '<line x1="12" y1="24" x2="8"  y2="38" stroke-width="1.1"/>' +
        '<line x1="12" y1="24" x2="16" y2="38" stroke-width="1.1"/>' +
      '</g>' +
    '</svg>';
  }

  function robotSVG(size) {
    const w = (size * 24) / 40;
    return '<svg class="creature robot flip" viewBox="0 0 24 40" width="' + w +
           '" height="' + size + '" aria-hidden="true">' +
      '<g class="profile">' +
        '<g class="antenna">' +
          '<line x1="12" y1="4" x2="12" y2="0.5" stroke-width="1"/>' +
          '<circle cx="12" cy="0.5" r="0.8" fill="currentColor" stroke="none"/>' +
        '</g>' +
        '<rect x="8.5" y="3.5" width="7" height="6" rx="0.6" stroke-width="1.1"/>' +
        '<circle class="led" cx="12" cy="6.5" r="0.9"/>' +
        '<line x1="12" y1="9.5" x2="12" y2="11" stroke-width="1.1"/>' +
        '<rect x="8.5" y="11" width="7" height="13" rx="0.6" stroke-width="1.1"/>' +
        '<g class="arm-l"><line x1="12" y1="14" x2="12" y2="23" stroke-width="1.1"/></g>' +
        '<g class="arm-r"><line x1="12" y1="14" x2="12" y2="23" stroke-width="1.1"/></g>' +
        '<g class="leg-l"><line x1="12" y1="24" x2="12" y2="38" stroke-width="1.1"/></g>' +
        '<g class="leg-r"><line x1="12" y1="24" x2="12" y2="38" stroke-width="1.1"/></g>' +
      '</g>' +
      '<g class="frontal">' +
        '<line x1="12" y1="4" x2="12" y2="0.5" stroke-width="1"/>' +
        '<circle cx="12" cy="0.5" r="0.8" fill="currentColor" stroke="none"/>' +
        '<rect x="8.5" y="3.5" width="7" height="6" rx="0.6" stroke-width="1.1"/>' +
        '<circle class="led-front" cx="12" cy="6.5" r="1.4" fill="var(--accent,#2A4D6E)" stroke="none" opacity="0.9"/>' +
        '<line x1="12" y1="9.5" x2="12" y2="11" stroke-width="1.1"/>' +
        '<rect x="8.5" y="11" width="7" height="13" rx="0.6" stroke-width="1.1"/>' +
        '<line x1="9"  y1="13" x2="5.5"  y2="22" stroke-width="1.1"/>' +
        '<line x1="15" y1="13" x2="18.5" y2="22" stroke-width="1.1"/>' +
        '<line x1="10" y1="24" x2="8"  y2="38" stroke-width="1.1"/>' +
        '<line x1="14" y1="24" x2="16" y2="38" stroke-width="1.1"/>' +
      '</g>' +
    '</svg>';
  }

  function bubbleHTML() {
    return '<div class="bubble" aria-hidden="true">' +
      '<svg viewBox="0 0 26 19" aria-hidden="true">' +
        '<path d="M 3 1 H 23 Q 25 1 25 3 V 11 Q 25 13 23 13 H 15 L 13 17 L 11 13 H 3 Q 1 13 1 11 V 3 Q 1 1 3 1 Z"' +
              ' fill="var(--paper,#FAF7F2)" stroke="currentColor" stroke-width="0.7"/>' +
        '<text class="bubble-text" x="13" y="9.7" text-anchor="middle"' +
              ' fill="currentColor" stroke="none">·</text>' +
      '</svg>' +
    '</div>';
  }

  // ── Scenario walker factory ──────────────────────────────────────
  function spawnWalker(layer, opts) {
    const kind = opts.kind || 'human';
    const size = opts.size || 28;
    const opacity = opts.opacity != null ? opts.opacity : 0.13;
    let currX = opts.x || 0;
    let currY = opts.y != null ? opts.y : 50;
    const facing = opts.facing || 'right';

    const div = document.createElement('div');
    div.className = 'walker scen' + (facing === 'left' ? ' rtl' : '');
    div.style.setProperty('--w', (size * 24 / 40).toFixed(1) + 'px');
    div.style.setProperty('--h', size + 'px');
    div.style.setProperty('--op', String(opacity));
    div.style.setProperty('--gait-dur', GAIT_REF + 's');
    div.style.transform = 'translate(' + currX + 'vw, ' + currY + 'vh)';
    div.innerHTML = (kind === 'human' ? humanSVG(size) : robotSVG(size)) + bubbleHTML();
    layer.appendChild(div);

    const bubble = div.querySelector('.bubble');
    const bubbleText = div.querySelector('.bubble-text');
    const isRobot = kind === 'robot';
    let removed = false;

    function glyphToGesture(g) {
      if (isRobot) return 'comm';
      if (g === '·') return 'talk';
      if (g === '?') return 'shrug';
      if (g === '!') return 'emphasis';
      return null;
    }

    const api = {
      el: div,
      get x() { return currX; },
      get y() { return currY; },

      async walkTo(toX, toY, durSec) {
        if (removed) return;
        const dx = toX - currX;
        const dy = toY - currY;
        const dist = Math.hypot(dx, dy);
        const minDur = dist / MAX_VW_PER_SEC;
        if (durSec < minDur) durSec = minDur;
        if (Math.abs(dx) > 0.3) div.classList.toggle('rtl', dx < 0);
        div.classList.remove('standing', 'facing');
        const speed = dist / durSec;
        div.style.setProperty('--gait-dur', gaitDurForSpeed(speed).toFixed(2) + 's');
        div.style.transition = 'transform ' + durSec + 's linear';
        void div.offsetHeight;
        div.style.transform = 'translate(' + toX + 'vw, ' + toY + 'vh)';
        currX = toX; currY = toY;
        await sleep(durSec * 1000);
      },

      stop() {
        if (removed) return;
        div.classList.add('standing');
      },

      face(dir) {
        if (removed) return;
        div.classList.add('standing');
        if (dir === 'front') {
          div.classList.add('facing');
          div.classList.remove('rtl');
        } else {
          div.classList.remove('facing');
          div.classList.toggle('rtl', dir === 'left');
        }
      },

      async say(glyph, durMs) {
        if (removed) return;
        durMs = durMs || 1200;
        div.classList.add('standing');
        const gesture = glyphToGesture(glyph);
        if (gesture) {
          div.style.setProperty('--gesture-dur', durMs + 'ms');
          div.classList.add('gesture-' + gesture);
        }
        bubbleText.textContent = isRobot
          ? ROBOT_GLYPHS[Math.floor(Math.random() * ROBOT_GLYPHS.length)]
          : glyph;
        bubble.classList.add('on');
        await sleep(durMs);
        bubble.classList.remove('on');
        if (gesture) div.classList.remove('gesture-' + gesture);
        await sleep(320);
      },

      setBright(bright) {
        if (removed) return;
        div.classList.toggle('bright', !!bright);
      },

      async remove(fadeMs) {
        if (removed) return;
        fadeMs = fadeMs || 700;
        if (currX > -8 && currX < 108) {
          const target = currX > 50 ? 125 : -20;
          try { await this.walkTo(target, currY, 3.5); } catch (e) { /* ignore */ }
        }
        removed = true;
        div.style.transition = 'opacity ' + fadeMs + 'ms ease';
        div.style.opacity = '0';
        await sleep(fadeMs);
        div.remove();
      },
    };
    return api;
  }

  // ── Background walkers (ambient drift) ────────────────────────────
  const PROCESSION = [
    { kind: 'human', size: 24, dur: 32, delay:  -2, dir: 'ltr', op: 0.10, top: '4%'  },
    { kind: 'robot', size: 28, dur: 29, delay:  -9, dir: 'rtl', op: 0.13, top: '11%' },
    { kind: 'human', size: 32, dur: 25, delay: -18, dir: 'ltr', op: 0.14, top: '18%' },
    { kind: 'robot', size: 22, dur: 35, delay:  -4, dir: 'rtl', op: 0.09, top: '26%' },
    { kind: 'human', size: 26, dur: 28, delay: -14, dir: 'rtl', op: 0.11, top: '32%' },
    { kind: 'robot', size: 30, dur: 24, delay:  -6, dir: 'ltr', op: 0.13, top: '40%' },
    { kind: 'human', size: 22, dur: 36, delay: -20, dir: 'ltr', op: 0.09, top: '47%' },
    { kind: 'robot', size: 26, dur: 30, delay: -11, dir: 'rtl', op: 0.11, top: '54%' },
    { kind: 'human', size: 30, dur: 26, delay: -17, dir: 'rtl', op: 0.13, top: '61%' },
    { kind: 'robot', size: 24, dur: 33, delay:  -3, dir: 'ltr', op: 0.10, top: '69%' },
    { kind: 'human', size: 28, dur: 27, delay: -10, dir: 'ltr', op: 0.12, top: '76%' },
    { kind: 'robot', size: 22, dur: 37, delay: -22, dir: 'rtl', op: 0.09, top: '84%' },
    { kind: 'human', size: 26, dur: 31, delay:  -7, dir: 'rtl', op: 0.11, top: '91%' },
    { kind: 'human', size: 30, dur: 28, delay: -14, dir: 'ltr', op: 0.12, top: '97%' },
  ];

  function spawnBackgroundWalker(layer, p) {
    const div = document.createElement('div');
    div.className = 'walker bg ' + p.dir;
    div.style.setProperty('--w', (p.size * 24 / 40).toFixed(1) + 'px');
    div.style.setProperty('--h', p.size + 'px');
    div.style.setProperty('--dur', p.dur + 's');
    div.style.setProperty('--d', p.delay + 's');
    div.style.setProperty('--op', String(p.op));
    div.style.setProperty('--top', p.top);
    div.style.setProperty('--gait-dur', gaitDurForSpeed(100 / p.dur).toFixed(2) + 's');
    div.innerHTML = p.kind === 'human' ? humanSVG(p.size) : robotSVG(p.size);
    layer.appendChild(div);

    function cycle() {
      const walkFor   = 12000 + Math.random() * 22000;
      const facingFor =  2800 + Math.random() *  2200;
      setTimeout(() => {
        div.classList.add('facing');
        setTimeout(() => {
          div.classList.remove('facing');
          cycle();
        }, facingFor);
      }, walkFor);
    }
    setTimeout(cycle, Math.random() * 14000);
  }

  // ─────────────────────────────────────────────────────────────────
  // SCENARIOS — 10 choreographed sequences. See creatures.jsx /
  // scenarios.jsx in the prototype for narrative comments on each.
  // ─────────────────────────────────────────────────────────────────

  async function scenarioDialogue(layer, lanes) {
    const lane = lanes[0];
    const op = 0.13;
    const a = spawnWalker(layer, { kind:'human', size:28, opacity:op, x:-8,  y:lane, facing:'right' });
    const b = spawnWalker(layer, { kind:'human', size:28, opacity:op, x:108, y:lane, facing:'left'  });
    await Promise.all([ a.walkTo(43, lane, 7), b.walkTo(54, lane, 7) ]);
    a.face('right'); b.face('left');
    await sleep(550);
    await a.say('·', 1100);
    await b.say('?', 1200);
    await a.say('·', 1100);
    await sleep(500);
    if (Math.random() < 0.5) {
      await Promise.all([ a.walkTo(110, lane, 7), b.walkTo(115, lane, 7) ]);
    } else {
      await Promise.all([ a.walkTo(110, lane, 7), b.walkTo(-10, lane, 7) ]);
    }
    await Promise.all([ a.remove(), b.remove() ]);
  }

  async function scenarioTranslation(layer, lanes) {
    const lane = lanes[0];
    const human = spawnWalker(layer, { kind:'human', size:28, opacity:0.13, x:-8,  y:lane, facing:'right' });
    const robot = spawnWalker(layer, { kind:'robot', size:30, opacity:0.13, x:108, y:lane, facing:'left'  });
    await Promise.all([ human.walkTo(43, lane, 7.5), robot.walkTo(55, lane, 7.5) ]);
    human.face('right'); robot.face('left');
    await sleep(600);
    await robot.say('[ ]', 1200);
    await human.say('?',   1100);
    await robot.say('·',   1100);
    await human.say('!',   1200);
    await sleep(500);
    if (Math.random() < 0.5) {
      await Promise.all([ human.walkTo(110, lane, 7), robot.walkTo(115, lane, 7) ]);
    } else {
      await Promise.all([ robot.walkTo(-12, lane, 7), human.walkTo(-6, lane, 7) ]);
    }
    await Promise.all([ human.remove(), robot.remove() ]);
  }

  async function scenarioPiedPiper(layer, lanes) {
    const lane = lanes[0];
    const robot = spawnWalker(layer, { kind:'robot', size:32, opacity:0.14, x:-10, y:lane, facing:'right' });
    const h1 = spawnWalker(layer, { kind:'human', size:26, opacity:0.11, x:32, y:lane, facing:'right' });
    const h2 = spawnWalker(layer, { kind:'human', size:26, opacity:0.11, x:62, y:lane, facing:'right' });
    h1.stop(); h2.stop();
    await robot.walkTo(28, lane, 5.5);
    await robot.say('[ ]', 1200);
    await Promise.all([
      robot.walkTo(58, lane, 5),
      sleep(220).then(() => h1.walkTo(53, lane, 4.8)),
    ]);
    h1.stop();
    await robot.say('[ ]', 1100);
    await Promise.all([
      robot.walkTo(120, lane, 7),
      sleep(180).then(() => h1.walkTo(115, lane, 6.8)),
      sleep(400).then(() => h2.walkTo(110, lane, 6.5)),
    ]);
    await Promise.all([ robot.remove(), h1.remove(), h2.remove() ]);
  }

  async function scenarioMurmuration(layer, lanes) {
    const lane1 = lanes[0], lane2 = lanes[1];
    const dY = lane2 - lane1;
    const offsets = [
      { dx: 0,  dy: 0         },
      { dx: 4,  dy: dY * 0.45 },
      { dx: 8,  dy: dY * 0.85 },
      { dx: 11, dy: dY * 0.20 },
      { dx: 14, dy: dY * 0.65 },
    ];
    const startX = -15;
    const figs = offsets.map((o) => spawnWalker(layer, {
      kind:'human', size: 24 + Math.random()*6, opacity: 0.09 + Math.random()*0.03,
      x: startX + o.dx, y: lane1 + o.dy, facing: 'right',
    }));
    await Promise.all(figs.map((f, i) => f.walkTo(startX + offsets[i].dx + 38, lane1 + offsets[i].dy, 5.5)));
    figs.forEach((f) => f.face('front'));
    await sleep(1400);
    await Promise.all(figs.map((f, i) => f.walkTo(startX + offsets[i].dx + 70, lane1 + offsets[i].dy, 4.8)));
    figs.forEach((f) => f.face('front'));
    await sleep(1100);
    await Promise.all(figs.map((f, i) => f.walkTo(startX + offsets[i].dx + 130, lane1 + offsets[i].dy, 6.5)));
    await Promise.all(figs.map((f) => f.remove()));
  }

  async function scenarioWhisper(layer, lanes) {
    const lane = lanes[0];
    const op = 0.12;
    const a = spawnWalker(layer, { kind:'human', size:26, opacity:op, x:-10, y:lane, facing:'right' });
    const b = spawnWalker(layer, { kind:'human', size:26, opacity:op, x:-10, y:lane, facing:'right' });
    const c = spawnWalker(layer, { kind:'human', size:26, opacity:op, x:-10, y:lane, facing:'right' });
    await Promise.all([
      (async () => { await a.walkTo(25, lane, 4.5); a.face('right'); })(),
      (async () => { await sleep(800);  await b.walkTo(45, lane, 5.3); b.face('right'); })(),
      (async () => { await sleep(1600); await c.walkTo(65, lane, 6.2); c.face('right'); })(),
    ]);
    await sleep(600);
    await a.say('·', 1100); await sleep(280);
    await b.say('·', 1100); await sleep(280);
    await c.say('!', 1300); await sleep(500);
    await Promise.all([
      a.walkTo(-12, lane, 6.5),
      b.walkTo(112, lane, 8),
      c.walkTo(115, lane, 5),
    ]);
    await Promise.all([ a.remove(), b.remove(), c.remove() ]);
  }

  async function scenarioWatcher(layer, lanes) {
    const lane1 = lanes[0], lane2 = lanes[1];
    const robot = spawnWalker(layer, { kind:'robot', size:32, opacity:0.14, x:-8, y:lane1, facing:'right' });
    await robot.walkTo(50, lane1, 8);
    robot.face('front');
    await sleep(600);
    const human = spawnWalker(layer, { kind:'human', size:28, opacity:0.12, x:-10, y:lane2, facing:'right' });
    await human.walkTo(38, lane2, 4.5);
    robot.setBright(true);
    await human.walkTo(62, lane2, 3.5);
    await human.walkTo(120, lane2, 6.5);
    robot.setBright(false);
    await sleep(700);
    robot.face('right');
    await sleep(280);
    await robot.walkTo(120, lane1, 7);
    await Promise.all([ robot.remove(), human.remove() ]);
  }

  async function scenarioCrowdsourcing(layer, lanes) {
    const lane1 = lanes[0], lane2 = lanes[1];
    const robot = spawnWalker(layer, { kind:'robot', size:30, opacity:0.14, x:50, y:lane1, facing:'right' });
    robot.face('front');
    await sleep(500);
    const contributors = [
      { spawnX: -12, spawnY: lane2,     exitX: 115, exitY: lane2 + 2 },
      { spawnX: 112, spawnY: lane2 - 3, exitX: -15, exitY: lane2 - 5 },
      { spawnX: -12, spawnY: lane2 + 4, exitX: 115, exitY: lane2 + 5 },
    ];
    for (let i = 0; i < contributors.length; i++) {
      const c = contributors[i];
      const h = spawnWalker(layer, {
        kind:'human', size: 24 + Math.random()*4, opacity: 0.10 + Math.random()*0.03,
        x: c.spawnX, y: c.spawnY, facing: c.spawnX < 0 ? 'right' : 'left',
      });
      const meetX = 48 + Math.random() * 4;
      const meetY = lane2 - 4 + Math.random() * 6;
      await h.walkTo(meetX, meetY, 3.5);
      h.face(c.spawnX < 0 ? 'right' : 'left');
      await h.say('·', 1000);
      if (i === 1) robot.setBright(true);
      h.walkTo(c.exitX, c.exitY, 3.5).then(() => h.remove());
      await sleep(700);
    }
    await sleep(800);
    robot.face('right');
    await sleep(300);
    await robot.walkTo(120, lane1, 5.5);
    await robot.remove();
  }

  async function scenarioFilterBubbles(layer, lanes) {
    const lane = lanes[0];
    const robot = spawnWalker(layer, { kind:'robot', size:30, opacity:0.14, x:50, y:lane, facing:'right' });
    robot.face('front');
    await sleep(400);
    const hL = spawnWalker(layer, { kind:'human', size:26, opacity:0.12, x:-10, y:lane, facing:'right' });
    const hR = spawnWalker(layer, { kind:'human', size:26, opacity:0.12, x:110, y:lane, facing:'left'  });
    await Promise.all([ hL.walkTo(36, lane, 5), hR.walkTo(64, lane, 5) ]);
    hL.face('right'); hR.face('left');
    await sleep(500);
    robot.face('left');
    await sleep(280);
    await robot.say('[ ]', 1200);
    await hL.say('!', 1000);
    await sleep(300);
    hL.walkTo(-15, lane, 5).then(() => hL.remove());
    await sleep(600);
    robot.face('right');
    await sleep(280);
    await robot.say('[ ]', 1200);
    await hR.say('!', 1000);
    await sleep(300);
    hR.walkTo(115, lane, 5).then(() => hR.remove());
    await sleep(900);
    await robot.walkTo(120, lane, 5.5);
    await robot.remove();
  }

  async function scenarioConsensus(layer, lanes) {
    const lane1 = lanes[0], lane2 = lanes[1];
    const dY = lane2 - lane1;
    const positions = [
      { spawnX: -12, spawnY: lane1,        gatherX: 46, gatherY: lane1 + 1     },
      { spawnX: -12, spawnY: lane1 + dY,   gatherX: 50, gatherY: lane1 + dY/2  },
      { spawnX: 112, spawnY: lane1,        gatherX: 54, gatherY: lane1 + 3     },
      { spawnX: 112, spawnY: lane1 + dY,   gatherX: 48, gatherY: lane1 + dY - 1 },
      { spawnX: -12, spawnY: lane1 + dY/2, gatherX: 52, gatherY: lane1 + dY/2 + 1 },
    ];
    const figs = positions.map((p) => spawnWalker(layer, {
      kind:'human', size: 24 + Math.random()*6, opacity: 0.10 + Math.random()*0.03,
      x: p.spawnX, y: p.spawnY, facing: p.spawnX < 0 ? 'right' : 'left',
    }));
    await Promise.all(figs.map((f, i) => f.walkTo(positions[i].gatherX, positions[i].gatherY, 6)));
    figs.forEach((f) => f.face('front'));
    await sleep(900);
    await figs[0].say('·', 900); await sleep(180);
    await figs[3].say('?', 900); await sleep(180);
    await figs[2].say('·', 900); await sleep(500);
    const goRight = Math.random() < 0.5;
    const exitX = goRight ? 130 : -20;
    figs.forEach((f) => f.face(goRight ? 'right' : 'left'));
    await sleep(300);
    await Promise.all(figs.map((f, i) =>
      f.walkTo(exitX + (Math.random()-0.5)*6, positions[i].gatherY, 6)
    ));
    await Promise.all(figs.map((f) => f.remove()));
  }

  async function scenarioWhistleblower(layer, lanes) {
    const lane1 = lanes[0], lane2 = lanes[1];
    const dY = lane2 - lane1;
    const offsets = [
      { dx:  0, dy: dY * 0.2  },
      { dx:  4, dy: dY * 0.7  },
      { dx:  7, dy: dY * 0.4  },
      { dx: 10, dy: dY * 0.1  },
      { dx: 13, dy: dY * 0.55 },
    ];
    const figs = offsets.map((o) => spawnWalker(layer, {
      kind:'human', size: 24 + Math.random()*5, opacity: 0.10 + Math.random()*0.03,
      x: -15 + o.dx, y: lane1 + o.dy, facing: 'right',
    }));
    await Promise.all(figs.map((f, i) =>
      f.walkTo(42 + offsets[i].dx, lane1 + offsets[i].dy, 6)
    ));
    const wb = figs[2];
    wb.face('left');
    await sleep(250);
    await wb.say('!', 1300);
    await Promise.all([
      wb.walkTo(-15, wb.y, 6),
      figs[0].walkTo(130 + offsets[0].dx, lane1 + offsets[0].dy, 6),
      figs[1].walkTo(130 + offsets[1].dx, lane1 + offsets[1].dy, 6),
      figs[3].walkTo(130 + offsets[3].dx, lane1 + offsets[3].dy, 6),
      figs[4].walkTo(130 + offsets[4].dx, lane1 + offsets[4].dy, 6),
    ]);
    await Promise.all(figs.map((f) => f.remove()));
  }

  // ── Scheduler ────────────────────────────────────────────────────
  const LANES = [12, 24, 36, 48, 60, 72, 84];
  const REGISTRY = [
    { fn: scenarioDialogue,      lanes: 1, weight: 4 },
    { fn: scenarioTranslation,   lanes: 1, weight: 3 },
    { fn: scenarioWhisper,       lanes: 1, weight: 3 },
    { fn: scenarioPiedPiper,     lanes: 1, weight: 3 },
    { fn: scenarioMurmuration,   lanes: 2, weight: 2 },
    { fn: scenarioWatcher,       lanes: 2, weight: 2 },
    { fn: scenarioCrowdsourcing, lanes: 2, weight: 3 },
    { fn: scenarioFilterBubbles, lanes: 1, weight: 3 },
    { fn: scenarioConsensus,     lanes: 2, weight: 2 },
    { fn: scenarioWhistleblower, lanes: 2, weight: 3 },
  ];

  function pickWeighted(list) {
    const total = list.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    for (let i = 0; i < list.length; i++) {
      r -= list[i].weight;
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  function allocateLanes(inUse, count) {
    if (count === 1) {
      const free = LANES.filter((l) => !inUse.has(l));
      if (!free.length) return null;
      return [free[Math.floor(Math.random() * free.length)]];
    }
    const adjacent = [];
    for (let i = 0; i < LANES.length - 1; i++) {
      if (!inUse.has(LANES[i]) && !inUse.has(LANES[i + 1])) {
        adjacent.push([LANES[i], LANES[i + 1]]);
      }
    }
    if (adjacent.length) return adjacent[Math.floor(Math.random() * adjacent.length)];
    return null;
  }

  async function scenarioLoop(layer) {
    const inUse = new Set();
    await sleep(2500 + Math.random() * 2500);
    while (true) {
      if (document.hidden) { await sleep(2000); continue; }
      const entry = pickWeighted(REGISTRY);
      const lanes = allocateLanes(inUse, entry.lanes);
      if (lanes) {
        lanes.forEach((l) => inUse.add(l));
        Promise.resolve()
          .then(() => entry.fn(layer, lanes))
          .catch((e) => console.warn('scenario error:', e))
          .finally(() => lanes.forEach((l) => inUse.delete(l)));
      }
      await sleep(7000 + Math.random() * 5000);
    }
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const layer = document.createElement('div');
    layer.className = 'creatures-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    PROCESSION.forEach((p) => spawnBackgroundWalker(layer, p));
    scenarioLoop(layer);

    document.addEventListener('visibilitychange', () => {
      layer.classList.toggle('layer-paused', document.hidden);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
