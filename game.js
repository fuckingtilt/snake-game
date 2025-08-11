document.addEventListener('DOMContentLoaded', () => {

    // --- ГЛОБАЛЬНІ КОНСТАНТИ ТА НАЛАШТУВАННЯ ГРИ ---
    const VERSION = '12_FINAL_LOCAL'; 
    const COLORS = { 
        PRIMARY_NEON: '#00e5ff', DANGER_NEON: '#ff3838', COIN_NEON: '#ffde00', 
        DARK_BG: '#01000d', DARK_PURPLE: '#1a0537', COMBO_NEON: '#a200ff', 
        GHOST_NEON: '#ffffff', BOSS_NEON: '#ff00ff' 
    };
    const POWERUP_TYPES = { GHOST: 'ghost', GOLD_RUSH: 'gold_rush' };
    const GAME_SETTINGS = { 
        SNAKE_SPEED: 3.0, POWERUP_SPAWN_CHANCE: 0.1, LEADERBOARD_SIZE: 10, 
        MAX_COMBO_TIME: 150, BOSS_TRIGGER_SCORE: 50 
    };
    const skins = [ { id: 0, name: 'Стандарт', price: 0, colors: ['#00ff6a', '#00aaff'] }, { id: 1, name: 'Електрик', price: 200, colors: ['#00ffff', '#0077ff'] }, { id: 2, name: 'Вогняний', price: 300, colors: ['#ff8c00', '#ff0000'] }, { id: 3, name: 'Отрута', price: 400, colors: ['#7fff00', '#ff00ff'] }, { id: 4, name: 'Пустота', price: 500, colors: ['#9370db', '#483d8b'] }, { id: 5, name: 'Світанок', price: 600, colors: ['#fd5e53', '#ffde00'] }, { id: 6, name: 'Кристал', price: 700, colors: ['#f0f8ff', '#add8e6'] }, { id: 7, name: 'Глітч', price: 800, colors: ['#ff00ff', '#00ffff'] }, { id: 8, name: 'Плазма', price: 900, colors: ['#fd5e53', '#ff00ff'] }, { id: 9, name: 'Золотий', price: 1000, colors: ['#ffd700', '#ffb347'] }, { id: 10, name: 'Супернова', price: 1100, colors: ['#ffffff', '#ffde00'] }, { id: 11, name: 'Кіберпанк', price: 1200, colors: ['#ff00ff', '#00e5ff'] }, { id: 12, name: 'Магма', price: 1300, colors: ['#ff4500', '#dc143c'] }, { id: 13, name: 'Аврора', price: 1400, colors: ['#40e0d0', '#ff8c00'] }, { id: 14, name: 'Тінь', price: 1500, colors: ['#333333', '#808080'] }, { id: 15, name: 'Квантовий', price: 1600, colors: ['#00ff7f', '#dda0dd'] }, { id: 16, name: 'Ангельський', price: 1700, colors: ['#ffffff', '#fffacd'] }, { id: 17, name: 'Демонічний', price: 1800, colors: ['#8b0000', '#ff0000'] }, { id: 18, 'name': 'Голограма', price: 1900, colors: ['#00e5ff', '#ff00ff']}, { id: 19, 'name': 'Сингулярність', price: 2000, colors: ['#ffffff', '#000000']} ];
    
    // --- ПОШУК УСІХ HTML ЕЛЕМЕНТІВ ---
    const elements = {};
    ['mainMenu', 'gameScreen', 'gameOverScreen', 'shopScreen', 'leaderboardScreen', 'playButton', 'shopButton', 'leaderboardButton', 'restartButton', 'backToMenuButton', 'closeShopButton', 'backFromLeaderboard', 'canvas', 'score', 'highscore', 'coins', 'shopCoins', 'finalScore', 'newRecordText', 'skinList', 'highScoresList', 'coinScoresList', 'tabScores', 'tabCoins', 'powerup-timers', 'combo-bar', 'combo-text', 'boss-health-container', 'boss-health-bar', 'boss-health-text']
    .forEach(id => elements[id] = document.getElementById(id));
    const ctx = elements.canvas.getContext('2d');
    elements.canvas.width = 420; elements.canvas.height = 747;

    // --- ГОЛОВНИЙ ОБ'ЄКТ ГРИ (ІГРОВИЙ РУШІЙ) ---
    const GameEngine = {
        state: 'MENU', 
        entities: { snake: null, foods: [], powerup: null, boss: null, particles: [], bgParticles: [] },
        gameplay: { score: 0, combo: 1, comboTimer: 0, activePowerups: {}, velocity: { x: 0, y: 0 } },
        player: { highscore: 0, coins: 0, currentSkin: skins[0], purchasedSkins: [0], id: 'PLAYER' },
        leaderboards: { scores: [], coins: [] },
        animationFrameId: null,

        init() {
            this.loadLocalData();
            this.setupEventListeners();
            for (let i = 0; i < 50; i++) this.entities.bgParticles.push(new BgParticle());
            this.switchState('MENU');
        },

        switchState(newState) {
            if (this.state === newState) return;
            this.state = newState;
            
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            const screenMap = { 
                'MENU': 'mainMenu', 'PLAYING': 'gameScreen', 'BOSS_FIGHT': 'gameScreen', 
                'GAME_OVER': 'gameOverScreen', 'SHOP': 'shopScreen', 'LEADERBOARD': 'leaderboardScreen' 
            };
            if (screenMap[newState]) elements[screenMap[newState]].classList.add('active');

            if (newState === 'PLAYING' || newState === 'BOSS_FIGHT') this.startGameLoop();
            else this.stopGameLoop();

            if (newState === 'GAME_OVER') this.endGame();
            if (newState === 'SHOP') this.renderShop();
            if (newState === 'LEADERBOARD') this.renderLeaderboards();
        },

        gameLoop() { this.update(); this.draw(); this.animationFrameId = requestAnimationFrame(() => this.gameLoop()); },
        startGameLoop() { if (!this.animationFrameId) this.gameLoop(); },
        stopGameLoop() { if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; },

        update() {
            this.updatePowerups();
            this.entities.snake.update(this.gameplay.velocity);
            
            if (this.state === 'PLAYING') this.checkStandardCollisions();
            else if (this.state === 'BOSS_FIGHT') { this.entities.boss.update(); this.checkBossCollisions(); }
        },
        draw() {
            const bgGradient = ctx.createRadialGradient(elements.canvas.width / 2, elements.canvas.height / 2, 5, elements.canvas.width / 2, elements.canvas.height / 2, elements.canvas.height); 
            bgGradient.addColorStop(0, COLORS.DARK_PURPLE); bgGradient.addColorStop(1, COLORS.DARK_BG);
            ctx.fillStyle = bgGradient; ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
            
            this.entities.bgParticles.forEach(p => p.update());
            this.entities.particles = this.entities.particles.filter(p => p.life > 0);
            [...this.entities.bgParticles, ...this.entities.particles].forEach(p => p.draw(ctx)); 
            
            if (this.state === 'PLAYING') { this.entities.foods.forEach(f => f.draw()); if(this.entities.powerup) this.entities.powerup.draw(); } 
            else if (this.state === 'BOSS_FIGHT') { this.entities.boss.draw(); }
            
            this.entities.snake.draw();
        },

        resetGame() {
            this.entities.snake = new Snake(this.player.currentSkin);
            this.entities.foods = [new Food()];
            this.entities.powerup = null; this.entities.boss = null;
            this.entities.particles = [];
            this.gameplay = { score: 0, combo: 1, comboTimer: 0, activePowerups: {}, velocity: { x: 0, y: -1 } };
            
            elements.newRecordText.classList.add('hidden');
            elements['boss-health-container'].classList.add('hidden');
            
            this.updateUI();
            this.switchState('PLAYING');
        },
        endGame() {
            if (this.gameplay.score > this.player.highscore) this.player.highscore = this.gameplay.score;
            elements.finalScore.textContent = this.gameplay.score;
            this.updateLeaderboards();
            this.saveLocalData();
        },

        checkStandardCollisions() {
            let eaten = false;
            this.entities.foods.forEach((foodItem, index) => {
                if (Math.hypot(this.entities.snake.head.x - foodItem.x, this.entities.snake.head.y - foodItem.y) < this.entities.snake.baseRadius + foodItem.radius) {
                    eaten = true;
                    if (foodItem.isCoin) { this.player.coins++; } 
                    else { 
                        this.gameplay.combo++; this.gameplay.comboTimer = GAME_SETTINGS.MAX_COMBO_TIME; 
                        this.gameplay.score += this.gameplay.combo; this.entities.snake.grow(); 
                        if(Math.random() < GAME_SETTINGS.POWERUP_SPAWN_CHANCE && !this.entities.powerup) this.entities.powerup = new PowerUp();
                        if (!this.entities.boss && this.gameplay.score >= GAME_SETTINGS.BOSS_TRIGGER_SCORE) {
                            this.entities.boss = new Boss(); this.switchState('BOSS_FIGHT');
                        }
                    }
                    this.createParticleBurst(foodItem.x, foodItem.y, foodItem.color);
                    this.entities.foods.splice(index, 1);
                }
            });
            if (eaten) this.updateUI();
            if (this.entities.foods.length === 0) this.entities.foods.push(new Food());

            if(this.entities.powerup && Math.hypot(this.entities.snake.head.x - this.entities.powerup.x, this.entities.snake.head.y - this.entities.powerup.y) < this.entities.snake.baseRadius + this.entities.powerup.radius) {
                this.gameplay.activePowerups[this.entities.powerup.type] = Date.now() + 10000;
                if(this.entities.powerup.type === POWERUP_TYPES.GOLD_RUSH) this.entities.foods.forEach(f => f.convertToCoin());
                this.entities.powerup = null;
            }

            const isOutOfBounds = this.entities.snake.head.x < 0 || this.entities.snake.head.x > elements.canvas.width || this.entities.snake.head.y < 0 || this.entities.snake.head.y > elements.canvas.height;
            if ((isOutOfBounds && !this.gameplay.activePowerups.ghost) || this.entities.snake.checkCollisionSelf()) this.switchState('GAME_OVER');
        },
        checkBossCollisions() {
            this.entities.boss.weakPoints.forEach((point, index) => {
                if(Math.hypot(this.entities.snake.head.x - point.x, this.entities.snake.head.y - point.y) < this.entities.snake.baseRadius + point.radius) {
                    this.entities.boss.takeDamage(); this.createParticleBurst(point.x, point.y, COLORS.BOSS_NEON);
                    this.entities.boss.weakPoints.splice(index, 1); this.gameplay.score += 10; this.updateUI();
                }
            });
            
            if(this.entities.boss.isDefeated()) {
                this.gameplay.score += 100; this.updateUI(); this.entities.boss = null;
                this.switchState('PLAYING'); this.entities.foods.push(new Food());
                elements['boss-health-container'].classList.add('hidden');
            }
            const isOutOfBounds = this.entities.snake.head.x < 0 || this.entities.snake.head.x > elements.canvas.width || this.entities.snake.head.y < 0 || this.entities.snake.head.y > elements.canvas.height;
            if ((isOutOfBounds && !this.gameplay.activePowerups.ghost) || this.entities.snake.checkCollisionSelf()) this.switchState('GAME_OVER');
        },

        loadLocalData() { this.player.id = this.getPlayerId(); try { this.player.highscore = parseInt(localStorage.getItem(`snake_highscore_${VERSION}`)) || 0; this.player.coins = parseInt(localStorage.getItem(`snake_coins_${VERSION}`)) || 0; this.player.purchasedSkins = JSON.parse(localStorage.getItem(`snake_purchasedSkins_${VERSION}`)) || [0]; const skinId = parseInt(localStorage.getItem(`snake_currentSkin_${VERSION}`)) || 0; this.player.currentSkin = skins.find(s => s.id === skinId) || skins[0]; this.leaderboards.scores = JSON.parse(localStorage.getItem(`snake_leaderboardScores_${VERSION}`)) || []; this.leaderboards.coins = JSON.parse(localStorage.getItem(`snake_leaderboardCoins_${VERSION}`)) || []; } catch (e) { console.error("Помилка завантаження даних:", e); this.player.purchasedSkins = [0]; } },
        saveLocalData() { try { localStorage.setItem(`snake_highscore_${VERSION}`, this.player.highscore); localStorage.setItem(`snake_coins_${VERSION}`, this.player.coins); localStorage.setItem(`snake_purchasedSkins_${VERSION}`, JSON.stringify(this.player.purchasedSkins)); localStorage.setItem(`snake_currentSkin_${VERSION}`, this.player.currentSkin.id); localStorage.setItem(`snake_leaderboardScores_${VERSION}`, JSON.stringify(this.leaderboards.scores)); localStorage.setItem(`snake_leaderboardCoins_${VERSION}`, JSON.stringify(this.leaderboards.coins)); } catch (e) { console.error("Помилка збереження даних:", e); } },

        updateUI() { elements.score.textContent = this.gameplay.score; elements.highscore.textContent = this.player.highscore; elements.coins.textContent = this.player.coins; elements.shopCoins.textContent = this.player.coins; },
        updatePowerups() { if (this.gameplay.comboTimer > 0) this.gameplay.comboTimer--; else this.gameplay.combo = 1; for(const type in this.gameplay.activePowerups) if(Date.now() > this.gameplay.activePowerups[type]) delete this.gameplay.activePowerups[type]; elements['combo-bar'].style.width = `${(this.gameplay.comboTimer / GAME_SETTINGS.MAX_COMBO_TIME) * 100}%`; elements['combo-text'].textContent = `x${this.gameplay.combo}`; elements['powerup-timers'].innerHTML = ''; for(const type in this.gameplay.activePowerups) { const timeLeft = Math.ceil((this.gameplay.activePowerups[type] - Date.now()) / 1000); if(timeLeft > 0) elements['powerup-timers'].innerHTML += `<div class="timer-icon ${type}">${type === 'ghost' ? '👻' : '★'} ${timeLeft}с</div>`; } },
        createParticleBurst(x, y, color) { for (let i = 0; i < 15; i++) this.entities.particles.push(new Particle(x, y, color)); },
        
        renderShop() { elements.skinList.innerHTML = ''; skins.forEach(skin => { const isPurchased = this.player.purchasedSkins.includes(skin.id); const isEquipped = this.player.currentSkin.id === skin.id; const item = document.createElement('div'); item.className = 'skin-item'; if (isEquipped) item.classList.add('selected'); if (!isPurchased) item.classList.add('locked'); item.innerHTML = `<div class="skin-preview" style="background: linear-gradient(90deg, ${skin.colors[0]}, ${skin.colors[1]})"></div><div>${skin.name}</div>${isPurchased ? (isEquipped ? '<div class="equipped-badge">✓</div>' : '') : `<div class="skin-price"><span class="coin-icon"></span> ${skin.price}</div>`}`; item.addEventListener('click', () => { if (isPurchased) { this.player.currentSkin = skin; this.saveLocalData(); this.renderShop(); if (this.entities.snake) this.entities.snake.applySkin(this.player.currentSkin); } else if (this.player.coins >= skin.price) { this.player.coins -= skin.price; this.player.purchasedSkins.push(skin.id); this.player.currentSkin = skin; this.saveLocalData(); this.renderShop(); this.updateUI(); } }); elements.skinList.appendChild(item); }); },
        renderLeaderboards() { this.populateLeaderboard(elements.highScoresList, this.leaderboards.scores, 'score'); this.populateLeaderboard(elements.coinScoresList, this.leaderboards.coins, 'coins'); },
        populateLeaderboard(listElement, data, type) { listElement.innerHTML = ''; if (data.length === 0) { listElement.innerHTML = '<li>Тут поки пусто...</li>'; return; } data.forEach((entry, index) => { const li = document.createElement('li'); const value = type === 'score' ? entry.score : entry.coins; li.innerHTML = `<span class="rank">${index + 1}.</span><span class="name">${entry.name}</span><span class="score">${value}</span>`; if (entry.name === this.player.id) li.classList.add('current-player'); listElement.appendChild(li); }); },
        updateLeaderboards() { const currentBest = this.leaderboards.scores.find(e => e.name === this.player.id)?.score || 0; if (this.gameplay.score > 0 && this.gameplay.score > currentBest) { this.addOrUpdateLeaderboard(this.leaderboards.scores, { name: this.player.id, score: this.gameplay.score }, 'score'); elements.newRecordText.classList.remove('hidden'); } this.addOrUpdateLeaderboard(this.leaderboards.coins, { name: this.player.id, coins: this.player.coins }, 'coins');},
        addOrUpdateLeaderboard(leaderboard, newEntry, key) { const existingIndex = leaderboard.findIndex(e => e.name === newEntry.name); if (existingIndex !== -1) { if(newEntry[key] > leaderboard[existingIndex][key]) leaderboard[existingIndex][key] = newEntry[key]; } else if (leaderboard.length < GAME_SETTINGS.LEADERBOARD_SIZE || newEntry[key] > (leaderboard[leaderboard.length - 1]?.[key] || 0)) { leaderboard.push(newEntry); } leaderboard.sort((a, b) => b[key] - a[key]); if (leaderboard.length > GAME_SETTINGS.LEADERBOARD_SIZE) leaderboard.pop(); },

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
            
            document.addEventListener('keydown', e => { if (this.state !== 'PLAYING' && this.state !== 'BOSS_FIGHT') return; switch (e.key) { case 'ArrowUp': case 'w': if (this.gameplay.velocity.y === 0) this.gameplay.velocity = { x: 0, y: -1 }; break; case 'ArrowDown': case 's': if (this.gameplay.velocity.y === 0) this.gameplay.velocity = { x: 0, y: 1 }; break; case 'ArrowLeft': case 'a': if (this.gameplay.velocity.x === 0) this.gameplay.velocity = { x: -1, y: 0 }; break; case 'ArrowRight': case 'd': if (this.gameplay.velocity.x === 0) this.gameplay.velocity = { x: 1, y: 0 }; break; } });
            document.addEventListener('touchstart', e => { this.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
            document.addEventListener('touchmove', e => { if (this.state !== 'PLAYING' && this.state !== 'BOSS_FIGHT') return; e.preventDefault(); const touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY }; const deltaX = touchMove.x - this.touchStart.x; const deltaY = touchMove.y - this.touchStart.y; if (Math.abs(deltaX) > 20 || Math.abs(deltaY) > 20) { if (Math.abs(deltaX) > Math.abs(deltaY)) { if (deltaX > 0 && this.gameplay.velocity.x === 0) this.gameplay.velocity = { x: 1, y: 0 }; else if (deltaX < 0 && this.gameplay.velocity.x === 0) this.gameplay.velocity = { x: -1, y: 0 }; } else { if (deltaY > 0 && this.gameplay.velocity.y === 0) this.gameplay.velocity = { x: 0, y: 1 }; else if (deltaY < 0 && this.gameplay.velocity.y === 0) this.gameplay.velocity = { x: 0, y: -1 }; } this.touchStart = touchMove; } }, { passive: false });
        },
        getPlayerId() {
            try { const tg = window.Telegram.WebApp; const user = tg.initDataUnsafe.user; if (user && user.id) return user.username ? `@${user.username}` : user.first_name || 'PLAYER'; } catch (e) {}
            let id = localStorage.getItem(`snake_playerId_${VERSION}`);
            if (!id) { id = `PLAYER-${Math.random().toString(16).substr(2, 4).toUpperCase()}`; localStorage.setItem(`snake_playerId_${VERSION}`, id); }
            return id;
        }
    };

    // --- Класи ігрових сутностей ---
    class Snake { constructor(skin) { this.head = { x: elements.canvas.width / 2, y: elements.canvas.height / 2 }; this.path = []; this.length = 10; this.baseRadius = 7; this.segmentDistance = 4; this.applySkin(skin); } applySkin(skin) { this.colorStart = skin.colors[0]; this.colorEnd = skin.colors[1]; } update(direction) { this.path.push({ ...this.head }); this.head.x += direction.x * GAME_SETTINGS.SNAKE_SPEED; this.head.y += direction.y * GAME_SETTINGS.SNAKE_SPEED; if (this.path.length > this.length * this.segmentDistance) this.path.shift(); } draw() { ctx.globalAlpha = GameEngine.gameplay.activePowerups.ghost ? 0.5 : 1; if (GameEngine.gameplay.activePowerups.ghost) { ctx.shadowColor = COLORS.GHOST_NEON; ctx.shadowBlur = 30; } const gradient = ctx.createLinearGradient(0, 0, elements.canvas.width, elements.canvas.height); gradient.addColorStop(0, this.colorStart); gradient.addColorStop(1, this.colorEnd); for (let i = 0; i < this.length; i++) { const pathIndex = this.path.length - 1 - (i * this.segmentDistance); if (pathIndex < 0) break; const pos = this.path[pathIndex]; const radius = this.baseRadius * (1 - i / (this.length * 1.2)); ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill(); } ctx.beginPath(); ctx.arc(this.head.x, this.head.y, this.baseRadius, 0, Math.PI * 2); ctx.fillStyle = this.colorStart; if (!GameEngine.gameplay.activePowerups.ghost) { ctx.shadowColor = this.colorStart; ctx.shadowBlur = 20; } ctx.fill(); ctx.shadowBlur = 0; const angle = (GameEngine.gameplay.velocity.x === 0 && GameEngine.gameplay.velocity.y === 0) ? -Math.PI / 2 : Math.atan2(GameEngine.gameplay.velocity.y, GameEngine.gameplay.velocity.x); const eyeOffsetX = Math.cos(angle + Math.PI / 2) * (this.baseRadius * 0.4); const eyeOffsetY = Math.sin(angle + Math.PI / 2) * (this.baseRadius * 0.4); ctx.beginPath(); ctx.arc(this.head.x + eyeOffsetX, this.head.y + eyeOffsetY, 1.5, 0, Math.PI * 2); ctx.arc(this.head.x - eyeOffsetX, this.head.y - eyeOffsetY, 1.5, 0, Math.PI * 2); ctx.fillStyle = 'black'; ctx.fill(); ctx.globalAlpha = 1; } checkCollisionSelf() { if (GameEngine.gameplay.activePowerups.ghost) return false; for (let i = 0; i < this.path.length - Math.floor(this.length * this.segmentDistance / 2); i++) if (Math.hypot(this.head.x - this.path[i].x, this.head.y - this.path[i].y) < this.baseRadius / 2) return true; return false; } grow() { this.length += 3; } }
    class Food { constructor() { this.spawn(); } spawn() { this.isCoin = Math.random() < 0.2; this.radius = this.isCoin ? 10 : 8; this.color = this.isCoin ? COLORS.COIN_NEON : COLORS.DANGER_NEON; this.x = Math.random() * (elements.canvas.width - 40) + 20; this.y = Math.random() * (elements.canvas.height - 40) + 20; } draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; if (this.isCoin) { ctx.fillStyle = '#a07d00'; ctx.font = `bold ${this.radius+2}px "${getComputedStyle(document.documentElement).getPropertyValue('--game-font').trim()}"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', this.x, this.y + 1); } } convertToCoin() { this.isCoin = true; this.color = COLORS.COIN_NEON; this.radius = 10; } }
    class PowerUp { constructor() { this.spawn(); } spawn() { this.type = Math.random() < 0.5 ? POWERUP_TYPES.GHOST : POWERUP_TYPES.GOLD_RUSH; this.radius = 12; this.x = Math.random() * (elements.canvas.width - 40) + 20; this.y = Math.random() * (elements.canvas.height - 40) + 20; } draw() { ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.globalAlpha = 0.8; ctx.fillStyle = this.type === POWERUP_TYPES.GHOST ? COLORS.GHOST_NEON : COLORS.COIN_NEON; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 25; ctx.fill(); ctx.restore(); ctx.fillStyle = 'black'; ctx.font = 'bold 10px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.type === POWERUP_TYPES.GHOST ? '👻' : '★', this.x, this.y + 1); } }
    class Boss { constructor() { this.x = elements.canvas.width / 2; this.y = elements.canvas.height / 4; this.radius = 40; this.maxHealth = 5; this.health = 5; this.vel = { x: 1.5, y: 1.5 }; this.weakPoints = []; this.spawnWeakPoints(); elements['boss-health-container'].classList.remove('hidden'); } spawnWeakPoints() { for(let i = 0; i < 3; i++) { const angle = Math.random() * Math.PI * 2; this.weakPoints.push({ x: this.x + Math.cos(angle) * this.radius, y: this.y + Math.sin(angle) * this.radius, radius: 6 }); } } update() { this.x += this.vel.x; this.y += this.vel.y; if(this.x < this.radius || this.x > elements.canvas.width - this.radius) this.vel.x *= -1; if(this.y < this.radius || this.y > elements.canvas.height / 2) this.vel.y *= -1; this.weakPoints.forEach(p => { p.x += this.vel.x; p.y += this.vel.y; }); if(this.weakPoints.length === 0) this.spawnWeakPoints(); elements['boss-health-bar'].style.width = `${(this.health / this.maxHealth) * 100}%`; } draw() { ctx.fillStyle = COLORS.BOSS_NEON; ctx.shadowColor = COLORS.BOSS_NEON; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; this.weakPoints.forEach(p => { ctx.fillStyle = COLORS.DANGER_NEON; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); }); } takeDamage() { this.health--; } isDefeated() { return this.health <= 0; } }
    
    // --- ЗАПУСК ГРИ ---
    GameEngine.init();
});