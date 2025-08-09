// --- КОЛЬОРИ (винесені для легкого доступу) ---
const COLORS = {
    PRIMARY_NEON: '#00e5ff',
    DANGER_NEON: '#ff3838',
    COIN_NEON: '#ffde00',
    DANGER_GLOW: 'rgba(255, 56, 56, 0.7)',
    COIN_GLOW: 'rgba(255, 222, 0, 0.7)'
};

// --- Елементи DOM ---
const mainMenu = document.getElementById('mainMenu');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const shopScreen = document.getElementById('shopScreen');

const playButton = document.getElementById('playButton');
const shopButton = document.getElementById('shopButton');
const restartButton = document.getElementById('restartButton');
const backToMenuButton = document.getElementById('backToMenuButton');
const closeShopButton = document.getElementById('closeShopButton');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- UI Елементи ---
const scoreElement = document.getElementById('score');
const highscoreElement = document.getElementById('highscore');
const coinsElement = document.getElementById('coins');
const shopCoinsElement = document.getElementById('shopCoins');
const finalScoreElement = document.getElementById('finalScore');
const skinList = document.getElementById('skin-list');

// Роздільна здатність Canvas (фіксована для стабільності)
canvas.width = 420;
canvas.height = 747; // Співвідношення 9:16 від ширини 420

// --- Скіни ---
const skins = [
    { id: 0, name: 'Неон', price: 0, colors: ['#00ff6a', '#00aaff'] },
    { id: 1, name: 'Вогняний', price: 50, colors: ['#ff8c00', '#ff0000'] },
    { id: 2, name: 'Льодяний', price: 100, colors: ['#00ffff', '#0077ff'] },
    { id: 3, name: 'Отруйний', price: 150, colors: ['#7fff00', '#ff00ff'] },
    { id: 4, name: 'Космос', price: 200, colors: ['#ffffff', '#9370db'] },
    { id: 5, name: 'Золотий', price: 250, colors: ['#ffd700', '#ffb347'] }
];

// --- Глобальні змінні ---
let snake, food, score, highscore, coins, particles, velocity, currentSkin, purchasedSkins;
let running = false;
let touchStart = { x: 0, y: 0 };
let animationFrameId;

const SNAKE_SPEED = 2.8;
const FOOD_SPAWN_CHANCE_COIN = 0.2; // 20% шанс, що їжа буде монетою

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
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
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
        // ВИПРАВЛЕНО: Використовуємо константи замість CSS-змінних
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

    ctx.fillStyle = 'rgba(2, 0, 17, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    food.draw();
    snake.draw();
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
    switchScreen('gameScreen');
    snake = new Snake();
    food = new Food();
    score = 0;
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
        saveData();
    }
    finalScoreElement.textContent = score;
    switchScreen('gameOverScreen');
}

// --- Керування екранами ---
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
        activeScreen.classList.add('active');
    }
}

// --- UI та дані ---
function updateUI() {
    scoreElement.textContent = score;
    highscoreElement.textContent = highscore;
    coinsElement.textContent = coins;
    shopCoinsElement.textContent = coins;
}

function loadData() {
    highscore = parseInt(localStorage.getItem('snake_highscore')) || 0;
    coins = parseInt(localStorage.getItem('snake_coins')) || 0;
    purchasedSkins = JSON.parse(localStorage.getItem('snake_purchasedSkins')) || [0];
    const skinId = parseInt(localStorage.getItem('snake_currentSkin')) || 0;
    currentSkin = skins.find(s => s.id === skinId) || skins[0];
}

function saveData() {
    localStorage.setItem('snake_highscore', highscore);
    localStorage.setItem('snake_coins', coins);
    localStorage.setItem('snake_purchasedSkins', JSON.stringify(purchasedSkins));
    localStorage.setItem('snake_currentSkin', currentSkin.id);
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

        item.addEventListener('click', () => {
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
        });
        skinList.appendChild(item);
    });
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
    const touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const deltaX = touchMove.x - touchStart.x;
    const deltaY = touchMove.y - touchStart.y;
    
    // Встановлюємо поріг, щоб уникнути випадкових спрацьовувань
    const swipeThreshold = 20; 

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > swipeThreshold) {
            if (deltaX > 0 && velocity.x === 0) { velocity = { x: 1, y: 0 }; }
            else if (deltaX < 0 && velocity.x === 0) { velocity = { x: -1, y: 0 }; }
            touchStart = touchMove; // Оновлюємо позицію для наступного свайпу
        }
    } else {
        if (Math.abs(deltaY) > swipeThreshold) {
            if (deltaY > 0 && velocity.y === 0) { velocity = { x: 0, y: 1 }; }
            else if (deltaY < 0 && velocity.y === 0) { velocity = { x: 0, y: -1 }; }
            touchStart = touchMove;
        }
    }
}, { passive: false });

// --- Ініціалізація ---
function init() {
    loadData();
    updateUI();
    switchScreen('mainMenu');
}

init();