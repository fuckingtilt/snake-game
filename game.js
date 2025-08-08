// --- Налаштування гри ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Встановлюємо високу внутрішню роздільну здатність для чіткості
canvas.width = 600;
canvas.height = 600;

const gridSize = 30; // Збільшимо клітинку, щоб було легше грати
let tileCount = canvas.width / gridSize;

// --- Стан гри ---
let snake = [{ x: 10, y: 10 }];
let food = { x: 15, y: 15 };
let velocity = { x: 0, y: 0 };
let score = 0;
let running = false;

// --- Головний цикл гри ---
function gameLoop() {
    if (!running) return;
    update();
    draw();
    setTimeout(gameLoop, 1000 / 15);
}

// --- Функція оновлення логіки ---
function update() {
    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreElement.textContent = score;
        spawnFood();
    } else {
        snake.pop();
    }

    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || checkSelfCollision(head)) {
        resetGame();
    }
}

// --- Функція малювання ---
function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f0';
    snake.forEach(segment => {
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    });
    ctx.fillStyle = '#f00';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
}

// --- Допоміжні функції ---
function spawnFood() {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);
    snake.forEach(segment => {
        if (segment.x === food.x && segment.y === food.y) spawnFood();
    });
}

function checkSelfCollision(head) {
    return snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y);
}

function resetGame() {
    snake = [{ x: 10, y: 10 }];
    velocity = { x: 0, y: 0 };
    score = 0;
    scoreElement.textContent = score;
    running = false;
    
    // НОВИЙ ТЕКСТ: Прохання зробити свайп
    ctx.fillStyle = 'black'; // Перемальовуємо фон, щоб не було артефактів
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '30px Consolas';
    ctx.textAlign = 'center';
    ctx.fillText('Зробіть свайп, щоб почати', canvas.width / 2, canvas.height / 2);
}

// --- НОВА ЛОГІКА КЕРУВАННЯ: СВАЙПИ ---
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, false);

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
}, false);

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const swipeThreshold = 50; // Мінімальна дистанція свайпу

    if (!running) {
        if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
            running = true;
            gameLoop();
        }
    }
    
    // Визначаємо напрямок свайпу
    if (Math.abs(deltaX) > Math.abs(deltaY)) { // Горизонтальний свайп
        if (Math.abs(deltaX) > swipeThreshold) {
            if (deltaX > 0 && velocity.x === 0) { // Свайп вправо
                velocity = { x: 1, y: 0 };
            } else if (deltaX < 0 && velocity.x === 0) { // Свайп вліво
                velocity = { x: -1, y: 0 };
            }
        }
    } else { // Вертикальний свайп
        if (Math.abs(deltaY) > swipeThreshold) {
            if (deltaY > 0 && velocity.y === 0) { // Свайп вниз
                velocity = { x: 0, y: 1 };
            } else if (deltaY < 0 && velocity.y === 0) { // Свайп вгору
                velocity = { x: 0, y: -1 };
            }
        }
    }
}

// Запускаємо гру з початковим екраном
resetGame();