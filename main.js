const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#111",
  parent: "game-container",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [MenuScene, SoloScene, PartyScene]
};

new Phaser.Game(config);

/* ================= SAVE SYSTEM ================= */

function saveProgress(level){
  localStorage.setItem("shapeDefenseLevel", level);
}

function loadProgress(){
  const saved = localStorage.getItem("shapeDefenseLevel");
  return saved ? parseInt(saved) : 1;
}

let playerLevel = loadProgress();

/* ================= SOUND LOADER ================= */

function loadSounds(scene){
  scene.load.audio("menuMusic","https://actions.google.com/sounds/v1/ambiences/space_ambience.ogg");
  scene.load.audio("mapMusic","https://actions.google.com/sounds/v1/ambiences/battlefield_ambience.ogg");
  scene.load.audio("towerAttack","https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg");
  scene.load.audio("click","https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg");
  scene.load.audio("roundStart","https://actions.google.com/sounds/v1/cartoon/concussive_hit_guitar_boing.ogg");
  scene.load.audio("lose","https://actions.google.com/sounds/v1/cartoon/boing.ogg");
  scene.load.audio("bossKill","https://actions.google.com/sounds/v1/cartoon/metal_thud_and_wobble.ogg");
  scene.load.audio("bossTheme","https://actions.google.com/sounds/v1/ambiences/alien_ship.ogg");
}

/* ================= MENU SCENE ================= */

function MenuScene(){ Phaser.Scene.call(this,{key:"MenuScene"}); }
MenuScene.prototype = Object.create(Phaser.Scene.prototype);

MenuScene.prototype.preload = function(){
  loadSounds(this);
};

MenuScene.prototype.create = function(){

  playerLevel = loadProgress();

  this.menuMusic = this.sound.add("menuMusic",{loop:true,volume:0.4});
  this.menuMusic.play();

  this.add.text(400,80,"SHAPE DEFENSE",{fontSize:"42px",color:"#ffffff"}).setOrigin(0.5);
  this.add.text(400,130,"LEVEL: "+playerLevel,{fontSize:"20px",color:"#00ffcc"}).setOrigin(0.5);

  const playBtn = this.add.text(400,250,"PLAY",{fontSize:"36px",color:"#ffffff"}).setOrigin(0.5).setInteractive();
  playBtn.on("pointerdown", ()=>{
    this.sound.play("click");
    this.menuMusic.stop();
    this.scene.start("SoloScene");
  });

  const partyBtn = this.add.text(400,380,"PARTY",{fontSize:"28px",color:"#ffffff"}).setOrigin(0.5).setInteractive();
  partyBtn.on("pointerdown", ()=>{
    this.sound.play("click");
    this.scene.start("PartyScene");
  });
};

/* ================= PARTY SCENE ================= */

function PartyScene(){ Phaser.Scene.call(this,{key:"PartyScene"}); }
PartyScene.prototype = Object.create(Phaser.Scene.prototype);

PartyScene.prototype.create = function(){

  this.add.text(400,80,"SHAPE STATS",{fontSize:"36px",color:"#ffffff"}).setOrigin(0.5);

  const backBtn = this.add.text(400,540,"BACK",{fontSize:"24px",color:"#ffffff"}).setOrigin(0.5).setInteractive();
  backBtn.on("pointerdown", ()=>{
    this.sound.play("click");
    this.scene.start("MenuScene");
  });
};

/* ================= SOLO GAME SCENE ================= */

function SoloScene(){ Phaser.Scene.call(this,{key:"SoloScene"}); }
SoloScene.prototype = Object.create(Phaser.Scene.prototype);

const MAX_TOWERS = 25;

const SHAPES = {
  circle:   { range:130, dmg:2, rate:600,  cost:40,  color:0x00ffcc },
  square:   { range:170, dmg:5, rate:1400, cost:70,  color:0xffaa00 },
  triangle: { range:90,  dmg:3, rate:300,  cost:50,  color:0xaa66ff }
};

const path = [
  {x:0,y:300},{x:200,y:300},{x:400,y:200},{x:600,y:300},{x:800,y:300}
];

let enemies, towers, wave, money, crystalHP, selectedTower;
let laserGraphics, moneyText, waveText, selectText, hpText, towerCountText;

SoloScene.prototype.create = function(){

  enemies = [];
  towers = [];
  wave = 1;
  money = 150;
  crystalHP = 20;
  selectedTower = "circle";

  drawPath(this);

  this.mapMusic = this.sound.add("mapMusic",{loop:true,volume:0.3});
  this.mapMusic.play();

  this.sound.play("roundStart");

  laserGraphics = this.add.graphics();

  moneyText = this.add.text(10,10,"Money: "+money,{color:"#fff"});
  waveText = this.add.text(10,30,"Wave: 1",{color:"#fff"});
  selectText = this.add.text(10,50,"Selected: CIRCLE",{color:"#fff"});
  hpText = this.add.text(10,70,"Crystal HP: "+crystalHP,{color:"#00ffff"});
  towerCountText = this.add.text(10,90,"Towers: 0 / "+MAX_TOWERS,{color:"#aaa"});

  this.input.on("pointerdown", p => tryPlaceTower(this, p.x, p.y));

  this.input.keyboard.on("keydown-ONE", ()=>{ this.sound.play("click"); changeSelection("circle"); });
  this.input.keyboard.on("keydown-TWO", ()=>{ this.sound.play("click"); changeSelection("square"); });
  this.input.keyboard.on("keydown-THREE", ()=>{ this.sound.play("click"); changeSelection("triangle"); });

  spawnWave(this);
  this.time.addEvent({ delay:7000, loop:true, callback:()=>spawnWave(this) });
};

SoloScene.prototype.update = function(time){
  moveEnemies(this);
  updateTowerDamage(this,time);
  drawLasers();
};

/* ================= CORE GAME LOGIC ================= */

function spawnWave(scene){
  const isBossWave = wave % 5 === 0;

  if(isBossWave){
    scene.sound.play("bossTheme",{volume:0.5});
  }

  for(let i=0;i<5+wave;i++){
    const hp = isBossWave ? 150 + wave*10 : 12 + wave*3;
    const size = isBossWave ? 22 : 14;
    const speed = isBossWave ? 0.5 : 0.8 + wave*0.05;
    const color = isBossWave ? 0xff0000 : 0xff5555;

    const e = { x:path[0].x, y:path[0].y, hp, speed, pathIndex:0, alive:true, boss:isBossWave };
    e.body = scene.add.circle(e.x,e.y,size,color);
    e.text = scene.add.text(e.x-10,e.y-12,e.hp,{color:"#fff"});
    enemies.push(e);
  }

  wave++;
  waveText.setText("Wave: "+wave);
}

function moveEnemies(scene){
  enemies.forEach(e=>{
    if(!e.alive) return;

    const next = path[e.pathIndex+1];
    if(!next){
      damageCrystal(scene,e.boss?5:1);
      e.alive=false;
      e.body.destroy();
      e.text.destroy();
      return;
    }

    const dx=next.x-e.x, dy=next.y-e.y;
    const d=Math.hypot(dx,dy);
    e.x += (dx/d)*e.speed;
    e.y += (dy/d)*e.speed;
    e.body.setPosition(e.x,e.y);
    e.text.setPosition(e.x-10,e.y-12);
    if(d<4) e.pathIndex++;
  });
}

function tryPlaceTower(scene,x,y){
  if(towers.length >= MAX_TOWERS) return;
  const tData = SHAPES[selectedTower];
  if(money < tData.cost) return;

  money -= tData.cost;
  moneyText.setText("Money: "+money);
  addTower(scene,x,y,selectedTower);
  towerCountText.setText("Towers: "+towers.length+" / "+MAX_TOWERS);
}

function addTower(scene,x,y,type){
  const s = SHAPES[type];
  towers.push({x,y,range:s.range,dmg:s.dmg,rate:s.rate,nextTick:0,type});
  scene.add.circle(x,y,14,s.color).setStrokeStyle(2,0xffffff);
}

function changeSelection(type){
  selectedTower=type;
  selectText.setText("Selected: "+type.toUpperCase());
}

function updateTowerDamage(scene,time){
  towers.forEach(t=>{
    if(time < t.nextTick) return;
    t.nextTick = time + t.rate;

    enemies.forEach(e=>{
      if(!e.alive) return;
      const dx=e.x-t.x, dy=e.y-t.y;
      if(dx*dx+dy*dy<=t.range*t.range){
        scene.sound.play("towerAttack",{volume:0.15});
        damageEnemy(scene,e,t.dmg);
      }
    });
  });
}

function drawLasers(){
  laserGraphics.clear();
}

function damageEnemy(scene,e,dmg){
  e.hp-=dmg;
  e.text.setText(Math.floor(e.hp));

  if(e.hp<=0){
    if(e.boss){
      scene.sound.play("bossKill");
    }
    e.alive=false;
    e.body.destroy();
    e.text.destroy();
    money+=15;
    moneyText.setText("Money: "+money);
  }
}

function damageCrystal(scene,amount){
  crystalHP -= amount;
  hpText.setText("Crystal HP: " + crystalHP);

  if(crystalHP <= 0){
    scene.sound.play("lose");

    const reachedLevel = wave - 1;
    if(reachedLevel > playerLevel){
      playerLevel = reachedLevel;
      saveProgress(playerLevel);
    }

    scene.scene.start("MenuScene");
  }
}

function drawPath(scene){
  const g=scene.add.graphics();
  g.lineStyle(20,0x444444,1);
  g.beginPath();
  g.moveTo(path[0].x,path[0].y);
  for(let i=1;i<path.length;i++) g.lineTo(path[i].x,path[i].y);
  g.strokePath();
}
