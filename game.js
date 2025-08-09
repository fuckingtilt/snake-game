// --- КОНСТАНТИ ---
const COLORS = {
    PRIMARY_NEON: '#00e5ff', DANGER_NEON: '#ff3838', COIN_NEON: '#ffde00',
    DANGER_GLOW: 'rgba(255, 56, 56, 0.7)', COIN_GLOW: 'rgba(255, 222, 0, 0.7)',
    DARK_BG: '#01000d', DARK_PURPLE: '#1a0537', SHIELD_NEON: '#ffffff'
};
const POWERUP_TYPES = {
    SHIELD: { name: 'shield', color: '#ffffff', symbol: 'S' },
    SCORE_MULTIPLIER: { name: 'score', color: '#ff3838', symbol: 'x2' },
    COIN_MAGNET: { name: 'magnet', color: '#ffde00', symbol: 'M' }
};
const SNAKE_SPEED = 3.0;
const FOOD_SPAWN_CHANCE_COIN = 0.2;
const POWERUP_SPAWN_CHANCE = 0.05; // 5% шанс спавну при поїданні їжі
const LEADERBOARD_SIZE = 10;
const skins = [
    { id: 0, name: 'Неон', price: 0, colors: ['#00ff6a', '#00aaff'] },
    { id: 1, name: 'Пульсар', price: 500, colors: ['#ff00ff', '#ff3838'] },
    { id: 2, name: 'Сонячний', price: 750, colors: ['#ffde00', '#ff8c00'] },
    { id: 3, name: 'Аква', price: 1000, colors: ['#00ffff', '#0077ff'] },
    { id: 4, name: 'Глітч', price: 1250, colors: ['#ff00ff', '#00ffff'] },
    { id: 5, name: 'Пустота', price: 1500, colors: ['#9370db', '#483d8b'] },
    { id: 6, name: 'Плазма', price: 1750, colors: ['#fd5e53', '#ff00ff'] },
    { id: 7, name: 'Супернова', price: 2000, colors: ['#ffffff', '#ffde00'] },
    { id: 8, name: 'Ефірний', price: 2250, colors: ['#f0f8ff', '#add8e6'] },
    { id: 9, name: 'Сингулярність', price: 2500, colors: ['#ffffff', '#000000'] }
];

// --- DOM Елементи ---
const gameWrapper = document.querySelector('.game-wrapper');
const { mainMenu, gameScreen, gameOverScreen, shopScreen, leaderboardScreen, playButton, shopButton, leaderboardButton, restartButton, backToMenuButton, closeShopButton, backFromLeaderboard, canvas } = Object.fromEntries(
    ['mainMenu', 'gameScreen', 'gameOverScreen', 'shopScreen', 'leaderboardScreen', 'playButton', 'shopButton', 'leaderboardButton', 'restartButton', 'backToMenuButton', 'closeShopButton', 'backFromLeaderboard', 'canvas'].map(id => [id, document.getElementById(id)])
);
const ctx = canvas.getContext('2d');
const { scoreElement, highscoreElement, coinsElement, shopCoinsElement, finalScoreElement, newRecordText, skinList, highScoresList, coinScoresList, tabScores, tabCoins, powerupTimers } = Object.fromEntries(
    ['score', 'highscore', 'coins', 'shopCoins', 'finalScore', 'newRecordText', 'skinList', 'highScoresList', 'coinScoresList', 'tabScores', 'tabCoins', 'powerup-timers'].map(id => [id, document.getElementById(id)])
);
canvas.width = 420; canvas.height = 747;

// --- Аудіо менеджер ---
const AudioManager = {
    sounds: Object.fromEntries(
        ['eat', 'coin', 'powerup', 'death', 'click'].map(id => [id, document.getElementById(`sound-${id}`)])
    ),
    play(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(() => {});
        }
    }
};

// --- Глобальні змінні ---
let snake, foods = [], powerups = [], particles = [], bgParticles = [];
let score, highscore, coins, currentSkin, purchasedSkins, playerId;
let leaderboardScores, leaderboardCoins, activePowerups = {};
let running = false, touchStart = { x: 0, y: 0 }, velocity, animationFrameId;

// --- Класи ---
class Particle {
    constructor(x, y, color, sizeMultiplier = 1) {
        this.x = x; this.y = y; this.color = color;
        this.size = (Math.random() * 5 + 2) * sizeMultiplier;
        this.life = 1;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        this.velX = Math.cos(angle) * speed;
        this.velY = Math.sin(angle) * speed;
    }
    update() { this.x += this.velX; this.y += this.velY; this.life -= 0.03; if (this.size > 0.2) this.size -= 0.1; }
    draw(context) { context.fillStyle = this.color; context.globalAlpha = this.life; context.beginPath(); context.arc(this.x, this.y, this.size, 0, Math.PI * 2); context.fill(); }
}

class Snake {
    constructor() {
        this.head = { x: canvas.width / 2, y: canvas.height / 2 };
        this.path = []; this.length = 10; this.baseRadius = 7;
        this.segmentDistance = 4; this.applySkin(currentSkin);
    }
    applySkin(skin) { this.colorStart = skin.colors[0]; this.colorEnd = skin.colors[1]; }
    update(direction) { this.path.push({ ...this.head }); this.head.x += direction.x * SNAKE_SPEED; this.head.y += direction.y * SNAKE_SPEED; if (this.path.length > this.length * this.segmentDistance) this.path.shift(); }
    draw() {
        if (activePowerups.shield) { ctx.shadowColor = COLORS.SHIELD_NEON; ctx.shadowBlur = 30; }
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, this.colorStart); gradient.addColorStop(1, this.colorEnd);
        for (let i = 0; i < this.length; i++) {
            const pathIndex = this.path.length - 1 - (i * this.segmentDistance); if (pathIndex < 0) break;
            const pos = this.path[pathIndex]; const radius = this.baseRadius * (1 - i / (this.length * 1.2));
            ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(this.head.x, this.head.y, this.baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.colorStart; if (!activePowerups.shield) { ctx.shadowColor = this.colorStart; ctx.shadowBlur = 20; }
        ctx.fill(); ctx.shadowBlur = 0;
        const angle = (velocity.x === 0 && velocity.y === 0) ? -Math.PI / 2 : Math.atan2(velocity.y, velocity.x);
        const eyeOffsetX = Math.cos(angle + Math.PI / 2) * (this.baseRadius * 0.4); const eyeOffsetY = Math.sin(angle + Math.PI / 2) * (this.baseRadius * 0.4);
        ctx.beginPath(); ctx.arc(this.head.x + eyeOffsetX, this.head.y + eyeOffsetY, 1.5, 0, Math.PI * 2); ctx.arc(this.head.x - eyeOffsetX, this.head.y - eyeOffsetY, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'black'; ctx.fill();
    }
    checkCollisionSelf() { if(activePowerups.shield) return false; for (let i = 0; i < this.path.length - Math.floor(this.length * this.segmentDistance / 2); i++) if (Math.hypot(this.head.x - this.path[i].x, this.head.y - this.path[i].y) < this.baseRadius / 2) return true; return false; }
    grow() { this.length += 3; }
}

class Food {
    constructor() { this.spawn(); }
    spawn() { this.isCoin = Math.random() < FOOD_SPAWN_CHANCE_COIN; this.radius = this.isCoin ? 10 : 8; this.color = this.isCoin ? COLORS.COIN_NEON : COLORS.DANGER_NEON; this.shadow = this.isCoin ? COLORS.COIN_GLOW : COLORS.DANGER_GLOW; this.x = Math.random() * (canvas.width - 40) + 20; this.y = Math.random() * (canvas.height - 40) + 20; }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.shadowColor = this.shadow; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; if (this.isCoin) { ctx.fillStyle = '#a07d00'; ctx.font = `bold ${this.radius}px "${getComputedStyle(document.documentElement).getPropertyValue('--game-font').trim()}"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', this.x, this.y + 1); } }
}

class PowerUp {
    constructor() { this.spawn(); }
    spawn() { const types = Object.values(POWERUP_TYPES); this.type = types[Math.floor(Math.random() * types.length)]; this.radius = 12; this.x = Math.random() * (canvas.width - 40) + 20; this.y = Math.random() * (canvas.height - 40) + 20; }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.type.color; ctx.shadowColor = this.type.color; ctx.shadowBlur = 25; ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = COLORS.DARK_BG; ctx.font = `bold ${this.radius}px "${getComputedStyle(document.documentElement).getPropertyValue('--game-font').trim()}"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.type.symbol, this.x, this.y + 1); }
}

// --- Ігровий цикл ---
function gameLoop() {
    if (!running) return;
    handlePowerups();
    snake.update(velocity);
    checkCollisions();
    
    // Малювання
    const bgGradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 5, canvas.width / 2, canvas.height / 2, canvas.height);
    bgGradient.addColorStop(0, COLORS.DARK_PURPLE); bgGradient.addColorStop(1, COLORS.DARK_BG);
    ctx.fillStyle = bgGradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
    bgParticles.forEach(p => { p.update(); p.y > canvas.height ? p.y = 0 : null; p.draw(ctx); ctx.globalAlpha = 1; });
    particles.forEach((p, i) => { p.update(); p.draw(ctx); if (p.life <= 0) particles.splice(i, 1); });
    [...foods, ...powerups].forEach(f => f.draw());
    snake.draw();
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

function handlePowerups() {
    if(activePowerups.magnet) foods.filter(f => f.isCoin).forEach(coin => {
        const angle = Math.atan2(snake.head.y - coin.y, snake.head.x - coin.x);
        coin.x += Math.cos(angle) * 4; coin.y += Math.sin(angle) * 4;
    });
    for(const type in activePowerups) if(Date.now() > activePowerups[type]) delete activePowerups[type];
    updatePowerupTimersUI();
}

function checkCollisions() {
    [...foods, ...powerups].forEach((item, index) => {
        if (Math.hypot(snake.head.x - item.x, snake.head.y - item.y) < snake.baseRadius + item.radius) {
            if (item instanceof Food) {
                if (item.isCoin) { coins++; AudioManager.play('coin'); updateCoinLeaderboard(); createParticleBurst(item.x, item.y, COLORS.COIN_NEON); } 
                else { score += activePowerups.score ? 2 : 1; snake.grow(); AudioManager.play('eat'); if(Math.random() < POWERUP_SPAWN_CHANCE && powerups.length === 0) powerups.push(new PowerUp()); createParticleBurst(item.x, item.y, COLORS.DANGER_NEON); }
                foods.splice(index, 1); if(foods.length === 0) foods.push(new Food());
                updateUI(); saveData();
            } else if (item instanceof PowerUp) {
                activePowerups[item.type.name] = Date.now() + 10000; AudioManager.play('powerup');
                powerups.splice(index, 1);
            }
        }
    });
    const isOutOfBounds = snake.head.x < 0 || snake.head.x > canvas.width || snake.head.y < 0 || snake.head.y > canvas.height;
    if ((isOutOfBounds && !activePowerups.shield) || snake.checkCollisionSelf()) endGame();
    else if (isOutOfBounds && activePowerups.shield) { // Wall bounce
        if (snake.head.x < 0) snake.head.x = canvas.width; else if (snake.head.x > canvas.width) snake.head.x = 0;
        if (snake.head.y < 0) snake.head.y = canvas.height; else if (snake.head.y > canvas.height) snake.head.y = 0;
    }
}

// --- Початок/Кінець гри ---
function startGame() {
    switchScreen('gameScreen');
    snake = new Snake(); foods = [new Food()]; powerups = []; particles = [];
    score = 0; velocity = { x: 0, y: -1 }; running = true;
    activePowerups = {}; newRecordText.classList.add('hidden');
    updateUI(); if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

function endGame() {
    running = false; cancelAnimationFrame(animationFrameId);
    AudioManager.play('death'); if(navigator.vibrate) navigator.vibrate(200);
    if (score > highscore) highscore = score;
    finalScoreElement.textContent = score;
    checkForNewRecord(); saveData(); switchScreen('gameOverScreen');
}

// --- Керування UI та екранами ---
function switchScreen(screenId) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(screenId)?.classList.add('active'); }
function updateUI() { scoreElement.textContent = score; highscoreElement.textContent = highscore; coinsElement.textContent = coins; shopCoinsElement.textContent = coins; }
function createParticleBurst(x, y, color) { for (let i = 0; i < 15; i++) particles.push(new Particle(x, y, color, 1.2)); }
function updatePowerupTimersUI() {
    powerupTimers.innerHTML = '';
    for(const type in activePowerups) {
        const timeLeft = Math.ceil((activePowerups[type] - Date.now()) / 1000);
        const typeInfo = Object.values(POWERUP_TYPES).find(t => t.name === type);
        if(timeLeft > 0) powerupTimers.innerHTML += `<div class="timer-icon ${type}">${typeInfo.symbol} ${timeLeft}с</div>`;
    }
}

// --- Дані та інтеграція ---
function getPlayerId() {
    try {
        const tg = window.Telegram.WebApp;
        // Перевіряємо, чи є ім'я користувача, інакше використовуємо ім'я
        return tg.initDataUnsafe.user.username ? `@${tg.initDataUnsafe.user.username}` : tg.initDataUnsafe.user.first_name || 'PLAYER';
    } catch (e) {
        let id = localStorage.getItem('snake_playerId_v4');
        if (!id) { id = `PLAYER-${Math.random().toString(16).substr(2, 4).toUpperCase()}`; localStorage.setItem('snake_playerId_v4', id); }
        return id;
    }
}
function loadData() {
    playerId = getPlayerId();
    highscore = parseInt(localStorage.getItem('snake_highscore_v4')) || 0;
    coins = parseInt(localStorage.getItem('snake_coins_v4')) || 0;
    purchasedSkins = JSON.parse(localStorage.getItem('snake_purchasedSkins_v4')) || [0];
    const skinId = parseInt(localStorage.getItem('snake_currentSkin_v4')) || 0;
    currentSkin = skins.find(s => s.id === skinId) || skins[0];
    leaderboardScores = JSON.parse(localStorage.getItem('snake_leaderboardScores_v4')) || [];
    leaderboardCoins = JSON.parse(localStorage.getItem('snake_leaderboardCoins_v4')) || [];
}
function saveData() { localStorage.setItem('snake_highscore_v4', highscore); localStorage.setItem('snake_coins_v4', coins); localStorage.setItem('snake_purchasedSkins_v4', JSON.stringify(purchasedSkins)); localStorage.setItem('snake_currentSkin_v4', currentSkin.id); localStorage.setItem('snake_leaderboardScores_v4', JSON.stringify(leaderboardScores)); localStorage.setItem('snake_leaderboardCoins_v4', JSON.stringify(leaderboardCoins)); }

// --- Магазин та Лідерборди ---
function populateShop() {
    skinList.innerHTML = '';
    skins.forEach(skin => {
        const isPurchased = purchasedSkins.includes(skin.id); const isEquipped = currentSkin.id === skin.id;
        const item = document.createElement('div'); item.className = 'skin-item';
        if (isEquipped) item.classList.add('selected'); if (!isPurchased) item.classList.add('locked');
        item.innerHTML = `<div class="skin-preview" style="background: linear-gradient(90deg, ${skin.colors[0]}, ${skin.colors[1]})"></div><div>${skin.name}</div>${isPurchased ? (isEquipped ? '<div class="equipped-badge">✓</div>' : '') : `<div class="skin-price"><span class="coin-icon"></span> ${skin.price}</div>`}`;
        item.addEventListener('click', () => { AudioManager.play('click'); if (isPurchased) { currentSkin = skin; saveData(); populateShop(); } else if (coins >= skin.price) { coins -= skin.price; purchasedSkins.push(skin.id); currentSkin = skin; saveData(); populateShop(); updateUI(); } else { item.style.animation = 'shake 0.5s'; setTimeout(() => item.style.animation = '', 500); } });
        skinList.appendChild(item);
    });
}

function showLeaderboards() { AudioManager.play('click'); populateLeaderboard(highScoresList, leaderboardScores, 'score'); populateLeaderboard(coinScoresList, leaderboardCoins, 'coins'); switchScreen('leaderboardScreen'); }
function populateLeaderboard(listElement, data, type) { listElement.innerHTML = ''; if (data.length === 0) { listElement.innerHTML = '<li>Тут поки пусто...</li>'; return; } data.forEach((entry, index) => { const li = document.createElement('li'); const value = type === 'score' ? entry.score : entry.coins; li.innerHTML = `<span class="rank">${index + 1}.</span><span class="name">${entry.name}</span><span class="score">${value}</span>`; if (entry.name === playerId) li.style.background = "rgba(0, 229, 255, 0.2)"; listElement.appendChild(li); }); }
function checkForNewRecord() {
    const isNewHighScore = score > 0 && (leaderboardScores.length < LEADERBOARD_SIZE || score > (leaderboardScores[leaderboardScores.length - 1]?.score || 0));
    if (isNewHighScore) { addOrUpdateLeaderboard(leaderboardScores, { name: playerId, score: score }, 'score'); newRecordText.classList.remove('hidden'); }
}
function updateCoinLeaderboard() { addOrUpdateLeaderboard(leaderboardCoins, { name: playerId, coins: coins }, 'coins'); }
function addOrUpdateLeaderboard(leaderboard, newEntry, key) {
    const existingIndex = leaderboard.findIndex(e => e.name === newEntry.name);
    if (existingIndex !== -1) leaderboard[existingIndex] = newEntry;
    else leaderboard.push(newEntry);
    leaderboard.sort((a, b) => b[key] - a[key]);
    if (leaderboard.length > LEADERBOARD_SIZE) leaderboard.pop();
}

// --- Обробники подій ---
[playButton, restartButton, backToMenuButton, shopButton, closeShopButton, leaderboardButton, backFromLeaderboard, tabScores, tabCoins].forEach(btn => btn.addEventListener('click', () => AudioManager.play('click')));
playButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
backToMenuButton.addEventListener('click', () => switchScreen('mainMenu'));
shopButton.addEventListener('click', () => { updateUI(); populateShop(); switchScreen('shopScreen'); });
closeShopButton.addEventListener('click', () => switchScreen('mainMenu'));
leaderboardButton.addEventListener('click', showLeaderboards);
backFromLeaderboard.addEventListener('click', () => switchScreen('mainMenu'));
tabScores.addEventListener('click', () => { tabScores.classList.add('active'); tabCoins.classList.remove('active'); highScoresList.classList.add('active'); coinScoresList.classList.remove('active'); });
tabCoins.addEventListener('click', () => { tabCoins.classList.add('active'); tabScores.classList.remove('active'); coinScoresList.classList.add('active'); highScoresList.classList.remove('active'); });

document.addEventListener('keydown', e => { if (!running) return; switch (e.key) { case 'ArrowUp': case 'w': if (velocity.y === 0) velocity = { x: 0, y: -1 }; break; case 'ArrowDown': case 's': if (velocity.y === 0) velocity = { x: 0, y: 1 }; break; case 'ArrowLeft': case 'a': if (velocity.x === 0) velocity = { x: -1, y: 0 }; break; case 'ArrowRight': case 'd': if (velocity.x === 0) velocity = { x: 1, y: 0 }; break; } });
document.addEventListener('touchstart', e => { touchStart.x = e.touches[0].clientX; touchStart.y = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchmove', e => { if (!running) return; e.preventDefault(); const touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY }; const deltaX = touchMove.x - touchStart.x; const deltaY = touchMove.y - touchStart.y; if (Math.abs(deltaX) > 20 || Math.abs(deltaY) > 20) { if (Math.abs(deltaX) > Math.abs(deltaY)) { if (deltaX > 0 && velocity.x === 0) velocity = { x: 1, y: 0 }; else if (deltaX < 0 && velocity.x === 0) velocity = { x: -1, y: 0 }; } else { if (deltaY > 0 && velocity.y === 0) velocity = { x: 0, y: 1 }; else if (deltaY < 0 && velocity.y === 0) velocity = { x: 0, y: -1 }; } touchStart = touchMove; } }, { passive: false });

// --- Ініціалізація ---
function init() {
    try { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); } catch (e) { console.log("Not in Telegram"); }
    loadData(); updateUI();
    for(let i=0; i < 50; i++) bgParticles.push(new Particle(Math.random()*canvas.width, Math.random()*canvas.height, 'rgba(255,255,255,0.2)', 0.5));
    switchScreen('mainMenu');
}

init();