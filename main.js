let paused = false;
function togglePause(){ paused = !paused; }
function restartGame(){ location.reload(); }

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#111",
  scene: { preload, create, update }
};

new Phaser.Game(config);

// ---------------- SETTINGS ----------------

const SHAPES = {
  circle:   { dmg:2, rate:600, color:0x00ffcc, cost:30, range:120 },
  square:   { dmg:5, rate:1400, color:0xffaa00, cost:50, range:150 },
  triangle: { dmg:1, rate:300, color:0xaa66ff, cost:20, range:100 }
};

const ENEMY_TYPES = [
  { hp:8,  speed:0.9, color:0xffcc00 },
  { hp:15, speed:0.5, color:0xaa00ff },
  { hp:10, speed:0.6, color:0xff5555 }
];

const path = [
  {x:0,y:300},{x:200,y:300},{x:400,y:200},{x:600,y:300},{x:800,y:300}
];

// ---------------- GAME STATE ----------------

let enemies = [], towers = [];
let wave=1, crystalHP=20, money=100, selectedShape="circle";
let moneyText, waveText, hpText, shapeText, previewRing;

function preload(){}

function create(){
  drawPath(this);

  hpText=this.add.text(650,340,"Crystal: 20",{color:"#fff"});
  waveText=this.add.text(10,10,"Wave: 1",{color:"#fff"});
  moneyText=this.add.text(10,40,"Money: 100",{color:"#fff"});
  shapeText=this.add.text(10,70,"Selected: CIRCLE",{color:"#fff"});

  previewRing=this.add.circle(0,0,SHAPES[selectedShape].range,0xffffff,0.05)
    .setStrokeStyle(1,0xffffff,0.3).setVisible(false);

  this.input.on("pointermove",p=>previewRing.setVisible(true).setPosition(p.x,p.y));
  this.input.on("pointerdown",p=>placeTowerIfValid(this,p.x,p.y));

  this.input.keyboard.on("keydown-ONE",()=>selectShape("circle"));
  this.input.keyboard.on("keydown-TWO",()=>selectShape("square"));
  this.input.keyboard.on("keydown-THREE",()=>selectShape("triangle"));

  spawnWave(this);

  this.time.addEvent({
    delay:8000,
    loop:true,
    callback:()=>{
      wave++;
      waveText.setText("Wave: "+wave);
      spawnWave(this);
    }
  });
}

function update(){
  if(paused) return;
  moveEnemies();
  updateLasers(this);

  enemies = enemies.filter(e=>{
    if(!e.alive){
      e.body.destroy();
      e.text.destroy();
      return false;
    }
    return true;
  });
}

// ---------------- PATH ----------------

function drawPath(scene){
  const g=scene.add.graphics();
  g.lineStyle(20,0x444444,1);
  g.beginPath();
  g.moveTo(path[0].x,path[0].y);
  for(let i=1;i<path.length;i++) g.lineTo(path[i].x,path[i].y);
  g.strokePath();
  path.forEach(p=>scene.add.circle(p.x,p.y,6,0x888888));
}

// ---------------- ENEMIES ----------------

function spawnWave(scene){
  for(let i=0;i<wave+2;i++) spawnEnemy(scene);
}

function spawnEnemy(scene){
  const type=Phaser.Utils.Array.GetRandom(ENEMY_TYPES);
  const e={
    hp:type.hp+wave,
    speed:type.speed,
    index:0,
    x:path[0].x,
    y:path[0].y,
    alive:true
  };
  e.body=scene.add.circle(e.x,e.y,16,type.color);
  e.text=scene.add.text(e.x-6,e.y-8,e.hp,{color:"#fff"});
  enemies.push(e);
}

function moveEnemies(){
  enemies.forEach((e,i)=>{
    if(!e.alive) return;

    const next=path[e.index+1];
    if(!next){ damageCrystal(i); return; }

    const dx=next.x-e.x,dy=next.y-e.y,d=Math.hypot(dx,dy);
    e.x+=(dx/d)*e.speed;
    e.y+=(dy/d)*e.speed;
    e.body.setPosition(e.x,e.y);
    e.text.setPosition(e.x-6,e.y-8);

    if(d<4) e.index++;
  });
}

// ---------------- TOWERS ----------------

function selectShape(type){
  selectedShape=type;
  shapeText.setText("Selected: "+type.toUpperCase());
  previewRing.setRadius(SHAPES[type].range);
}

function placeTower(scene,x,y,type){
  const s=SHAPES[type];
  const t={ x,y,dmg:s.dmg,rate:s.rate,lastTick:0,range:s.range,beam:null,target:null };
  t.body=scene.add.circle(x,y,14,s.color);
  towers.push(t);
}

function placeTowerIfValid(scene,x,y){
  const cost=SHAPES[selectedShape].cost;
  if(money<cost) return;

  for(let p of path){
    if(Phaser.Math.Distance.Between(x,y,p.x,p.y)<40) return;
  }

  money-=cost;
  moneyText.setText("Money: "+money);
  placeTower(scene,x,y,selectedShape);
}

// ---------------- LASERS (FINAL TARGET LOCK FIX) ----------------

function updateLasers(scene){
  const now = scene.time.now;

  towers.forEach(t => {

    // Damage tick timer
    if (!t.nextTick) t.nextTick = now + t.rate;

    if (now >= t.nextTick) {
      t.nextTick = now + t.rate;

      const rangeSq = t.range * t.range;

      enemies.forEach(e => {
        if (!e.alive) return;

        const dx = e.x - t.x;
        const dy = e.y - t.y;
        const distSq = dx*dx + dy*dy;

        if (distSq <= rangeSq) {
          hitEnemy(e, t.dmg);
        }
      });
    }

    // ---------------- VISUAL BEAM (OPTIONAL, DOES NOT CONTROL DAMAGE) ----------------
    // Find ONE enemy just for beam drawing
    let beamTarget = null;
    let closestSq = Infinity;

    enemies.forEach(e => {
      if (!e.alive) return;
      const dx = e.x - t.x;
      const dy = e.y - t.y;
      const distSq = dx*dx + dy*dy;

      if (distSq < closestSq && distSq <= t.range * t.range) {
        closestSq = distSq;
        beamTarget = e;
      }
    });

    if (t.beam) { t.beam.destroy(); t.beam = null; }

    if (beamTarget) {
      let color = 0x00ffcc, width = 3;
      if (t.dmg >= 5) { color = 0xffaa00; width = 5; }
      else if (t.dmg <= 1) { color = 0xaa66ff; width = 2; }

      const angle = Phaser.Math.Angle.Between(t.x, t.y, beamTarget.x, beamTarget.y);
      const startX = t.x + Math.cos(angle) * 14;
      const startY = t.y + Math.sin(angle) * 14;

      t.beam = scene.add.line(0, 0, startX, startY, beamTarget.x, beamTarget.y, color)
        .setLineWidth(width)
        .setAlpha(0.9);
    }
  });
}

// ---------------- DAMAGE ----------------

function hitEnemy(e,dmg){
  if(!e.alive) return;

  e.hp-=dmg;
  e.text.setText(e.hp);

  if(e.hp<=0){
    e.alive=false;
    money+=10;
    moneyText.setText("Money: "+money);
  }
}

function damageCrystal(i){
  const e=enemies[i];
  if(!e||!e.alive) return;

  e.alive=false;
  crystalHP--;
  hpText.setText("Crystal: "+crystalHP);

  if(crystalHP<=0) gameOver();
}

function gameOver(){
  alert("Game Over! Wave "+wave);
  location.reload();
}
