// --- КОНСТАНТИ ---
const COLORS = { PRIMARY_NEON: '#00e5ff', DANGER_NEON: '#ff3838', COIN_NEON: '#ffde00', DARK_BG: '#01000d', DARK_PURPLE: '#1a0537' };
const SNAKE_SPEED = 2.5; // Швидкість зменшено
const LEADERBOARD_SIZE = 10;
const skins = [
    { id: 0, name: 'Стандарт', price: 0, colors: ['#00ff6a', '#00aaff'] },
    { id: 1, name: 'Електрик', price: 200, colors: ['#00ffff', '#0077ff'] },
    { id: 2, name: 'Вогняний', price: 300, colors: ['#ff8c00', '#ff0000'] },
    { id: 3, name: 'Отрута', price: 400, colors: ['#7fff00', '#ff00ff'] },
    { id: 4, name: 'Пустота', price: 500, colors: ['#9370db', '#483d8b'] },
    { id: 5, name: 'Світанок', price: 600, colors: ['#fd5e53', '#ffde00'] },
    { id: 6, name: 'Кристал', price: 700, colors: ['#f0f8ff', '#add8e6'] },
    { id: 7, name: 'Глітч', price: 800, colors: ['#ff00ff', '#00ffff'] },
    { id: 8, name: 'Плазма', price: 900, colors: ['#fd5e53', '#ff00ff'] },
    { id: 9, name: 'Золотий', price: 1000, colors: ['#ffd700', '#ffb347'] }
];
const quests = [
    { id: 1, description: "Набити 100 очок", goal: 100, reward: 20, completed: false }
];

// --- ІНІЦІАЛІЗАЦІЯ DOM ---
const gameWrapper = document.querySelector('.game-wrapper');
const elements = {};
['mainMenu', 'gameScreen', 'gameOverScreen', 'shopScreen', 'leaderboardScreen', 'playButton', 'shopButton', 'leaderboardButton', 'restartButton', 'backToMenuButton', 'closeShopButton', 'backFromLeaderboard', 'canvas', 'score', 'highscore', 'coins', 'stars', 'shopCoins', 'shopStars', 'finalScore', 'questCompleteText', 'skinList', 'highScoresList', 'boss-health-container', 'boss-health-bar', 'boss-hint']
.forEach(id => elements[id] = document.getElementById(id));
const ctx = elements.canvas.getContext('2d');
elements.canvas.width = 420; elements.canvas.height = 747;

// --- Глобальні змінні ---
let snake, food, boss, projectiles = [], particles = [], bgParticles = [];
let score, highscore, coins, stars, currentSkin, purchasedSkins, playerId;
let leaderboardScores;
let bossSpawnedThisGame = false;
let running = false, touchStart = { x: 0, y: 0 }, velocity, animationFrameId;

// --- Класи ---
class Particle { constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.size = Math.random() * 5 + 2; this.life = 1; const angle = Math.random() * Math.PI * 2; const speed = Math.random() * 4 + 1; this.velX = Math.cos(angle) * speed; this.velY = Math.sin(angle) * speed; } update() { this.x += this.velX; this.y += this.velY; this.life -= 0.03; if (this.size > 0.2) this.size -= 0.1; } draw(context) { context.fillStyle = this.color; context.globalAlpha = this.life; context.beginPath(); context.arc(this.x, this.y, this.size, 0, Math.PI * 2); context.fill(); } }
class BgParticle extends Particle { constructor() { super(Math.random() * elements.canvas.width, Math.random() * elements.canvas.height, 'rgba(255,255,255,0.2)'); this.velY = Math.random() * 0.5 + 0.1; this.velX = 0; } update() { this.y += this.velY; if(this.y > elements.canvas.height) { this.y = 0; this.x = Math.random() * elements.canvas.width; } } }
class Snake {
    constructor() { this.head = { x: elements.canvas.width / 2, y: elements.canvas.height / 2 }; this.path = []; this.length = 5; this.baseRadius = 5; this.segmentDistance = 3; this.applySkin(currentSkin); } // Змійка стала меншою
    applySkin(skin) { this.colorStart = skin.colors[0]; this.colorEnd = skin.colors[1]; }
    update(direction) { this.path.push({ ...this.head }); this.head.x += direction.x * SNAKE_SPEED; this.head.y += direction.y * SNAKE_SPEED; if (this.path.length > this.length * this.segmentDistance) this.path.shift(); }
    draw() { ctx.globalAlpha = 1; const gradient = ctx.createLinearGradient(0, 0, elements.canvas.width, elements.canvas.height); gradient.addColorStop(0, this.colorStart); gradient.addColorStop(1, this.colorEnd); for (let i = 0; i < this.length; i++) { const pathIndex = this.path.length - 1 - (i * this.segmentDistance); if (pathIndex < 0) break; const pos = this.path[pathIndex]; const radius = this.baseRadius * (1 - i / (this.length * 1.2)); ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill(); } ctx.beginPath(); ctx.arc(this.head.x, this.head.y, this.baseRadius, 0, Math.PI * 2); ctx.fillStyle = this.colorStart; ctx.shadowColor = this.colorStart; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; const angle = (velocity.x === 0 && velocity.y === 0) ? -Math.PI / 2 : Math.atan2(velocity.y, velocity.x); const eyeOffsetX = Math.cos(angle + Math.PI / 2) * (this.baseRadius * 0.4); const eyeOffsetY = Math.sin(angle + Math.PI / 2) * (this.baseRadius * 0.4); ctx.beginPath(); ctx.arc(this.head.x + eyeOffsetX, this.head.y + eyeOffsetY, 1.5, 0, Math.PI * 2); ctx.arc(this.head.x - eyeOffsetX, this.head.y - eyeOffsetY, 1.5, 0, Math.PI * 2); ctx.fillStyle = 'black'; ctx.fill(); }
    checkCollisionSelf() { for (let i = 0; i < this.path.length - Math.floor(this.length * this.segmentDistance / 2); i++) if (Math.hypot(this.head.x - this.path[i].x, this.head.y - this.path[i].y) < this.baseRadius / 2) return true; return false; }
    grow() { this.length += 2; }
}
class Food { constructor(isCoin = false) { this.spawn(isCoin); } spawn(isCoin) { this.isCoin = isCoin; this.radius = this.isCoin ? 10 : 8; this.color = this.isCoin ? COLORS.COIN_NEON : COLORS.DANGER_NEON; this.x = Math.random() * (elements.canvas.width - 40) + 20; this.y = Math.random() * (elements.canvas.height - 40) + 20; } draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; if (this.isCoin) { ctx.fillStyle = '#a07d00'; ctx.font = `bold ${this.radius+2}px "${getComputedStyle(document.documentElement).getPropertyValue('--game-font').trim()}"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', this.x, this.y + 1); } } }
class Boss {
    constructor() { this.x = elements.canvas.width / 2; this.y = 100; this.radius = 30; this.maxHealth = 5; this.health = this.maxHealth; this.speed = 1.5; this.shootCooldown = 90; }
    update() { this.x += this.speed; if (this.x < this.radius || this.x > elements.canvas.width - this.radius) { this.speed *= -1; } this.shootCooldown--; if (this.shootCooldown <= 0) { projectiles.push(new Projectile(this.x, this.y)); this.shootCooldown = 90; } }
    draw() { ctx.fillStyle = COLORS.DANGER_NEON; ctx.shadowColor = COLORS.DANGER_NEON; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    takeDamage() { this.health--; elements['boss-health-bar'].style.width = `${(this.health / this.maxHealth) * 100}%`; for (let i = 0; i < 10; i++) particles.push(new Particle(this.x, this.y, COLORS.DANGER_NEON)); if (this.health <= 0) { for (let i = 0; i < 50; i++) particles.push(new Particle(this.x, this.y, COLORS.DANGER_NEON)); stars += 10; boss = null; elements['boss-health-container'].classList.add('hidden'); } }
}
class Projectile { constructor(x, y) { this.x = x; this.y = y; this.radius = 5; this.speed = 3; } update() { this.y += this.speed; } draw() { ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); } }

// --- Ігровий цикл та логіка ---
function gameLoop() {
    if (!running) return;
    snake.update(velocity); checkCollisions();
    const bgGradient = ctx.createRadialGradient(elements.canvas.width / 2, elements.canvas.height / 2, 5, elements.canvas.width / 2, elements.canvas.height / 2, elements.canvas.height); bgGradient.addColorStop(0, COLORS.DARK_PURPLE); bgGradient.addColorStop(1, COLORS.DARK_BG);
    ctx.fillStyle = bgGradient; ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
    bgParticles.forEach(p => p.update()); [...bgParticles, ...particles].forEach(p => p.draw(ctx)); ctx.globalAlpha = 1;
    particles = particles.filter(p => p.life > 0);
    if(food) food.draw();
    if (boss) { boss.update(); boss.draw(); }
    projectiles.forEach((p, i) => { p.update(); p.draw(); if (Math.hypot(snake.head.x - p.x, snake.head.y - p.y) < snake.baseRadius + p.radius) endGame(); if (p.y > elements.canvas.height) projectiles.splice(i, 1); });
    snake.draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function checkCollisions() {
    if (food && Math.hypot(snake.head.x - food.x, snake.head.y - food.y) < snake.baseRadius + food.radius) {
        if (food.isCoin) { coins++; } else { score++; snake.grow(); }
        for (let i = 0; i < 15; i++) particles.push(new Particle(food.x, food.y, food.color));
        food = new Food(Math.random() < 0.2);
    }
    if (score >= 50 && !bossSpawnedThisGame && !boss) {
        boss = new Boss();
        bossSpawnedThisGame = true;
        elements['boss-health-container'].classList.remove('hidden');
        elements['boss-health-bar'].style.width = '100%';
        showHint("Вдарте його головою 5 разів!");
    }
    if (boss && Math.hypot(snake.head.x - boss.x, snake.head.y - boss.y) < snake.baseRadius + boss.radius) {
        boss.takeDamage();
        snake.length = Math.max(3, snake.length - 1);
    }
    if (snake.head.x < 0 || snake.head.x > elements.canvas.width || snake.head.y < 0 || snake.head.y > elements.canvas.height || snake.checkCollisionSelf()) endGame();
}

// --- Початок/Кінець гри ---
function startGame() { switchScreen('gameScreen'); snake = new Snake(); food = new Food(); boss = null; projectiles = []; bossSpawnedThisGame = false; elements['boss-health-container'].classList.add('hidden'); particles = []; score = 0; velocity = { x: 0, y: -1 }; running = true; elements.questCompleteText.classList.add('hidden'); updateUI(); if (animationFrameId) cancelAnimationFrame(animationFrameId); gameLoop(); }
function endGame() { running = false; cancelAnimationFrame(animationFrameId); if(navigator.vibrate) navigator.vibrate(200); gameWrapper.style.transform = 'translate(5px, -5px)'; setTimeout(() => gameWrapper.style.transform = '', 100); if (score > highscore) highscore = score; elements.finalScore.textContent = score; checkQuestCompletion(); saveData(); switchScreen('gameOverScreen'); }

// --- UI, Дані та Інтеграція ---
function switchScreen(screenId) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(screenId)?.classList.add('active'); }
function updateUI() { ['score', 'highscore', 'coins', 'stars', 'shopCoins', 'shopStars'].forEach(id => elements[id].textContent = window[id]); }
function showHint(message) { elements.bossHint.textContent = message; elements.bossHint.classList.remove('hidden'); setTimeout(() => { elements.bossHint.style.opacity = '0'; setTimeout(() => { elements.bossHint.classList.add('hidden'); elements.bossHint.style.opacity = '1'; }, 500); }, 3000); }
function getPlayerId() { try { const tg = window.Telegram.WebApp; return tg.initDataUnsafe.user.username ? `@${tg.initDataUnsafe.user.username}` : (tg.initDataUnsafe.user.first_name || 'PLAYER'); } catch (e) { let id = localStorage.getItem('snake_playerId_v10'); if (!id) { id = `PLAYER-${Math.random().toString(16).substr(2, 4).toUpperCase()}`; localStorage.setItem('snake_playerId_v10', id); } return id; } }
function loadData() { playerId = getPlayerId(); highscore = parseInt(localStorage.getItem('snake_highscore_v10')) || 0; coins = parseInt(localStorage.getItem('snake_coins_v10')) || 0; stars = parseInt(localStorage.getItem('snake_stars_v10')) || 0; purchasedSkins = JSON.parse(localStorage.getItem('snake_purchasedSkins_v10')) || [0]; const skinId = parseInt(localStorage.getItem('snake_currentSkin_v10')) || 0; currentSkin = skins.find(s => s.id === skinId) || skins[0]; leaderboardScores = JSON.parse(localStorage.getItem('snake_leaderboardScores_v10')) || []; quests[0].completed = JSON.parse(localStorage.getItem('snake_quest1_completed_v10')) || false; }
function saveData() { localStorage.setItem('snake_highscore_v10', highscore); localStorage.setItem('snake_coins_v10', coins); localStorage.setItem('snake_stars_v10', stars); localStorage.setItem('snake_purchasedSkins_v10', JSON.stringify(purchasedSkins)); localStorage.setItem('snake_currentSkin_v10', currentSkin.id); localStorage.setItem('snake_leaderboardScores_v10', JSON.stringify(leaderboardScores)); localStorage.setItem('snake_quest1_completed_v10', JSON.stringify(quests[0].completed)); }

// --- Магазин та Лідерборди ---
function populateShop() { elements.skinList.innerHTML = ''; skins.forEach(skin => { const isPurchased = purchasedSkins.includes(skin.id); const isEquipped = currentSkin.id === skin.id; const item = document.createElement('div'); item.className = 'skin-item'; if (isEquipped) item.classList.add('selected'); if (!isPurchased) item.classList.add('locked'); item.innerHTML = `<div class="skin-preview" style="background: linear-gradient(90deg, ${skin.colors[0]}, ${skin.colors[1]})"></div><div>${skin.name}</div>${isPurchased ? (isEquipped ? '<div class="equipped-badge">✓</div>' : '') : `<div class="skin-price"><span class="coin-icon"></span> ${skin.price}</div>`}`; item.addEventListener('click', () => { if (isPurchased) { currentSkin = skin; saveData(); populateShop(); } else if (coins >= skin.price) { coins -= skin.price; purchasedSkins.push(skin.id); currentSkin = skin; saveData(); populateShop(); updateUI(); } }); elements.skinList.appendChild(item); }); }
function showLeaderboards() { populateLeaderboard(elements.highScoresList, leaderboardScores, 'score'); switchScreen('leaderboardScreen'); }
function populateLeaderboard(listElement, data, type) { listElement.innerHTML = ''; if (data.length === 0) { listElement.innerHTML = '<li>Тут поки пусто...</li>'; return; } data.forEach((entry, index) => { const li = document.createElement('li'); const value = entry.score; li.innerHTML = `<span class="rank">${index + 1}.</span><span class="name">${entry.name}</span><span class="score">${value}</span>`; if (entry.name === playerId) li.classList.add('current-player'); listElement.appendChild(li); }); }

// --- Логіка завдань ---
function checkQuestCompletion() {
    if (!quests[0].completed && score >= quests[0].goal) {
        coins += quests[0].reward;
        quests[0].completed = true;
        elements.questCompleteText.textContent = `ЗАВДАННЯ ВИКОНАНО: +${quests[0].reward} МОНЕТ!`;
        elements.questCompleteText.classList.remove('hidden');
    }
}

// --- Обробники подій ---
elements.playButton.addEventListener('click', startGame); elements.restartButton.addEventListener('click', startGame); elements.backToMenuButton.addEventListener('click', () => switchScreen('mainMenu'));
elements.shopButton.addEventListener('click', () => { updateUI(); populateShop(); switchScreen('shopScreen'); });
elements.closeShopButton.addEventListener('click', () => switchScreen('mainMenu')); elements.leaderboardButton.addEventListener('click', showLeaderboards); elements.backFromLeaderboard.addEventListener('click', () => switchScreen('mainMenu'));
document.addEventListener('keydown', e => { if (!running) return; switch (e.key) { case 'ArrowUp': case 'w': if (velocity.y === 0) velocity = { x: 0, y: -1 }; break; case 'ArrowDown': case 's': if (velocity.y === 0) velocity = { x: 0, y: 1 }; break; case 'ArrowLeft': case 'a': if (velocity.x === 0) velocity = { x: -1, y: 0 }; break; case 'ArrowRight': case 'd': if (velocity.x === 0) velocity = { x: 1, y: 0 }; break; } });
document.addEventListener('touchstart', e => { touchStart.x = e.touches[0].clientX; touchStart.y = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchmove', e => { if (!running) return; e.preventDefault(); const touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY }; const deltaX = touchMove.x - touchStart.x; const deltaY = touchMove.y - touchStart.y; if (Math.abs(deltaX) > 20 || Math.abs(deltaY) > 20) { if (Math.abs(deltaX) > Math.abs(deltaY)) { if (deltaX > 0 && velocity.x === 0) velocity = { x: 1, y: 0 }; else if (deltaX < 0 && velocity.x === 0) velocity = { x: -1, y: 0 }; } else { if (deltaY > 0 && velocity.y === 0) velocity = { x: 0, y: 1 }; else if (deltaY < 0 && velocity.y === 0) velocity = { x: 0, y: -1 }; } touchStart = touchMove; } }, { passive: false });

// --- Ініціалізація ---
function init() {
    try { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); } catch (e) { console.log("Could not init Telegram WebApp"); }
    if(bgParticles.length === 0) for(let i=0; i < 50; i++) bgParticles.push(new BgParticle());
    loadData();
    updateUI();
    switchScreen('mainMenu');
}

init();