const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#111",
  scene: { create, update }
};

new Phaser.Game(config);

/* ================= SETTINGS ================= */

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
let selectedTower = "circle";
let laserGraphics, moneyText, waveText, selectText;

/* ================= SCENE ================= */

function create(){
  drawPath(this);

  laserGraphics = this.add.graphics();

  moneyText = this.add.text(10,10,"Money: "+money,{color:"#fff"});
  waveText = this.add.text(10,30,"Wave: 1",{color:"#fff"});
  selectText = this.add.text(10,50,"Selected: CIRCLE",{color:"#fff"});

  this.input.on("pointerdown", p => tryPlaceTower(this, p.x, p.y));

  this.input.keyboard.on("keydown-ONE", ()=>changeSelection("circle"));
  this.input.keyboard.on("keydown-TWO", ()=>changeSelection("square"));
  this.input.keyboard.on("keydown-THREE", ()=>changeSelection("triangle"));

  spawnWave(this);

  this.time.addEvent({
    delay:6000,
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
  for(let i=0;i<5+wave;i++){
    const hp = 12 + wave*3;
    const e = {
      x:path[0].x,
      y:path[0].y,
      hp,
      speed:0.8 + wave*0.05,
      pathIndex:0,
      alive:true
    };
    e.body = scene.add.circle(e.x,e.y,14,0xff5555);
    e.text = scene.add.text(e.x-8,e.y-10,e.hp,{color:"#fff"});
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
    e.text.setPosition(e.x-8,e.y-10);

    if(d<4) e.pathIndex++;
  });
}

/* ================= TOWERS ================= */

function tryPlaceTower(scene,x,y){
  const tData = SHAPES[selectedTower];
  if(money < tData.cost) return;

  for(let p of path){
    if(Phaser.Math.Distance.Between(x,y,p.x,p.y) < 50) return;
  }

  money -= tData.cost;
  moneyText.setText("Money: "+money);
  addTower(scene,x,y,selectedTower);
}

function addTower(scene,x,y,type){
  const s=SHAPES[type];
  towers.push({
    x,y,
    range:s.range,
    dmg:s.dmg,
    rate:s.rate,
    nextTick:0,
    type:type
  });
  scene.add.circle(x,y,14,s.color);
}

function changeSelection(type){
  selectedTower = type;
  selectText.setText("Selected: "+type.toUpperCase());
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

/* ================= LASERS (VISUAL) ================= */

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
  e.text.setText(e.hp);

  if(e.hp <= 0){
    e.alive=false;
    e.body.destroy();
    e.text.destroy();
    money += 15;
    moneyText.setText("Money: "+money);
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
