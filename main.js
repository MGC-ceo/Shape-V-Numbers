const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#111",
  scene: { create, update }
};

new Phaser.Game(config);

const SHAPES = {
  circle:   { range:130, dmg:2,  rate:600,  color:0x00ffcc },
  square:   { range:170, dmg:5,  rate:1400, color:0xffaa00 },
  triangle: { range:90,  dmg:3,  rate:300,  color:0xaa66ff }
};

const path = [
  {x:0,y:300},{x:200,y:300},{x:400,y:200},{x:600,y:300},{x:800,y:300}
];

let enemies = [];
let towers = [];
let wave = 1;

function create(){
  drawPath(this);

  // Spawn test towers
  addTower(this, 250, 250, "circle");
  addTower(this, 420, 180, "square");
  addTower(this, 500, 320, "triangle");

  spawnWave(this);

  this.time.addEvent({
    delay:5000,
    loop:true,
    callback:()=>spawnWave(this)
  });
}

function update(time){
  moveEnemies();
  updateTowerDamage(time);
}

/* ================= ENEMIES ================= */

function spawnWave(scene){
  for(let i=0;i<5+wave;i++){
    const hp = 10 + wave*2;
    const e = {
      x:path[0].x,
      y:path[0].y,
      hp,
      speed:0.7 + wave*0.05,
      pathIndex:0,
      alive:true
    };
    e.body = scene.add.circle(e.x,e.y,14,0xff5555);
    e.text = scene.add.text(e.x-8,e.y-10,e.hp,{color:"#fff"});
    enemies.push(e);
  }
  wave++;
}

function moveEnemies(){
  enemies.forEach(e=>{
    if(!e.alive) return;

    const next = path[e.pathIndex+1];
    if(!next){ e.alive=false; e.body.destroy(); e.text.destroy(); return; }

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

function addTower(scene,x,y,type){
  const s=SHAPES[type];
  towers.push({
    x,y,
    range:s.range,
    dmg:s.dmg,
    rate:s.rate,
    nextTick:0
  });
  scene.add.circle(x,y,14,s.color);
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

/* ================= DAMAGE ================= */

function damageEnemy(e,dmg){
  e.hp -= dmg;
  e.text.setText(e.hp);

  if(e.hp <= 0){
    e.alive=false;
    e.body.destroy();
    e.text.destroy();
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
