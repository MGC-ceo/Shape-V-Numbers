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
  scene: [MenuScene, SoloScene] // ✅ Removed PartyScene
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

/* ================= GLOBAL AUDIO ================= */

let masterVolume = 0.3;
let isMuted = false;

function tone(scene, freq = 440, duration = 150, volume = 0.2, type="sine"){
  if(isMuted) return;

  const ctx = scene.sound.context;
  if(!ctx) return;
  if(ctx.state === "suspended") ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(volume * masterVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration/1000);

  osc.start();
  osc.stop(ctx.currentTime + duration/1000);
}

/* ================= MUSIC SYSTEM ================= */

let musicEvents = [];

function stopMusic(){
  musicEvents.forEach(e=>e.remove());
  musicEvents = [];
}

function startMenuMusic(scene){
  stopMusic();

  musicEvents.push(scene.time.addEvent({
    delay: 800,
    loop: true,
    callback: ()=> tone(scene, 180, 400, 0.08, "triangle")
  }));

  musicEvents.push(scene.time.addEvent({
    delay: 1600,
    loop: true,
    callback: ()=> tone(scene, 440, 300, 0.05, "sine")
  }));
}

function startGameMusic(scene){
  stopMusic();

  musicEvents.push(scene.time.addEvent({
    delay: 600,
    loop: true,
    callback: ()=> tone(scene, 120, 300, 0.09, "square")
  }));

  musicEvents.push(scene.time.addEvent({
    delay: 900,
    loop: true,
    callback: ()=> tone(scene, 260, 200, 0.05, "triangle")
  }));
}

/* ================= MENU SCENE ================= */

function MenuScene(){ Phaser.Scene.call(this,{key:"MenuScene"}); }
MenuScene.prototype = Object.create(Phaser.Scene.prototype);

MenuScene.prototype.create = function(){

  const w = this.cameras.main.width;
  const h = this.cameras.main.height;
  const centerX = w/2;
  const centerY = h/2;

  this.cameras.main.fadeIn(600);
  startMenuMusic(this);

  this.add.rectangle(centerX,centerY,500,450,0x000000,0.4)
      .setStrokeStyle(2,0x00ffcc);

  const title = this.add.text(centerX,centerY-100,"SHAPE DEFENSE",
      {fontSize:"42px",color:"#ffffff"}).setOrigin(0.5);

  const playBtn = this.add.text(centerX,centerY,"PLAY",
      {fontSize:"36px",color:"#ffffff"})
      .setOrigin(0.5)
      .setInteractive();

  playBtn.on("pointerdown", ()=>{
    tone(this,700,120,0.4);
    this.cameras.main.fadeOut(400);
    this.time.delayedCall(400,()=>this.scene.start("SoloScene"));
  });
};

/* ================= SOLO GAME ================= */

function SoloScene(){ Phaser.Scene.call(this,{key:"SoloScene"}); }
SoloScene.prototype = Object.create(Phaser.Scene.prototype);

const MAX_TOWERS = 25;
let paused = false;

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
  paused=false;

  drawPath(this);
  laserGraphics=this.add.graphics();

  moneyText=this.add.text(10,10,"Money: "+money,{color:"#fff"});
  waveText=this.add.text(10,30,"Wave: 1",{color:"#fff"});
  hpText=this.add.text(10,50,"Crystal HP: "+crystalHP,{color:"#00ffff"});

  this.input.keyboard.on("keydown-P",()=>{
    paused=!paused;
  });

  this.input.on("pointerdown",p=>tryPlaceTower(this,p.x,p.y));

  spawnWave(this);
  this.time.addEvent({delay:7000,loop:true,callback:()=>spawnWave(this)});
};

SoloScene.prototype.update=function(time){
  if(paused) return;
  moveEnemies(this);
  updateTowerDamage(this,time);
};

/* ================= GAME LOGIC ================= */

function spawnWave(scene){

  const isBossWave = wave % 5 === 0;

  for(let i=0;i<5+wave;i++){

    const hp = isBossWave ? 100 : 12+wave*3;
    const size = isBossWave ? 24 : 14;
    const color = isBossWave ? 0xff0000 : 0xff5555;

    const e={
      x:path[0].x,
      y:path[0].y,
      hp:hp,
      speed:isBossWave ? 0.5 : 0.8,
      pathIndex:0,
      alive:true
    };

    e.body=scene.add.circle(e.x,e.y,size,color);
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

function updateTowerDamage(scene,time){

  laserGraphics.clear();

  towers.forEach(t=>{
    if(time<t.nextTick)return;
    t.nextTick=time+t.rate;

    enemies.forEach(e=>{
      if(!e.alive)return;
      const dx=e.x-t.x,dy=e.y-t.y;

      if(dx*dx+dy*dy<=t.range*t.range){

        laserGraphics.lineStyle(4,0xffffff,0.2);
        laserGraphics.strokeLineShape(new Phaser.Geom.Line(t.x,t.y,e.x,e.y));

        laserGraphics.lineStyle(2,0xffffff,0.9);
        laserGraphics.strokeLineShape(new Phaser.Geom.Line(t.x,t.y,e.x,e.y));

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
  scene.cameras.main.shake(200,0.01);
  if(crystalHP<=0){
    stopMusic();
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
