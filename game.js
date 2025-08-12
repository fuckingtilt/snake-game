// --- КОНСТАНТИ ---
const COLORS = { PRIMARY_NEON: '#00e5ff', DANGER_NEON: '#ff3838', COIN_NEON: '#ffde00', DARK_BG: '#01000d', DARK_PURPLE: '#1a0537', BOSS_NEON: '#ff00ff' };
const SNAKE_SPEED = 2.5; // Швидкість зменшено
const LEADERBOARD_SIZE = 10;
const BOSS_TRIGGER_SCORE = 50;
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
    { id: 9, name: 'Золотий', price: 1000, colors: ['#ffd700', '#ffb347'] },
    { id: 10, name: 'Супернова', price: 1100, colors: ['#ffffff', '#ffde00'] },
    { id: 11, name: 'Кіберпанк', price: 1200, colors: ['#ff00ff', '#00e5ff'] },
    { id: 12, name: 'Магма', price: 1300, colors: ['#ff4500', '#dc143c'] },
    { id: 13, name: 'Аврора', price: 1400, colors: ['#40e0d0', '#ff8c00'] },
    { id: 14, name: 'Тінь', price: 1500, colors: ['#333333', '#808080'] },
    { id: 15, name: 'Квантовий', price: 1600, colors: ['#00ff7f', '#dda0dd'] },
    { id: 16, name: 'Ангел', price: 1700, colors: ['#ffffff', '#fffacd'] },
    { id: 17, name: 'Демон', price: 1800, colors: ['#8b0000', '#ff0000'] },
    { id: 18, 'name': 'Голограма', price: 1900, colors: ['#00e5ff', '#ff00ff']},
    { id: 19, 'name': 'Сингулярність', price: 2000, colors: ['#ffffff', '#000000']}
];

// --- ІНІЦІАЛІЗАЦІЯ DOM ---
const elements = {};
['mainMenu', 'gameScreen', 'gameOverScreen', 'shopScreen', 'leaderboardScreen', 'dailyRewardScreen', 'questScreen', 'playButton', 'shopButton', 'leaderboardButton', 'questButton', 'restartButton', 'backToMenuButton', 'closeShopButton', 'closeQuestButton', 'backFromLeaderboard', 'claimDailyRewardButton', 'canvas', 'score', 'highscore', 'coins', 'shopCoins', 'finalScore', 'skinList', 'highScoresList', 'quest-list', 'boss-ui', 'boss-health-bar']
.forEach(id => elements[id] = document.getElementById(id));
const ctx = elements.canvas.getContext('2d');
elements.canvas.width = 420; elements.canvas.height = 747;

// --- Глобальні змінні ---
let snake, foods = [], boss, particles = [], bgParticles = [];
let score, highscore, coins, currentSkin, purchasedSkins, playerId;
let leaderboardScores = [];
let gameData = {}; // Об'єкт для зберігання всіх даних гравця
let running = false, touchStart = { x: 0, y: 0 }, velocity, animationFrameId, isBossFight = false;

// --- Класи ---
class Snake {
    constructor() { this.head = { x: elements.canvas.width / 2, y: elements.canvas.height / 2 }; this.path = []; this.length = 10; this.baseRadius = 6; this.segmentDistance = 3; this.applySkin(currentSkin); } // Змійка стала меншою
    applySkin(skin) { this.colorStart = skin.colors[0]; this.colorEnd = skin.colors[1]; }
    update(direction) { this.path.push({ ...this.head }); this.head.x += direction.x * SNAKE_SPEED; this.head.y += direction.y * SNAKE_SPEED; if (this.path.length > this.length * this.segmentDistance) this.path.shift(); }
    draw() { const gradient = ctx.createLinearGradient(0, 0, elements.canvas.width, elements.canvas.height); gradient.addColorStop(0, this.colorStart); gradient.addColorStop(1, this.colorEnd); for (let i = 0; i < this.length; i++) { const pathIndex = this.path.length - 1 - (i * this.segmentDistance); if (pathIndex < 0) break; const pos = this.path[pathIndex]; const radius = this.baseRadius * (1 - i / (this.length * 1.2)); ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill(); } ctx.beginPath(); ctx.arc(this.head.x, this.head.y, this.baseRadius, 0, Math.PI * 2); ctx.fillStyle = this.colorStart; ctx.shadowColor = this.colorStart; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; }
    checkCollisionSelf() { for (let i = 0; i < this.path.length - Math.floor(this.length * this.segmentDistance / 2); i++) if (Math.hypot(this.head.x - this.path[i].x, this.head.y - this.path[i].y) < this.baseRadius / 2) return true; return false; }
    grow() { this.length += 3; }
}

class Food { constructor() { this.spawn(); } spawn() { this.isCoin = Math.random() < 0.2; this.radius = this.isCoin ? 10 : 8; this.color = this.isCoin ? COLORS.COIN_NEON : COLORS.DANGER_NEON; this.x = Math.random() * (elements.canvas.width - 40) + 20; this.y = Math.random() * (elements.canvas.height - 40) + 20; } draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; if (this.isCoin) { ctx.fillStyle = '#a07d00'; ctx.font = `bold 12px "Press Start 2P"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', this.x, this.y + 1); } } }

class Boss {
    constructor() { this.x = elements.canvas.width / 2; this.y = 100; this.radius = 30; this.health = 10; this.maxHealth = 10; this.vx = 2; this.vy = 1; this.color = COLORS.BOSS_NEON; }
    update() { this.x += this.vx; this.y += this.vy; if(this.x < this.radius || this.x > elements.canvas.width - this.radius) this.vx *= -1; if(this.y < this.radius || this.y > elements.canvas.height / 2) this.vy *= -1; }
    draw() { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius / 3, 0, Math.PI * 2); ctx.fill(); }
    takeDamage() { this.health--; elements['boss-health-bar'].style.width = `${(this.health / this.maxHealth) * 100}%`; }
}

// --- Ігровий цикл та логіка ---
function gameLoop() {
    if (!running) return;
    snake.update(velocity);
    if (isBossFight) {
        boss.update();
        checkBossCollisions();
    } else {
        checkCollisions();
        if (score > 0 && score % BOSS_TRIGGER_SCORE === 0 && gameData.lastBossScore !== score) {
            gameData.lastBossScore = score;
            startBossFight();
        }
    }
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function draw() {
    ctx.fillStyle = 'rgba(1, 0, 13, 0.3)'; ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
    if (!isBossFight) foods.forEach(f => f.draw());
    else boss.draw();
    snake.draw();
}

function checkCollisions() {
    for (let i = foods.length - 1; i >= 0; i--) {
        const foodItem = foods[i];
        if (Math.hypot(snake.head.x - foodItem.x, snake.head.y - foodItem.y) < snake.baseRadius + foodItem.radius) {
            if (foodItem.isCoin) { coins++; gameData.quests.coinsCollected++; } else { score++; snake.grow(); gameData.quests.foodEaten++; }
            foods.splice(i, 1);
        }
    }
    if (foods.length === 0) foods.push(new Food());
    if (snake.head.x < 0 || snake.head.x > elements.canvas.width || snake.head.y < 0 || snake.head.y > elements.canvas.height || snake.checkCollisionSelf()) endGame();
}

function checkBossCollisions() {
    if (Math.hypot(snake.head.x - boss.x, snake.head.y - boss.y) < snake.baseRadius + boss.radius) {
        boss.takeDamage();
        snake.length = Math.max(5, snake.length - 1); // Змійка трохи зменшується при ударі
        if (boss.health <= 0) endBossFight();
    }
    if (snake.head.x < 0 || snake.head.x > elements.canvas.width || snake.head.y < 0 || snake.head.y > elements.canvas.height || snake.checkCollisionSelf()) endGame();
}

// --- Початок/Кінець гри/Боса ---
function startGame() { switchScreen('gameScreen'); snake = new Snake(); foods = [new Food()]; score = 0; gameData.quests.scoreGainedThisRun = 0; gameData.lastBossScore = 0; velocity = { x: 0, y: -1 }; running = true; updateUI(); if (animationFrameId) cancelAnimationFrame(animationFrameId); gameLoop(); }
function endGame() {
    running = false; isBossFight = false; cancelAnimationFrame(animationFrameId);
    if (score > highscore) highscore = score;
    if (score > gameData.quests.scoreGainedThisRun) gameData.quests.scoreGainedThisRun = score;
    elements.finalScore.textContent = score;
    addScoreToLeaderboard({ name: playerId, score });
    saveData();
    switchScreen('gameOverScreen');
}
function startBossFight() { isBossFight = true; boss = new Boss(); foods = []; elements['boss-ui'].classList.remove('hidden'); elements.canvas.classList.add('boss-mode'); }
function endBossFight() { isBossFight = false; coins += 100; boss = null; foods.push(new Food()); elements['boss-ui'].classList.add('hidden'); elements.canvas.classList.remove('boss-mode'); }

// --- UI, Дані та Інтеграція ---
function switchScreen(screenId) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(screenId)?.classList.add('active'); }
function updateUI() { ['score', 'highscore', 'coins', 'shopCoins'].forEach(id => elements[id].textContent = window[id]); }
function getPlayerId() { try { const tg = window.Telegram.WebApp; return tg.initDataUnsafe.user.username ? `@${tg.initDataUnsafe.user.username}` : (tg.initDataUnsafe.user.first_name || 'PLAYER'); } catch (e) { let id = localStorage.getItem('snake_playerId_v10'); if (!id) { id = `PLAYER-${Math.random().toString(16).substr(2, 4).toUpperCase()}`; localStorage.setItem('snake_playerId_v10', id); } return id; } }

function loadData() {
    playerId = getPlayerId();
    const savedData = JSON.parse(localStorage.getItem('snake_gameData_v10'));
    gameData = {
        lastLogin: new Date(0),
        quests: { foodEaten: 0, coinsCollected: 0, scoreGainedThisRun: 0, claimed: [] },
        ...savedData,
    };
    highscore = parseInt(localStorage.getItem('snake_highscore_v10')) || 0;
    coins = parseInt(localStorage.getItem('snake_coins_v10')) || 0;
    purchasedSkins = JSON.parse(localStorage.getItem('snake_purchasedSkins_v10')) || [0];
    leaderboardScores = JSON.parse(localStorage.getItem('snake_leaderboard_v10')) || [];
    const skinId = parseInt(localStorage.getItem('snake_currentSkin_v10')) || 0;
    currentSkin = skins.find(s => s.id === skinId) || skins[0];
}

function saveData() {
    localStorage.setItem('snake_gameData_v10', JSON.stringify(gameData));
    localStorage.setItem('snake_highscore_v10', highscore);
    localStorage.setItem('snake_coins_v10', coins);
    localStorage.setItem('snake_purchasedSkins_v10', JSON.stringify(purchasedSkins));
    localStorage.setItem('snake_currentSkin_v10', currentSkin.id);
    localStorage.setItem('snake_leaderboard_v10', JSON.stringify(leaderboardScores));
}

// --- Щоденні нагороди та квести ---
const QUESTS = [ { id: 1, text: "З'їж 30 яблучок", goal: 30, key: 'foodEaten', reward: 25 }, { id: 2, text: "Збери 10 монет", goal: 10, key: 'coinsCollected', reward: 50 }, { id: 3, text: "Набери 100 очок", goal: 100, key: 'scoreGainedThisRun', reward: 75 } ];
function checkDailyReward() {
    const today = new Date().toDateString();
    if (new Date(gameData.lastLogin).toDateString() !== today) {
        switchScreen('dailyRewardScreen');
    }
}
function populateQuests() {
    elements['quest-list'].innerHTML = '';
    QUESTS.forEach(q => {
        const progress = gameData.quests[q.key] || 0;
        const isClaimed = gameData.quests.claimed.includes(q.id);
        const item = document.createElement('div'); item.className = 'quest-item';
        item.innerHTML = `
            <div class="quest-description">${q.text}</div>
            <div class="quest-progress">
                <div class="quest-progress-bar-container"><div class="quest-progress-bar" style="width: ${Math.min(100, (progress / q.goal) * 100)}%"></div></div>
                <span>${progress}/${q.goal}</span>
            </div>
            <button class="claim-button" data-quest-id="${q.id}" ${progress < q.goal || isClaimed ? 'disabled' : ''}>${isClaimed ? '✓' : 'Забрати'}</button>
        `;
        elements['quest-list'].appendChild(item);
    });
    document.querySelectorAll('.claim-button').forEach(b => b.addEventListener('click', claimQuestReward));
}
function claimQuestReward(e) {
    const questId = parseInt(e.target.dataset.questId);
    const quest = QUESTS.find(q => q.id === questId);
    if (quest && !gameData.quests.claimed.includes(questId)) {
        coins += quest.reward;
        gameData.quests.claimed.push(questId);
        saveData(); updateUI(); populateQuests();
    }
}

// --- Магазин та Лідерборди ---
function populateShop() { elements.skinList.innerHTML = ''; skins.forEach(skin => { const isPurchased = purchasedSkins.includes(skin.id); const isEquipped = currentSkin.id === skin.id; const item = document.createElement('div'); item.className = 'skin-item'; if (isEquipped) item.classList.add('selected'); if (!isPurchased) item.classList.add('locked'); item.innerHTML = `<div class="skin-preview" style="background: linear-gradient(90deg, ${skin.colors[0]}, ${skin.colors[1]})"></div><div>${skin.name}</div>${isPurchased ? (isEquipped ? '<div class="equipped-badge">✓</div>' : '') : `<div class="skin-price"><span></span> ${skin.price}</div>`}`; const priceEl = item.querySelector('.skin-price span'); if(priceEl) priceEl.className = 'coin-icon'; item.addEventListener('click', () => { if (isPurchased) { currentSkin = skin; saveData(); populateShop(); } else if (coins >= skin.price) { coins -= skin.price; purchasedSkins.push(skin.id); currentSkin = skin; saveData(); populateShop(); updateUI(); } }); elements.skinList.appendChild(item); }); }
function showLeaderboards() { populateLeaderboard(elements.highScoresList, leaderboardScores); switchScreen('leaderboardScreen'); }
function populateLeaderboard(listElement, data) { listElement.innerHTML = ''; if (data.length === 0) { listElement.innerHTML = '<li>Тут поки пусто...</li>'; return; } data.forEach((entry, index) => { const li = document.createElement('li'); li.innerHTML = `<span class="rank">${index + 1}.</span><span class="name">${entry.name}</span><span class="score">${entry.score}</span>`; if (entry.name === playerId) li.classList.add('current-player'); listElement.appendChild(li); }); }
function addScoreToLeaderboard(newEntry) {
    const existingIndex = leaderboardScores.findIndex(e => e.name === newEntry.name);
    if (existingIndex !== -1) { if(newEntry.score > leaderboardScores[existingIndex].score) leaderboardScores[existingIndex].score = newEntry.score; } 
    else { leaderboardScores.push(newEntry); }
    leaderboardScores.sort((a, b) => b.score - a.score);
    if (leaderboardScores.length > LEADERBOARD_SIZE) leaderboardScores.pop();
}

// --- Обробники подій ---
elements.playButton.addEventListener('click', startGame);
elements.restartButton.addEventListener('click', startGame);
elements.backToMenuButton.addEventListener('click', () => switchScreen('mainMenu'));
elements.shopButton.addEventListener('click', () => { updateUI(); populateShop(); switchScreen('shopScreen'); });
elements.questButton.addEventListener('click', () => { populateQuests(); switchScreen('questScreen'); });
elements.closeShopButton.addEventListener('click', () => switchScreen('mainMenu'));
elements.closeQuestButton.addEventListener('click', () => switchScreen('mainMenu'));
elements.leaderboardButton.addEventListener('click', showLeaderboards);
elements.backFromLeaderboard.addEventListener('click', () => switchScreen('mainMenu'));
elements.claimDailyRewardButton.addEventListener('click', () => {
    coins += 50;
    gameData.lastLogin = new Date().toISOString();
    saveData();
    updateUI();
    switchScreen('mainMenu');
});

// --- Ініціалізація ---
function init() {
    loadData();
    updateUI();
    checkDailyReward();
    switchScreen('mainMenu');
}

init();