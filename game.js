// Це "золоте правило" веб-розробки.
// Весь код буде виконано тільки після того, як HTML-сторінка повністю завантажиться.
// Це гарантує, що всі кнопки та елементи будуть на місці і гра не зависне.
document.addEventListener('DOMContentLoaded', () => {

    // --- ГЛОБАЛЬНІ КОНСТАНТИ ТА НАЛАШТУВАННЯ ГРИ ---
    // Всі налаштування винесені сюди для легкості редагування
    const VERSION = '15_RENAISSANCE'; // Змінюємо версію для скидання старих збережень
    const COLORS = { 
        PRIMARY_NEON: '#00e5ff', DANGER_NEON: '#ff3838', COIN_NEON: '#ffde00', 
        DARK_BG: '#01000d', DARK_PURPLE: '#1a0537', XP_NEON: '#9dff00'
    };
    const GAME_SETTINGS = { 
        BASE_SNAKE_SPEED: 2.8, SPEED_INCREASE_PER_LEVEL: 0.1,
        LEADERBOARD_SIZE: 10, XP_PER_FOOD: 10
    };
    const skins = [ { id: 0, name: 'Стандарт', price: 0, colors: ['#00ff6a', '#00aaff'] }, { id: 1, name: 'Електрик', price: 200, colors: ['#00ffff', '#0077ff'] }, { id: 2, name: 'Вогняний', price: 300, colors: ['#ff8c00', '#ff0000'] }, { id: 3, name: 'Отрута', price: 400, colors: ['#7fff00', '#ff00ff'] }, { id: 4, name: 'Пустота', price: 500, colors: ['#9370db', '#483d8b'] }, { id: 5, name: 'Світанок', price: 600, colors: ['#fd5e53', '#ffde00'] }, { id: 6, name: 'Кристал', price: 700, colors: ['#f0f8ff', '#add8e6'] }, { id: 7, name: 'Глітч', price: 800, colors: ['#ff00ff', '#00ffff'] }, { id: 8, name: 'Плазма', price: 900, colors: ['#fd5e53', '#ff00ff'] }, { id: 9, name: 'Золотий', price: 1000, colors: ['#ffd700', '#ffb347'] }, { id: 10, name: 'Супернова', price: 1100, colors: ['#ffffff', '#ffde00'] }, { id: 11, name: 'Кіберпанк', price: 1200, colors: ['#ff00ff', '#00e5ff'] }, { id: 12, name: 'Магма', price: 1300, colors: ['#ff4500', '#dc143c'] }, { id: 13, name: 'Аврора', price: 1400, colors: ['#40e0d0', '#ff8c00'] }, { id: 14, name: 'Тінь', price: 1500, colors: ['#333333', '#808080'] }, { id: 15, name: 'Квантовий', price: 1600, colors: ['#00ff7f', '#dda0dd'] }, { id: 16, name: 'Ангельський', price: 1700, colors: ['#ffffff', '#fffacd'] }, { id: 17, name: 'Демонічний', price: 1800, colors: ['#8b0000', '#ff0000'] }, { id: 18, 'name': 'Голограма', price: 1900, colors: ['#00e5ff', '#ff00ff']}, { id: 19, 'name': 'Сингулярність', price: 2000, colors: ['#ffffff', '#000000']} ];

    // --- ПОШУК УСІХ HTML ЕЛЕМЕНТІВ ---
    const elements = {};
    ['mainMenu', 'gameScreen', 'gameOverScreen', 'shopScreen', 'leaderboardScreen', 'playButton', 'shopButton', 'leaderboardButton', 'restartButton', 'backToMenuButton', 'closeShopButton', 'backFromLeaderboard', 'canvas', 'score', 'highscore', 'coins', 'shopCoins', 'finalScore', 'newRecordText', 'skinList', 'highScoresList', 'level-value', 'xp-bar', 'dailyRewardModal', 'claimRewardButton', 'rewardAmount']
    .forEach(id => elements[id] = document.getElementById(id));
    const ctx = elements.canvas.getContext('2d');
    elements.canvas.width = 420; elements.canvas.height = 747;

    // --- ГОЛОВНИЙ ОБ'ЄКТ ГРИ (ІГРОВИЙ РУШІЙ) ---
    const GameEngine = {
        state: 'MENU',
        entities: { snake: null, food: null, particles: [] },
        gameplay: { score: 0, velocity: { x: 0, y: 0 } },
        player: { highscore: 0, coins: 0, currentSkin: skins[0], purchasedSkins: [0], level: 1, xp: 0, id: 'PLAYER' },
        leaderboard: [],
        animationFrameId: null,

        init() {
            this.loadLocalData();
            this.setupEventListeners();
            this.checkDailyReward();
            this.switchState('MENU');
        },

        switchState(newState) {
            this.state = newState;
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            elements[newState.toLowerCase() + 'Screen']?.classList.add('active');

            if (newState === 'PLAYING') this.startGameLoop(); else this.stopGameLoop();
            if (newState === 'GAME_OVER') this.endGame();
            if (newState === 'SHOP') this.renderShop();
            if (newState === 'LEADERBOARD') this.renderLeaderboards();
        },

        gameLoop() {
            this.update();
            this.draw();
            this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
        },
        startGameLoop() { if (!this.animationFrameId) this.gameLoop(); },
        stopGameLoop() { if (this.animationFrameId) { cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; } },

        update() {
            this.entities.snake.update(this.gameplay.velocity);
            this.checkCollisions();
            this.entities.particles = this.entities.particles.filter(p => p.life > 0);
            this.entities.particles.forEach(p => p.update());
        },
        draw() {
            ctx.fillStyle = COLORS.DARK_BG;
            ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
            this.entities.particles.forEach(p => p.draw());
            if(this.entities.food) this.entities.food.draw();
            if(this.entities.snake) this.entities.snake.draw();
        },

        resetGame() {
            this.entities.snake = new Snake(this.player.currentSkin, this.player.level);
            this.entities.food = new Food();
            this.entities.particles = [];
            this.gameplay = { score: 0, velocity: { x: 0, y: -1 } };
            elements.newRecordText.classList.add('hidden');
            this.updateUI();
            this.switchState('PLAYING');
        },
        endGame() {
            if (this.gameplay.score > this.player.highscore) this.player.highscore = this.gameplay.score;
            elements.finalScore.textContent = this.gameplay.score;
            this.updateLeaderboard();
            this.saveLocalData();
        },

        checkCollisions() {
            if (this.entities.food && Math.hypot(this.entities.snake.head.x - this.entities.food.x, this.entities.snake.head.y - this.entities.food.y) < this.entities.snake.baseRadius + this.entities.food.radius) {
                if (this.entities.food.isCoin) {
                    this.player.coins++;
                } else {
                    this.gameplay.score++;
                    this.entities.snake.grow();
                    this.addXP(GAME_SETTINGS.XP_PER_FOOD);
                }
                this.createParticleBurst(this.entities.food.x, this.entities.food.y, this.entities.food.color);
                this.entities.food = new Food();
                this.updateUI();
            }
            if (this.entities.snake.head.x < 0 || this.entities.snake.head.x > elements.canvas.width || this.entities.snake.head.y < 0 || this.entities.snake.head.y > elements.canvas.height || this.entities.snake.checkCollisionSelf()) {
                this.switchState('GAME_OVER');
            }
        },

        addXP(amount) {
            this.player.xp += amount;
            const xpForNextLevel = 100 + (this.player.level - 1) * 50;
            if (this.player.xp >= xpForNextLevel) {
                this.player.level++;
                this.player.xp -= xpForNextLevel;
                this.entities.snake.levelUp();
            }
            this.updateUI();
        },

        loadLocalData() {
            this.player.id = this.getPlayerId();
            try {
                this.player.highscore = parseInt(localStorage.getItem(`snake_highscore_${VERSION}`)) || 0;
                this.player.coins = parseInt(localStorage.getItem(`snake_coins_${VERSION}`)) || 0;
                this.player.level = parseInt(localStorage.getItem(`snake_level_${VERSION}`)) || 1;
                this.player.xp = parseInt(localStorage.getItem(`snake_xp_${VERSION}`)) || 0;
                this.player.purchasedSkins = JSON.parse(localStorage.getItem(`snake_purchasedSkins_${VERSION}`)) || [0];
                const skinId = parseInt(localStorage.getItem(`snake_currentSkin_${VERSION}`)) || 0;
                this.player.currentSkin = skins.find(s => s.id === skinId) || skins[0];
                this.leaderboard = JSON.parse(localStorage.getItem(`snake_leaderboard_${VERSION}`)) || [];
            } catch (e) {
                console.error("Помилка завантаження даних:", e);
                this.player = { highscore: 0, coins: 0, currentSkin: skins[0], purchasedSkins: [0], level: 1, xp: 0, id: this.getPlayerId() };
            }
        },
        saveLocalData() {
            try {
                localStorage.setItem(`snake_highscore_${VERSION}`, this.player.highscore);
                localStorage.setItem(`snake_coins_${VERSION}`, this.player.coins);
                localStorage.setItem(`snake_level_${VERSION}`, this.player.level);
                localStorage.setItem(`snake_xp_${VERSION}`, this.player.xp);
                localStorage.setItem(`snake_purchasedSkins_${VERSION}`, JSON.stringify(this.player.purchasedSkins));
                localStorage.setItem(`snake_currentSkin_${VERSION}`, this.player.currentSkin.id);
                localStorage.setItem(`snake_leaderboard_${VERSION}`, JSON.stringify(this.leaderboard));
            } catch (e) {
                console.error("Помилка збереження даних:", e);
            }
        },

        updateUI() {
            elements.score.textContent = this.gameplay.score;
            elements.highscore.textContent = this.player.highscore;
            elements.coins.textContent = this.player.coins;
            elements.shopCoins.textContent = this.player.coins;
            elements['level-value'].textContent = this.player.level;
            const xpForNextLevel = 100 + (this.player.level - 1) * 50;
            elements['xp-bar'].style.width = `${(this.player.xp / xpForNextLevel) * 100}%`;
        },
        createParticleBurst(x, y, color) {
            for (let i = 0; i < 15; i++) this.entities.particles.push(new Particle(x, y, color));
        },
        
        renderShop() {
            elements.skinList.innerHTML = '';
            skins.forEach(skin => {
                const isPurchased = this.player.purchasedSkins.includes(skin.id);
                const isEquipped = this.player.currentSkin.id === skin.id;
                const item = document.createElement('div');
                item.className = 'skin-item';
                if (isEquipped) item.classList.add('selected');
                if (!isPurchased) item.classList.add('locked');
                item.innerHTML = `<div class="skin-preview" style="background: linear-gradient(90deg, ${skin.colors[0]}, ${skin.colors[1]})"></div><div>${skin.name}</div>${isPurchased ? (isEquipped ? '<div class="equipped-badge">✓</div>' : '') : `<div class="skin-price"><span class="coin-icon"></span> ${skin.price}</div>`}`;
                item.addEventListener('click', () => {
                    if (isPurchased) {
                        this.player.currentSkin = skin;
                        this.saveLocalData();
                        this.renderShop();
                    } else if (this.player.coins >= skin.price) {
                        this.player.coins -= skin.price;
                        this.player.purchasedSkins.push(skin.id);
                        this.player.currentSkin = skin;
                        this.saveLocalData();
                        this.renderShop();
                        this.updateUI();
                    }
                });
                elements.skinList.appendChild(item);
            });
        },
        
        renderLeaderboards() {
            elements.highScoresList.innerHTML = '';
            this.leaderboard.sort((a,b) => b.score - a.score);
            if (this.leaderboard.length === 0) {
                elements.highScoresList.innerHTML = '<li>Тут поки пусто...</li>';
                return;
            }
            this.leaderboard.slice(0, GAME_SETTINGS.LEADERBOARD_SIZE).forEach((entry, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="rank">${index + 1}.</span><span class="name">${entry.name}</span><span class="score">${entry.score}</span>`;
                elements.highScoresList.appendChild(li);
            });
        },
        
        updateLeaderboard() {
            const currentBest = this.leaderboard.find(e => e.name === this.player.id)?.score || 0;
            if (this.gameplay.score > currentBest) {
                elements.newRecordText.classList.remove('hidden');
                const existingIndex = this.leaderboard.findIndex(e => e.name === this.player.id);
                if (existingIndex !== -1) {
                    this.leaderboard[existingIndex].score = this.gameplay.score;
                } else {
                    this.leaderboard.push({ name: this.player.id, score: this.gameplay.score });
                }
            }
        },

        checkDailyReward() {
            const today = new Date().toDateString();
            const lastVisit = localStorage.getItem(`snake_lastVisit_${VERSION}`);
            if (lastVisit !== today) {
                const reward = 100;
                this.player.coins += reward;
                elements.rewardAmount.textContent = reward;
                elements.dailyRewardModal.classList.remove('hidden');
                localStorage.setItem(`snake_lastVisit_${VERSION}`, today);
                this.saveLocalData();
                this.updateUI();
            }
        },

        setupEventListeners() {
            elements.playButton.addEventListener('click', () => this.resetGame());
            elements.restartButton.addEventListener('click', () => this.resetGame());
            elements.shopButton.addEventListener('click', () => this.switchState('SHOP'));
            elements.leaderboardButton.addEventListener('click', () => this.switchState('LEADERBOARD'));
            elements.backToMenuButton.addEventListener('click', () => this.switchState('MENU'));
            elements.closeShopButton.addEventListener('click', () => this.switchState('MENU'));
            elements.backFromLeaderboard.addEventListener('click', () => this.switchState('MENU'));
            elements.claimRewardButton.addEventListener('click', () => elements.dailyRewardModal.classList.add('hidden'));

            document.addEventListener('keydown', e => { if (this.state !== 'PLAYING') return; switch (e.key) { case 'ArrowUp': case 'w': if (this.gameplay.velocity.y === 0) this.gameplay.velocity = { x: 0, y: -1 }; break; case 'ArrowDown': case 's': if (this.gameplay.velocity.y === 0) this.gameplay.velocity = { x: 0, y: 1 }; break; case 'ArrowLeft': case 'a': if (this.gameplay.velocity.x === 0) this.gameplay.velocity = { x: -1, y: 0 }; break; case 'ArrowRight': case 'd': if (this.gameplay.velocity.x === 0) this.gameplay.velocity = { x: 1, y: 0 }; break; } });
            
            document.addEventListener('touchstart', e => { this.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
            document.addEventListener('touchmove', e => { if (this.state !== 'PLAYING') return; e.preventDefault(); const touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY }; const deltaX = touchMove.x - this.touchStart.x; const deltaY = touchMove.y - this.touchStart.y; if (Math.abs(deltaX) > 20 || Math.abs(deltaY) > 20) { if (Math.abs(deltaX) > Math.abs(deltaY)) { if (deltaX > 0 && this.gameplay.velocity.x === 0) this.gameplay.velocity = { x: 1, y: 0 }; else if (deltaX < 0 && this.gameplay.velocity.x === 0) this.gameplay.velocity = { x: -1, y: 0 }; } else { if (deltaY > 0 && this.gameplay.velocity.y === 0) this.gameplay.velocity = { x: 0, y: 1 }; else if (deltaY < 0 && this.gameplay.velocity.y === 0) this.gameplay.velocity = { x: 0, y: -1 }; } this.touchStart = touchMove; } }, { passive: false });
        },
        
        getPlayerId() {
            try { const tg = window.Telegram.WebApp; const user = tg.initDataUnsafe.user; if (user && user.id) return user.username ? `@${user.username}` : user.first_name || 'PLAYER'; } catch (e) {}
            return `PLAYER-${Math.random().toString(16).substr(2, 4).toUpperCase()}`;
        }
    };

    // --- Класи ігрових сутностей ---
    class Snake {
        constructor(skin, level) {
            this.head = { x: elements.canvas.width / 2, y: elements.canvas.height / 2 };
            this.path = [];
            this.length = 10;
            this.baseRadius = 7;
            this.segmentDistance = 4;
            this.speed = GAME_SETTINGS.BASE_SNAKE_SPEED + (level - 1) * GAME_SETTINGS.SPEED_INCREASE_PER_LEVEL;
            this.applySkin(skin);
        }
        applySkin(skin) { this.colorStart = skin.colors[0]; this.colorEnd = skin.colors[1]; }
        update(direction) { this.path.push({ ...this.head }); this.head.x += direction.x * this.speed; this.head.y += direction.y * this.speed; if (this.path.length > this.length * this.segmentDistance) this.path.shift(); }
        draw() {
            const gradient = ctx.createLinearGradient(0, 0, elements.canvas.width, elements.canvas.height);
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
            const angle = (GameEngine.gameplay.velocity.x === 0 && GameEngine.gameplay.velocity.y === 0) ? -Math.PI / 2 : Math.atan2(GameEngine.gameplay.velocity.y, GameEngine.gameplay.velocity.x);
            const eyeOffsetX = Math.cos(angle + Math.PI / 2) * (this.baseRadius * 0.4);
            const eyeOffsetY = Math.sin(angle + Math.PI / 2) * (this.baseRadius * 0.4);
            ctx.beginPath();
            ctx.arc(this.head.x + eyeOffsetX, this.head.y + eyeOffsetY, 1.5, 0, Math.PI * 2);
            ctx.arc(this.head.x - eyeOffsetX, this.head.y - eyeOffsetY, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'black';
            ctx.fill();
        }
        checkCollisionSelf() {
            for (let i = 0; i < this.path.length - Math.floor(this.length * this.segmentDistance / 2); i++) {
                if (Math.hypot(this.head.x - this.path[i].x, this.head.y - this.path[i].y) < this.baseRadius / 2) return true;
            }
            return false;
        }
        grow() { this.length += 3; }
        levelUp() { this.speed += GAME_SETTINGS.SPEED_INCREASE_PER_LEVEL; }
    }

    class Food {
        constructor() { this.spawn(); }
        spawn() {
            this.isCoin = Math.random() < 0.2;
            this.radius = this.isCoin ? 10 : 8;
            this.color = this.isCoin ? COLORS.COIN_NEON : COLORS.DANGER_NEON;
            this.x = Math.random() * (elements.canvas.width - 40) + 20;
            this.y = Math.random() * (elements.canvas.height - 40) + 20;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 20;
            ctx.fill();
            ctx.shadowBlur = 0;
            if (this.isCoin) {
                ctx.fillStyle = '#a07d00';
                ctx.font = `bold ${this.radius + 2}px "Press Start 2P"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('$', this.x, this.y + 1);
            }
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.size = Math.random() * 5 + 2;
            this.life = 1;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1;
            this.velX = Math.cos(angle) * speed;
            this.velY = Math.sin(angle) * speed;
        }
        update() {
            this.x += this.velX;
            this.y += this.velY;
            this.life -= 0.03;
            if (this.size > 0.2) this.size -= 0.1;
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.life;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    
    // --- ЗАПУСК ГРИ ---
    GameEngine.init();
});