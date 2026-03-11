// Game Constants
const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const GAME_SPEED = 3;

// Game States
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAMEOVER: 'gameover',
    LEVELUP: 'levelup'
};

// Game Variables
let gameState = GameState.MENU;
let canvas, ctx;
let player = null;
let aliens = [];
let playerBullets = [];
let alienBullets = [];
let particles = [];
let level = 1;
let score = 0;
let health = 100;
let maxHealth = 100;
let aliensKilled = 0;
let aliensDefeated = 0;
let levelScore = 0;
let alienCount = 0;

// Battle Pass System
let battlePassProgress = 0;
let battlePassRewards = [
    { points: 25, name: 'Arme Rapide' },
    { points: 50, name: 'Bouclier Temporaire' },
    { points: 75, name: 'Double Tir' },
    { points: 100, name: 'Munitions Infinies' }
];

// Quêtes
let quests = [
    { id: 1, name: 'Dépasser le niveau 3', target: 3, current: 0, completed: false },
    { id: 2, name: 'Tuer 50 aliens', target: 50, current: 0, completed: false },
    { id: 3, name: 'Obtenir 5000 points', target: 5000, current: 0, completed: false },
    { id: 4, name: 'Compléter 5 niveaux', target: 5, current: 0, completed: false },
    { id: 5, name: 'Ne perdre que 20 santé au niveau 1', target: 80, current: health, completed: false }
];

// Classe Player
class Player {
    constructor() {
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight - 60;
        this.width = 40;
        this.height = 40;
        this.speed = 6;
        this.fireRate = 0;
        this.fireDelay = 8;
    }

    update() {
        // Suivre la souris
        const dx = mouseX - (this.x + this.width / 2);
        const dy = mouseY - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            const moveX = (dx / distance) * this.speed;
            const moveY = (dy / distance) * this.speed;
            
            this.x += moveX;
            this.y += moveY;
            
            // Empêcher de sortir de l'écran
            this.x = Math.max(0, Math.min(this.x, window.innerWidth - this.width));
            this.y = Math.max(0, Math.min(this.y, window.innerHeight - this.height));
        }

        this.fireRate--;
        // Tirer automatiquement vers la souris
        if (this.fireRate <= 0) {
            this.shoot();
            this.fireRate = this.fireDelay;
        }
    }

    shoot() {
        const dx = mouseX - (this.x + this.width / 2);
        const dy = mouseY - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            playerBullets.push(new PlayerBullet(
                this.x + this.width / 2 - 2,
                this.y,
                dx / distance,
                dy / distance
            ));
        }
    }

    draw(ctx) {
        // Vaisseau principal
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        
        // Triangle pointant vers le haut
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        // Moteurs
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x + 5, this.y + this.height - 5, 8, 8);
        ctx.fillRect(this.x + this.width - 13, this.y + this.height - 5, 8, 8);

        ctx.shadowColor = 'transparent';
    }

    takeDamage(amount) {
        health -= amount;
        if (health < 0) health = 0;
    }
}

// Classe PlayerBullet
class PlayerBullet {
    constructor(x, y, dx, dy) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 15;
        this.speed = 8;
        this.dx = dx;
        this.dy = dy;
    }

    update() {
        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;
    }

    draw(ctx) {
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowColor = 'transparent';
    }
}

// Classe Alien
class Alien {
    constructor(x, y, type = 0) {
        this.x = x;
        this.y = y;
        this.width = 35;
        this.height = 35;
        this.speed = 2 + (level * 0.5);
        this.health = 30 + (level * 10);
        this.maxHealth = this.health;
        this.fireRate = Math.random() * 40 + 30;
        this.fireDelay = Math.random() * 40 + 30;
        this.type = type % 4; // 4 types d'aliens bizarres
        this.angle = Math.random() * Math.PI * 2;
        this.directionChange = 0;
    }

    update() {
        // Mouvement bizarre
        this.directionChange--;
        if (this.directionChange <= 0) {
            this.angle = Math.random() * Math.PI * 2;
            this.directionChange = Math.random() * 60 + 30;
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed + 0.5;

        // Rester dans les limites
        if (this.x < 0) { this.x = 0; this.angle = Math.PI * 0.5; }
        if (this.x + this.width > window.innerWidth) { this.x = window.innerWidth - this.width; this.angle = Math.PI * 1.5; }
        if (this.y < 0) { this.y = 0; this.angle = 0; }

        this.fireRate--;
        if (this.fireRate <= 0) {
            this.shoot();
            this.fireRate = this.fireDelay;
        }
    }

    shoot() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < window.innerHeight * 0.8) {
            alienBullets.push(new AlienBullet(
                this.x + this.width / 2,
                this.y + this.height / 2,
                dx / distance,
                dy / distance
            ));
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        const colors = ['#ff00ff', '#ff6600', '#00ff00', '#ff0066'];
        const glowColor = colors[this.type];

        ctx.fillStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;

        switch(this.type) {
            case 0: // Alien tentacule
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                ctx.fill();
                for (let i = 0; i < 4; i++) {
                    const angle = (i * Math.PI * 2) / 4;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
                    ctx.strokeStyle = glowColor;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
                break;
            case 1: // Alien dentelé
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI * 2) / 6;
                    const x = Math.cos(angle) * 15;
                    const y = Math.sin(angle) * 15;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                break;
            case 2: // Alien cubique
                ctx.fillRect(-12, -12, 24, 24);
                ctx.strokeStyle = glowColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(-12, -12, 24, 24);
                break;
            case 3: // Alien spirale
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI * 2) / 8;
                    const x = Math.cos(angle) * (10 + i * 2);
                    const y = Math.sin(angle) * (10 + i * 2);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                break;
        }

        // Barre de santé
        ctx.fillStyle = this.health > this.maxHealth * 0.5 ? '#00ff00' : '#ff0000';
        ctx.fillRect(-15, 20, (this.health / this.maxHealth) * 30, 4);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-15, 20, 30, 4);

        ctx.restore();
    }

    takeDamage(amount) {
        this.health -= amount;
    }
}

// Classe AlienBullet
class AlienBullet {
    constructor(x, y, dx, dy) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 8;
        this.speed = 5;
        this.dx = dx;
        this.dy = dy;
    }

    update() {
        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;
    }

    draw(ctx) {
        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
    }
}

// Classe Particle (Explosion)
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 30;
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.life--;
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(0, 255, 255, ${this.life / 30})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Touches clavier
const keys = {};
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let isMobile = false;

// Variables joystick
let joystickActive = false;
let joystickX = 0;
let joystickY = 0;
let joystickStartX = 0;
let joystickStartY = 0;
const JOYSTICK_RADIUS = 60;
const JOYSTICK_CENTER_X = 60;
const JOYSTICK_CENTER_Y = 490; // bottom + height/2

// Détecter si c'est un mobile
function detectMobile() {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    return isMobile;
}

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'Escape') {
        togglePause();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Suivre la souris sur tout le document
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
}, true);

// Événements tactiles pour mobile
document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);
document.addEventListener('touchend', handleTouchEnd, false);

function handleTouchStart(e) {
    const touches = e.touches;
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX;
        const y = touch.clientY;
        
        // Vérifier si le toucher est sur le joystick (bas-gauche)
        const dist = Math.sqrt(Math.pow(x - JOYSTICK_CENTER_X, 2) + Math.pow(y - JOYSTICK_CENTER_Y, 2));
        if (dist < JOYSTICK_RADIUS + 40) {
            joystickActive = true;
            joystickStartX = x;
            joystickStartY = y;
            e.preventDefault();
        }
    }
}

function handleTouchMove(e) {
    const touches = e.touches;
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX;
        const y = touch.clientY;
        
        if (joystickActive) {
            const deltaX = x - joystickStartX;
            const deltaY = y - joystickStartY;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance > JOYSTICK_RADIUS) {
                const angle = Math.atan2(deltaY, deltaX);
                joystickX = Math.cos(angle) * JOYSTICK_RADIUS;
                joystickY = Math.sin(angle) * JOYSTICK_RADIUS;
            } else {
                joystickX = deltaX;
                joystickY = deltaY;
            }
            
            // Mettre à jour la position du stick visuel
            const stick = document.getElementById('joystick-stick');
            if (stick) {
                stick.style.transform = `translate(${joystickX}px, ${joystickY}px)`;
            }
            
            // Mettre à jour les coordonnées souris pour suivre le joystick
            const magnitude = Math.sqrt(joystickX * joystickX + joystickY * joystickY) / JOYSTICK_RADIUS;
            if (magnitude > 0.1 && player) {
                const angle = Math.atan2(joystickY, joystickX);
                mouseX = player.x + player.width / 2 + Math.cos(angle) * 500;
                mouseY = player.y + player.height / 2 + Math.sin(angle) * 500;
            }
            
            e.preventDefault();
        }
    }
}

function handleTouchEnd(e) {
    const touches = e.touches;
    let joystickTouching = false;
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX;
        const y = touch.clientY;
        
        const dist = Math.sqrt(Math.pow(x - JOYSTICK_CENTER_X, 2) + Math.pow(y - JOYSTICK_CENTER_Y, 2));
        if (dist < JOYSTICK_RADIUS + 40) {
            joystickTouching = true;
        }
    }
    
    if (!joystickTouching) {
        joystickActive = false;
        joystickX = 0;
        joystickY = 0;
        const stick = document.getElementById('joystick-stick');
        if (stick) {
            stick.style.transform = 'translate(0px, 0px)';
        }
    }
}

// Initialiser le jeu
function initGame() {
    // Détecter le mobile
    detectMobile();
    
    // Afficher ou cacher les contrôles mobiles
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
        mobileControls.style.display = isMobile ? 'block' : 'none';
    }
    
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    player = new Player();
    aliens = [];
    playerBullets = [];
    alienBullets = [];
    particles = [];
    health = maxHealth;
    score = 0;
    levelScore = 0;
    alienCount = 0;

    setupLevel();
}

// Configuration du niveau
function setupLevel() {
    aliens = [];
    alienCount = Math.min(4 + level, 6);
    
    for (let i = 0; i < alienCount; i++) {
        const x = Math.random() * (window.innerWidth - 50) + 50;
        const y = Math.random() * (window.innerHeight * 0.4) + 50;
        aliens.push(new Alien(x, y, i % 4));
    }
}

// Boucle de jeu
function update() {
    if (gameState !== GameState.PLAYING || !player) return;

    // Mise à jour du joueur
    player.update();

    // Mise à jour des aliens
    for (let i = aliens.length - 1; i >= 0; i--) {
        aliens[i].update();

        // Collision avec les balles du joueur
        for (let j = playerBullets.length - 1; j >= 0; j--) {
            if (isColliding(playerBullets[j], aliens[i])) {
                aliens[i].takeDamage(25);
                playerBullets.splice(j, 1);

                if (aliens[i].health <= 0) {
                    createExplosion(aliens[i].x + aliens[i].width / 2, aliens[i].y + aliens[i].height / 2);
                    aliens.splice(i, 1);
                    updateScore(100 * level);
                    aliensKilled++;
                    aliensDefeated++;
                    updateQuests();
                }
                break;
            }
        }
    }

    // Mise à jour des balles du joueur
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        playerBullets[i].update();
        if (playerBullets[i].y < 0) {
            playerBullets.splice(i, 1);
        }
    }

    // Mise à jour des balles des aliens
    for (let i = alienBullets.length - 1; i >= 0; i--) {
        alienBullets[i].update();

        // Collision avec le joueur
        if (isColliding(alienBullets[i], player)) {
            player.takeDamage(15);
            createExplosion(alienBullets[i].x, alienBullets[i].y);
            alienBullets.splice(i, 1);
            continue;
        }

        if (alienBullets[i].x < 0 || alienBullets[i].x > window.innerWidth ||
            alienBullets[i].y < 0 || alienBullets[i].y > window.innerHeight) {
            alienBullets.splice(i, 1);
        }
    }

    // Mise à jour des particules
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Vérifier la santé du joueur
    if (health <= 0) {
        endGame();
    }

    // Vérifier si tous les aliens sont éliminés
    if (aliens.length === 0) {
        levelUp();
    }

    updateHUD();
}

// Dessiner le jeu
function draw() {
    if (!ctx || !canvas) return;
    
    // Fond galactique
    ctx.fillStyle = 'rgba(10, 10, 26, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Étoiles en arrière-plan
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 100; i++) {
        const x = (i * 137) % canvas.width;
        const y = (i * 71) % canvas.height;
        const size = ((i % 5) + 1) * 0.2;
        ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1.0;

    // Dessiner les aliens
    for (let alien of aliens) {
        alien.draw(ctx);
    }

    // Dessiner les balles des aliens
    for (let bullet of alienBullets) {
        bullet.draw(ctx);
    }

    // Dessiner les balles du joueur
    for (let bullet of playerBullets) {
        bullet.draw(ctx);
    }

    // Dessiner les particules
    for (let particle of particles) {
        particle.draw(ctx);
    }

    // Dessiner le joueur
    player.draw(ctx);
}

// Fonction de collision
function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Créer une explosion
function createExplosion(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y));
    }
}

// Mettre à jour le score
function updateScore(points) {
    score += points;
    levelScore += points;
    battlePassProgress = Math.min(100, (aliensKilled / 50) * 100);
}

// Mettre à jour le HUD
function updateHUD() {
    document.getElementById('level-text').textContent = level;
    document.getElementById('health-text').textContent = Math.max(0, health);
    document.getElementById('score-text').textContent = score;
    document.getElementById('aliens-text').textContent = aliens.length;
}

// Passer au niveau suivant
function levelUp() {
    gameState = GameState.LEVELUP;
    
    document.getElementById('levelup-level').textContent = level;
    document.getElementById('levelup-score').textContent = levelScore;
    
    showScreen('levelup-screen');
}

// Terminer le jeu
function endGame() {
    gameState = GameState.GAMEOVER;
    
    document.getElementById('final-level').textContent = level;
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-aliens').textContent = aliensDefeated;
    
    showScreen('gameover-screen');
}

// Mettre à jour les quêtes
function updateQuests() {
    quests[1].current = aliensKilled;
    quests[2].current = score;
    quests[3].current = level;
    
    if (quests[3].current >= quests[3].target) {
        quests[3].completed = true;
    }
}

// Afficher un écran
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');

    if (screenId === 'game-screen') {
        gameState = GameState.PLAYING;
    }
}

// Basculer la pause
function togglePause() {
    if (gameState === GameState.PLAYING) {
        gameState = GameState.PAUSED;
        showScreen('pause-screen');
    } else if (gameState === GameState.PAUSED) {
        gameState = GameState.PLAYING;
        showScreen('game-screen');
    }
}

// Mettre à jour le Pass de Combat
function updateBattlePass() {
    document.getElementById('bp-progress').textContent = Math.floor(battlePassProgress);
    document.getElementById('bp-bar').style.width = battlePassProgress + '%';

    const rewardsList = document.getElementById('rewards-list');
    rewardsList.innerHTML = '';
    
    battlePassRewards.forEach((reward, index) => {
        const unlocked = battlePassProgress >= reward.points;
        const div = document.createElement('div');
        div.textContent = `${unlocked ? '✓' : '○'} ${reward.name} (${reward.points}%)`;
        div.style.color = unlocked ? '#00ff00' : '#999';
        rewardsList.appendChild(div);
    });
}

// Mettre à jour la liste des quêtes
function updateQuestsList() {
    const questsList = document.getElementById('quests-list');
    questsList.innerHTML = '';
    
    quests.forEach(quest => {
        const div = document.createElement('div');
        div.className = `quest-item ${quest.completed ? 'completed' : ''}`;
        div.innerHTML = `
            <div>${quest.completed ? '✓' : '○'} ${quest.name}</div>
            <div style="font-size: 12px; margin-top: 5px;">
                Progression: ${Math.min(quest.current, quest.target)} / ${quest.target}
            </div>
        `;
        questsList.appendChild(div);
    });
}

// Event Listeners
document.getElementById('start-btn').addEventListener('click', () => {
    initGame();
    showScreen('game-screen');
});

document.getElementById('battle-pass-btn').addEventListener('click', () => {
    updateBattlePass();
    showScreen('battle-pass-screen');
});

document.getElementById('quests-btn').addEventListener('click', () => {
    updateQuestsList();
    showScreen('quests-screen');
});

document.getElementById('back-from-bp').addEventListener('click', () => {
    showScreen('menu-screen');
});

document.getElementById('back-from-quests').addEventListener('click', () => {
    showScreen('menu-screen');
});

document.getElementById('pause-btn').addEventListener('click', () => {
    togglePause();
});

document.getElementById('resume-btn').addEventListener('click', () => {
    togglePause();
});

document.getElementById('menu-btn').addEventListener('click', () => {
    gameState = GameState.MENU;
    showScreen('menu-screen');
});

document.getElementById('restart-btn').addEventListener('click', () => {
    level = 1;
    score = 0;
    aliensDefeated = 0;
    aliensKilled = 0;
    battlePassProgress = 0;
    quests.forEach(q => q.completed = false);
    initGame();
    showScreen('game-screen');
});

document.getElementById('home-btn').addEventListener('click', () => {
    level = 1;
    score = 0;
    aliensDefeated = 0;
    aliensKilled = 0;
    battlePassProgress = 0;
    quests.forEach(q => q.completed = false);
    showScreen('menu-screen');
});

document.getElementById('next-level-btn').addEventListener('click', () => {
    level++;
    health = maxHealth;
    setupLevel();
    gameState = GameState.PLAYING;
    showScreen('game-screen');
});

document.getElementById('settings-btn').addEventListener('click', () => {
    alert('Paramètres:\n\n- Flèches ou WASD: Déplacer\n- Espace: Tirer\n- Échap: Pause\n\nBon jeu!');
});

// Game Loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Gérer le redimensionnement de la fenêtre
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Démarrer le jeu
gameLoop();
