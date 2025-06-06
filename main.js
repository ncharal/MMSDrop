
// Matter.js aliases
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      World = Matter.World,
      Events = Matter.Events;

const engine = Engine.create();
const world = engine.world;

const canvas = document.getElementById('gameCanvas');
const width = canvas.width;
const height = canvas.height;

const render = Render.create({
  canvas: canvas,
  engine: engine,
  options: {
    width: width,
    height: height,
    wireframes: false,
    background: '#fffbe6'
  }
});
Render.run(render);
Runner.run(Runner.create(), engine);

// Walls
const wallThickness = 30;
const ground = Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true });
const leftWall = Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true });
const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true });
World.add(world, [ground, leftWall, rightWall]);

// Fruit types
const fruitTypes = [
  { name: 'Benny', radius: 26, sprite: 'assets/images/cherry.png' },
  { name: 'Tony', radius: 32, sprite: 'assets/images/strawberry.png' },
  { name: 'Ryan', radius: 40, sprite: 'assets/images/grape.png' },
  { name: 'Kinder', radius: 48, sprite: 'assets/images/peach.png' },
  { name: 'Gibbo', radius: 56, sprite: 'assets/images/orange.png' },
  { name: 'Jordan', radius: 65, sprite: 'assets/images/apple.png' },
  { name: 'Mox', radius: 76, sprite: 'assets/images/melon.png' },
  { name: 'Pickle', radius: 90, sprite: 'assets/images/watermelon.png' }
];

renderEvolutionChart();

// Game state
let fruits = [];
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let watermelonCount = 0;
let nextFruitTier = getRandomTier();
let lastDropTime = 0;
const DROP_COOLDOWN = 500;

updateNextFruitPreview();
updateScoreDisplay();
updateWatermelonDisplay();
resizeConfettiCanvas();

// Confetti
const myConfetti = confetti.create(document.getElementById('confettiCanvas'), {
  resize: true,
  useWorker: true
});

function resizeConfettiCanvas() {
  const game = document.getElementById('gameCanvas');
  const confettiCanvas = document.getElementById('confettiCanvas');
  const rect = game.getBoundingClientRect();
  confettiCanvas.width = game.width;
  confettiCanvas.height = game.height;
  confettiCanvas.style.width = rect.width + 'px';
  confettiCanvas.style.height = rect.height + 'px';
}
window.addEventListener('load', resizeConfettiCanvas);
window.addEventListener('resize', resizeConfettiCanvas);

// Weighted random tier
function getRandomTier() {
  // Weighted drop chance for tiers 0–6 (cherry to melon)
  const weights = [0.30, 0.20, 0.15, 0.13, 0.10, 0.07, 0.05]; // sum = 1.00
  const cumulative = [];
  weights.reduce((acc, w, i) => {
    cumulative[i] = acc + w;
    return cumulative[i];
  }, 0);

  const rand = Math.random();
  for (let i = 0; i < cumulative.length; i++) {
    if (rand < cumulative[i]) return i;
  }
  return 0;
}


// Create fruit
function createFruit(x, y, tier) {
  const type = fruitTypes[tier];
  const scale = (type.radius * 2) / 250;
  const body = Bodies.circle(x, y, type.radius, {
    restitution: 0.3,
    friction: 0.1,
    render: {
      sprite: {
        texture: type.sprite,
        xScale: scale,
        yScale: scale
      }
    }
  });
  return { body, tier };
}

// UI updates
function updateNextFruitPreview() {
  const img = document.getElementById('nextFruitImage');
  img.src = fruitTypes[nextFruitTier].sprite;
  img.alt = fruitTypes[nextFruitTier].name;
}
function updateScoreDisplay() {
  document.getElementById('scoreValue').textContent = score;
  document.getElementById('highScoreValue').textContent = highScore;
}
function updateWatermelonDisplay() {
  document.getElementById('watermelonCount').textContent = watermelonCount;
}
function showCelebration() {
  const message = document.getElementById('celebrationMessage');
  message.style.display = 'block';
  myConfetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
  setTimeout(() => { message.style.display = 'none'; }, 3000);
}

// Handle drop with cooldown
function handleDrop(x) {
  const now = Date.now();
  if (now - lastDropTime < DROP_COOLDOWN) return;
  lastDropTime = now;
  const fruit = createFruit(x, 50, nextFruitTier);
  fruits.push(fruit);
  World.add(world, fruit.body);
  nextFruitTier = getRandomTier();
  updateNextFruitPreview();
}

// Input
canvas.addEventListener('click', e => handleDrop(e.clientX - canvas.getBoundingClientRect().left));
canvas.addEventListener('touchstart', e => handleDrop(e.touches[0].clientX - canvas.getBoundingClientRect().left));

// Dev shortcut
document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'w') {
    const fruit = createFruit(width / 2, 50, fruitTypes.length - 1);
    fruits.push(fruit);
    World.add(world, fruit.body);
  }
});

// Merge logic
Events.on(engine, 'collisionStart', e => {
  e.pairs.forEach(pair => {
    const fruitA = fruits.find(f => f.body === pair.bodyA);
    const fruitB = fruits.find(f => f.body === pair.bodyB);
    if (fruitA && fruitB && fruitA !== fruitB && fruitA.tier === fruitB.tier) {
      const tier = fruitA.tier;
      const newX = (fruitA.body.position.x + fruitB.body.position.x) / 2;
      const newY = (fruitA.body.position.y + fruitB.body.position.y) / 2;
      World.remove(world, fruitA.body);
      World.remove(world, fruitB.body);
      fruits = fruits.filter(f => f !== fruitA && f !== fruitB);
      if (tier < fruitTypes.length - 1) {
        const newFruit = createFruit(newX, newY, tier + 1);
        fruits.push(newFruit);
        World.add(world, newFruit.body);
        score += (tier + 2) * 10;
      } else {
        score += 1000;
        watermelonCount++;
        showCelebration();
      }
      updateScoreDisplay();
      updateWatermelonDisplay();
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
      }
    }
  });
});

// Game over detection
Events.on(engine, 'afterUpdate', () => {
  for (let fruit of fruits) {
    if (fruit.body.position.y < 40) {
      triggerGameOver();
      break;
    }
  }
});

function triggerGameOver() {
  fruits.forEach(f => World.remove(world, f.body));
  fruits = [];
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalHighScore').textContent = highScore;
  document.getElementById('gameOverOverlay').style.display = 'flex';
}

// Leaderboard submission + fetch
const LEADERBOARD_URL = 'https://script.google.com/macros/s/AKfycbw1HIfmPkQifvBJwJN8i3_HNdIWAs7-amRsdmsrIYmMRjMJUbJusLZ9qm4k3SS6O11yMw/exec';

function submitScoreToGoogleSheets(name, score) {
  if (!name) return;
  fetch(LEADERBOARD_URL, {
  method: 'POST',
  body: JSON.stringify({ name, score }) // no headers
}).then(res => res.text()).then(console.log).catch(console.error);
}

function fetchLeaderboard() {
  fetch(LEADERBOARD_URL)
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('leaderboardList');
      list.innerHTML = '';
      data.forEach((entry, i) => {
        const li = document.createElement('li');
        li.textContent = `${i + 1}. ${entry.name || 'Anonymous'} — ${entry.score}`;
        list.appendChild(li);
      });
    })
    .catch(console.error);
}

// Submit score button
document.getElementById('submitScoreButton').addEventListener('click', () => {
  const name = document.getElementById('playerNameInput').value.trim();
  submitScoreToGoogleSheets(name, score);
  document.getElementById('submitScoreButton').disabled = true;
  setTimeout(fetchLeaderboard, 1000);
});

// Restart
document.getElementById('restartButton').addEventListener('click', () => {
  score = 0;
  watermelonCount = 0;
  nextFruitTier = getRandomTier();
  updateScoreDisplay();
  updateWatermelonDisplay();
  updateNextFruitPreview();

  document.getElementById('gameOverOverlay').style.display = 'none';
  document.getElementById('submitScoreButton').disabled = false;
  document.getElementById('playerNameInput').value = '';
});

// Show leaderboard on load
window.addEventListener('load', fetchLeaderboard);

// Evolution chart
function renderEvolutionChart() {
  const container = document.getElementById('evolutionChart');
  container.innerHTML = '';
  fruitTypes.forEach((fruit, i) => {
    const div = document.createElement('div');
    div.className = 'evolution-item';
    const img = document.createElement('img');
    img.src = fruit.sprite;
    const label = document.createElement('div');
    label.textContent = fruit.name.charAt(0).toUpperCase() + fruit.name.slice(1);
    div.appendChild(img);
    div.appendChild(label);
    container.appendChild(div);
    if (i < fruitTypes.length - 1) {
      const arrow = document.createElement('span');
      arrow.textContent = '→';
      arrow.style.margin = '0 6px';
      container.appendChild(arrow);
    }
  });
}
