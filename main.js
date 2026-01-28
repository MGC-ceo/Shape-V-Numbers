const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#111",
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

let paused = false;
function togglePause(){ paused = !paused; }
function restartGame(){ location.reload(); }

// ================= SETTINGS =================

const SHAPES = {
  circle:   { dmg:2, rate:600, color:0x00ffcc, cost:30, range:140 },
  square:   { dmg:4, rate:1200, color:0xffaa00, cost:50, range:200 },
  triangle: { dmg:2, rate:300, color:0xaa66ff, cost:20, range:90 }
};

const path = [
  {x:50,y:400},
  {x:350,y:400},
  {x:550,y:250},
  {x:800,y:400},
  {x:window.innerWidth-100,y:400}
];

// ================= GAME STATE =================

let enemies = [], towers = [];
let money = 100, wave = 1, crystalHP = 20;
let moneyText, waveText, hpText;
let selectedShape = "circle";

// ================= SCENE =================

function preload(){}

function create(){
  drawPath(this);
  drawCrystal(this);

  moneyText = this.add.text(20,20,"Money: 100",{color:"#fff"});
  waveText  = this.add.text(20,50,"Wave: 1",{color:"#fff"});
  hpText    = this.add.text(window.innerWidth-200,20,"Crystal: 20",{color:"#fff"});

  this.input.on("pointerdown", p => placeTower(this, p.x, p.y));

  spawnWave(this);
}

function update(){
  if(paused) return;

  moveEnemies();
  towerLogic(this);
}

// ================= PATH =================

function drawPath(scene){
  const g = scene.add.graphics();
  g.lineStyle(30,0x444444,1);
  g.beginPath();
  g.moveTo(path[0].x,path[0].y);
  for(let i=1;i<path.length;i++) g.lineTo(path[i].x,path[i].y);
  g.strokePath();

  path.forEach(p=>scene.add.circle(p.x,p.y,8,0x888888));
}

// ================= CRYSTAL =================

function drawCrystal(scene){
  const crystal = scene.add.circle(path[path.length-1].x+40, path[path.length-1].y, 25, 0x00ffff);
  scene.tweens.add({
    targets: crystal,
    scale: 1.1,
    yoyo: true,
    repeat: -1,
    duration: 800
  });
}

// ================= ENEMIES =================

function spawnWave(scene){
  for(let i=0;i<wave+2;i++){
    const e = { hp:10+wave, speed:1.2, index:0, alive:true };
    e.body = scene.add.circle(path[0].x,path[0].y,16,0xff5555);
    e.text = scene.add.text(e.body.x-10,e.body.y-10,e.hp,{color:"#fff"});
    enemies.push(e);
  }
}

function moveEnemies(){
  enemies.forEach(e=>{
    if(!e.alive) return;

    const next = path[e.index+1];
    if(!next){
      e.alive=false;
      e.body.destroy();
      e.text.destroy();
      crystalHP--;
      hpText.setText("Crystal: "+crystalHP);
      return;
    }

    const dx=next.x-e.body.x, dy=next.y-e.body.y;
    const d=Math.hypot(dx,dy);

    e.body.x += (dx/d)*e.speed;
    e.body.y += (dy/d)*e.speed;
    e.text.setPosition(e.body.x-10,e.body.y-10);

    if(d<4) e.index++;
  });
}

// ================= TOWERS =================

function placeTower(scene,x,y){
  if(towers.length >= 25) return;

  const s = SHAPES[selectedShape];
  const t = { x,y,dmg:s.dmg,rate:s.rate,last:0,range:s.range };

  if(selectedShape==="circle"){
    t.body = scene.add.circle(x,y,15,s.color);
  }
  if(selectedShape==="square"){
    t.body = scene.add.rectangle(x,y,30,30,s.color);
  }
  if(selectedShape==="triangle"){
    t.body = scene.add.triangle(x,y,0,30,15,0,30,30,s.color);
  }

  towers.push(t);
}

// ================= TOWER LOGIC =================

function towerLogic(scene){
  const now = scene.time.now;

  towers.forEach(t=>{
    const target = enemies.find(e=>e.alive && Phaser.Math.Distance.Between(t.x,t.y,e.body.x,e.body.y)<=t.range);
    if(!target) return;

    if(now - t.last > t.rate){
      t.last = now;
      target.hp -= t.dmg;
      target.text.setText(target.hp);

      if(target.hp<=0){
        target.alive=false;
        target.body.destroy();
        target.text.destroy();
        money+=10;
        moneyText.setText("Money: "+money);
      }
    }
  });
}
