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
     wave++; waveText.setText("Wave: "+wave);
     spawnWave(this);
   }
 });
}

function update(){
 if(paused) return;
 moveEnemies();
 updateLasers(this);
}

// ---------------- PATH ----------------

function drawPath(scene){
 const g=scene.add.graphics();
 g.lineStyle(20,0x444444,1);
 g.beginPath(); g.moveTo(path[0].x,path[0].y);
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
 const e={hp:type.hp+wave,speed:type.speed,index:0,x:path[0].x,y:path[0].y};
 e.body=scene.add.circle(e.x,e.y,16,type.color);
 e.text=scene.add.text(e.x-6,e.y-8,e.hp,{color:"#fff"});
 enemies.push(e);
}

function moveEnemies(){
 enemies.forEach((e,i)=>{
  const next=path[e.index+1];
  if(!next){damageCrystal(i);return;}
  const dx=next.x-e.x,dy=next.y-e.y,d=Math.hypot(dx,dy);
  e.x+=(dx/d)*e.speed; e.y+=(dy/d)*e.speed;
  e.body.setPosition(e.x,e.y);
  e.text.setPosition(e.x-6,e.y-8);
  if(d<4)e.index++;
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
 const t={
  x,y,
  dmg:s.dmg,
  rate:s.rate,
  lastTick:0,
  range:s.range,
  beam:null,
  target:null
 };
 t.body=scene.add.circle(x,y,14,s.color);
 towers.push(t);
}

function placeTowerIfValid(scene,x,y){
 const cost=SHAPES[selectedShape].cost;
 if(money<cost)return;
 for(let p of path)if(Phaser.Math.Distance.Between(x,y,p.x,p.y)<40)return;
 money-=cost; moneyText.setText("Money: "+money);
 placeTower(scene,x,y,selectedShape);
}

// ---------------- CONTINUOUS LASERS ----------------

function updateLasers(scene){
 const now = scene.time.now;

 towers.forEach(t=>{

  // Validate target every frame
  if(!t.target || !enemies.includes(t.target)){
    t.target = null;
  }

  if(t.target){
    const dist = Phaser.Math.Distance.Between(t.x,t.y,t.target.x,t.target.y);
    if(dist > t.range){
      t.target = null;
    }
  }

  // Acquire new target if needed
  if(!t.target){
    t.target = enemies.find(e =>
      Phaser.Math.Distance.Between(t.x,t.y,e.x,e.y) <= t.range
    );

    // Reset tick so new target gets hit instantly
    if(t.target){
      t.lastTick = 0;
    }
  }

  // No target → remove beam
  if(!t.target){
    if(t.beam){ t.beam.destroy(); t.beam = null; }
    return;
  }

  // Beam style
  let color = 0x00ffcc;
  let width = 3;
  if(t.dmg >= 5){ color = 0xffaa00; width = 5; }
  else if(t.dmg <= 1){ color = 0xaa66ff; width = 2; }

  // Redraw beam cleanly
  if(t.beam) t.beam.destroy();

  const angle = Phaser.Math.Angle.Between(t.x, t.y, t.target.x, t.target.y);
  const startX = t.x + Math.cos(angle) * 14;
  const startY = t.y + Math.sin(angle) * 14;

  t.beam = scene.add.line(0,0,startX,startY,t.target.x,t.target.y,color)
    .setLineWidth(width)
    .setAlpha(0.95);

  // Continuous damage tick
  if(now - t.lastTick >= t.rate){
    t.lastTick = now;
    hitEnemy(t.target, t.dmg);
  }
 });
}

// ---------------- DAMAGE ----------------

function hitEnemy(e,dmg){
 e.hp-=dmg;
 e.text.setText(e.hp);
 e.body.setScale(e.body.scaleX*0.95);

 if(e.hp<=0){
  e.body.destroy();
  e.text.destroy();
  enemies=enemies.filter(x=>x!==e);
  money+=10; moneyText.setText("Money: "+money);
 }
}

function damageCrystal(i){
 enemies[i].body.destroy(); enemies[i].text.destroy();
 enemies.splice(i,1);
 crystalHP--; hpText.setText("Crystal: "+crystalHP);
 if(crystalHP<=0) gameOver();
}

function gameOver(){
 alert("Game Over! Wave "+wave);
 location.reload();
}
