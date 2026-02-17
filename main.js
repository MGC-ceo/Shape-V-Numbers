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

/* ================= SOUND ENGINE ================= */

function tone(scene, freq = 440, duration = 100, volume = 0.2){
  const ctx = scene.sound.context;
  if(!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.value = freq;
  osc.type = "sine";

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration/1000);

  osc.start();
  osc.stop(ctx.currentTime + duration/1000);
}

/* ========== BACKGROUND MUSIC LOOPS ========== */

let menuMusicLoop;
let gameMusicLoop;

function startMenuMusic(scene){
  stopGameMusic();
  menuMusicLoop = scene.time.addEvent({
    delay: 900,
    loop: true,
    callback: () => tone(scene, 220, 400, 0.05)
  });
}

function stopMenuMusic(){
  if(menuMusicLoop) menuMusicLoop.remove();
}

function startGameMusic(scene){
  stopMenuMusic();
  gameMusicLoop = scene.time.addEvent({
    delay: 700,
    loop: true,
    callback: () => tone(scene, 140, 300, 0.05)
  });
}

function stopGameMusic(){
  if(gameMusicLoop) gameMusicLoop.remove();
}

/* ================= MENU SCENE ================= */

function MenuScene(){ Phaser.Scene.call(this,{key:"MenuScene"}); }
MenuScene.prototype = Object.create(Phaser.Scene.prototype);

MenuScene.prototype.create = function(){

  const centerX = this.cameras.main.width/2;
  const centerY = this.cameras.main.height/2;

  this.cameras.main.fadeIn(600);

  startMenuMusic(this);

  const panel = this.add.rectangle(centerX,centerY,500,450,0x000000,0.4)
    .setStrokeStyle(2,0x00ffcc);

  const container = this.add.container(centerX, centerY);

  const title = this.add.text(0,-150,"SHAPE DEFENSE",{fontSize:"42px",color:"#ffffff"}).setOrigin(0.5);
  const level = this.add.text(0,-100,"LEVEL: "+playerLevel,{fontSize:"20px",color:"#00ffcc"}).setOrigin(0.5);

  const playBtn = this.add.text(0,0,"PLAY",{fontSize:"36px",color:"#ffffff"})
    .setOrigin(0.5)
    .setInteractive();

  const more = this.add.text(0,50,"More Content Soon",{fontSize:"16px",color:"#888"}).setOrigin(0.5);

  const partyBtn = this.add.text(0,120,"PARTY",{fontSize:"28px",color:"#ffffff"})
    .setOrigin(0.5)
    .setInteractive();

  container.add([title,level,playBtn,more,partyBtn]);

  this.tweens.add({
    targets: container,
    y: centerY - 10,
    duration: 2000,
    yoyo:true,
    repeat:-1,
    ease:"Sine.easeInOut"
  });

  playBtn.on("pointerdown", ()=>{
    tone(this, 700, 120);
    stopMenuMusic();
    this.cameras.main.fadeOut(400);
    this.time.delayedCall(400,()=>this.scene.start("SoloScene"));
  });

  partyBtn.on("pointerdown", ()=>{
    tone(this, 500, 120);
    this.scene.start("PartyScene");
  });
};

/* ================= PARTY SCENE ================= */

function PartyScene(){ Phaser.Scene.call(this,{key:"PartyScene"}); }
PartyScene.prototype = Object.create(Phaser.Scene.prototype);

PartyScene.prototype.create = function(){

  this.cameras.main.fadeIn(400);

  this.add.text(400,80,"SHAPE STATS",{fontSize:"36px",color:"#ffffff"}).setOrigin(0.5);

  const stats = [
    "CIRCLE\nDamage: Medium\nRange: Medium\nAttack Speed: Normal",
    "SQUARE\nDamage: High\nRange: Large\nAttack Speed: Slow",
    "TRIANGLE\nDamage: Medium\nRange: Short\nAttack Speed: Fast"
  ];

  stats.forEach((s,i)=>{
    this.add.text(400,180+i*120,s,{fontSize:"18px",color:"#00ffcc",align:"center"}).setOrigin(0.5);
  });

  const backBtn = this.add.text(400,540,"BACK",{fontSize:"24px",color:"#ffffff"})
    .setOrigin(0.5)
    .setInteractive();

  backBtn.on("pointerdown", ()=>{
    tone(this, 400, 120);
    this.scene.start("MenuScene");
  });
};

/* ================= SOLO GAME SCENE ================= */

function SoloScene(){ Phaser.Scene.call(this,{key:"SoloScene"}); }
SoloScene.prototype = Object.create(Phaser.Scene.prototype);

const MAX_TOWERS = 25;

const SHAPES = {
  circle:{range:130,dmg:2,rate:600,cost:40,color:0x00ffcc},
  square:{range:170,dmg:5,rate:1400,cost:70,color:0xffaa00},
  triangle:{range:90,dmg:3,rate:300,cost:50,color:0xaa66ff}
};

const path = [
  {x:0,y:300},{x:200,y:300},{x:400,y:200},{x:600,y:300},{x:800,y:300}
];

let enemies,towers,wave,money,crystalHP,selectedTower;
let laserGraphics,moneyText,waveText,selectText,hpText,towerCountText;

SoloScene.prototype.create = function(){

  this.cameras.main.fadeIn(400);
  startGameMusic(this);

  enemies=[];
  towers=[];
  wave=1;
  money=150;
  crystalHP=20;
  selectedTower="circle";

  drawPath(this);
  laserGraphics=this.add.graphics();

  moneyText=this.add.text(10,10,"Money: "+money,{color:"#fff"});
  waveText=this.add.text(10,30,"Wave: 1",{color:"#fff"});
  selectText=this.add.text(10,50,"Selected: CIRCLE",{color:"#fff"});
  hpText=this.add.text(10,70,"Crystal HP: "+crystalHP,{color:"#00ffff"});
  towerCountText=this.add.text(10,90,"Towers: 0 / "+MAX_TOWERS,{color:"#aaa"});

  this.input.on("pointerdown",p=>tryPlaceTower(this,p.x,p.y));

  this.input.keyboard.on("keydown-ONE",()=>{
    tone(this,600,80);
    changeSelection("circle");
  });

  this.input.keyboard.on("keydown-TWO",()=>{
    tone(this,500,80);
    changeSelection("square");
  });

  this.input.keyboard.on("keydown-THREE",()=>{
    tone(this,400,80);
    changeSelection("triangle");
  });

  spawnWave(this);
  this.time.addEvent({delay:7000,loop:true,callback:()=>spawnWave(this)});
};

SoloScene.prototype.update = function(time){
  moveEnemies(this);
  updateTowerDamage(this,time);
};

/* ================= GAME LOGIC ================= */

function spawnWave(scene){
  tone(scene,300,200); // wave start sound

  for(let i=0;i<5+wave;i++){
    const e={x:path[0].x,y:path[0].y,hp:12+wave*3,speed:0.8,pathIndex:0,alive:true};
    e.body=scene.add.circle(e.x,e.y,14,0xff5555);
    e.text=scene.add.text(e.x-10,e.y-12,e.hp,{color:"#fff"});
    enemies.push(e);
  }
  wave++;
  waveText.setText("Wave: "+wave);
}

function moveEnemies(scene){
  enemies.forEach(e=>{
    if(!e.alive)return;
    const next=path[e.pathIndex+1];
    if(!next){
      damageCrystal(scene,1);
      e.alive=false;
      e.body.destroy();
      e.text.destroy();
      return;
    }
    const dx=next.x-e.x,dy=next.y-e.y;
    const d=Math.hypot(dx,dy);
    e.x+=(dx/d)*e.speed;
    e.y+=(dy/d)*e.speed;
    e.body.setPosition(e.x,e.y);
    e.text.setPosition(e.x-10,e.y-12);
    if(d<4)e.pathIndex++;
  });
}

function tryPlaceTower(scene,x,y){
  if(towers.length>=MAX_TOWERS)return;
  const tData=SHAPES[selectedTower];
  if(money<tData.cost)return;

  money-=tData.cost;
  moneyText.setText("Money: "+money);

  towers.push({x,y,...tData,nextTick:0,type:selectedTower});

  if(selectedTower==="circle")
    scene.add.circle(x,y,14,tData.color).setStrokeStyle(2,0xffffff);
  if(selectedTower==="square")
    scene.add.rectangle(x,y,28,28,tData.color).setStrokeStyle(2,0xffffff);
  if(selectedTower==="triangle")
    scene.add.polygon(x,y,[0,-16,-14,12,14,12],tData.color).setStrokeStyle(2,0xffffff);

  towerCountText.setText("Towers: "+towers.length+" / "+MAX_TOWERS);
}

function changeSelection(type){
  selectedTower=type;
  selectText.setText("Selected: "+type.toUpperCase());
}

function updateTowerDamage(scene,time){
  laserGraphics.clear();

  towers.forEach(t=>{
    if(time<t.nextTick)return;
    t.nextTick=time+t.rate;

    enemies.forEach(e=>{
      if(!e.alive)return;
      const dx=e.x-t.x,dy=e.y-t.y;
      if(dx*dx+dy*dy<=t.range*t.range){

        laserGraphics.lineStyle(2,0xffffff,0.7);
        laserGraphics.beginPath();
        laserGraphics.moveTo(t.x,t.y);
        laserGraphics.lineTo(e.x,e.y);
        laserGraphics.strokePath();

        tone(scene,800,50); // tower attack sound
        damageEnemy(e,t.dmg);
      }
    });
  });
}

function damageEnemy(e,dmg){
  e.hp-=dmg;
  e.text.setText(Math.floor(e.hp));
  if(e.hp<=0){
    e.alive=false;
    e.body.destroy();
    e.text.destroy();
    money+=15;
    moneyText.setText("Money: "+money);
  }
}

function damageCrystal(scene,amount){
  crystalHP-=amount;
  hpText.setText("Crystal HP: "+crystalHP);
  if(crystalHP<=0){
    stopGameMusic();
    tone(scene,120,400,0.4); // lose sound
    scene.scene.start("MenuScene");
  }
}

function drawPath(scene){
  const g=scene.add.graphics();
  g.lineStyle(20,0x444444,1);
  g.beginPath();
  g.moveTo(path[0].x,path[0].y);
  for(let i=1;i<path.length;i++)g.lineTo(path[i].x,path[i].y);
  g.strokePath();
}
