// --- Налаштування гри ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Елементи
const scoreElement = document.getElementById('score');
const highscoreElement = document.getElementById('highscore');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Внутрішня роздільна здатність
canvas.width = 420;
canvas.height = 630;

// --- Глобальні змінні стану гри ---
let snake, food, score, highscore, particles, velocity;
let running = false;
let touchStart = { x: 0, y: 0 };

const SNAKE_SPEED = 2.5; // Зменшена швидкість

// --- Клас Змійки ---
class Snake {
    constructor() {
        this.head = { x: canvas.width / 2, y: canvas.height / 2 };
        this.path = []; // Зберігаємо шлях голови
        this.length = 15; // Початкова довжина в сегментах
        this.baseRadius = 10;
        this.segmentDistance = 5; // Відстань між центрами сегментів
        this.colorStart = '#00ff6a';
        this.colorEnd = '#00aaff';
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
        // Малюємо тіло
        for (let i = 0; i < this.length; i++) {
            const pathIndex = this.path.length - 1 - (i * this.segmentDistance);
            if (pathIndex < 0) break;
            const pos = this.path[pathIndex];
            
            const radius = this.baseRadius * (1 - i / (this.length * 1.2));
            const ratio = i / this.length;
            
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = this.colorStart; // Тіло одного кольору для кращого вигляду
            ctx.fill();
        }
        
        // Малюємо голову
        ctx.beginPath();
        ctx.arc(this.head.x, this.head.y, this.baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.colorStart;
        ctx.fill();
        
        // Малюємо очі
        const angle = Math.atan2(velocity.y, velocity.x);
        const eyeOffsetX = Math.cos(angle + Math.PI / 2) * (this.baseRadius * 0.4);
        const eyeOffsetY = Math.sin(angle + Math.PI / 2) * (this.baseRadius * 0.4);
        
        ctx.beginPath();
        ctx.arc(this.head.x + eyeOffsetX, this.head.y + eyeOffsetY, 2, 0, Math.PI * 2);
        ctx.arc(this.head.x - eyeOffsetX, this.head.y - eyeOffsetY, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
    }
    
    checkCollisionSelf() {
        const checkStartIndex = this.length * this.segmentDistance / 2;
        for(let i = 0; i < this.path.length - checkStartIndex; i++) {
            const dist = Math.hypot(this.head.x - this.path[i].x, this.head.y - this.path[i].y);
            if (dist < this.baseRadius / 2) return true;
        }
        return false;
    }

    grow() { this.length += 5; }
}

// --- Інші класи (їжа, частинки) ---
class Food {
    constructor() { this.spawn(); }
    spawn() {
        this.radius = 8;
        this.x = Math.random() * (canvas.width - 20) + 10;
        this.y = Math.random() * (canvas.height - 20) + 10;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3838';
        ctx.shadowColor = '#ff3838';
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
        this.radius = Math.random() * 2 + 1;
        this.life = 50;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 106, ${this.life / 50})`;
        ctx.fill();
    }
}


// --- Головний цикл та логіка ---
function gameLoop() {
    if (!running) return;

    // Оновлення
    snake.update(velocity);
    if (Math.random() > 0.5) particles.push(new Particle(snake.head.x, snake.head.y));
    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);
    
    // Перевірки зіткнень
    if (Math.hypot(snake.head.x - food.x, snake.head.y - food.y) < snake.baseRadius + food.radius) {
        food.spawn();
        snake.grow();
        score++;
    }
    if (snake.head.x < 0 || snake.head.x > canvas.width || snake.head.y < 0 || snake.head.y > canvas.height || snake.checkCollisionSelf()) {
        endGame();
    }

    // Малювання
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Ефект "сліду"
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(p => p.draw());
    food.draw();
    snake.draw();
    
    scoreElement.textContent = score;
    highscoreElement.textContent = highscore;

    requestAnimationFrame(gameLoop);
}

function init() {
    snake = new Snake();
    food = new Food();
    particles = [];
    score = 0;
    highscore = localStorage.getItem('snake_highscore') || 0;
    velocity = { x: 0, y: 0 };
    gameOverScreen.classList.add('hidden');
    running = true;
    requestAnimationFrame(gameLoop);
}

function endGame() {
    running = false;
    if (score > highscore) {
        highscore = score;
        localStorage.setItem('snake_highscore', highscore);
    }
    finalScore.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// --- Обробка керування ---
document.addEventListener('touchstart', e => {
    touchStart.x = e.touches[0].clientX;
    touchStart.y = e.touches[0].clientY;
});

document.addEventListener('touchmove', e => {
    e.preventDefault(); // Забороняємо скрол сторінки під час гри
    if (!running) return;
    const touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const deltaX = touchMove.x - touchStart.x;
    const deltaY = touchMove.y - touchStart.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) velocity = { x: 1, y: 0 }; // Right
        else velocity = { x: -1, y: 0 }; // Left
    } else {
        if (deltaY > 0) velocity = { x: 0, y: 1 }; // Down
        else velocity = { x: 0, y: -1 }; // Up
    }
});

restartButton.addEventListener('click', init);

// Початковий запуск
init();