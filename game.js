// --- КОЛЬОРИ (винесені для легкого доступу) ---
const COLORS = {
    PRIMARY_NEON: '#00e5ff',
    DANGER_NEON: '#ff3838',
    COIN_NEON: '#ffde00',
    DANGER_GLOW: 'rgba(255, 56, 56, 0.7)',
    COIN_GLOW: 'rgba(255, 222, 0, 0.7)',
    DARK_BG: '#01000d',
    DARK_PURPLE: '#1a0537'
};

// --- Елементи DOM ---
const mainMenu = document.getElementById('mainMenu');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const shopScreen = document.getElementById('shopScreen');
const leaderboardScreen = document.getElementById('leaderboardScreen');

const playButton = document.getElementById('playButton');
const shopButton = document.getElementById('shopButton');
const leaderboardButton = document.getElementById('leaderboardButton');
const restartButton = document.getElementById('restartButton');
const backToMenuButton = document.getElementById('backToMenuButton');
const closeShopButton = document.getElementById('closeShopButton');
const backFromLeaderboard = document.getElementById('backFromLeaderboard');
const submitScoreButton = document.getElementById('submitScoreButton');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- UI Елементи ---
const scoreElement = document.getElementById('score');
const highscoreElement = document.getElementById('highscore');
const coinsElement = document.getElementById('coins');
const shopCoinsElement = document.getElementById('shopCoins');
const finalScoreElement = document.getElementById('finalScore');
const finalFoodElement = document.getElementById('finalFood');
const skinList = document.getElementById('skin-list');
const newRecordContainer = document.getElementById('newRecordContainer');
const gameOverButtons = document.getElementById('gameOverButtons');
const playerNameInput = document.getElementById('playerNameInput');
const highScoresList = document.getElementById('highScoresList');
const foodScoresList = document.getElementById('foodScoresList');
const tabScores = document.getElementById('tabScores');
const tabFood = document.getElementById('tabFood');

// Роздільна здатність Canvas
canvas.width = 420;
canvas.height = 747;

// --- Скіни (оновлені) ---
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

// --- Глобальні змінні ---
let snake, food, score, highscore, coins, currentSkin, purchasedSkins;
let leaderboardScores, leaderboardFood;
let foodEatenThisGame;
let running = false;
let touchStart = { x: 0, y: 0 };
let velocity;
let animationFrameId;

const SNAKE_SPEED = 3.0;
const FOOD_SPAWN_CHANCE_COIN = 0.2; // 20% шанс, що їжа буде монетою
const LEADERBOARD_SIZE = 10;

// --- Класи ---
class Snake {
    constructor() {
        this.head = { x: canvas.width / 2, y: canvas.height / 2 };
        this.path = [];
        this.length = 10;
        this.baseRadius = 10;
        this.segmentDistance = 5;
        this.applySkin(currentSkin);
    }

    applySkin(skin) {
        this.colorStart = skin.colors[0];
        this.colorEnd = skin.colors[1];
    }

    update(direction) {
        this.path.push({ ...this.head });
        this.head.x += direction.x * SNAKE_SPEED;
        this.head.y += direction.y * SNAKE_SPEED;

        const pathNeeded = this.length * this.segmentDistance;
        if (this.path.length > pathNeeded) {
            this.path.shift();
        }
    }

    draw() {
        const gradient = ctx.createLinearGradient(this.head.x - 50, this.head.y - 50, this.head.x + 50, this.head.y + 50);
        gradient.addColorStop(0, this.colorStart);
        gradient.addColorStop(1, this.colorEnd);

        for (let i = 0; i < this.length; i++) {
            const pathIndex = this.path.length - 1 - (i * this.segmentDistance);
            if (pathIndex < 0) break;
            const pos = this.path[pathIndex];
            const radius = this.baseRadius * (1 - i / (this.length * 1.2));
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
        
        ctx.beginPath();
        ctx.arc(this.head.x, this.head.y, this.baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.colorStart;
        ctx.shadowColor = this.colorStart;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        const angle = (velocity.x === 0 && velocity.y === 0) ? -Math.PI / 2 : Math.atan2(velocity.y, velocity.x);
        const eyeOffsetX = Math.cos(angle + Math.PI / 2) * (this.baseRadius * 0.4);
        const eyeOffsetY = Math.sin(angle + Math.PI / 2) * (this.baseRadius * 0.4);
        
        ctx.beginPath();
        ctx.arc(this.head.x + eyeOffsetX, this.head.y + eyeOffsetY, 2.5, 0, Math.PI * 2);
        ctx.arc(this.head.x - eyeOffsetX, this.head.y - eyeOffsetY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
    }
    
    checkCollisionSelf() {
        const checkStartIndex = Math.floor(this.length * this.segmentDistance / 2);
        for(let i = 0; i < this.path.length - checkStartIndex; i++) {
            const dist = Math.hypot(this.head.x - this.path[i].x, this.head.y - this.path[i].y);
            if (dist < this.baseRadius / 2) return true;
        }
        return false;
    }

    grow() { this.length += 3; }
}

class Food {
    constructor() { this.spawn(); }
    spawn() {
        this.isCoin = Math.random() < FOOD_SPAWN_CHANCE_COIN;
        this.radius = this.isCoin ? 10 : 8;
        this.color = this.isCoin ? COLORS.COIN_NEON : COLORS.DANGER_NEON;
        this.shadow = this.isCoin ? COLORS.COIN_GLOW : COLORS.DANGER_GLOW;
        this.x = Math.random() * (canvas.width - 40) + 20;
        this.y = Math.random() * (canvas.height - 40) + 20;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.shadow;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (this.isCoin) {
            ctx.fillStyle = '#a07d00';
            ctx.font = `bold ${this.radius}px "${getComputedStyle(document.documentElement).getPropertyValue('--game-font').trim()}"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', this.x, this.y + 1);
        }
    }
}

// --- Ігровий цикл та логіка ---
function gameLoop() {
    if (!running) return;
    
    snake.update(velocity);
    
    if (Math.hypot(snake.head.x - food.x, snake.head.y - food.y) < snake.baseRadius + food.radius) {
        foodEatenThisGame++;
        if (food.isCoin) {
            coins++;
            saveData();
        } else {
            snake.grow();
            score++;
        }
        food.spawn();
        updateUI();
    }

    if (snake.head.x < 0 || snake.head.x > canvas.width || snake.head.y < 0 || snake.head.y > canvas.height || snake.checkCollisionSelf()) {
        endGame();
        return;
    }

    // Оновлене тло
    const bgGradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 5, canvas.width / 2, canvas.height / 2, canvas.height);
    bgGradient.addColorStop(0, COLORS.DARK_PURPLE);
    bgGradient.addColorStop(1, COLORS.DARK_BG);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(2, 0, 17, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;

    food.draw();
    snake.draw();
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
    switchScreen('gameScreen');
    snake = new Snake();
    food = new Food();
    score = 0;
    foodEatenThisGame = 0;
    velocity = { x: 0, y: -1 };
    running = true;
    updateUI();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

function endGame() {
    running = false;
    cancelAnimationFrame(animationFrameId);
    if (score > highscore) {
        highscore = score;
    }
    finalScoreElement.textContent = score;
    finalFoodElement.textContent = foodEatenThisGame;
    
    checkAndPromptForNewRecord();
    saveData();
    switchScreen('gameOverScreen');
}

// --- Керування екранами ---
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId)?.classList.add('active');
}

// --- UI та дані ---
function updateUI() {
    scoreElement.textContent = score;
    highscoreElement.textContent = highscore;
    coinsElement.textContent = coins;
    shopCoinsElement.textContent = coins;
}

function loadData() {
    highscore = parseInt(localStorage.getItem('snake_highscore_v2')) || 0;
    coins = parseInt(localStorage.getItem('snake_coins_v2')) || 0;
    purchasedSkins = JSON.parse(localStorage.getItem('snake_purchasedSkins_v2')) || [0];
    const skinId = parseInt(localStorage.getItem('snake_currentSkin_v2')) || 0;
    currentSkin = skins.find(s => s.id === skinId) || skins[0];
    leaderboardScores = JSON.parse(localStorage.getItem('snake_leaderboardScores')) || [];
    leaderboardFood = JSON.parse(localStorage.getItem('snake_leaderboardFood')) || [];
}

function saveData() {
    localStorage.setItem('snake_highscore_v2', highscore);
    localStorage.setItem('snake_coins_v2', coins);
    localStorage.setItem('snake_purchasedSkins_v2', JSON.stringify(purchasedSkins));
    localStorage.setItem('snake_currentSkin_v2', currentSkin.id);
    localStorage.setItem('snake_leaderboardScores', JSON.stringify(leaderboardScores));
    localStorage.setItem('snake_leaderboardFood', JSON.stringify(leaderboardFood));
}

// --- Логіка магазину ---
function populateShop() {
    skinList.innerHTML = '';
    skins.forEach(skin => {
        const isPurchased = purchasedSkins.includes(skin.id);
        const isEquipped = currentSkin.id === skin.id;

        const item = document.createElement('div');
        item.className = 'skin-item';
        if (isEquipped) item.classList.add('selected');
        if (!isPurchased) item.classList.add('locked');
        
        item.innerHTML = `
            <div class="skin-preview" style="background: linear-gradient(90deg, ${skin.colors[0]}, ${skin.colors[1]})"></div>
            <div>${skin.name}</div>
            ${isPurchased ? 
                (isEquipped ? '<div class="equipped-badge">✓</div>' : '') :
                `<div class="skin-price"><span class="coin-icon"></span> ${skin.price}</div>`
            }
        `;

        item.addEventListener('click', () => handleSkinSelection(skin, item));
        skinList.appendChild(item);
    });
}

function handleSkinSelection(skin, item) {
    const isPurchased = purchasedSkins.includes(skin.id);
    if (isPurchased) {
        currentSkin = skin;
        saveData();
        populateShop();
    } else {
        if (coins >= skin.price) {
            coins -= skin.price;
            purchasedSkins.push(skin.id);
            currentSkin = skin;
            saveData();
            populateShop();
            updateUI();
        } else {
            item.style.animation = 'shake 0.5s';
            setTimeout(() => item.style.animation = '', 500);
        }
    }
}

// --- Лідерборди ---
function showLeaderboards() {
    populateLeaderboard(highScoresList, leaderboardScores, 'score');
    populateLeaderboard(foodScoresList, leaderboardFood, 'food');
    switchScreen('leaderboardScreen');
}

function populateLeaderboard(listElement, data, type) {
    listElement.innerHTML = '';
    if (data.length === 0) {
        listElement.innerHTML = '<li>Тут поки пусто...</li>';
        return;
    }
    data.forEach((entry, index) => {
        const li = document.createElement('li');
        const value = type === 'score' ? entry.score : entry.food;
        li.innerHTML = `
            <span class="rank">${index + 1}.</span>
            <span class="name">${entry.name}</span>
            <span class="score">${value}</span>
        `;
        listElement.appendChild(li);
    });
}

function checkAndPromptForNewRecord() {
    const isNewHighScore = score > 0 && (leaderboardScores.length < LEADERBOARD_SIZE || score > leaderboardScores[leaderboardScores.length - 1].score);
    const isNewHighFood = foodEatenThisGame > 0 && (leaderboardFood.length < LEADERBOARD_SIZE || foodEatenThisGame > leaderboardFood[leaderboardFood.length - 1].food);

    if (isNewHighScore || isNewHighFood) {
        newRecordContainer.classList.remove('hidden');
        gameOverButtons.classList.add('hidden');
        
        submitScoreButton.onclick = () => {
            const name = playerNameInput.value.trim().toUpperCase() || 'ГІСТЬ';
            if(isNewHighScore) addScoreToLeaderboard(leaderboardScores, { name, score }, 'score');
            if(isNewHighFood) addScoreToLeaderboard(leaderboardFood, { name, food: foodEatenThisGame }, 'food');
            saveData();
            newRecordContainer.classList.add('hidden');
            gameOverButtons.classList.remove('hidden');
            playerNameInput.value = '';
        };
    } else {
        newRecordContainer.classList.add('hidden');
        gameOverButtons.classList.remove('hidden');
    }
}

function addScoreToLeaderboard(leaderboard, newEntry, key) {
    leaderboard.push(newEntry);
    leaderboard.sort((a, b) => b[key] - a[key]);
    if (leaderboard.length > LEADERBOARD_SIZE) {
        leaderboard.pop();
    }
}


// --- Обробники подій ---
playButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
backToMenuButton.addEventListener('click', () => switchScreen('mainMenu'));
shopButton.addEventListener('click', () => {
    updateUI();
    populateShop();
    switchScreen('shopScreen');
});
closeShopButton.addEventListener('click', () => switchScreen('mainMenu'));
leaderboardButton.addEventListener('click', showLeaderboards);
backFromLeaderboard.addEventListener('click', () => switchScreen('mainMenu'));

tabScores.addEventListener('click', () => {
    tabScores.classList.add('active');
    tabFood.classList.remove('active');
    highScoresList.classList.add('active');
    foodScoresList.classList.remove('active');
});

tabFood.addEventListener('click', () => {
    tabFood.classList.add('active');
    tabScores.classList.remove('active');
    foodScoresList.classList.add('active');
    highScoresList.classList.remove('active');
});


document.addEventListener('keydown', e => {
    if (!running) return;
    switch(e.key) {
        case 'ArrowUp': case 'w': if (velocity.y === 0) velocity = {x: 0, y: -1}; break;
        case 'ArrowDown': case 's': if (velocity.y === 0) velocity = {x: 0, y: 1}; break;
        case 'ArrowLeft': case 'a': if (velocity.x === 0) velocity = {x: -1, y: 0}; break;
        case 'ArrowRight': case 'd': if (velocity.x === 0) velocity = {x: 1, y: 0}; break;
    }
});

document.addEventListener('touchstart', e => {
    touchStart.x = e.touches[0].clientX;
    touchStart.y = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', e => {
    if (!running) return;
    e.preventDefault();
    const touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const deltaX = touchMove.x - touchStart.x;
    const deltaY = touchMove.y - touchStart.y;
    const swipeThreshold = 20; 

    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0 && velocity.x === 0) { velocity = { x: 1, y: 0 }; }
          else if (deltaX < 0 && velocity.x === 0) { velocity = { x: -1, y: 0 }; }
      } else {
          if (deltaY > 0 && velocity.y === 0) { velocity = { x: 0, y: 1 }; }
          else if (deltaY < 0 && velocity.y === 0) { velocity = { x: 0, y: -1 }; }
      }
      touchStart = touchMove;
    }
}, { passive: false });

// --- Ініціалізація ---
function init() {
    loadData();
    updateUI();
    switchScreen('mainMenu');
}

init();