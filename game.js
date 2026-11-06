const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const finalScoreEl = document.getElementById('finalScore');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

const keys = {
  left: false,
  right: false,
  fire: false,
};

let gameState = 'menu';
let game = null;

function resetGame() {
  game = {
    player: {
      x: canvas.width / 2,
      y: canvas.height - 48,
      width: 54,
      height: 18,
      speed: 420,
      cooldown: 0,
      baseColor: '#75d8ff',
    },
    keys: { left: false, right: false },
    bullets: [],
    meteors: [],
    particles: [],
    score: 0,
    lives: 3,
    level: 1,
    spawnTimer: 0,
    fireRate: 0.35,
    meteorSpeed: 180,
    lastTime: 0,
    meteorsDestroyed: 0,
  };
}

function setOverlay(overlay, visible) {
  overlay.classList.toggle('hidden', !visible);
  overlay.classList.toggle('visible', visible);
}

function startGame() {
  resetGame();
  gameState = 'playing';
  setOverlay(startOverlay, false);
  setOverlay(gameOverOverlay, false);
}

function endGame() {
  gameState = 'over';
  finalScoreEl.textContent = String(game.score);
  setOverlay(gameOverOverlay, true);
}

function updateHUD() {
  scoreEl.textContent = String(game.score);
  livesEl.textContent = String(game.lives);
  levelEl.textContent = String(game.level);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createBullet(x, y) {
  game.bullets.push({
    x,
    y,
    radius: 5,
    speed: 540,
    color: '#ffd76a',
  });
}

function createMeteor() {
  const side = Math.random() < 0.5 ? -1 : 1;
  const x = side === -1 ? -30 : canvas.width + 30;
  const y = -30 - Math.random() * 120;
  const radius = 14 + Math.random() * 22;
  const speed = game.meteorSpeed + Math.random() * 110;
  const drift = (Math.random() - 0.5) * 110;

  game.meteors.push({
    x,
    y,
    radius,
    speed,
    drift,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.5,
    color: '#ff8a5b',
  });
}

function spawnBurst(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
    const speed = 50 + Math.random() * 140;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 2.5,
      life: 0.7 + Math.random() * 0.7,
      color,
    });
  }
}

function firePlayerWeapon() {
  if (game.player.cooldown > 0) return;
  createBullet(game.player.x, game.player.y - 18);
  createBullet(game.player.x - 14, game.player.y - 10);
  createBullet(game.player.x + 14, game.player.y - 10);
  game.player.cooldown = game.fireRate;
}

function updatePlayer(dt) {
  const moveDir = Number(keys.right) - Number(keys.left);
  game.player.x += moveDir * game.player.speed * dt;
  game.player.x = clamp(game.player.x, 30, canvas.width - 30);
  game.player.cooldown = Math.max(0, game.player.cooldown - dt);

  if (keys.fire && !game.keys.fire) {
    firePlayerWeapon();
  }
  game.keys.fire = keys.fire;
}

function updateBullets(dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    bullet.y -= bullet.speed * dt;

    if (bullet.y < -20) {
      game.bullets.splice(i, 1);
      continue;
    }

    for (let j = game.meteors.length - 1; j >= 0; j--) {
      const meteor = game.meteors[j];
      const dx = bullet.x - meteor.x;
      const dy = bullet.y - meteor.y;
      const distance = Math.hypot(dx, dy);

      if (distance < meteor.radius + bullet.radius) {
        game.bullets.splice(i, 1);
        game.meteors.splice(j, 1);
        game.score += 10;
        game.meteorsDestroyed += 1;
        spawnBurst(meteor.x, meteor.y, '#ffd76a', 12);
        break;
      }
    }
  }
}

function updateMeteors(dt) {
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    const count = Math.min(2 + Math.floor(game.level / 2), 6);
    for (let i = 0; i < count; i++) createMeteor();
    game.spawnTimer = Math.max(0.4, 1.2 - game.level * 0.08);
  }

  for (let i = game.meteors.length - 1; i >= 0; i--) {
    const meteor = game.meteors[i];
    meteor.y += meteor.speed * dt;
    meteor.x += meteor.drift * dt;
    meteor.rotation += meteor.spin * dt;

    if (meteor.y - meteor.radius > canvas.height + 30) {
      game.meteors.splice(i, 1);
      game.lives -= 1;
      spawnBurst(meteor.x, meteor.y, '#ff6f61', 18);
      if (game.lives <= 0) {
        endGame();
      }
      continue;
    }

    if (meteor.x < -100 || meteor.x > canvas.width + 100) {
      meteor.drift *= -0.8;
      meteor.x = clamp(meteor.x, -80, canvas.width + 80);
    }
  }

  if (game.meteorsDestroyed > 0 && game.meteorsDestroyed % 12 === 0) {
    game.level = 1 + Math.floor(game.meteorsDestroyed / 12);
    game.meteorSpeed = 180 + game.level * 18;
    game.fireRate = Math.max(0.12, 0.35 - game.level * 0.02);
  }
}

function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const particle = game.particles[i];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    if (particle.life <= 0) {
      game.particles.splice(i, 1);
    }
  }
}

function update(dt) {
  if (gameState !== 'playing') return;
  updatePlayer(dt);
  updateBullets(dt);
  updateMeteors(dt);
  updateParticles(dt);
  updateHUD();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#0d1732');
  gradient.addColorStop(0.5, '#0a1a32');
  gradient.addColorStop(1, '#071017');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 80; i++) {
    const x = (i * 97 + (performance.now() * 0.02) % 100) % canvas.width;
    const y = (i * 53) % canvas.height;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = '#8ad7ff';
  ctx.fillRect(0, canvas.height - 18, canvas.width, 18);
  ctx.fillStyle = '#06111b';
  ctx.fillRect(0, canvas.height - 12, canvas.width, 12);
}

function drawPlayer() {
  const { x, y, width, height } = game.player;
  const bodyColor = '#7fe0ff';
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(x, y - height);
  ctx.lineTo(x + width * 0.5, y + height);
  ctx.lineTo(x - width * 0.5, y + height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d2f7ff';
  ctx.fillRect(x - 6, y - 16, 12, 10);
  ctx.fillStyle = '#2ab0ff';
  ctx.fillRect(x - 18, y + 6, 36, 9);
}

function drawBullets() {
  for (const bullet of game.bullets) {
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMeteors() {
  for (const meteor of game.meteors) {
    ctx.save();
    ctx.translate(meteor.x, meteor.y);
    ctx.rotate(meteor.rotation);
    ctx.fillStyle = meteor.color;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const angle = (Math.PI * 2 * i) / 7;
      const radius = meteor.radius * (0.72 + (i % 2) * 0.28);
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of game.particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life * 1.2);
    ctx.fillRect(particle.x, particle.y, particle.radius * 2, particle.radius * 2);
    ctx.globalAlpha = 1;
  }
}

function drawBaseShield() {
  ctx.fillStyle = '#2f5d73';
  ctx.fillRect(0, canvas.height - 18, canvas.width, 18);
  ctx.fillStyle = '#7af0c8';
  ctx.fillRect(0, canvas.height - 16, canvas.width, 6);
}

function render() {
  drawBackground();
  if (gameState === 'menu' || gameState === 'over') {
    if (game) {
      drawPlayer();
      drawBullets();
      drawMeteors();
      drawParticles();
      drawBaseShield();
    }
    return;
  }

  drawPlayer();
  drawBullets();
  drawMeteors();
  drawParticles();
  drawBaseShield();
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - (game?.lastTime ?? timestamp)) / 1000, 0.033);
  if (game) {
    game.lastTime = timestamp;
    update(dt);
  }
  render();
  requestAnimationFrame(gameLoop);
}

function handleKeyChange(event, isDown) {
  const key = event.key.toLowerCase();
  if (key === 'a' || key === 'arrowleft') keys.left = isDown;
  if (key === 'd' || key === 'arrowright') keys.right = isDown;
  if (key === ' ' || key === 'w') {
    keys.fire = isDown;
    if (isDown && gameState === 'playing') firePlayerWeapon();
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.preventDefault();
}

window.addEventListener('keydown', (event) => handleKeyChange(event, true));
window.addEventListener('keyup', (event) => handleKeyChange(event, false));

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

document.querySelectorAll('[data-action]').forEach((button) => {
  const action = button.dataset.action;
  const press = (event) => {
    event.preventDefault();
    if (action === 'left') keys.left = true;
    if (action === 'right') keys.right = true;
    if (action === 'fire') {
      keys.fire = true;
      if (gameState === 'playing') firePlayerWeapon();
    }
  };

  const release = (event) => {
    event.preventDefault();
    if (action === 'left') keys.left = false;
    if (action === 'right') keys.right = false;
    if (action === 'fire') keys.fire = false;
  };

  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointerleave', release);
  button.addEventListener('pointercancel', release);
});

resetGame();
updateHUD();
requestAnimationFrame(gameLoop);
