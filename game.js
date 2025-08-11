// Це "золоте правило" веб-розробки.
// Весь код буде виконано тільки після того, як HTML-сторінка повністю завантажиться.
// Це гарантує, що всі кнопки та елементи будуть на місці і гра не зависне.
document.addEventListener('DOMContentLoaded', () => {

    // --- ГЛОБАЛЬНІ КОНСТАНТИ ТА НАЛАШТУВАННЯ ГРИ ---
    const VERSION = '15_RENAISSANCE'; // Змінюємо версію для скидання старих збережень
    const COLORS = { 
        PRIMARY_NEON: '#00e5ff', DANGER_NEON: '#ff3838', COIN_NEON: '#ffde00', 
        DARK_BG: '#01000d', DARK_PURPLE: '#1a0537'
    };
    const GAME_SETTINGS = { 
        SNAKE_SPEED: 3.0, LEADERBOARD_SIZE: 10
    };
    const skins = [ { id: 0, name: 'Стандарт', price: 0, colors: ['#00ff6a', '#00aaff'] }, { id: 1, name: 'Електрик', price: 200, colors: ['#00ffff', '#0077ff'] }, { id: 2, name: 'Вогняний', price: 300, colors: ['#ff8c00', '#ff0000'] }, { id: 3, name: 'Отрута', price: 400, colors: ['#7fff00', '#ff00ff'] }, { id: 4, name: 'Пустота', price: 500, colors: ['#9370db', '#483d8b'] }, { id: 5, name: 'Світанок', price: 600, colors: ['#fd5e53', '#ffde00'] }, { id: 6, name: 'Кристал', price: 700, colors: ['#f0f8ff', '#add8e6'] }, { id: 7, name: 'Глітч', price: 800, colors: ['#ff00ff', '#00ffff'] }, { id: 8, name: 'Плазма', price: 900, colors: ['#fd5e53', '#ff00ff'] }, { id: 9, name: 'Золотий', price: 1000, colors: ['#ffd700', '#ffb347'] }, { id: 10, name: 'Супернова', price: 1100, colors: ['#ffffff', '#ffde00'] }, { id: 11, name: 'Кіберпанк', price: 1200, colors: ['#ff00ff', '#00e5ff'] }, { id: 12, name: 'Магма', price: 1300, colors: ['#ff4500', '#dc143c'] }, { id: 13, name: 'Аврора', price: 1400, colors: ['#40e0d0', '#ff8c00'] }, { id: 14, name: 'Тінь', price: 1500, colors: ['#333333', '#808080'] }, { id: 15, name: 'Квантовий', price: 1600, colors: ['#00ff7f', '#dda0dd'] }, { id: 16, name: 'Ангельський', price: 1700, colors: ['#ffffff', '#fffacd'] }, { id: 17, name: 'Демонічний', price: 1800, colors: ['#8b0000', '#ff0000'] }, { id: 18, 'name': 'Голограма', price: 1900, colors: ['#00e5ff', '#ff00ff']}, { id: 19, 'name': 'Сингулярність', price: 2000, colors: ['#ffffff', '#000000']} ];
    const TASKS = [
        { id: 'score100', text: 'Набити 100 очок за одну гру', goal: 100, reward: 200, type: 'score' }
    ];

    // --- ПОШУК УСІХ HTML ЕЛЕМЕНТІВ ---
    const elements = {};
    ['mainMenu', 'gameScreen', 'gameOverScreen', 'shopScreen', 'leaderboardScreen', 'tasksScreen', 'playButton', 'shopButton', 'leaderboardButton', 'tasksButton', 'restartButton', 'backToMenuButton', 'closeShopButton', 'backFromLeaderboard', 'backFromTasksButton', 'canvas', 'score', 'highscore', 'coins', 'shopCoins', 'finalScore', 'gameOverInfo', 'skinList', 'highScoresList', 'tasks-list', 'dailyRewardModal', 'claimRewardButton', 'rewardAmount']
    .forEach(id => elements[id] = document.getElementById(id));
    const ctx = elements.canvas.getContext('2d');
    elements.canvas.width = 420; elements.canvas.height = 747;

    // --- ГЛОБАЛЬНІ ЗМІННІ ---
    let snake, food, particles = [];
    let score, highscore, coins, currentSkin, purchasedSkins, leaderboard, completedTasks, loginStreak;
    let running = false, touchStart = { x: 0, y: 0 }, velocity, animationFrameId;

    // --- КЛАСИ ---
    class Particle { constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.size = Math.random() * 5 + 2; this.life = 1; const angle = Math.random() * Math.PI * 2; const speed = Math.random() * 4 + 1; this.velX = Math.cos(angle) * speed; this.velY = Math.sin(angle) * speed; } update() { this.x += this.velX; this.y += this.velY; this.life -= 0.03; if (this.size > 0.2) this.size -= 0.1; } draw() { ctx.fillStyle = this.color; ctx.globalAlpha = this.life; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; } }
    class Snake { constructor(skin) { this.head = { x: elements.canvas.width / 2, y: elements.canvas.height / 2 }; this.path = []; this.length = 10; this.baseRadius = 7; this.segmentDistance = 4; this.applySkin(skin); } applySkin(skin) { this.colorStart = skin.colors[0]; this.colorEnd = skin.colors[1]; } update(direction) { this.path.push({ ...this.head }); this.head.x += direction.x * GAME_SETTINGS.SNAKE_SPEED; this.head.y += direction.y * GAME_SETTINGS.SNAKE_SPEED; if (this.path.length > this.length * this.segmentDistance) this.path.shift(); } draw() { const gradient = ctx.createLinearGradient(0, 0, elements.canvas.width, elements.canvas.height); gradient.addColorStop(0, this.colorStart); gradient.addColorStop(1, this.colorEnd); for (let i = 0; i < this.length; i++) { const pathIndex = this.path.length - 1 - (i * this.segmentDistance); if (pathIndex < 0) break; const pos = this.path[pathIndex]; const radius = this.baseRadius * (1 - i / (this.length * 1.2)); ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill(); } ctx.beginPath(); ctx.arc(this.head.x, this.head.y, this.baseRadius, 0, Math.PI * 2); ctx.fillStyle = this.colorStart; ctx.shadowColor = this.colorStart; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; const angle = (velocity.x === 0 && velocity.y === 0) ? -Math.PI / 2 : Math.atan2(velocity.y, velocity.x); const eyeOffsetX = Math.cos(angle + Math.PI / 2) * (this.baseRadius * 0.4); const eyeOffsetY = Math.sin(angle + Math.PI / 2) * (this.baseRadius * 0.4); ctx.beginPath(); ctx.arc(this.head.x + eyeOffsetX, this.head.y + eyeOffsetY, 1.5, 0, Math.PI * 2); ctx.arc(this.head.x - eyeOffsetX, this.head.y - eyeOffsetY, 1.5, 0, Math.PI * 2); ctx.fillStyle = 'black'; ctx.fill(); } checkCollisionSelf() { for (let i = 0; i < this.path.length - Math.floor(this.length * this.segmentDistance / 2); i++) if (Math.hypot(this.head.x - this.path[i].x, this.head.y - this.path[i].y) < this.baseRadius / 2) return true; return false; } grow() { this.length += 3; } }
    class Food { constructor() { this.spawn(); } spawn() { this.isCoin = Math.random() < 0.2; this.radius = this.isCoin ? 10 : 8; this.color = this.isCoin ? COLORS.COIN_NEON : COLORS.DANGER_NEON; this.x = Math.random() * (elements.canvas.width - 40) + 20; this.y = Math.random() * (elements.canvas.height - 40) + 20; } draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; if (this.isCoin) { ctx.fillStyle = '#a07d00'; ctx.font = `bold ${this.radius+2}px "Press Start 2P"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', this.x, this.y + 1); } } }

    // --- ОСНОВНІ ФУНКЦІЇ ГРИ ---
    function gameLoop() { if (!running) return; update(); draw(); animationFrameId = requestAnimationFrame(gameLoop); }
    function update() { snake.update(velocity); checkCollisions(); particles.forEach((p, i) => { p.update(); if(p.life <= 0) particles.splice(i, 1); }); }
    function draw() { ctx.fillStyle = 'rgba(1,0,13,0.5)'; ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height); particles.forEach(p => p.draw()); if(food) food.draw(); if(snake) snake.draw(); }

    function startGame() { switchScreen('gameScreen'); snake = new Snake(currentSkin); food = new Food(); particles = []; score = 0; velocity = { x: 0, y: -1 }; running = true; elements.gameOverInfo.innerHTML = ''; if (animationFrameId) cancelAnimationFrame(animationFrameId); gameLoop(); }
    function endGame() { running = false; if(navigator.vibrate) navigator.vibrate(100); if (score > highscore) highscore = score; elements.finalScore.textContent = score; checkForNewRecord(); checkForTaskCompletion(); saveData(); switchScreen('gameOverScreen'); }

    function checkCollisions() {
        if (food && Math.hypot(snake.head.x - food.x, snake.head.y - food.y) < snake.baseRadius + food.radius) {
            if (food.isCoin) { coins++; } else { score++; snake.grow(); }
            for (let i = 0; i < 15; i++) particles.push(new Particle(food.x, food.y, food.color));
            food = new Food(); updateUI();
        }
        if (snake.head.x < 0 || snake.head.x > elements.canvas.width || snake.head.y < 0 || snake.head.y > elements.canvas.height || snake.checkCollisionSelf()) endGame();
    }

    // --- UI ТА ЗБЕРЕЖЕННЯ ДАНИХ ---
    function switchScreen(screenId) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); elements[screenId].classList.add('active'); }
    function updateUI() { ['score', 'highscore', 'coins', 'shopCoins'].forEach(id => elements[id].textContent = window[id]); }
    
    function loadData() {
        highscore = parseInt(localStorage.getItem(`snake_highscore_${VERSION}`)) || 0;
        coins = parseInt(localStorage.getItem(`snake_coins_${VERSION}`)) || 0;
        purchasedSkins = JSON.parse(localStorage.getItem(`snake_purchasedSkins_${VERSION}`)) || [0];
        leaderboard = JSON.parse(localStorage.getItem(`snake_leaderboard_${VERSION}`)) || [];
        completedTasks = JSON.parse(localStorage.getItem(`snake_completedTasks_${VERSION}`)) || [];
        loginStreak = parseInt(localStorage.getItem(`snake_loginStreak_${VERSION}`)) || 0;
        const skinId = parseInt(localStorage.getItem(`snake_currentSkin_${VERSION}`)) || 0;
        currentSkin = skins.find(s => s.id === skinId) || skins[0];
    }
    function saveData() {
        localStorage.setItem(`snake_highscore_${VERSION}`, highscore);
        localStorage.setItem(`snake_coins_${VERSION}`, coins);
        localStorage.setItem(`snake_purchasedSkins_${VERSION}`, JSON.stringify(purchasedSkins));
        localStorage.setItem(`snake_leaderboard_${VERSION}`, JSON.stringify(leaderboard));
        localStorage.setItem(`snake_completedTasks_${VERSION}`, JSON.stringify(completedTasks));
        localStorage.setItem(`snake_currentSkin_${VERSION}`, currentSkin.id);
        localStorage.setItem(`snake_loginStreak_${VERSION}`, loginStreak);
    }

    // --- ЛОГІКА МАГАЗИНУ, ЛІДЕРІВ, ЗАВДАНЬ ТА БОНУСІВ ---
    function populateShop() { elements.skinList.innerHTML = ''; skins.forEach(skin => { const isPurchased = purchasedSkins.includes(skin.id); const isEquipped = currentSkin.id === skin.id; const item = document.createElement('div'); item.className = 'skin-item'; if (isEquipped) item.classList.add('selected'); if (!isPurchased) item.classList.add('locked'); item.innerHTML = `<div class="skin-preview" style="background: linear-gradient(90deg, ${skin.colors[0]}, ${skin.colors[1]})"></div><div>${skin.name}</div>${isPurchased ? (isEquipped ? '<div class="equipped-badge">✓</div>' : '') : `<div class="skin-price"><span class="coin-icon"></span> ${skin.price}</div>`}`; item.addEventListener('click', () => { if (isPurchased) { currentSkin = skin; saveData(); populateShop(); } else if (coins >= skin.price) { coins -= skin.price; purchasedSkins.push(skin.id); currentSkin = skin; saveData(); populateShop(); updateUI(); } }); elements.skinList.appendChild(item); }); }
    function populateLeaderboard() { elements.highScoresList.innerHTML = ''; leaderboard.sort((a,b) => b.score - a.score); if (leaderboard.length === 0) { elements.highScoresList.innerHTML = '<li>Тут поки пусто...</li>'; return; } leaderboard.slice(0, GAME_SETTINGS.LEADERBOARD_SIZE).forEach((entry, index) => { const li = document.createElement('li'); li.innerHTML = `<span class="rank">${index + 1}.</span><span class="name">${entry.name}</span><span class="score">${entry.score}</span>`; elements.highScoresList.appendChild(li); }); }
    function checkForNewRecord() { const currentBest = leaderboard.find(e => e.name === "You")?.score || 0; if (score > 0 && score > currentBest) { elements.gameOverInfo.innerHTML = "НОВИЙ РЕКОРД!"; const existingIndex = leaderboard.findIndex(e => e.name === "You"); if (existingIndex !== -1) { leaderboard[existingIndex].score = score; } else { leaderboard.push({ name: "You", score: score }); } } }
    function populateTasks() { elements['tasks-list'].innerHTML = ''; TASKS.forEach(task => { const isCompleted = completedTasks.includes(task.id); const taskItem = document.createElement('div'); taskItem.className = 'task-item'; if (isCompleted) taskItem.classList.add('completed'); taskItem.innerHTML = `<div class="task-description">${task.text}</div><div class="task-reward ${isCompleted ? 'completed' : ''}">${isCompleted ? '✓ ВИКОНАНО' : `<span class="coin-icon"></span> +${task.reward}`}</div>`; elements['tasks-list'].appendChild(taskItem); }); }
    function checkForTaskCompletion() { TASKS.forEach(task => { if (!completedTasks.includes(task.id) && task.type === 'score' && score >= task.goal) { coins += task.reward; completedTasks.push(task.id); elements.gameOverInfo.innerHTML += `<br>ЗАВДАННЯ ВИКОНАНО! +${task.reward} монет!`; } }); }
    function checkDailyReward() {
        const today = new Date().toDateString();
        const lastVisit = localStorage.getItem(`snake_lastVisit_${VERSION}`);
        if (lastVisit === today) return;

        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if(lastVisit === yesterday) {
            loginStreak++;
        } else {
            loginStreak = 1;
        }

        let reward = 0;
        if (loginStreak === 1) reward = 5;
        else if (loginStreak === 2) reward = 10;
        else if (loginStreak === 3) reward = 15;
        else reward = 20;
        
        coins += reward;
        elements.rewardAmount.textContent = reward;
        elements.dailyRewardModal.classList.remove('hidden');
        localStorage.setItem(`snake_lastVisit_${VERSION}`, today);
        saveData();
        updateUI();
    }

    // --- ОБРОБНИКИ ПОДІЙ ---
    elements.playButton.addEventListener('click', startGame); 
    elements.restartButton.addEventListener('click', startGame); 
    elements.backToMenuButton.addEventListener('click', () => switchScreen('mainMenu'));
    elements.shopButton.addEventListener('click', () => { updateUI(); populateShop(); switchScreen('shopScreen'); });
    elements.tasksButton.addEventListener('click', () => { populateTasks(); switchScreen('tasksScreen'); });
    elements.closeShopButton.addEventListener('click', () => switchScreen('mainMenu')); 
    elements.leaderboardButton.addEventListener('click', () => { populateLeaderboard(); switchScreen('leaderboardScreen'); }); 
    elements.backFromLeaderboard.addEventListener('click', () => switchScreen('mainMenu'));
    elements.backFromTasksButton.addEventListener('click', () => switchScreen('mainMenu'));
    elements.claimRewardButton.addEventListener('click', () => elements.dailyRewardModal.classList.add('hidden'));

    document.addEventListener('keydown', e => { if (!running) return; switch (e.key) { case 'ArrowUp': case 'w': if (velocity.y === 0) velocity = { x: 0, y: -1 }; break; case 'ArrowDown': case 's': if (velocity.y === 0) velocity = { x: 0, y: 1 }; break; case 'ArrowLeft': case 'a': if (velocity.x === 0) velocity = { x: -1, y: 0 }; break; case 'ArrowRight': case 'd': if (velocity.x === 0) velocity = { x: 1, y: 0 }; break; } });
    document.addEventListener('touchstart', e => { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
    document.addEventListener('touchmove', e => { if (!running) return; e.preventDefault(); const touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY }; const deltaX = touchMove.x - touchStart.x; const deltaY = touchMove.y - touchStart.y; if (Math.abs(deltaX) > 20 || Math.abs(deltaY) > 20) { if (Math.abs(deltaX) > Math.abs(deltaY)) { if (deltaX > 0 && velocity.x === 0) velocity = { x: 1, y: 0 }; else if (deltaX < 0 && velocity.x === 0) velocity = { x: -1, y: 0 }; } else { if (deltaY > 0 && velocity.y === 0) velocity = { x: 0, y: 1 }; else if (deltaY < 0 && velocity.y === 0) velocity = { x: 0, y: -1 }; } touchStart = touchMove; } }, { passive: false });

    // --- ІНІЦІАЛІЗАЦІЯ ---
    function init() {
        loadData(); 
        updateUI();
        checkDailyReward();
        switchScreen('mainMenu');
    }

    init();
});