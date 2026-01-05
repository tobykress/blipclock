// ---- Blip time helpers ----
function getBlipTime() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const msSinceMidnight = now - midnight;
  const blipUnit = 86400000 / 100000; // 0.864 s
  const blipCount = Math.floor(msSinceMidnight / blipUnit);
  return blipCount.toString().padStart(5, '0'); // "00000" .. "99999"
}

// ---- Digital slots for fixed-width digits ----
let digitSpans = [];
function initDigitalSlots() {
  const container = document.getElementById('blipTime');
  if (!container) return;
  container.textContent = '';            // clear the "00000"
  for (let i = 0; i < 5; i++) {
    const s = document.createElement('span');
    s.className = 'digit';
    s.textContent = '0';
    container.appendChild(s);
    digitSpans.push(s);
  }
}

function updateBlipDisplay() {
  const str = getBlipTime();             // "00000" .. "99999"
  if (digitSpans.length === 5) {
    for (let i = 0; i < 5; i++) {
      digitSpans[i].textContent = str[i];
    }
  } else {
    // fallback if init didn't run
    const el = document.getElementById("blipTime");
    if (el) el.textContent = str;
  }
}

// ---- Analog hands ----
function updateAnalogClock() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const ms = now - midnight;
  const dayMs = 86_400_000;

  const deciblip   = (ms / dayMs) * 10;          // 0..10 (continuous)
  const blip       = (deciblip % 1) * 10;
  const centiblip  = (blip % 1) * 10;
  const milliblip  = (centiblip % 1) * 10;
  const microblip  = (milliblip % 1) * 10;

  const set = (id, turns) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.transform = `rotate(${(turns * 36)}deg)`; // 10 divisions → 36° each
  };

  set("handDeci",  deciblip);
  set("handBlip",  blip);
  set("handCenti", centiblip);
  set("handMilli", milliblip);
  set("handMicro", microblip);
}

// Add a lightweight animation loop:
(function animateAnalog(){
  updateAnalogClock();
  requestAnimationFrame(animateAnalog);
})();

// Build 5 rows × 4 dots (bits: 8,4,2,1)
function initBinaryGrid() {
  const ids = ['Db','B','Cb','Mb','Ub'];
  ids.forEach(id => {
    const row = document.getElementById(`row${id}`);
    if (!row) return;
    if (row.children.length < 4) {
      row.innerHTML = '';                 // ensure exactly 4 dots
      for (let i = 0; i < 4; i++) {
        const dot = document.createElement('div');
        dot.className = 'bit';
        row.appendChild(dot);
      }
    }
  });
}

function updateBinaryClock() {
  const digits = getBlipTime().split('').map(Number); // [dB,b,cb,mb,ub]
  const ids = ['Db','B','Cb','Mb','Ub'];
  const bits = [8, 4, 2, 1]; // left → right
  for (let r = 0; r < 5; r++) {
    const row = document.getElementById(`row${ids[r]}`);
    if (!row) continue;
    const n = digits[r];
    for (let i = 0; i < 4; i++) {
      const dot = row.children[i];
      dot.classList.toggle('on', (n & bits[i]) !== 0);
    }
  }
}

// ---- Sand (color) clock ----
let sandReady = false, sandCtx, cw, ch, cols, grainSize, rows, stackHeight, fallingGrains;
function initSand() {
  const canvas = document.getElementById('sandCanvas');
  if (!canvas) return;

  sandCtx = canvas.getContext('2d');
  cw = canvas.width;
  ch = canvas.height;

  cols = 100;
  grainSize = cw / cols;
  rows = Math.floor(ch / grainSize);

  // Reset
  stackHeight = Array(cols).fill(0);
  fallingGrains = [];

  // Calculate current total grain target
  const now = new Date();
  const msSinceMidnight = now - new Date(now).setHours(0,0,0,0);
  const dayProgress = msSinceMidnight / 86400000;

  const totalGrains = cols * rows;
  const targetGrains = Math.floor(totalGrains * dayProgress);

  // Immediately fill base stack
  for (let i = 0; i < targetGrains; i++) {
    const col = i % cols;
    stackHeight[col]++;
  }

  sandReady = true;
  requestAnimationFrame(animateSandClock);
}


function launchGrain() {
  if (!sandReady) return;
  const x = Math.floor(Math.random() * cols);
  fallingGrains.push({ x, y: 0, targetY: ch - (stackHeight[x] + 1) * grainSize });
}
function animateSandClock() {
  if (!sandReady) return;

  sandCtx.clearRect(0, 0, cw, ch);
  sandCtx.fillStyle = '#008080';

  // Draw base sand
  for (let x = 0; x < cols; x++) {
    const h = stackHeight[x];
    if (h > 0) {
      sandCtx.fillRect(x * grainSize, ch - h * grainSize, grainSize, h * grainSize);
    }
  }

  // New grains over time
  const now = new Date();
const msSinceMidnight = now - new Date(now).setHours(0, 0, 0, 0);
const totalGrains = cols * rows;
const currentTarget = Math.floor(totalGrains * (msSinceMidnight / 86400000));
const currentBase = stackHeight.reduce((sum, h) => sum + h, 0);

// Drop exactly enough grains to match real-time progress
const grainsToAdd = currentTarget - currentBase;
const maxPerFrame = 2;

for (let i = 0; i < Math.min(grainsToAdd, maxPerFrame); i++) {
  const nextIndex = currentBase + i;
  const col = nextIndex % cols;
  fallingGrains.push({
    x: col,
    y: ch - stackHeight[col] * grainSize - grainSize,
    targetY: ch - (stackHeight[col] + 1) * grainSize
  });
}


  // Animate falling grains
  for (let i = fallingGrains.length - 1; i >= 0; i--) {
    const g = fallingGrains[i];
    g.y += grainSize * 0.3; // fall speed

    if (g.y >= g.targetY) {
      stackHeight[g.x]++;
      fallingGrains.splice(i, 1);
    }
  }

  // Draw falling grains
  for (const g of fallingGrains) {
    sandCtx.beginPath();
    sandCtx.arc(g.x * grainSize + grainSize/2, g.y + grainSize/2, grainSize/2, 0, Math.PI*2);
    sandCtx.fill();
  }

  requestAnimationFrame(animateSandClock);
}




// ---- Mode switching (unchanged except null-safety) ----
function switchMode(mode) {
  const modes = ['digital', 'analog', 'binary', 'sand'];

  // Hide all views
  modes.forEach(m => {
    const el = document.getElementById(`clock-${m}`);
    if (el) el.classList.add('hidden');
  });

  // Deactivate all nav buttons
  document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));

  // Show selected view
  const activeView = document.getElementById(`clock-${mode}`);
  if (activeView) activeView.classList.remove('hidden');

  // Activate nav button
  const buttonMap = {
  digital: '.top-left',
  analog: '.top-right',
  sand: '.bottom-left',
  binary: '.bottom-right'
};

  const activeBtn = document.querySelector(buttonMap[mode]);
  if (activeBtn) activeBtn.classList.add('active');

  // View-specific hooks
  if (mode === 'binary') {
    initBinaryGrid?.();
    updateBinaryClock?.();
  }
  if (mode === 'sand') {
    initSand?.();
  }
}


// ---- Master tick ----
function tick() {
  updateBlipDisplay();
  updateAnalogClock();
  updateBinaryClock();
  launchGrain(); // one grain per microblip
}
// Build the 0..9 numerals around the analog dial
function buildAnalogNumbers() {
  const container = document.getElementById('analogNumbers');
  if (!container || container.children.length) return; // already built
  for (let i = 0; i < 10; i++) {
    const d = document.createElement('div');
    d.className = 'number';
    d.style.setProperty('--n', i);
    d.textContent = i;
    container.appendChild(d);
  }
}

// Smooth, continuous hands (keep if you already replaced this earlier)
function updateAnalogClock() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const ms = now - midnight;
  const dayMs = 86_400_000;

  const deciblip   = (ms / dayMs) * 10;
  const blip       = (deciblip % 1) * 10;
  const centiblip  = (blip % 1) * 10;
  const milliblip  = (centiblip % 1) * 10;
  const microblip  = (milliblip % 1) * 10;

  const set = (id, turns) => {
    const el = document.getElementById(id);
    if (el) el.style.transform = `rotate(${turns * 36}deg)`;
  };
  set("handDeci",  deciblip);
  set("handBlip",  blip);
  set("handCenti", centiblip);
  set("handMilli", milliblip);
  set("handMicro", microblip);
}

// Lightweight rAF loop for the hands
(function animateAnalog(){
  updateAnalogClock();
  requestAnimationFrame(animateAnalog);
})();

// ===== Binary Clock (GLOBAL) =====
window.initBinaryGrid = function initBinaryGrid() {
  const ids = ['Db','B','Cb','Mb','Ub'];
  ids.forEach(id => {
    const row = document.getElementById(`row${id}`);
    if (!row) return;
    if (row.children.length !== 4) {
      row.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const dot = document.createElement('div');
        dot.className = 'bit';
        row.appendChild(dot);
      }
    }
  });
};

window.updateBinaryClock = function updateBinaryClock() {
  const digits = getBlipTime().split('').map(Number); // [dB,b,cb,mb,ub]
  const ids = ['Db','B','Cb','Mb','Ub'];
  const bits = [8,4,2,1]; // left→right
  for (let r = 0; r < 5; r++) {
    const row = document.getElementById(`row${ids[r]}`);
    if (!row) continue;
    const n = digits[r];
    for (let i = 0; i < 4; i++) {
      row.children[i].classList.toggle('on', (n & bits[i]) !== 0);
    }
  }
};


document.addEventListener('DOMContentLoaded', () => {
  buildAnalogNumbers?.();
  initDigitalSlots?.();

  window.initBinaryGrid();   // ensure dots exist at load

  initSand?.();
  tick();
  setInterval(tick, 864);
});

function toggleAbout() {
  const about = document.getElementById('aboutPage');
  const mainViews = document.querySelectorAll('.clock-container, .nav-button');
  const isShowing = !about.classList.contains('hidden');

  about.classList.toggle('hidden');

  mainViews.forEach(el => {
    if (!el.classList.contains('top-center')) {
      el.style.display = isShowing ? '' : 'none';
    }
  });
}

