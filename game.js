// --- Головна функція, яка запускає всю гру ---
// Це гарантує, що весь HTML завантажився до того, як почне працювати JS
document.addEventListener('DOMContentLoaded', () => {

    // --- ГЛОБАЛЬНІ КОНСТАНТИ ТА НАЛАШТУВАННЯ ---
    const VERSION = '10_FINAL'; // Версія для localStorage
    const COLORS = { PRIMARY_NEON: '#00e5ff', DANGER_NEON: '#ff3838', COIN_NEON: '#ffde00', DARK_BG: '#01000d', DARK_PURPLE: '#1a0537', COMBO_NEON: '#a200ff', GHOST_NEON: '#ffffff', BOSS_NEON: '#ff00ff' };
    const POWERUP_TYPES = { GHOST: 'ghost', GOLD_RUSH: 'gold_rush' };
    const GAME_SETTINGS = { SNAKE_SPEED: 3.0, POWERUP_SPAWN_CHANCE: 0.1, LEADERBOARD_SIZE: 10, MAX_COMBO_TIME: 150, BOSS_TRIGGER_SCORE: 50 };
    const skins = [ { id: 0, name: 'Стандарт', price: 0, colors: ['#00ff6a', '#00aaff'] }, { id: 1, name: 'Електрик', price: 200, colors: ['#00ffff', '#0077ff'] }, { id: 2, name: 'Вогняний', price: 300, colors: ['#ff8c00', '#ff0000'] }, { id: 3, name: 'Отрута', price: 400, colors: ['#7fff00', '#ff00ff'] }, { id: 4, name: 'Пустота', price: 500, colors: ['#9370db', '#483d8b'] }, { id: 5, name: 'Світанок', price: 600, colors: ['#fd5e53', '#ffde00'] }, { id: 6, name: 'Кристал', price: 700, colors: ['#f0f8ff', '#add8e6'] }, { id: 7, name: 'Глітч', price: 800, colors: ['#ff00ff', '#00ffff'] }, { id: 8, name: 'Плазма', price: 900, colors: ['#fd5e53', '#ff00ff'] }, { id: 9, name: 'Золотий', price: 1000, colors: ['#ffd700', '#ffb347'] }, { id: 10, name: 'Супернова', price: 1100, colors: ['#ffffff', '#ffde00'] }, { id: 11, name: 'Кіберпанк', price: 1200, colors: ['#ff00ff', '#00e5ff'] }, { id: 12, name: 'Магма', price: 1300, colors: ['#ff4500', '#dc143c'] }, { id: 13, name: 'Аврора', price: 1400, colors: ['#40e0d0', '#ff8c00'] }, { id: 14, name: 'Тінь', price: 1500, colors: ['#333333', '#808080'] }, { id: 15, name: 'Квантовий', price: 1600, colors: ['#00ff7f', '#dda0dd'] }, { id: 16, name: 'Ангельський', price: 1700, colors: ['#ffffff', '#fffacd'] }, { id: 17, name: 'Демонічний', price: 1800, colors: ['#8b0000', '#ff0000'] }, { id: 18, 'name': 'Голограма', price: 1900, colors: ['#00e5ff', '#ff00ff']}, { id: 19, 'name': 'Сингулярність', price: 2000, colors: ['#ffffff', '#000000']} ];
    
    // --- ПОШУК УСІХ HTML ЕЛЕМЕНТІВ (щоб не шукати їх щоразу) ---
    const elements = {};
    ['mainMenu', 'gameScreen', 'gameOverScreen', 'shopScreen', 'leaderboardScreen', 'loadingScreen', 'playButton', 'shopButton', 'leaderboardButton', 'restartButton', 'backToMenuButton', 'closeShopButton', 'backFromLeaderboard', 'canvas', 'score', 'highscore', 'coins', 'shopCoins', 'finalScore', 'newRecordText', 'skinList', 'highScoresList', 'coinScoresList', 'tabScores', 'tabCoins', 'powerup-timers', 'combo-bar', 'combo-text', 'boss-health-container', 'boss-health-bar', 'boss-health-text']
    .forEach(id => elements[id] = document.getElementById(id));
    const ctx = elements.canvas.getContext('2d');
    elements.canvas.width = 420; elements.canvas.height = 747;

    // --- ГОЛОВНИЙ ОБ'ЄКТ ГРИ (ДВИГУН) ---
    const Game = {
        state: 'LOADING', // Поточний стан гри: LOADING, MENU, PLAYING, BOSS_FIGHT, GAME_OVER, SHOP, LEADERBOARD
        
        // Ігрові сутності
        snake: null,
        foods: [],
        powerup: null,
        boss: null,
        particles: [],
        bgParticles: [],
        
        // Ігрові змінні
        score: 0,
        highscore: 0,
        coins: 0,
        currentSkin: skins[0],
        purchasedSkins: [0],
        playerId: 'PLAYER',
        leaderboardScores: [],
        leaderboardCoins: [],
        combo: 1,
        comboTimer: 0,
        activePowerups: {},
        
        // Технічні змінні
        running: false,
        touchStart: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        animationFrameId: null,

        // --- ІНІЦІАЛІЗАЦІЯ ---
        init() {
            this.loadLocalData();
            this.setupEventListeners();
            for (let i = 0; i < 50; i++) this.bgParticles.push(new BgParticle());
            
            try { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); } 
            catch (e) { console.log("Could not init Telegram WebApp"); }

            setTimeout(() => {
                this.switchState('MENU');
            }, 1000); // Симуляція завантаження
        },

        // --- КЕРУВАННЯ СТАНОМ ГРИ ---
        switchState(newState) {
            this.state = newState;
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            const screenId = {
                'MENU': 'mainMenu', 'PLAYING': 'gameScreen', 'BOSS_FIGHT': 'gameScreen', 
                'GAME_OVER': 'gameOverScreen', 'SHOP': 'shopScreen', 'LEADERBOARD': 'leaderboardScreen'
            }[newState];
            if (screenId) elements[screenId].classList.add('active');

            if (newState === 'PLAYING' || newState === 'BOSS_FIGHT') this.startGameLoop();
            if (newState === 'GAME_OVER') this.endGame();
            if (newState === 'SHOP') this.populateShop();
            if (newState === 'LEADERBOARD') this.showLeaderboards();
        },

        // --- ІГРОВИЙ ЦИКЛ ---
        gameLoop() {
            if (!this.running) return;

            // Оновлення логіки
            this.update();
            // Малювання
            this.draw();

            this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
        },

        startGameLoop() {
            if (this.running) return;
            this.running = true;
            this.gameLoop();
        },

        stopGameLoop() {
            this.running = false;
            if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        },

        // --- ОНОВЛЕННЯ ЛОГІКИ ГРИ ---
        update() {
            this.handlePowerups();
            
            if (this.state === 'PLAYING') {
                this.snake.update(this.velocity);
                this.checkCollisions();
            } else if (this.state === 'BOSS_FIGHT') {
                this.snake.update(this.velocity);
                this.boss.update();
                this.checkBossCollisions();
            }
        },

        // --- МАЛЮВАННЯ ГРИ ---
        draw() {
            const bgGradient = ctx.createRadialGradient(elements.canvas.width / 2, elements.canvas.height / 2, 5, elements.canvas.width / 2, elements.canvas.height / 2, elements.canvas.height); 
            bgGradient.addColorStop(0, COLORS.DARK_PURPLE); bgGradient.addColorStop(1, COLORS.DARK_BG);
            ctx.fillStyle = bgGradient; ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
            
            this.bgParticles.forEach(p => p.update());
            [...this.bgParticles, ...this.particles].forEach(p => p.draw(ctx)); 
            ctx.globalAlpha = 1;
            this.particles = this.particles.filter(p => p.life > 0);

            if (this.state === 'PLAYING') {
                this.foods.forEach(f => f.draw()); 
                if(this.powerup) this.powerup.draw();
            } else if (this.state === 'BOSS_FIGHT') {
                this.boss.draw();
            }
            
            this.snake.draw();
        },

        // --- ЛОГІКА ІГРОВИХ ОБ'ЄКТІВ ---
        resetGame() {
            this.snake = new Snake();
            this.foods = [new Food()];
            this.powerup = null;
            this.particles = [];
            this.score = 0;
            this.combo = 1;
            this.comboTimer = 0;
            this.velocity = { x: 0, y: -1 };
            this.activePowerups = {};
            elements.newRecordText.classList.add('hidden');
            elements['boss-health-container'].classList.add('hidden');
            this.updateUI();
            this.switchState('PLAYING');
        },
        
        endGame() {
            this.stopGameLoop();
            if(navigator.vibrate) navigator.vibrate(200);
            gameWrapper.style.transform = 'translate(5px, -5px)';
            setTimeout(() => gameWrapper.style.transform = '', 100);
            
            if (this.score > this.highscore) this.highscore = this.score;
            elements.finalScore.textContent = this.score;
            
            this.checkForNewRecord();
            this.saveLocalData();
        },

        handlePowerups() { 
            if (this.comboTimer > 0) this.comboTimer--; else this.combo = 1; 
            for(const type in this.activePowerups) if(Date.now() > this.activePowerups[type]) delete this.activePowerups[type]; 
            this.updateIndicatorsUI(); 
        },

        checkCollisions() {
            this.foods.forEach((foodItem, index) => {
                if (Math.hypot(this.snake.head.x - foodItem.x, this.snake.head.y - foodItem.y) < this.snake.baseRadius + foodItem.radius) {
                    if (foodItem.isCoin) { this.coins++; } 
                    else { 
                        this.combo++; this.comboTimer = MAX_COMBO_TIME; 
                        this.score += this.combo; 
                        this.snake.grow(); 
                        if(Math.random() < GAME_SETTINGS.POWERUP_SPAWN_CHANCE && !this.powerup) this.powerup = new PowerUp();
                        if (this.score % GAME_SETTINGS.BOSS_TRIGGER_SCORE < this.combo) {
                            this.boss = new Boss();
                            this.switchState('BOSS_FIGHT');
                        }
                    }
                    this.createParticleBurst(foodItem.x, foodItem.y, foodItem.color);
                    this.foods.splice(index, 1);
                }
            });
            if (this.foods.length === 0) this.foods.push(new Food());

            if(this.powerup && Math.hypot(this.snake.head.x - this.powerup.x, this.snake.head.y - this.powerup.y) < this.snake.baseRadius + this.powerup.radius) {
                this.activePowerups[this.powerup.type] = Date.now() + 10000;
                if(this.powerup.type === POWERUP_TYPES.GOLD_RUSH) this.foods.forEach(f => f.convertToCoin());
                this.powerup = null;
            }

            const isOutOfBounds = this.snake.head.x < 0 || this.snake.head.x > elements.canvas.width || this.snake.head.y < 0 || this.snake.head.y > elements.canvas.height;
            if ((isOutOfBounds && !this.activePowerups.ghost) || this.snake.checkCollisionSelf()) this.switchState('GAME_OVER');
        },

        checkBossCollisions() {
            this.boss.weakPoints.forEach((point, index) => {
                if(Math.hypot(this.snake.head.x - point.x, this.snake.head.y - point.y) < this.snake.baseRadius + point.radius) {
                    this.boss.takeDamage();
                    this.createParticleBurst(point.x, point.y, COLORS.BOSS_NEON);
                    this.boss.weakPoints.splice(index, 1);
                    this.score += 10; // Бонус за вразливу точку
                }
            });
            
            if(this.boss.isDefeated()) {
                this.score += 100; // Бонус за перемогу над босом
                this.switchState('PLAYING');
                this.foods.push(new Food());
                elements['boss-health-container'].classList.add('hidden');
            }
             const isOutOfBounds = this.snake.head.x < 0 || this.snake.head.x > elements.canvas.width || this.snake.head.y < 0 || this.snake.head.y > elements.canvas.height;
            if ((isOutOfBounds && !this.activePowerups.ghost) || this.snake.checkCollisionSelf()) this.switchState('GAME_OVER');
        },

        // --- РОБОТА З ДАНИМИ (ЛОКАЛЬНО) ---
        getPlayerId() { 
            try { const tg = window.Telegram.WebApp; return tg.initDataUnsafe.user.username ? `@${tg.initDataUnsafe.user.username}` : (tg.initDataUnsafe.user.first_name || 'PLAYER'); } 
            catch (e) { let id = localStorage.getItem(`snake_playerId_${VERSION}`); if (!id) { id = `PLAYER-${Math.random().toString(16).substr(2, 4).toUpperCase()}`; localStorage.setItem(`snake_playerId_${VERSION}`, id); } return id; } 
        },
        loadLocalData() { 
            this.playerId = this.getPlayerId();
            this.highscore = parseInt(localStorage.getItem(`snake_highscore_${VERSION}`)) || 0;
            this.coins = parseInt(localStorage.getItem(`snake_coins_${VERSION}`)) || 0;
            this.purchasedSkins = JSON.parse(localStorage.getItem(`snake_purchasedSkins_${VERSION}`)) || [0];
            const skinId = parseInt(localStorage.getItem(`snake_currentSkin_${VERSION}`)) || 0;
            this.currentSkin = skins.find(s => s.id === skinId) || skins[0];
            this.leaderboardScores = JSON.parse(localStorage.getItem(`snake_leaderboardScores_${VERSION}`)) || [];
            this.leaderboardCoins = JSON.parse(localStorage.getItem(`snake_leaderboardCoins_${VERSION}`)) || [];
        },
        saveLocalData() { 
            localStorage.setItem(`snake_highscore_${VERSION}`, this.highscore);
            localStorage.setItem(`snake_coins_${VERSION}`, this.coins);
            localStorage.setItem(`snake_purchasedSkins_${VERSION}`, JSON.stringify(this.purchasedSkins));
            localStorage.setItem(`snake_currentSkin_${VERSION}`, this.currentSkin.id);
            localStorage.setItem(`snake_leaderboardScores_${VERSION}`, JSON.stringify(this.leaderboardScores));
            localStorage.setItem(`snake_leaderboardCoins_${VERSION}`, JSON.stringify(this.leaderboardCoins));
        },

        // --- UI ТА ІНДИКАТОРИ ---
        updateUI() {
            elements.score.textContent = this.score;
            elements.highscore.textContent = this.highscore;
            elements.coins.textContent = this.coins;
            elements.shopCoins.textContent = this.coins;
        },
        updateIndicatorsUI() { 
            elements['combo-bar'].style.width = `${(this.comboTimer / MAX_COMBO_TIME) * 100}%`; 
            elements['combo-text'].textContent = `x${this.combo}`;
            elements['powerup-timers'].innerHTML = ''; 
            for(const type in this.activePowerups) { 
                const timeLeft = Math.ceil((this.activePowerups[type] - Date.now()) / 1000); 
                if(timeLeft > 0) elements['powerup-timers'].innerHTML += `<div class="timer-icon ${type}">${type === 'ghost' ? '👻' : '★'} ${timeLeft}с</div>`;
            }
        },
        createParticleBurst(x, y, color) { for (let i = 0; i < 15; i++) this.particles.push(new Particle(x, y, color)); },
        
        // --- ЛІДЕРБОРДИ ТА МАГАЗИН (ЛОКАЛЬНІ) ---
        populateShop() { 
            elements.skinList.innerHTML = ''; 
            skins.forEach(skin => { 
                const isPurchased = this.purchasedSkins.includes(skin.id); 
                const isEquipped = this.currentSkin.id === skin.id; 
                const item = document.createElement('div'); 
                item.className = 'skin-item'; 
                if (isEquipped) item.classList.add('selected'); 
                if (!isPurchased) item.classList.add('locked'); 
                item.innerHTML = `<div class="skin-preview" style="background: linear-gradient(90deg, ${skin.colors[0]}, ${skin.colors[1]})"></div><div>${skin.name}</div>${isPurchased ? (isEquipped ? '<div class="equipped-badge">✓</div>' : '') : `<div class="skin-price"><span class="coin-icon"></span> ${skin.price}</div>`}`; 
                item.addEventListener('click', () => { 
                    if (isPurchased) { 
                        this.currentSkin = skin; this.saveLocalData(); this.populateShop(); 
                        if (this.snake) this.snake.applySkin(this.currentSkin);
                    } else if (this.coins >= skin.price) { 
                        this.coins -= skin.price; this.purchasedSkins.push(skin.id); this.currentSkin = skin; 
                        this.saveLocalData(); this.populateShop(); this.updateUI(); 
                    } 
                }); 
                elements.skinList.appendChild(item); 
            }); 
        },
        showLeaderboards() { this.populateLeaderboard(elements.highScoresList, this.leaderboardScores, 'score'); this.populateLeaderboard(elements.coinScoresList, this.leaderboardCoins, 'coins'); },
        populateLeaderboard(listElement, data, type) { 
            listElement.innerHTML = ''; 
            if (data.length === 0) { listElement.innerHTML = '<li>Тут поки пусто...</li>'; return; } 
            data.forEach((entry, index) => { 
                const li = document.createElement('li'); 
                const value = type === 'score' ? entry.score : entry.coins; 
                li.innerHTML = `<span class="rank">${index + 1}.</span><span class="name">${entry.name}</span><span class="score">${value}</span>`; 
                if (entry.name === this.playerId) li.classList.add('current-player'); 
                listElement.appendChild(li); 
            }); 
        },
        checkForNewRecord() { 
            const currentBest = this.leaderboardScores.find(e => e.name === this.playerId)?.score || 0; 
            if (this.score > 0 && this.score > currentBest) { 
                this.addOrUpdateLeaderboard(this.leaderboardScores, { name: this.playerId, score: this.score }, 'score'); 
                elements.newRecordText.classList.remove('hidden'); 
            } 
            this.addOrUpdateLeaderboard(this.leaderboardCoins, { name: this.playerId, coins: this.coins }, 'coins');
        },
        addOrUpdateLeaderboard(leaderboard, newEntry, key) { 
            const existingIndex = leaderboard.findIndex(e => e.name === newEntry.name); 
            if (existingIndex !== -1) { 
                if(newEntry[key] > leaderboard[existingIndex][key]) leaderboard[existingIndex][key] = newEntry[key]; 
            } else if (leaderboard.length < GAME_SETTINGS.LEADERBOARD_SIZE || newEntry[key] > (leaderboard[leaderboard.length - 1]?.[key] || 0)) { 
                leaderboard.push(newEntry); 
            } 
            leaderboard.sort((a, b) => b[key] - a[key]); 
            if (leaderboard.length > GAME_SETTINGS.LEADERBOARD_SIZE) leaderboard.pop(); 
        },

        // --- ОБРОБНИКИ ПОДІЙ ---
        setupEventListeners() {
            elements.playButton.addEventListener('click', () => this.resetGame());
            elements.restartButton.addEventListener('click', () => this.resetGame());
            elements.shopButton.addEventListener('click', () => this.switchState('SHOP'));
            elements.leaderboardButton.addEventListener('click', () => this.switchState('LEADERBOARD'));
            elements.backToMenuButton.addEventListener('click', () => this.switchState('MENU'));
            elements.closeShopButton.addEventListener('click', () => this.switchState('MENU'));
            elements.backFromLeaderboard.addEventListener('click', () => this.switchState('MENU'));
            
            elements.tabScores.addEventListener('click', () => { elements.tabScores.classList.add('active'); elements.tabCoins.classList.remove('active'); elements.highScoresList.classList.add('active'); elements.coinScoresList.classList.remove('active'); });
            elements.tabCoins.addEventListener('click', () => { elements.tabCoins.classList.add('active'); elements.tabScores.classList.remove('active'); elements.coinScoresList.classList.add('active'); elements.highScoresList.classList.remove('active'); });
            
            document.addEventListener('keydown', e => { if (!this.running) return; switch (e.key) { case 'ArrowUp': case 'w': if (this.velocity.y === 0) this.velocity = { x: 0, y: -1 }; break; case 'ArrowDown': case 's': if (this.velocity.y === 0) this.velocity = { x: 0, y: 1 }; break; case 'ArrowLeft': case 'a': if (this.velocity.x === 0) this.velocity = { x: -1, y: 0 }; break; case 'ArrowRight': case 'd': if (this.velocity.x === 0) this.velocity = { x: 1, y: 0 }; break; } });
            document.addEventListener('touchstart', e => { this.touchStart.x = e.touches[0].clientX; this.touchStart.y = e.touches[0].clientY; }, { passive: true });
            document.addEventListener('touchmove', e => { if (!this.running) return; e.preventDefault(); const touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY }; const deltaX = touchMove.x - this.touchStart.x; const deltaY = touchMove.y - this.touchStart.y; if (Math.abs(deltaX) > 20 || Math.abs(deltaY) > 20) { if (Math.abs(deltaX) > Math.abs(deltaY)) { if (deltaX > 0 && this.velocity.x === 0) this.velocity = { x: 1, y: 0 }; else if (deltaX < 0 && this.velocity.x === 0) this.velocity = { x: -1, y: 0 }; } else { if (deltaY > 0 && this.velocity.y === 0) this.velocity = { x: 0, y: 1 }; else if (deltaY < 0 && this.velocity.y === 0) this.velocity = { x: 0, y: -1 }; } this.touchStart = touchMove; } }, { passive: false });
        }
    };

    // --- Класи ігрових сутностей (мають бути тут, щоб мати доступ до Game) ---
    class Snake {
        constructor() { this.head = { x: elements.canvas.width / 2, y: elements.canvas.height / 2 }; this.path = []; this.length = 10; this.baseRadius = 7; this.segmentDistance = 4; this.applySkin(Game.currentSkin); }
        applySkin(skin) { this.colorStart = skin.colors[0]; this.colorEnd = skin.colors[1]; }
        update(direction) { this.path.push({ ...this.head }); this.head.x += direction.x * GAME_SETTINGS.SNAKE_SPEED; this.head.y += direction.y * GAME_SETTINGS.SNAKE_SPEED; if (this.path.length > this.length * this.segmentDistance) this.path.shift(); }
        draw() { ctx.globalAlpha = Game.activePowerups.ghost ? 0.5 : 1; if (Game.activePowerups.ghost) { ctx.shadowColor = COLORS.GHOST_NEON; ctx.shadowBlur = 30; } const gradient = ctx.createLinearGradient(0, 0, elements.canvas.width, elements.canvas.height); gradient.addColorStop(0, this.colorStart); gradient.addColorStop(1, this.colorEnd); for (let i = 0; i < this.length; i++) { const pathIndex = this.path.length - 1 - (i * this.segmentDistance); if (pathIndex < 0) break; const pos = this.path[pathIndex]; const radius = this.baseRadius * (1 - i / (this.length * 1.2)); ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill(); } ctx.beginPath(); ctx.arc(this.head.x, this.head.y, this.baseRadius, 0, Math.PI * 2); ctx.fillStyle = this.colorStart; if (!Game.activePowerups.ghost) { ctx.shadowColor = this.colorStart; ctx.shadowBlur = 20; } ctx.fill(); ctx.shadowBlur = 0; const angle = (Game.velocity.x === 0 && Game.velocity.y === 0) ? -Math.PI / 2 : Math.atan2(Game.velocity.y, Game.velocity.x); const eyeOffsetX = Math.cos(angle + Math.PI / 2) * (this.baseRadius * 0.4); const eyeOffsetY = Math.sin(angle + Math.PI / 2) * (this.baseRadius * 0.4); ctx.beginPath(); ctx.arc(this.head.x + eyeOffsetX, this.head.y + eyeOffsetY, 1.5, 0, Math.PI * 2); ctx.arc(this.head.x - eyeOffsetX, this.head.y - eyeOffsetY, 1.5, 0, Math.PI * 2); ctx.fillStyle = 'black'; ctx.fill(); ctx.globalAlpha = 1; }
        checkCollisionSelf() { if (Game.activePowerups.ghost) return false; for (let i = 0; i < this.path.length - Math.floor(this.length * this.segmentDistance / 2); i++) if (Math.hypot(this.head.x - this.path[i].x, this.head.y - this.path[i].y) < this.baseRadius / 2) return true; return false; }
        grow() { this.length += 3; }
    }
    class Food { constructor() { this.spawn(); } spawn() { this.isCoin = Math.random() < 0.2; this.radius = this.isCoin ? 10 : 8; this.color = this.isCoin ? COLORS.COIN_NEON : COLORS.DANGER_NEON; this.x = Math.random() * (elements.canvas.width - 40) + 20; this.y = Math.random() * (elements.canvas.height - 40) + 20; } draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; if (this.isCoin) { ctx.fillStyle = '#a07d00'; ctx.font = `bold ${this.radius+2}px "${getComputedStyle(document.documentElement).getPropertyValue('--game-font').trim()}"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', this.x, this.y + 1); } } convertToCoin() { this.isCoin = true; this.color = COLORS.COIN_NEON; this.radius = 10; } }
    class PowerUp { constructor() { this.spawn(); } spawn() { this.type = Math.random() < 0.5 ? POWERUP_TYPES.GHOST : POWERUP_TYPES.GOLD_RUSH; this.radius = 12; this.x = Math.random() * (elements.canvas.width - 40) + 20; this.y = Math.random() * (elements.canvas.height - 40) + 20; } draw() { ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.globalAlpha = 0.8; ctx.fillStyle = this.type === POWERUP_TYPES.GHOST ? COLORS.GHOST_NEON : COLORS.COIN_NEON; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 25; ctx.fill(); ctx.restore(); ctx.fillStyle = 'black'; ctx.font = 'bold 10px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.type === POWERUP_TYPES.GHOST ? '👻' : '★', this.x, this.y + 1); } }
    class Boss {
        constructor() { this.x = elements.canvas.width / 2; this.y = elements.canvas.height / 4; this.radius = 40; this.maxHealth = 5; this.health = 5; this.vel = { x: 1.5, y: 1.5 }; this.weakPoints = []; this.spawnWeakPoints(); elements['boss-health-container'].classList.remove('hidden'); }
        spawnWeakPoints() { for(let i = 0; i < 3; i++) { const angle = Math.random() * Math.PI * 2; this.weakPoints.push({ x: this.x + Math.cos(angle) * this.radius, y: this.y + Math.sin(angle) * this.radius, radius: 6 }); } }
        update() { this.x += this.vel.x; this.y += this.vel.y; if(this.x < this.radius || this.x > elements.canvas.width - this.radius) this.vel.x *= -1; if(this.y < this.radius || this.y > elements.canvas.height / 2) this.vel.y *= -1; this.weakPoints.forEach(p => { p.x += this.vel.x; p.y += this.vel.y; }); if(this.weakPoints.length === 0) this.spawnWeakPoints(); elements['boss-health-bar'].style.width = `${(this.health / this.maxHealth) * 100}%`; }
        draw() { ctx.fillStyle = COLORS.BOSS_NEON; ctx.shadowColor = COLORS.BOSS_NEON; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; this.weakPoints.forEach(p => { ctx.fillStyle = COLORS.DANGER_NEON; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); }); }
        takeDamage() { this.health--; }
        isDefeated() { return this.health <= 0; }
    }

    // --- ЗАПУСК ГРИ ---
    Game.init();
});