// --- Налаштування гри ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // "ctx" - це наш інструмент для малювання, аналог "screen" в Pygame
const scoreElement = document.getElementById('score');

const gridSize = 20; // Розмір однієї клітинки
let tileCount = canvas.width / gridSize;

// --- Стан гри ---
let snake = [{ x: 10, y: 10 }]; // Початкова позиція змійки
let food = { x: 15, y: 15 };
let velocity = { x: 0, y: 0 };
let score = 0;
let running = false; // Гра почнеться після першого натискання

// --- Головний цикл гри (аналог while True в Pygame) ---
function gameLoop() {
    if (!running) return;

    // 1. Оновлення логіки (рух, зіткнення)
    update();

    // 2. Малювання кадру
    draw();

    // Повторюємо цикл гри приблизно 15 разів на секунду
    setTimeout(gameLoop, 1000 / 15);
}

// --- Функція оновлення логіки ---
function update() {
    // Рухаємо голову змійки
    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };
    snake.unshift(head); // Додаємо нову голову на початок

    // Перевірка зіткнення з їжею
    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreElement.textContent = score;
        spawnFood(); // Створюємо нову їжу
    } else {
        snake.pop(); // Видаляємо хвіст, якщо їжу не з'їли
    }

    // Перевірка програшу (зіткнення зі стінами або з собою)
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || checkSelfCollision(head)) {
        resetGame();
    }
}

// --- Функція малювання ---
function draw() {
    // Малюємо фон
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Малюємо змійку
    ctx.fillStyle = '#0f0'; // Неоново-зелений
    snake.forEach(segment => {
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    });

    // Малюємо їжу
    ctx.fillStyle = '#f00'; // Неоново-червоний
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
}

// --- Допоміжні функції ---
function spawnFood() {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);
    // Перевіряємо, щоб їжа не з'явилась на змійці
    snake.forEach(segment => {
        if (segment.x === food.x && segment.y === food.y) {
            spawnFood();
        }
    });
}

function checkSelfCollision(head) {
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    return false;
}

function resetGame() {
    snake = [{ x: 10, y: 10 }];
    velocity = { x: 0, y: 0 };
    score = 0;
    scoreElement.textContent = score;
    running = false;
    // Малюємо початковий екран
    ctx.fillStyle = 'white';
    ctx.font = '20px Consolas';
    ctx.textAlign = 'center';
    ctx.fillText('Натисніть стрілку, щоб почати', canvas.width / 2, canvas.height / 2);
}


// --- Обробка натискань клавіш ---
document.addEventListener('keydown', e => {
    if (!running) {
        running = true;
        gameLoop();
    }

    switch (e.key) {
        case 'ArrowUp':
            if (velocity.y === 0) velocity = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
            if (velocity.y === 0) velocity = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
            if (velocity.x === 0) velocity = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
            if (velocity.x === 0) velocity = { x: 1, y: 1 };
            break;
    }
});

// Запускаємо функцію resetGame при першому завантаженні, щоб показати стартове повідомлення
resetGame();