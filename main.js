const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#111",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [MenuScene, SoloScene]
};

new Phaser.Game(config);

let level = 1;

/* ================= MENU ================= */

function MenuScene(){ Phaser.Scene.call(this,{key:"MenuScene"}); }
MenuScene.prototype = Object.create(Phaser.Scene.prototype);

MenuScene.prototype.create = function(){
  this.add.text(400,120,"SHAPE DEFENSE",{font:"48px Arial",color:"#fff"}).setOrigin(0.5);
  this.add.text(400,180,"LEVEL "+level,{font:"24px Arial",color:"#00ffaa"}).setOrigin(0.5);

  const play = this.add.text(400,300,"PLAY SOLO",{font:"36px Arial",color:"#fff"})
    .setOrigin(0.5).setInteractive();

  play.on("pointerdown",()=>this.scene.start("SoloScene"));

  this.add.text(400,350,"More Content Soon",{font:"18px Arial",color:"#777"}).setOrigin(0.5);
};

/* ================= SOLO GAME ================= */

function SoloScene(){ Phaser.Scene.call(this,{key:"SoloScene"}); }
SoloScene.prototype = Object.create(Phaser.Scene.prototype);

const SHAPES = {
  circle:   { dmg:2, rate:600, range:130, color:0x00ffcc, cost:30 },
  square:   { dmg:5, rate:1400, range:180, color:0xffaa00, cost:50 },
  triangle: { dmg:1, rate:300, range:95, color:0xaa66ff, cost:20 }
};

let enemies, towers, money, wave, selectedShape;
let moneyText, waveText, hpText;
let path, crystal;

SoloScene.prototype.create = function(){
  enemies = [];
  towers = [];
  money = 100;
  wave = 1;
  selectedShape = "circle";

  buildPath(this);
  drawCrystal(this);

  moneyText = this.add.text(10,10,"Money: 100",{color:"#fff"});
  waveText = this.add.text(10,35,"Wave: 1",{color:"#fff"});
  hpText = this.add.text(650,10,"Crystal: 20",{color:"#0ff"});

  this.input.on("pointerdown",p=>placeTower(this,p.x,p.y));
  this.input.keyboard.on("keydown-ONE",()=>selectedShape="circle");
  this.input.keyboard.on("keydown-TWO",()=>selectedShape="square");
  this.input.keyboard.on("keydown-THREE",()=>selectedShape="triangle");

  spawnWave(this);
};

SoloScene.prototype.update = function(time){
  moveEnemies(this);
  updateTowers(this,time);
};

/* ================= PATH ================= */

function buildPath(scene){
  path = [
    {x:0,y:400},
    {x:200,y:400},
    {x:350,y:300},
    {x:550,y:400},
    {x:800,y:400}
  ];

  const g = scene.add.graphics();
  g.lineStyle(30,0x333333,1);
  g.beginPath();
  g.moveTo(path[0].x,path[0].y);
  for(let i=1;i<path.length;i++) g.lineTo(path[i].x,path[i].y);
  g.strokePath();
}

function drawCrystal(scene){
  crystal = scene.add.circle(760,400,22,0x00ffff);
}

/* ================= ENEMIES ================= */

function spawnWave(scene){
  for(let i=0;i<5+wave;i++){
    const e = { hp:12+wave*2, speed:0.7+wave*0.05, index:0, alive:true };
    e.body = scene.add.circle(path[0].x,path[0].y,14,0xff5555);
    e.text = scene.add.text(e.body.x-8,e.body.y-10,e.hp,{color:"#fff"});
    enemies.push(e);
  }
}

function moveEnemies(scene){
  enemies.forEach(e=>{
    if(!e.alive) return;
    const next = path[e.index+1];
    if(!next){
      e.alive=false;
      e.body.destroy(); e.text.destroy();
      return;
    }
    const dx=next.x-e.body.x, dy=next.y-e.body.y;
    const d=Math.hypot(dx,dy);
    e.body.x += (dx/d)*e.speed;
    e.body.y += (dy/d)*e.speed;
    e.text.setPosition(e.body.x-8,e.body.y-10);
    if(d<4) e.index++;
  });
}

/* ================= TOWERS ================= */

function placeTower(scene,x,y){
  if(towers.length>=25) return;
  const s=SHAPES[selectedShape];
  if(money<s.cost) return;

  money-=s.cost;
  moneyText.setText("Money: "+money);

  const t={x,y,range:s.range,dmg:s.dmg,rate:s.rate,nextTick:0,shape:selectedShape,beam:null};

  if(selectedShape==="circle")
    t.body=scene.add.circle(x,y,15,s.color).setStrokeStyle(2,0xffffff);
  if(selectedShape==="square")
    t.body=scene.add.rectangle(x,y,28,28,s.color).setStrokeStyle(2,0xffffff);
  if(selectedShape==="triangle")
    t.body=scene.add.triangle(x,y,0,30,15,0,30,30,s.color).setStrokeStyle(2,0xffffff);

  towers.push(t);
}

/* ================= DAMAGE SYSTEM (STABLE) ================= */

function updateTowers(scene,time){
  towers.forEach(t=>{

    // REAL damage = range check
    enemies.forEach(e=>{
      if(!e.alive) return;
      const dist = Phaser.Math.Distance.Between(t.x,t.y,e.body.x,e.body.y);
      if(dist<=t.range && time>t.nextTick){
        t.nextTick=time+t.rate;
        e.hp-=t.dmg;
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

    // LASER VISUAL ONLY
    if(t.beam){t.beam.destroy();t.beam=null;}
    const target=enemies.find(e=>e.alive && Phaser.Math.Distance.Between(t.x,t.y,e.body.x,e.body.y)<=t.range);
    if(!target) return;

    let color=0x00ffcc,width=2;
    if(t.shape==="square"){color=0xffaa00;width=4;}
    if(t.shape==="triangle"){color=0xaa66ff;width=1;}

    t.beam=scene.add.line(0,0,t.x,t.y,target.body.x,target.body.y,color).setLineWidth(width).setAlpha(0.7);
  });
}
