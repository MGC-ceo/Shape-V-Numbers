let towers = [];
let enemies = [];
let money = 100;
let wave = 1;
let level = 1;
let selectedShape = "circle";
let lastWaveBeaten = 1;
const MAX_TOWERS = 25;

const SHAPES = {
  circle:   { dmg:2, rate:700, range:130, color:0x00ffff, cost:30 },
  square:   { dmg:4, rate:1400, range:200, color:0xffaa00, cost:50 },
  triangle: { dmg:3, rate:350, range:90, color:0xaa66ff, cost:40 }
};

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#111",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [MenuScene, SoloScene, PartyScene]
};

new Phaser.Game(config);

//////////////////// MENU ////////////////////

function MenuScene(){ Phaser.Scene.call(this,{key:"MenuScene"}); }
MenuScene.prototype = Object.create(Phaser.Scene.prototype);

MenuScene.prototype.create = function(){
  this.add.text(400,80,"SHAPE DEFENSE",{font:"48px Arial",color:"#fff"}).setOrigin(0.5);
  this.add.text(400,140,"LEVEL: "+level,{font:"28px Arial",color:"#00ffaa"}).setOrigin(0.5);

  let play = this.add.text(400,260,"PLAY",{font:"40px Arial",color:"#fff"}).setOrigin(0.5).setInteractive();
  play.on("pointerdown",()=>this.scene.start("SoloScene"));

  this.add.text(400,310,"More Content Soon",{font:"20px Arial",color:"#888"}).setOrigin(0.5);

  let party = this.add.text(400,380,"PARTY",{font:"36px Arial",color:"#fff"}).setOrigin(0.5).setInteractive();
  party.on("pointerdown",()=>this.scene.start("PartyScene"));
};

//////////////////// PARTY ////////////////////

function PartyScene(){ Phaser.Scene.call(this,{key:"PartyScene"}); }
PartyScene.prototype = Object.create(Phaser.Scene.prototype);

PartyScene.prototype.create = function(){
  this.add.text(400,80,"SHAPES",{font:"40px Arial",color:"#fff"}).setOrigin(0.5);

  let y=180;
  Object.keys(SHAPES).forEach(shape=>{
    let s=SHAPES[shape];
    this.add.text(400,y,shape.toUpperCase(),{font:"26px Arial",color:"#fff"}).setOrigin(0.5);
    this.add.text(400,y+30,`Damage: ${s.dmg} | Range: ${s.range} | Speed: ${s.rate}ms`,{font:"18px Arial",color:"#aaa"}).setOrigin(0.5);
    y+=90;
  });

  this.add.text(400,520,"BACK",{font:"28px Arial",color:"#fff"}).setOrigin(0.5).setInteractive()
    .on("pointerdown",()=>this.scene.start("MenuScene"));
};

//////////////////// SOLO GAME ////////////////////

function SoloScene(){ Phaser.Scene.call(this,{key:"SoloScene"}); }
SoloScene.prototype = Object.create(Phaser.Scene.prototype);

SoloScene.prototype.create = function(){
  towers=[]; enemies=[]; money=100; wave=1;

  this.add.text(10,10,"Money: "+money,{color:"#fff"});
  this.moneyText=this.add.text(10,40,"Wave: "+wave,{color:"#fff"});

  this.input.on("pointerdown",p=>placeTower(this,p.x,p.y));

  this.time.addEvent({delay:2500,loop:true,callback:()=>spawnEnemy(this)});
};

SoloScene.prototype.update = function(time){
  enemies.forEach(e=>{
    e.x+=e.speed;
    e.body.setPosition(e.x,e.y);

    towers.forEach(t=>{
      if(Phaser.Math.Distance.Between(t.x,t.y,e.x,e.y)<=t.range){
        if(time>t.nextTick){
          t.nextTick=time+t.rate;
          e.hp-=t.dmg;
          e.text.setText(e.hp);
        }
      }
    });
  });

  enemies = enemies.filter(e=>{
    if(e.hp<=0){
      e.body.destroy();
      e.text.destroy();
      money+=5;
      this.moneyText.setText("Money: "+money);
      return false;
    }
    return true;
  });
};

//////////////////// HELPERS ////////////////////

function spawnEnemy(scene){
  let hp=10+wave;
  let e={
    x:0,y:300,hp:hp,speed:0.5+wave*0.02
  };
  e.body=scene.add.circle(e.x,e.y,15,0xff5555);
  e.text=scene.add.text(e.x-10,e.y-10,hp,{color:"#fff"});
  enemies.push(e);
}

function placeTower(scene,x,y){
  if(towers.length>=MAX_TOWERS) return;
  let s=SHAPES[selectedShape];
  if(money<s.cost) return;

  money-=s.cost;
  scene.moneyText.setText("Money: "+money);

  let tower={x,y,range:s.range,dmg:s.dmg,rate:s.rate,nextTick:0,type:selectedShape};
  towers.push(tower);

  if(selectedShape==="circle"){
    scene.add.circle(x,y,14,s.color);
  }
  else if(selectedShape==="square"){
    scene.add.rectangle(x,y,26,26,s.color);
  }
  else if(selectedShape==="triangle"){
    scene.add.polygon(x,y,[0,-16, 16,16, -16,16],s.color);
  }
}
