let paused=false;
function togglePause(){paused=!paused;}
function restartGame(){location.reload();}

const config={type:Phaser.AUTO,width:800,height:600,backgroundColor:"#111",scene:{preload,create,update}};
new Phaser.Game(config);

const SHAPES={
 circle:{dmg:2,rate:600,color:0x00ffcc,cost:30,range:120},
 square:{dmg:5,rate:1400,color:0xffaa00,cost:50,range:150},
 triangle:{dmg:1,rate:450,color:0xaa66ff,cost:20,range:100}
};

const ENEMY_TYPES=[
 {hp:8,speed:0.9,color:0xffcc00},
 {hp:15,speed:0.5,color:0xaa00ff},
 {hp:10,speed:0.6,color:0xff5555}
];

const path=[{x:0,y:300},{x:200,y:300},{x:400,y:200},{x:600,y:300},{x:800,y:300}];

let enemies=[],towers=[],bullets=[];
let wave=1,crystalHP=20,money=100,selectedShape="circle";
let moneyText,waveText,hpText,shapeText,previewRing;

function preload(){}

function create(){
 drawPath(this);
 this.crystal=this.add.circle(750,300,25,0x00aaff);

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

 this.time.addEvent({delay:8000,loop:true,callback:()=>{
   wave++; waveText.setText("Wave: "+wave); spawnWave(this);
 }});
}

function update(){if(paused)return;moveEnemies();towerShooting(this);moveBullets();}

// PATH
function drawPath(scene){
 const g=scene.add.graphics();
 g.lineStyle(20,0x444444,1);
 g.beginPath(); g.moveTo(path[0].x,path[0].y);
 for(let i=1;i<path.length;i++) g.lineTo(path[i].x,path[i].y);
 g.strokePath();
 path.forEach(p=>scene.add.circle(p.x,p.y,6,0x888888));
}

// ENEMIES
function spawnWave(scene){for(let i=0;i<wave+2;i++)spawnEnemy(scene);}
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
  e.body.setPosition(e.x,e.y); e.text.setPosition(e.x-6,e.y-8);
  if(d<4)e.index++;
 });
}

// TOWERS
function selectShape(type){
 selectedShape=type;
 shapeText.setText("Selected: "+type.toUpperCase());
 previewRing.setRadius(SHAPES[type].range);
}

function placeTower(scene,x,y,type){
 const s=SHAPES[type];
 const t={x,y,dmg:s.dmg,rate:s.rate,last:0,range:s.range};
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

function towerShooting(scene){
 towers.forEach(t=>{
  const now=Date.now();
  if(now-t.last<t.rate)return;
  const target=enemies.find(e=>Phaser.Math.Distance.Between(t.x,t.y,e.x,e.y)<=t.range);
  if(!target)return;
  t.last=now; shoot(scene,t,target);
 });
}

// BULLETS
function shoot(scene,t,e){
 const b={x:t.x,y:t.y,e,dmg:t.dmg,speed:4};
 b.body=scene.add.circle(b.x,b.y,6,0xffffff);
 bullets.push(b);
}

function moveBullets(){
 for(let i=bullets.length-1;i>=0;i--){
  const b=bullets[i];
  if(!b.e||!enemies.includes(b.e)){b.body.destroy();bullets.splice(i,1);continue;}
const dx = b.e.x - b.x;
const dy = b.e.y - b.y;
const d = Math.hypot(dx,dy);

const hitDistance = 22;

// If already close enough → hit
if(d <= hitDistance){
  hitEnemy(b.e, b.dmg);
  b.body.destroy();
  bullets.splice(i,1);
  continue;
}

// Move bullet
const step = Math.min(b.speed, d);
const oldX = b.x;
const oldY = b.y;

b.x += (dx/d) * step;
b.y += (dy/d) * step;

// 🔥 NEW: Check if we passed through the enemy
const newDx = b.e.x - b.x;
const newDy = b.e.y - b.y;
const newD = Math.hypot(newDx,newDy);

if(newD > d){ // bullet went past enemy
  hitEnemy(b.e, b.dmg);
  b.body.destroy();
  bullets.splice(i,1);
  continue;
}

b.body.setPosition(b.x,b.y);

// DAMAGE
function hitEnemy(e,dmg){
 e.hp-=dmg; e.text.setText(e.hp); e.body.scale*=0.95;
 if(e.hp<=0){e.body.destroy();e.text.destroy();enemies=enemies.filter(x=>x!==e);money+=10;moneyText.setText("Money: "+money);}
}

function damageCrystal(i){
 enemies[i].body.destroy();enemies[i].text.destroy();
 enemies.splice(i,1); crystalHP--; hpText.setText("Crystal: "+crystalHP);
 if(crystalHP<=0) gameOver();
}

function gameOver(){alert("Game Over! Wave "+wave);location.reload();}
