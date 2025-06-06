// main.js

// Matter.js aliases
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      World = Matter.World,
      Events = Matter.Events;

// Create engine and world
const engine = Engine.create();
const world = engine.world;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const width = canvas.width;
const height = canvas.height;

// Renderer
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

// Walls and floor
const wallThickness = 30;
const ground = Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true });
const leftWall = Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true });
const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true });
World.add(world, [ground, leftWall, rightWall]);

// Fruit definitions
const fruitTypes = [
  { name: 'cherry', radius: 16, sprite: 'assets/images/cherry.png' },
  { name: 'strawberry', radius: 22, sprite: 'assets/images/strawberry.png' },
  { name: 'grape', radius: 30, sprite: 'assets/images/grape.png' },
  { name: 'peach', radius: 38, sprite: 'assets/images/peach.png' },
  { name: 'orange', radius: 46, sprite: 'assets/images/orange.png' },
  { name: 'apple', radius: 55, sprite: 'assets/images/apple.png' },
  { name: 'melon', radius: 66, sprite: 'assets/images/melon.png' },
  { name: 'watermelon', radius: 80, sprite: 'assets/images/watermelon.png' }
];

// Render evolution chart
renderEvolutionChart();

// Game state
let fruits = [];
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let watermelonCount = 0;
let nextFruitTier = getRandomTier();

// UI init
updateNextFruitPreview();
updateScoreDisplay();
updateWatermelonDisplay();
resizeConfettiCanvas();

// 🎉 Setup confetti instance
const myConfetti = confetti.create(document.getElementById('confettiCanvas'), {
  resize: true,
  useWorker: true
});

// Weighted random for dropping fruits (tiers 0–4)
function getRandomTier() {
  const weights = [0.35, 0.25, 0.15, 0.15, 0.10];
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

// Create a fruit object with proper sprite scaling
function createFruit(x, y, tier) {
  const type = fruitTypes[tier];
  const baseSpriteSize = 250;
  const diameter = type.radius * 2;
  const scale = diameter / baseSpriteSize;

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

// Celebration popup with confetti
function showCelebration() {
  const message = document.getElementById('celebrationMessage');
  message.style.display = 'block';

  myConfetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.5 },
    colors: ['#ff4d4f', '#73d13d', '#40a9ff', '#ffa940']
  });

  setTimeout(() => {
    message.style.display = 'none';
  }, 3000);
}

// Resize confetti canvas to match game canvas
function resizeConfettiCanvas() {
  const game = document.getElementById('gameCanvas');
  const confettiCanvas = document.getElementById('confettiCanvas');

  const rect = game.getBoundingClientRect();

  confettiCanvas.width = game.width;
  confettiCanvas.height = game.height;

  confettiCanvas.style.width = `${rect.width}px`;
  confettiCanvas.style.height = `${rect.height}px`;
}


window.addEventListener('load', resizeConfettiCanvas);
window.addEventListener('resize', resizeConfettiCanvas);

// Drop fruit on canvas click
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;

  const tier = nextFruitTier;
  const fruit = createFruit(x, 50, tier);
  fruits.push(fruit);
  World.add(world, fruit.body);

  nextFruitTier = getRandomTier();
  updateNextFruitPreview();
});

// Dev shortcut: Drop watermelon with "W" key
document.addEventListener('keydown', (e) => {
  if (e.key === 'w' || e.key === 'W') {
    const fruit = createFruit(width / 2, 50, fruitTypes.length - 1);
    fruits.push(fruit);
    World.add(world, fruit.body);
    console.log('Watermelon added via keyboard.');
  }
});

// Handle merging
Events.on(engine, 'collisionStart', (event) => {
  const pairs = event.pairs;

  pairs.forEach(pair => {
    const fruitA = fruits.find(f => f.body === pair.bodyA);
    const fruitB = fruits.find(f => f.body === pair.bodyB);

    if (fruitA && fruitB && fruitA !== fruitB && fruitA.tier === fruitB.tier) {
      const tier = fruitA.tier;
      const newX = (fruitA.body.position.x + fruitB.body.position.x) / 2;
      const newY = (fruitA.body.position.y + fruitB.body.position.y) / 2;

      // Remove old fruits
      World.remove(world, fruitA.body);
      World.remove(world, fruitB.body);
      fruits = fruits.filter(f => f !== fruitA && f !== fruitB);

      if (tier < fruitTypes.length - 1) {
        const newTier = tier + 1;
        const newFruit = createFruit(newX, newY, newTier);
        fruits.push(newFruit);
        World.add(world, newFruit.body);

        score += (newTier + 1) * 10;
        updateScoreDisplay();
		
		if (score > highScore) {
  highScore = score;
  localStorage.setItem('highScore', highScore);
}

      } else {
        // Watermelon merge celebration
        score += 1000;
        watermelonCount++;
        updateScoreDisplay();
		if (score > highScore) {
  highScore = score;
  localStorage.setItem('highScore', highScore);
}

        updateWatermelonDisplay();
        showCelebration();
      }
    }
  });
});

// Render evolution chart
function renderEvolutionChart() {
  const container = document.getElementById('evolutionChart');
  container.innerHTML = '';

  fruitTypes.forEach((fruit, index) => {
    const div = document.createElement('div');
    div.className = 'evolution-item';

    const img = document.createElement('img');
    img.src = fruit.sprite;
    img.alt = fruit.name;

    const label = document.createElement('div');
    label.textContent = fruit.name.charAt(0).toUpperCase() + fruit.name.slice(1);

    div.appendChild(img);
    div.appendChild(label);
    container.appendChild(div);

    if (index < fruitTypes.length - 1) {
      const arrow = document.createElement('span');
      arrow.textContent = '→';
      arrow.style.margin = '0 6px';
      container.appendChild(arrow);
    }
  });
}
