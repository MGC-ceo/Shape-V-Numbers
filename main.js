const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#111",
  scene: { create, update }
};

new Phaser.Game(config);

/* ================= SETTINGS ================= */

const MAX_TOWERS = 25;

const SHAPES = {
  circle:   { range:130, dmg:2, rate:600,  cost:40,  color:0x00ffcc },
  square:   { range:170, dmg:5, rate:1400, cost:70,  color:0xffaa00 },
  triangle: { range:90,  dmg:3, rate:300,  cost:50,  color:0xaa66ff }
};

const path = [
  {x:0,y:300},{x:200,y:300},{x:400,y:200},{x:600,y:300},{x:800,y:300}
];

/* ================= GAME STATE ================= */

let enemies = [];
let towers = [];
let wave = 1;
let money = 150;
let crystalHP = 20;
let selectedTower = "circle";

let laserGraphics, moneyText, waveText, selectText, hpText, towerCountText;

/* ================= SCENE ================= */

function create(){
  drawPath(this);
  laserGraphics = this.add.graphics();

  moneyText = this.add.text(10,10,"Money: "+money,{color:"#fff"});
  waveText = this.add.text(10,30,"Wave: 1",{color:"#fff"});
  selectText = this.add.text(10,50,"Selected: CIRCLE",{color:"#fff"});
  hpText = this.add.text(10,70,"Crystal HP: "+crystalHP,{color:"#00ffff"});
  towerCountText = this.add.text(10,90,"Towers: 0 / "+MAX_TOWERS,{color:"#aaa"});

  this.input.on("pointerdown", p => tryPlaceTower(this, p.x, p.y));

  this.input.keyboard.on("keydown-ONE", ()=>changeSelection("circle"));
  this.input.keyboard.on("keydown-TWO", ()=>changeSelection("square"));
  this.input.keyboard.on("keydown-THREE", ()=>changeSelection("triangle"));

  this.input.keyboard.on("keydown-U", ()=>upgradeNearestTower());

  spawnWave(this);

  this.time.addEvent({
    delay:7000,
    loop:true,
    callback:()=>spawnWave(this)
  });
}

function update(time){
  moveEnemies();
  updateTowerDamage(time);
  drawLasers();
}

/* ================= ENEMIES ================= */

function spawnWave(scene){
  const isBossWave = wave % 5 === 0;

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

function moveEnemies(){
  enemies.forEach(e=>{
    if(!e.alive) return;

    const next = path[e.pathIndex+1];
    if(!next){
      damageCrystal(e.boss ? 5 : 1);
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

/* ================= TOWERS ================= */

function tryPlaceTower(scene,x,y){
  if(towers.length >= MAX_TOWERS) return;

  const tData = SHAPES[selectedTower];
  if(money < tData.cost) return;

  for(let p of path){
    if(Phaser.Math.Distance.Between(x,y,p.x,p.y) < 50) return;
  }

  money -= tData.cost;
  moneyText.setText("Money: "+money);

  addTower(scene,x,y,selectedTower);
  towerCountText.setText("Towers: "+towers.length+" / "+MAX_TOWERS);
}

function addTower(scene,x,y,type){
  const s=SHAPES[type];
  const body = scene.add.circle(x,y,14,s.color).setInteractive();

  const tower = {
    x,y,
    range:s.range,
    dmg:s.dmg,
    rate:s.rate,
    nextTick:0,
    type:type,
    level:1,
    body:body
  };

  body.on("pointerdown", ()=>upgradeTower(tower));
  towers.push(tower);
}

function changeSelection(type){
  selectedTower = type;
  selectText.setText("Selected: "+type.toUpperCase());
}

function upgradeTower(t){
  const cost = 60 * t.level;
  if(money < cost) return;

  money -= cost;
  moneyText.setText("Money: "+money);

  t.level++;
  t.dmg += 2;
  t.range += 10;
  t.rate *= 0.9;
  t.body.setScale(1 + t.level*0.1);
}

function upgradeNearestTower(){
  if(towers.length === 0) return;
  upgradeTower(towers[towers.length-1]);
}

function updateTowerDamage(time){
  towers.forEach(t=>{
    if(time < t.nextTick) return;
    t.nextTick = time + t.rate;

    const rangeSq = t.range * t.range;

    enemies.forEach(e=>{
      if(!e.alive) return;
      const dx=e.x-t.x, dy=e.y-t.y;
      if(dx*dx+dy*dy <= rangeSq){
        damageEnemy(e,t.dmg);
      }
    });
  });
}

/* ================= LASERS ================= */

function drawLasers(){
  laserGraphics.clear();

  towers.forEach(tower=>{
    enemies.forEach(enemy=>{
      if(!enemy.alive) return;

      const dx = enemy.x - tower.x;
      const dy = enemy.y - tower.y;
      const distSq = dx*dx + dy*dy;

      if(distSq <= tower.range * tower.range){
        let color = 0x00ffcc;
        let width = 2;

        if(tower.type === "square"){ color = 0xffaa00; width = 4; }
        if(tower.type === "triangle"){ color = 0xaa66ff; width = 1; }

        laserGraphics.lineStyle(width, color, 0.9);
        laserGraphics.beginPath();
        laserGraphics.moveTo(tower.x, tower.y);
        laserGraphics.lineTo(enemy.x, enemy.y);
        laserGraphics.strokePath();
      }
    });
  });
}

/* ================= DAMAGE ================= */

function damageEnemy(e,dmg){
  e.hp -= dmg;
  e.text.setText(Math.floor(e.hp));

  if(e.hp <= 0){
    e.alive=false;
    e.body.destroy();
    e.text.destroy();
    money += e.boss ? 100 : 15;
    moneyText.setText("Money: "+money);
  }
}

function damageCrystal(amount){
  crystalHP -= amount;
  hpText.setText("Crystal HP: "+crystalHP);
  if(crystalHP <= 0){
    alert("Crystal Destroyed! Game Over");
    location.reload();
  }
}

/* ================= PATH ================= */

function drawPath(scene){
  const g=scene.add.graphics();
  g.lineStyle(20,0x444444,1);
  g.beginPath();
  g.moveTo(path[0].x,path[0].y);
  for(let i=1;i<path.length;i++) g.lineTo(path[i].x,path[i].y);
  g.strokePath();
}
