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

// ================= SHAPE STATS =================
const SHAPES = {
  circle:   { dmg:2, rate:600, range:140, color:0x00ffff },
  square:   { dmg:4, rate:1200, range:220, color:0xffaa00 },
  triangle: { dmg:2, rate:300, range:90, color:0xaa66ff }
};

let selectedShape = "circle";

// ================= GAME STATE =================
let enemies = [], towers = [];
let path = [];
let crystalHP = 20;
let money = 100;
let wave = 1;

let moneyText, hpText, waveText;

// ================= SCENE =================
function preload(){}

function create(){
  buildPath();
  drawPath(this);
  drawCrystal(this);

  moneyText = this.add.text(20,20,"Money: 100",{color:"#fff"});
  waveText  = this.add.text(20,50,"Wave: 1",{color:"#fff"});
  hpText    = this.add.text(window.innerWidth-200,20,"Crystal: 20",{color:"#0ff"});

  this.input.keyboard.on("keydown-ONE", ()=> selectedShape="circle");
  this.input.keyboard.on("keydown-TWO", ()=> selectedShape="square");
  this.input.keyboard.on("keydown-THREE", ()=> selectedShape="triangle");

  this.input.on("pointerdown", p => placeTower(this,p.x,p.y));

  spawnWave(this);
}

function update(time){
  if(paused) return;

  moveEnemies();
  updateTowers(this,time);

  // Clean dead enemies safely
  enemies = enemies.filter(e => e.alive);
}

// ================= PATH =================
function buildPath(){
  path = [
    {x:0,y:window.innerHeight*0.65},
    {x:window.innerWidth*0.3,y:window.innerHeight*0.65},
    {x:window.innerWidth*0.5,y:window.innerHeight*0.45},
    {x:window.innerWidth*0.7,y:window.innerHeight*0.65},
    {x:window.innerWidth-120,y:window.innerHeight*0.65}
  ];
}

function drawPath(scene){
  const g = scene.add.graphics();
  g.lineStyle(40,0x333333,1);
  g.beginPath();
  g.moveTo(path[0].x,path[0].y);
  for(let i=1;i<path.length;i++) g.lineTo(path[i].x,path[i].y);
  g.strokePath();
}

function drawCrystal(scene){
  const c = scene.add.circle(path[path.length-1].x+60,path[path.length-1].y,25,0x00ffff);
  scene.tweens.add({targets:c,scale:1.2,yoyo:true,repeat:-1,duration:700});
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
      e.body.destroy(); e.text.destroy();
      crystalHP--; hpText.setText("Crystal: "+crystalHP);
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
  const t = { x,y,range:s.range,dmg:s.dmg,rate:s.rate,last:0,beam:null };

  if(selectedShape==="circle"){
    t.body = scene.add.circle(x,y,18,s.color).setStrokeStyle(3,0xffffff);
  }
  if(selectedShape==="square"){
    t.body = scene.add.rectangle(x,y,34,34,s.color).setStrokeStyle(3,0xffffff);
  }
  if(selectedShape==="triangle"){
    const size = 36;
    const h = size * Math.sqrt(3) / 2;
    t.body = scene.add.polygon(x,y,[0,-h/2,-size/2,h/2,size/2,h/2],s.color)
      .setStrokeStyle(3,0xffffff);
  }

  // Range indicator
  t.rangeRing = scene.add.circle(x,y,t.range,0xffffff,0.04)
    .setStrokeStyle(1,0xffffff,0.15);

  towers.push(t);
}

// ================= TOWER LOGIC =================
function updateTowers(scene,time){
  towers.forEach(t=>{
    const target = enemies.find(e =>
      e.alive && Phaser.Math.Distance.Between(t.x,t.y,e.body.x,e.body.y)<=t.range
    );

    // Laser VISUAL ONLY
    if(target){
      if(t.beam) t.beam.destroy();
      t.beam = scene.add.line(0,0,t.x,t.y,target.body.x,target.body.y,0xffffff)
        .setLineWidth(2).setAlpha(0.5);
    }else{
      if(t.beam){ t.beam.destroy(); t.beam=null; }
    }

    // REAL DAMAGE = RANGE CHECK ONLY
    if(time - t.last > t.rate){
      t.last = time;

      enemies.forEach(e=>{
        if(e.alive && Phaser.Math.Distance.Between(t.x,t.y,e.body.x,e.body.y)<=t.range){
          e.hp -= t.dmg;
          e.text.setText(e.hp);

          if(e.hp<=0){
            e.alive=false;
            e.body.destroy();
            e.text.destroy();
            money+=10;
            moneyText.setText("Money: "+money);
          }
        }
      });
    }
  });
}
