// --- КОНСТАНТИ ---
// ВАЖЛИВО! Цю адресу ти маєш змінити на адресу свого сервера, коли захостиш його на Pela.
const SERVER_URL = 'http://localhost:3000'; 

const COLORS = { PRIMARY_NEON: '#00e5ff', DANGER_NEON: '#ff3838', COIN_NEON: '#ffde00', DARK_BG: '#01000d', DARK_PURPLE: '#1a0537', COMBO_NEON: '#a200ff', GHOST_NEON: '#ffffff' };
const POWERUP_TYPES = { GHOST: 'ghost', GOLD_RUSH: 'gold_rush' };
const SNAKE_SPEED = 3.0;
const POWERUP_SPAWN_CHANCE = 0.08;
const LEADERBOARD_SIZE = 10;
const MAX_COMBO_TIME = 150; 
const skins = [ { id: 0, name: 'Стандарт', price: 0, colors: ['#00ff6a', '#00aaff'] }, { id: 1, name: 'Електрик', price: 200, colors: ['#00ffff', '#0077ff'] }, { id: 2, name: 'Вогняний', price: 300, colors: ['#ff8c00', '#ff0000'] }, { id: 3, name: 'Отрута', price: 400, colors: ['#7fff00', '#ff00ff'] }, { id: 4, name: 'Пустота', price: 500, colors: ['#9370db', '#483d8b'] }, { id: 5, name: 'Світанок', price: 600, colors: ['#fd5e53', '#ffde00'] }, { id: 6, name: 'Кристал', price: 700, colors: ['#f0f8ff', '#add8e6'] }, { id: 7, name: 'Глітч', price: 800, colors: ['#ff00ff', '#00ffff'] }, { id: 8, name: 'Плазма', price: 900, colors: ['#fd5e53', '#ff00ff'] }, { id: 9, name: 'Золотий', price: 1000, colors: ['#ffd700', '#ffb347'] }, { id: 10, name: 'Супернова', price: 1100, colors: ['#ffffff', '#ffde00'] }, { id: 11, name: 'Кіберпанк', price: 1200, colors: ['#ff00ff', '#00e5ff'] }, { id: 12, name: 'Магма', price: 1300, colors: ['#ff4500', '#dc143c'] }, { id: 13, name: 'Аврора', price: 1400, colors: ['#40e0d0', '#ff8c00'] }, { id: 14, name: 'Тінь', price: 1500, colors: ['#333333', '#808080'] }, { id: 15, name: 'Квантовий', price: 1600, colors: ['#00ff7f', '#dda0dd'] }, { id: 16, name: 'Ангельський', price: 1700, colors: ['#ffffff', '#fffacd'] }, { id: 17, name: 'Демонічний', price: 1800, colors: ['#8b0000', '#ff0000'] }, { id: 18, 'name': 'Голограма', price: 1900, colors: ['#00e5ff', '#ff00ff']}, { id: 19, 'name': 'Сингулярність', price: 2000, colors: ['#ffffff', '#000000']} ];

// --- ІНІЦІАЛІЗАЦІЯ DOM ---
const gameWrapper = document.querySelector('.game-wrapper');
const elements = {};
['mainMenu', 'gameScreen', 'gameOverScreen', 'shopScreen', 'leaderboardScreen', 'playButton', 'shopButton', 'leaderboardButton', 'restartButton', 'backToMenuButton', 'closeShopButton', 'backFromLeaderboard', 'canvas', 'score', 'highscore', 'coins', 'shopCoins', 'finalScore', 'newRecordText', 'skinList', 'highScoresList', 'coinScoresList', 'tabScores', 'tabCoins', 'powerup-timers', 'combo-bar', 'combo-text']
.forEach(id => elements[id] = document.getElementById(id));
const ctx = elements.canvas.getContext('2d');
elements.canvas.width = 420; elements.canvas.height = 747;

// --- Глобальні змінні ---
let snake, foods = [], powerup, particles = [], bgParticles = [];
let score, highscore, coins, currentSkin, purchasedSkins, playerId;
let leaderboardScores = [], leaderboardCoins = [], combo, comboTimer, activePowerups = {};
let running = false, touchStart = { x: 0, y: 0 }, velocity, animationFrameId;

// --- Класи ---
class Particle { constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.size = Math.random() * 5 + 2; this.life = 1; const angle = Math.random() * Math.PI * 2; const speed = Math.random() * 4 + 1; this.velX = Math.cos(angle) * speed; this.velY = Math.sin(angle) * speed; } update() { this.x += this.velX; this.y += this.velY; this.life -= 0.03; if (this.size > 0.2) this.size -= 0.1; } draw(context) { context.fillStyle = this.color; context.globalAlpha = this.life; context.beginPath(); context.arc(this.x, this.y, this.size, 0, Math.PI * 2); context.fill(); } }
class BgParticle extends Particle { constructor() { super(Math.random() * elements.canvas.width, Math.random() * elements.canvas.height, 'rgba(255,255,255,0.2)'); this.velY = Math.random() * 0.5 + 0.1; this.velX = 0; } update() { this.y += this.velY; if(this.y > elements.canvas.height) { this.y = 0; this.x = Math.random() * elements.canvas.width; } } }
class Snake {
    constructor() { this.head = { x: elements.canvas.width / 2, y: elements.canvas.height / 2 }; this.path = []; this.length = 10; this.baseRadius = 7; this.segmentDistance = 4; this.applySkin(currentSkin); }
    applySkin(skin) { this.colorStart = skin.colors[0]; this.colorEnd = skin.colors[1]; }
    update(direction) { this.path.push({ ...this.head }); this.head.x += direction.x * SNAKE_SPEED; this.head.y += direction.y * SNAKE_SPEED; if (this.path.length > this.length * this.segmentDistance) this.path.shift(); }
    draw() { ctx.globalAlpha = activePowerups.ghost ? 0.5 : 1; if (activePowerups.ghost) { ctx.shadowColor = COLORS.GHOST_NEON; ctx.shadowBlur = 30; } const gradient = ctx.createLinearGradient(0, 0, elements.canvas.width, elements.canvas.height); gradient.addColorStop(0, this.colorStart); gradient.addColorStop(1, this.colorEnd); for (let i = 0; i < this.length; i++) { const pathIndex = this.path.length - 1 - (i * this.segmentDistance); if (pathIndex < 0) break; const pos = this.path[pathIndex]; const radius = this.baseRadius * (1 - i / (this.length * 1.2)); ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill(); } ctx.beginPath(); ctx.arc(this.head.x, this.head.y, this.baseRadius, 0, Math.PI * 2); ctx.fillStyle = this.colorStart; if (!activePowerups.ghost) { ctx.shadowColor = this.colorStart; ctx.shadowBlur = 20; } ctx.fill(); ctx.shadowBlur = 0; const angle = (velocity.x === 0 && velocity.y === 0) ? -Math.PI / 2 : Math.atan2(velocity.y, velocity.x); const eyeOffsetX = Math.cos(angle + Math.PI / 2) * (this.baseRadius * 0.4); const eyeOffsetY = Math.sin(angle + Math.PI / 2) * (this.baseRadius * 0.4); ctx.beginPath(); ctx.arc(this.head.x + eyeOffsetX, this.head.y + eyeOffsetY, 1.5, 0, Math.PI * 2); ctx.arc(this.head.x - eyeOffsetX, this.head.y - eyeOffsetY, 1.5, 0, Math.PI * 2); ctx.fillStyle = 'black'; ctx.fill(); ctx.globalAlpha = 1; }
    checkCollisionSelf() { if (activePowerups.ghost) return false; for (let i = 0; i < this.path.length - Math.floor(this.length * this.segmentDistance / 2); i++) if (Math.hypot(this.head.x - this.path[i].x, this.head.y - this.path[i].y) < this.baseRadius / 2) return true; return false; }
    grow() { this.length += 3; }
}
class Food { constructor() { this.spawn(); } spawn() { this.isCoin = Math.random() < 0.2; this.radius = this.isCoin ? 10 : 8; this.color = this.isCoin ? COLORS.COIN_NEON : COLORS.DANGER_NEON; this.x = Math.random() * (elements.canvas.width - 40) + 20; this.y = Math.random() * (elements.canvas.height - 40) + 20; } draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; if (this.isCoin) { ctx.fillStyle = '#a07d00'; ctx.font = `bold ${this.radius+2}px "${getComputedStyle(document.documentElement).getPropertyValue('--game-font').trim()}"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', this.x, this.y + 1); } } }
class PowerUp { constructor() { this.spawn(); } spawn() { this.type = Math.random() < 0.5 ? POWERUP_TYPES.GHOST : POWERUP_TYPES.GOLD_RUSH; this.radius = 12; this.x = Math.random() * (elements.canvas.width - 40) + 20; this.y = Math.random() * (elements.canvas.height - 40) + 20; } draw() { ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.globalAlpha = 0.8; ctx.fillStyle = this.type === POWERUP_TYPES.GHOST ? COLORS.GHOST_NEON : COLORS.COIN_NEON; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 25; ctx.fill(); ctx.restore(); ctx.fillStyle = 'black'; ctx.font = 'bold 10px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.type === POWERUP_TYPES.GHOST ? '👻' : '★', this.x, this.y + 1); } }

// --- Ігровий цикл та логіка ---
function gameLoop() { if (!running) return; handlePowerups(); snake.update(velocity); checkCollisions(); const bgGradient = ctx.createRadialGradient(elements.canvas.width / 2, elements.canvas.height / 2, 5, elements.canvas.width / 2, elements.canvas.height / 2, elements.canvas.height); bgGradient.addColorStop(0, COLORS.DARK_PURPLE); bgGradient.addColorStop(1, COLORS.DARK_BG); ctx.fillStyle = bgGradient; ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height); bgParticles.forEach(p => p.update()); [...bgParticles, ...particles].forEach(p => p.draw(ctx)); ctx.globalAlpha = 1; particles = particles.filter(p => p.life > 0); foods.forEach(f => f.draw()); if(powerup) powerup.draw(); snake.draw(); animationFrameId = requestAnimationFrame(gameLoop); }
function handlePowerups() { if (comboTimer > 0) comboTimer--; else combo = 1; for(const type in activePowerups) if(Date.now() > activePowerups[type]) delete activePowerups[type]; updateIndicatorsUI(); }
function checkCollisions() {
    foods.forEach((foodItem, index) => {
        if (Math.hypot(snake.head.x - foodItem.x, snake.head.y - foodItem.y) < snake.baseRadius + foodItem.radius) {
            if (foodItem.isCoin) { coins++; saveData(); } else { combo++; comboTimer = MAX_COMBO_TIME; score += combo; snake.grow(); if(Math.random() < POWERUP_SPAWN_CHANCE && !powerup) powerup = new PowerUp(); }
            for (let i = 0; i < 15; i++) particles.push(new Particle(foodItem.x, foodItem.y, foodItem.color));
            foods.splice(index, 1);
        }
    });
    if (foods.length === 0) foods.push(new Food());

    if(powerup && Math.hypot(snake.head.x - powerup.x, snake.head.y - powerup.y) < snake.baseRadius + powerup.radius) {
        activePowerups[powerup.type] = Date.now() + 10000;
        if(powerup.type === POWERUP_TYPES.GOLD_RUSH) foods.forEach(f => { f.isCoin = true; f.color = COLORS.COIN_NEON; f.radius = 10; });
        powerup = null;
    }
    const isOutOfBounds = snake.head.x < 0 || snake.head.x > elements.canvas.width || snake.head.y < 0 || snake.head.y > elements.canvas.height;
    if ((isOutOfBounds && !activePowerups.ghost) || snake.checkCollisionSelf()) endGame();
}

// --- Початок/Кінець гри ---
function startGame() { switchScreen('gameScreen'); snake = new Snake(); foods = [new Food()]; powerup = null; particles = []; score = 0; combo = 1; comboTimer = 0; velocity = { x: 0, y: -1 }; running = true; activePowerups = {}; elements.newRecordText.classList.add('hidden'); updateUI(); if (animationFrameId) cancelAnimationFrame(animationFrameId); gameLoop(); }
function endGame() { running = false; cancelAnimationFrame(animationFrameId); if(navigator.vibrate) navigator.vibrate(200); gameWrapper.style.transform = 'translate(5px, -5px)'; setTimeout(() => gameWrapper.style.transform = '', 100); if (score > highscore) { highscore = score; } elements.finalScore.textContent = score; saveDataToServer(); switchScreen('gameOverScreen'); }

// --- РОБОТА З СЕРВЕРОМ ---
async function loadDataFromServer() {
    try {
        const response = await fetch(`${SERVER_URL}/leaderboard`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        leaderboardScores = data.scores || [];
        leaderboardCoins = data.coins || [];
    } catch (error) { console.error("Не вдалося завантажити лідерборди:", error); leaderboardScores = []; leaderboardCoins = []; }
}
async function saveDataToServer() {
    try {
        const response = await fetch(`${SERVER_URL}/leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: playerId, score: score, coins: coins }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.newRecord) { elements.newRecordText.classList.remove('hidden'); }
    } catch (error) { console.error("Не вдалося відправити результат:", error); }
}
async function showLeaderboards() { await loadDataFromServer(); populateLeaderboard(elements.highScoresList, leaderboardScores, 'score'); populateLeaderboard(elements.coinScoresList, leaderboardCoins, 'coins'); switchScreen('leaderboardScreen'); }

// --- ЛОКАЛЬНІ ДАНІ ---
function getPlayerId() { try { const tg = window.Telegram.WebApp; return tg.initDataUnsafe.user.username ? `@${tg.initDataUnsafe.user.username}` : (tg.initDataUnsafe.user.first_name || 'PLAYER'); } catch (e) { let id = localStorage.getItem('snake_playerId_v8'); if (!id) { id = `PLAYER-${Math.random().toString(16).substr(2, 4).toUpperCase()}`; localStorage.setItem('snake_playerId_v8', id); } return id; } }
function loadData() { playerId = getPlayerId(); highscore = parseInt(localStorage.getItem('snake_highscore_v8')) || 0; coins = parseInt(localStorage.getItem('snake_coins_v8')) || 0; purchasedSkins = JSON.parse(localStorage.getItem('snake_purchasedSkins_v8')) || [0]; const skinId = parseInt(localStorage.getItem('snake_currentSkin_v8')) || 0; currentSkin = skins.find(s => s.id === skinId) || skins[0]; }
function saveData() { localStorage.setItem('snake_highscore_v8', highscore); localStorage.setItem('snake_coins_v8', coins); localStorage.setItem('snake_purchasedSkins_v8', JSON.stringify(purchasedSkins)); localStorage.setItem('snake_currentSkin_v8', currentSkin.id); }

// --- Решта функцій (UI, Магазин, Обробники подій) ---
function updateUI() { ['score', 'highscore', 'coins', 'shopCoins'].forEach(id => elements[id].textContent = window[id]); }
function updateIndicatorsUI() { elements['combo-bar'].style.width = `${(comboTimer / MAX_COMBO_TIME) * 100}%`; elements['combo-text'].textContent = `x${combo}`; elements['powerup-timers'].innerHTML = ''; for(const type in activePowerups) { const timeLeft = Math.ceil((activePowerups[type] - Date.now()) / 1000); if(timeLeft > 0) elements['powerup-timers'].innerHTML += `<div class="timer-icon ${type}">${type === 'ghost' ? '👻' : '★'} ${timeLeft}с</div>`; } }
function populateShop() { elements.skinList.innerHTML = ''; skins.forEach(skin => { const isPurchased = purchasedSkins.includes(skin.id); const isEquipped = currentSkin.id === skin.id; const item = document.createElement('div'); item.className = 'skin-item'; if (isEquipped) item.classList.add('selected'); if (!isPurchased) item.classList.add('locked'); item.innerHTML = `<div class="skin-preview" style="background: linear-gradient(90deg, ${skin.colors[0]}, ${skin.colors[1]})"></div><div>${skin.name}</div>${isPurchased ? (isEquipped ? '<div class="equipped-badge">✓</div>' : '') : `<div class="skin-price"><span class="coin-icon"></span> ${skin.price}</div>`}`; item.addEventListener('click', () => { if (isPurchased) { currentSkin = skin; saveData(); populateShop(); } else if (coins >= skin.price) { coins -= skin.price; purchasedSkins.push(skin.id); currentSkin = skin; saveData(); populateShop(); updateUI(); } }); elements.skinList.appendChild(item); }); }
function populateLeaderboard(listElement, data, type) { listElement.innerHTML = ''; if (data.length === 0) { listElement.innerHTML = '<li>Тут поки пусто...</li>'; return; } data.forEach((entry, index) => { const li = document.createElement('li'); const value = type === 'score' ? entry.score : entry.coins; li.innerHTML = `<span class="rank">${index + 1}.</span><span class="name">${entry.name}</span><span class="score">${value}</span>`; if (entry.name === playerId) li.classList.add('current-player'); listElement.appendChild(li); }); }

// Обробники подій
elements.playButton.addEventListener('click', startGame); elements.restartButton.addEventListener('click', startGame); elements.backToMenuButton.addEventListener('click', () => switchScreen('mainMenu'));
elements.shopButton.addEventListener('click', () => { updateUI(); populateShop(); switchScreen('shopScreen'); });
elements.closeShopButton.addEventListener('click', () => switchScreen('mainMenu')); elements.leaderboardButton.addEventListener('click', showLeaderboards); elements.backFromLeaderboard.addEventListener('click', () => switchScreen('mainMenu'));
elements.tabScores.addEventListener('click', () => { elements.tabScores.classList.add('active'); elements.tabCoins.classList.remove('active'); elements.highScoresList.classList.add('active'); elements.coinScoresList.classList.remove('active'); });
elements.tabCoins.addEventListener('click', () => { elements.tabCoins.classList.add('active'); elements.tabScores.classList.remove('active'); elements.coinScoresList.classList.add('active'); elements.highScoresList.classList.remove('active'); });
document.addEventListener('keydown', e => { if (!running) return; switch (e.key) { case 'ArrowUp': case 'w': if (velocity.y === 0) velocity = { x: 0, y: -1 }; break; case 'ArrowDown': case 's': if (velocity.y === 0) velocity = { x: 0, y: 1 }; break; case 'ArrowLeft': case 'a': if (velocity.x === 0) velocity = { x: -1, y: 0 }; break; case 'ArrowRight': case 'd': if (velocity.x === 0) velocity = { x: 1, y: 0 }; break; } });
document.addEventListener('touchstart', e => { touchStart.x = e.touches[0].clientX; touchStart.y = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchmove', e => { if (!running) return; e.preventDefault(); const touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY }; const deltaX = touchMove.x - touchStart.x; const deltaY = touchMove.y - touchStart.y; if (Math.abs(deltaX) > 20 || Math.abs(deltaY) > 20) { if (Math.abs(deltaX) > Math.abs(deltaY)) { if (deltaX > 0 && velocity.x === 0) velocity = { x: 1, y: 0 }; else if (deltaX < 0 && velocity.x === 0) velocity = { x: -1, y: 0 }; } else { if (deltaY > 0 && velocity.y === 0) velocity = { x: 0, y: 1 }; else if (deltaY < 0 && velocity.y === 0) velocity = { x: 0, y: -1 }; } touchStart = touchMove; } }, { passive: false });

// --- Ініціалізація ---
function init() {
    try { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); } catch (e) { console.log("Could not init Telegram WebApp"); }
    if(bgParticles.length === 0) for(let i=0; i < 50; i++) bgParticles.push(new BgParticle());
    loadData(); updateUI();
    switchScreen('mainMenu');
}

init();