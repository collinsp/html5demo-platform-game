"use strict";


Array.prototype.shuffle=function(){
  let a=this,b,c=a.length,d;
  while(c)b=Math.random()*c--|0,d=a[c],a[c]=a[b],a[b]=d;
  return a;
};


let getNextPlayerColor;
{ let colors=[0xFF0000,0xFF8800,0xFFFF00,0x00FF00,0xFF00FF,0x00FFFF,0x9900FF].shuffle(), i=colors.length;
  getNextPlayerColor=()=>{
    if (--i==-1) i=colors.length-1;
    return colors[i];
  }
}

let SFX = jsfx.Sounds({
  "point":{"Frequency":{"Start":1043.3438712734612,"ChangeSpeed":0.10879780798072744,"ChangeAmount":9.547207889817123},"Volume":{"Sustain":0.09806870832944409,"Decay":0.386858695064088,"Punch":0.3664459889035252,"Master":0.15}},
  "spawn":{"Frequency":{"Start":187,"Min":30,"Max":1800,"Slide":-0.45,"DeltaSlide":0.27111740058694034,"RepeatSpeed":2.4240420017375692,"ChangeAmount":-2,"ChangeSpeed":1},"Vibrato":{"Depth":0,"DepthSlide":-1,"Frequency":0.01,"FrequencySlide":-1},"Generator":{"Func":"string","A":0.5,"B":0.9461043322329408,"ASlide":-0.900955208690442,"BSlide":-0.23},"Guitar":{"A":0.37506791578452603,"B":0.38594375638192946,"C":0.07162987314436853},"Phaser":{"Offset":0.45,"Sweep":1},"Volume":{"Master":0.74,"Attack":0.001,"Sustain":0.94,"Punch":1.04,"Decay":1.551},"Filter":{"HPSlide":-0.66,"LPResonance":0,"HP":0.57,"LP":0.87}},
  "fire":{"Frequency":{"Start":677,"Min":620,"Slide":-0.37,"Max":944,"DeltaSlide":0.09,"RepeatSpeed":0,"ChangeAmount":-9},"Generator":{"Func":"sine","A":0.34390365900407127,"ASlide":0.062089220640302936},"Phaser":{"Offset":-0.23,"Sweep":0.19},"Volume":{"Sustain":0.08,"Decay":0.081,"Attack":0.001,"Master":0.7},"Vibrato":{"Depth":0,"Frequency":1.01,"FrequencySlide":-1,"DepthSlide":-1}},
  "die":{"Frequency":{"Start":186.6228670242122,"Slide":0},"Generator":{"Func":"noise"},"Phaser":{"Offset":-0.16281910187532175,"Sweep":-0.1803511833022753},"Volume":{"Sustain":0.12907184086420787,"Decay":0.48833081296121317,"Punch":0.5948980684527602}},
  "jump":{"Frequency":{"Start":377,"Slide":0.25,"Max":815,"DeltaSlide":0.56,"RepeatSpeed":0,"ChangeAmount":0,"ChangeSpeed":0,"Min":30},"Generator":{"Func":"square","A":0.38,"BSlide":-1,"ASlide":-1},"Filter":{"HP":0,"LP":0.46,"HPSlide":-1,"LPSlide":0.68},"Volume":{"Sustain":0.05,"Decay":0.191,"Master":0.68,"Attack":0.001,"Punch":0.72},"Vibrato":{"DepthSlide":-0.39,"FrequencySlide":0.06}}
});

let RENDERER = PIXI.autoDetectRenderer(window.innerWidth,window.innerHeight);
RENDERER.backgroundColor = 0x7cd3ff;
document.body.appendChild(RENDERER.view);
window.addEventListener("resize",()=>{RENDERER.resize(window.innerWidth,window.innerHeight);});

// pause button
let IS_PAUSED=false;
let PAUSE_MSG = new PIXI.Text("PAUSED", {
  fontFamily: "monospace",
  fontSize: 40,
  fill: "white",
  dropShadow: true,
  dropShadowBlur: 10
});
let togglePause=()=>{
  if (IS_PAUSED) {
    IS_PAUSED=false;
    SCREEN.removeChild(PAUSE_MSG);
  } else {
    let x = SCREEN.x + (RENDERER.width - PAUSE_MSG.width) / 2;
    let y = SCREEN.y + (RENDERER.height- PAUSE_MSG.height) / 2;
    PAUSE_MSG.position.set(x, y);
    IS_PAUSED=true;
    SCREEN.addChild(PAUSE_MSG);
  }
}

// use input mask to store the state of buttons
// (bit shift matches xbox controller buttons array)
// xbox axes = [ L-stick-x-axis, L-stick-y-axis, R-stick-x-axis, R-stick-y-axis ]
let
  BUT_A       =1<<0,
  BUT_B       =1<<1,
  BUT_X       =1<<2,
  BUT_Y       =1<<3,
  BUT_L_BUMP  =1<<4,
  BUT_R_BUMP  =1<<5,
  BUT_L_TRIG  =1<<6, 
  BUT_R_TRIG  =1<<7, 
  BUT_BACK    =1<<8, 
  BUT_START   =1<<9, 
  BUT_L_STICK =1<<10,
  BUT_R_STICK =1<<11,
  BUT_UP      =1<<12,
  BUT_DOWN    =1<<13,
  BUT_LEFT    =1<<14,
  BUT_RIGHT   =1<<15;


// gamepad and keyboard controllers
let gamePadPlayerIdxMap=[];
let updateGamepads=()=>{
  let gps = navigator.getGamepads();
  for (let i=gps.length-1; i>=0; --i) {
    let gp=gps[i];

    // if gamepad does not exist
    if (! gp) {
      // if player exists, destroy player
      if (gamePadPlayerIdxMap[i]) {
        let p = PLAYERS.children[gamePadPlayerIdxMap[i]];
        p.destroy();
        gamePadPlayerIdxMap[i]=undefined;
      }
      continue;
    }

    // if player for gamepad does not exist, create it
    if (gamePadPlayerIdxMap[i]==undefined) {
      gamePadPlayerIdxMap[i]=createPlayer();
    }
    let p = PLAYERS.children[gamePadPlayerIdxMap[i]];

    // update gamepad input
    p.input=0;
    for (let but_i=gp.buttons.length-1;but_i>=0;--but_i) {
      p.input |= gp.buttons[but_i].pressed && (1<<but_i);
    }

    // use analog left stick as directional movement
    let a = gp.axes;
    p.input |=
      (a[0]> .3 && BUT_RIGHT) |
      (a[0]<-.3 && BUT_LEFT)  |
      (a[1]<-.3 && BUT_UP)   |
      (a[1]> .3 && BUT_DOWN);
  }
};

let keyboardPlayerIdx=null;

window.addEventListener("keydown", (e)=>{
//console.log(e.keyCode);
  let k = e.keyCode;

  // if esc button
  if (k==27) {
    togglePause(); 
    return;
  }
  if (keyboardPlayerIdx===null && k>=37 && k<=40) {
    keyboardPlayerIdx=createPlayer();
    console.log('created new player for keyboard');
  }
  if (keyboardPlayerIdx===null) return;

  // update the player input mask
  let p = PLAYERS.children[keyboardPlayerIdx];
  p.input |=  
    (k==32 && BUT_A) ||
    (k==0  && BUT_B) ||
    (k==16 && BUT_X) ||
    (k==0  && BUT_Y) ||
    (k==0  && BUT_L_BUMP)  ||
    (k==0  && BUT_R_BUMP)  ||
    (k==0  && BUT_L_TRIG)  ||
    (k==17 && BUT_R_TRIG)  ||
    (k==0  && BUT_BACK)    ||
    (k==0  && BUT_START)   ||
    (k==0  && BUT_L_STICK) ||
    (k==0  && BUT_R_STICK) ||
    (k==38 && BUT_UP)      ||
    (k==40 && BUT_DOWN)    ||
    (k==37 && BUT_LEFT)    ||
    (k==39 && BUT_RIGHT);
});

window.addEventListener("keyup", (e)=>{
  if (keyboardPlayerIdx===null) return;
  let k = e.keyCode;
  let p = PLAYERS.children[keyboardPlayerIdx];

  // update the player input mask
  p.input &= ~( 
    (k==32 && BUT_A) ||
    (k==0  && BUT_B) ||
    (k==16 && BUT_X) ||
    (k==0  && BUT_Y) ||
    (k==0  && BUT_L_BUMP)  ||
    (k==0  && BUT_R_BUMP)  ||
    (k==0  && BUT_L_TRIG)  ||
    (k==17 && BUT_R_TRIG)  ||
    (k==0  && BUT_BACK)    ||
    (k==0  && BUT_START)   ||
    (k==0  && BUT_L_STICK) ||
    (k==0  && BUT_R_STICK) ||
    (k==38 && BUT_UP)      ||
    (k==40 && BUT_DOWN)    ||
    (k==37 && BUT_LEFT)    ||
    (k==39 && BUT_RIGHT)  );;
});


let updateChildren=(e)=>{
  if (e.children) {
    for (let c of e.children) {
      if (c.update) c.update();
    }
  }
}


let SCREEN = new PIXI.Container();
SCREEN.update=()=>{ updateChildren(SCREEN); }

let STAGE = new PIXI.Container();
STAGE.x=0;
STAGE.y=0;
STAGE.camera_x_speed=.005;
STAGE.camera_y_speed=.005;
SCREEN.addChild(STAGE);
STAGE.update=()=>{
  updateChildren(STAGE);

  let totalPlayers = 0;

  // find target x,y coords
  let x=0,y=0;
  for (let p of PLAYERS.children) {
    if (p && ! p.is_dead) {
      totalPlayers++; 
      x+=p.x;
      y+=p.y;
    }
  }
  if (totalPlayers > 0) {
    // get average
    x /= totalPlayers;
    y /= totalPlayers;

    let targetStageX = RENDERER.width*.5 - x;
    let targetStageY = RENDERER.height*.7 - y;  // keep player toward bottom of the screen

    STAGE.x -= (STAGE.x - targetStageX) * STAGE.camera_x_speed * ELAPSED_TIME;
    STAGE.y -= (STAGE.y - targetStageY) * STAGE.camera_y_speed * ELAPSED_TIME;
  }
}

// make ground
let GROUND_MIN_Y=0, GROUND_MAX_Y=0, createGround;
let GROUND = new PIXI.Container();
STAGE.addChild(GROUND);
GROUND.update=()=>{ updateChildren(GROUND); }
{ createGround=(x,y,w,h,color)=>{
    let g = new PIXI.Graphics();
    if (! x) x=0;
    if (! y) y=0;
    if (! w) w=20;
    if (! h) h=2;
    g.color=color;
    if (! g.color) g.color=0x4f844e;
    if (y > GROUND_MAX_Y) GROUND_MAX_Y=y;
    if (y < GROUND_MIN_Y) GROUND_MIN_Y=y;
    g.beginFill(g.color);
    g.lineStyle(1, 0x00000, 1);
    g.drawRect(0, 0, w, h);
    g.endFill();
    g.x=x;
    g.y=y;
    g.climbable = false;

    g.redefine=(def)=>{
      if (def.x!=undefined) g.x=def.x;
      if (def.y!=undefined) g.y=def.y;
      if (def.color!=undefined) g.color=def.color;
      let w=(def.w!=undefined) ? def.w : g.width;
      let h=(def.h!=undefined) ? def.h : g.height;
      g.clear();
      g.beginFill(g.color);
      g.drawRect(0, 0, w, h);
      g.lineStyle(1, 0x00000, 1);
      g.endFill();
    };
    g.destroy=()=>{
      GROUND.removeChild(g);
    }
    GROUND.addChild(g);
    return g;
  }

  let m=createGround;
  m(40,100,50,1,0x4f844e);
  m(100,200,90,1,0x4f844e);
  m(50,300,400,1,0x4f844e);
  m(80,400,80,1,0x4f844e);
  m(-200,440,2800,10,0x4f844e);

  // add margin
  GROUND_MIN_Y -= 200;
  GROUND_MAX_Y += 200;
}

let BADGUYS=[];
let createEnemy=(x,y)=>{
  let b = new PIXI.Graphics();
  STAGE.addChild(b);
  b.beginFill(0xA04A00);
  b.lineStyle(1, 0x00000, 1);
  b.drawRect(0, 0, 20, 20);
  b.endFill();
  if (y==undefined) y=GROUND_MIN_Y;
  b.startX=x;
  b.prevX=x;
  b.x=x;
  b.startY=y;
  b.prevY=y;
  b.y=y;
  b.hitbox = [0,0,0,0];
  b.ground=null;
  b.speed_x=.05;
  b.speed_y=0;
  b.fall_acceleration_y = .002;
  b.die=()=>{
    SFX.die(); 
    b.destroy();
  };
  b.destroy=()=>{
    STAGE.removeChild(b);
    let i = BADGUYS.indexOf(b);
    if (i!=-1) BADGUYS.splice(i, 1);
  };
  b.update=()=>{
    if (IS_PAUSED) return;

    // update position
    b.prevX = b.x;
    b.prevY = b.y;
    b.x += b.speed_x * ELAPSED_TIME;
    b.y += b.speed_y * ELAPSED_TIME;
    updateHitBox(b);
  
    // is the ground still valid
    if (b.ground && (b.x < b.ground.x || (b.x > b.ground.x + b.ground.width))) {
      b.ground=null;
    }
  
    // handle ground
    if (b.ground) {
      b.y = b.ground.y-b.height;
      b.speed_y=0;

      // if near edge, turn to other direction
      if (b.speed_x < 0 && b.x-b.ground.x < 1) {
        b.speed_x*=-1;
      } else if (b.speed_x > 0 && (b.ground.x+b.ground.width)-(b.x+b.width) < 1) {
        b.speed_x*=-1;
      }

    } else {
      // look for a ground
      for (let g of GROUND.children) {
        if ((b.x >= g.x && b.x <= (g.x + g.width)) && 
            (b.prevY+b.height <= g.y && b.y+b.height >= g.y)) {
          b.ground = g;
          break;
        }
      }
    }

    if (! b.ground) {
      // falling to death?
      if (b.y > GROUND_MAX_Y) {
        b.destroy();
        return;
      }
      b.speed_y += b.fall_acceleration_y * ELAPSED_TIME; 
    }

    // if hits player
    else {
      for (let p of PLAYERS.children) {
        if (! p.is_dead && hitTest(b, p)) {
          p.die(); 
        }
      }
    }
  };
  BADGUYS.push(b);
};
createEnemy(100);
createEnemy(200);
createEnemy(300);
createEnemy(400);
createEnemy(500);

let BULLETS=[];
let createBullet=(x,y,speed_x,speed_y,player)=>{
  let b = new PIXI.Graphics();
  STAGE.addChild(b);
  b.player=player;
  b.beginFill(player.playerColor);
  b.lineStyle(1, 0x00000, 1);
  b.drawRect(0, 0, 4, 4);
  b.endFill();
  b.startX=x;
  b.prevX=x;
  b.x=x;
  b.startY=y;
  b.prevY=y;
  b.y=y;
  b.hitbox = [0,0,0,0];
  b.speed_x=speed_x;
  b.speed_y=speed_y;
  b.ttl = T1 + 2000;
  b.destroy=()=>{
    STAGE.removeChild(b);
    let i = BULLETS.indexOf(b);
    if (i!=-1) BULLETS.splice(i, 1);
  };
  b.update=()=>{
    if (IS_PAUSED) return;
    if (T1 > b.ttl) {
      b.destroy();
      return;
    }
    b.prevX = b.x;
    b.prevY = b.y;
    b.x += b.speed_x * ELAPSED_TIME;
    b.y += b.speed_y * ELAPSED_TIME;
    updateHitBox(b);

    // if bullet badguy
    for (let p of BADGUYS) {
      if (hitTest(b, p)) p.die();
    }

    // if bullet hits player
    for (let p of PLAYERS.children) {
      if (! p.is_dead && p!=b.player && hitTest(b, p)) {
        p.die();
        b.player.score++;
        setTimeout(SFX.point, 650);
      }
      
    }
  };
};

let hitTest=(a,b)=>{
  return !(
    (a.hitbox[2] < b.hitbox[0]) ||
    (a.hitbox[0] > b.hitbox[2]) ||
    (a.hitbox[3] > b.hitbox[1]) ||
    (a.hitbox[1] < b.hitbox[3]) );
};


let updateHitBox=(o)=>{
  if (o.x < o.prevX) {
    o.hitbox[3]=o.x;
    o.hitbox[1]=o.prevX+o.width; 
  } else {
    o.hitbox[3]=o.prevX;
    o.hitbox[1]=o.x+o.width; 
  }
  if (o.y < o.prevY) {
    o.hitbox[0]=o.y;
    o.hitbox[2]=o.prevY+o.height; 
  } else {
    o.hitbox[0]=o.prevY;
    o.hitbox[2]=o.y+o.height; 
  }
};

let PLAYERS = new PIXI.Container();
PLAYERS.update=()=>{ updateChildren(PLAYERS); }
STAGE.addChild(PLAYERS);
let createPlayer=()=>{
  let p = new PIXI.Graphics();
  p.playerColor=getNextPlayerColor();
  p.beginFill(p.playerColor);
  p.lineStyle(1, 0x000000, 1);
  p.drawRect(0, 0, 4, 20);
  p.endFill();
  p.visible=false;
  p.ground = null;
  p.x = p.prevX = undefined;
  p.y = p.prevY = undefined;
  p.speed_x = 0;
  p.speed_y = 0;
  p.walk_acceleration = .0004;
  p.run_acceleration = .0008;
  p.stop_acceleration = .001;
  p.fall_acceleration_y = .002;
  p.fall_acceleration_x = .0004;
  p.walk_max_speed = .2;
  p.run_max_speed = .4;
  p.start_jump_speed = .5;
  p.continue_jump_speed = .001;
  p.continue_jump_ms = 900;
  p.fire_delay = 1000;
  p.next_fire_time = 0;
  p.jump_end = 0;
  p.facing = 1; // -1 facing left, 1 facing right
  p.hitbox = [0,0,0,0];
  p.is_dead=true;
  p.respawn_ms = 3000;
  p.can_respawn_ms = T1;
  p.score=0;
  p.bullet_speed=.8;

  p.spawn=()=>{
    SFX.spawn();

    let middleOfScreen = RENDERER.width/2 - STAGE.x;
    middleOfScreen += Math.random()*256-128; // add randomness between -128 and 128
    p.prevX= p.x = middleOfScreen;
    p.prevY = p.y = GROUND_MIN_Y;
    p.is_dead=false;
    p.visible=true;
    p.ground=null;
    p.jump_end = 0;
    p.speed_x = 0;
    p.speed_y = 0;
    updateHitBox(p);
  };

  p.die=()=>{
    p.is_dead=true;
    p.visible=false;
    p.can_respawn_ms = T1 + p.respawn_ms;
    SFX.die();
  };

  p.destroy=()=>{
    PLAYERS.removeChild(p);
  };

  p.keypress=(k)=>{ return (p.input & k) && !(p.prevInput & k); };
  p.input=0;
  p.prevInput=0;

  p.editingObject=null;

  p.update=()=>{

    // if player hit pause key
    if (p.keypress(BUT_START)) {
      togglePause();
    }

    if (IS_PAUSED) {

      // add a new platform?
      if (p.keypress(BUT_Y)) {
        // done editing?
        if (p.editingObject) {
          p.editingObject=null;
        }

        // create object
        else {
          p.editingObject = createGround(p.x, p.y + p.height);
        }
      }

      // cancel edit
      if (p.editingObject && p.keypress(BUT_B)) {
        p.editingObject.destroy();
        p.editingObject=null;
      }

      let speed_x=0, speed_y=0;
      if (p.input & BUT_RIGHT) speed_x =  p.input & BUT_X ? p.run_max_speed : p.walk_max_speed;
      if (p.input & BUT_LEFT)  speed_x = (p.input & BUT_X ? p.run_max_speed : p.walk_max_speed) * -1;
      if (p.input & BUT_DOWN)  speed_y =  p.input & BUT_X ? p.run_max_speed : p.walk_max_speed;
      if (p.input & BUT_UP)    speed_y = (p.input & BUT_X ? p.run_max_speed : p.walk_max_speed) * -1;

      p.x += speed_x * ELAPSED_TIME;
      p.y += speed_y * ELAPSED_TIME;

      // move / resize editing object
      if (p.editingObject) {
        let def = {};
        if (p.x < p.editingObject.x) {
          def.x = p.x;
        } else if (p.x - p.prevX > 0) {
          def.w = p.editingObject.width + (p.x-p.prevX);
        }
        if (p.y+p.height < p.editingObject.y) { 
          def.y = p.y + p.height;
        } else if (p.y - p.prevY > 0) {
          def.h = p.editingObject.height + (p.y-p.prevY);
        }
        p.editingObject.redefine(def);
      }

      p.prevX = p.x;
      p.prevY = p.y;
    }

    if (! IS_PAUSED) {
      // if player is dead, can they respawn?
      if (p.is_dead && T1 > p.can_respawn_ms && p.input) {
        p.spawn();
      }

      // if player is alive
      if (! p.is_dead) {

        // update direction player is facing
        if (p.input & BUT_LEFT) p.facing=-1;
        else if (p.input & BUT_RIGHT) p.facing=1;
  
        // handle player shoot gun
        if (p.input & BUT_R_TRIG && T1 >= p.next_fire_time) {
          p.next_fire_time = T1 + p.fire_delay;
          let speed_x = p.speed_x;
          let speed_y = p.speed_y;
  
          // if no directionals pressed, fire in the direction player is facing
          if (!(p.input & (BUT_DOWN|BUT_UP|BUT_LEFT|BUT_RIGHT))) {
            speed_x += p.bullet_speed * p.facing;
          }
  
          // else fire in the direction the player is pressing
          else {
            if (p.input & BUT_DOWN) speed_y += p.bullet_speed;
            else if (p.input & BUT_UP) speed_y -= p.bullet_speed;
            if (p.input & BUT_RIGHT) speed_x += p.bullet_speed;
            else if (p.input & BUT_LEFT) speed_x -= p.bullet_speed;
          }
          createBullet(p.x,p.y+10,speed_x,speed_y,p);
          SFX.fire();
        }
  
        // handle jump down from current platform
        if (p.ground && (p.input&BUT_DOWN) && (p.input&BUT_A) && !(p.prevInput&BUT_A)) {
          p.y += 5;
          p.ground=null;
        }
  
        // if standing on ground
        if (p.ground) {
  
          // handle walk/run x axis movement
          if (p.input & BUT_RIGHT && p.speed_x >= 0) {
            if (p.input & BUT_X) {
              p.speed_x += p.run_acceleration * ELAPSED_TIME;
              if (p.speed_x > p.run_max_speed) {
                p.speed_x=p.run_max_speed;
              }
            } else {
              p.speed_x += p.walk_acceleration * ELAPSED_TIME;
              if (p.speed_x > p.walk_max_speed) {
                p.speed_x=p.walk_max_speed;
              }
            }
          } else if (p.input & BUT_LEFT && p.speed_x <= 0) {
            if (p.input & BUT_X) {
              p.speed_x -= p.run_acceleration * ELAPSED_TIME;
              if (p.speed_x < (p.run_max_speed * -1)) {
                p.speed_x=p.run_max_speed * -1;
              }
            } else {
              p.speed_x -= p.walk_acceleration * ELAPSED_TIME;
              if (p.speed_x < (p.walk_max_speed * -1)) {
                p.speed_x=p.walk_max_speed * -1;
              }
            }
          } else if (p.speed_x > 0) {
            p.speed_x -= p.stop_acceleration * ELAPSED_TIME;
            if (p.speed_x < 0) p.speed_x=0;
          } else if (p.speed_x < 0) {
            p.speed_x += p.stop_acceleration * ELAPSED_TIME;
            if (p.speed_x > 0) p.speed_x=0;
          }
    
          // handle y movement (climbing)
          if (p.input & BUT_DOWN && p.speed_y >= 0) {
            p.speed_y += p.walk_acceleration * ELAPSED_TIME;
          } else if (p.input & BUT_UP && p.speed_y <= 0) {
            p.speed_y -= p.walk_acceleration * ELAPSED_TIME;
          } else if (p.speed_y > 0) {
            p.speed_y -= p.stop_acceleration * ELAPSED_TIME;
            if (p.speed_y < 0) p.speed_y=0;
          } else if (p.speed_y < 0) {
            p.speed_y += p.stop_acceleration * ELAPSED_TIME;
            if (p.speed_y > 0) p.speed_y=0;
          }
      
          // handle jump
          if (p.input & BUT_A && !(p.prevInput & BUT_A)) {
            SFX.jump();
            p.ground=null;
            p.jump_end = T1 + p.continue_jump_ms;
            p.speed_y = p.start_jump_speed * -1;
          }
        }
      
        // handle falling
        else {
          // apply gravity to downward speed
          p.speed_y += p.fall_acceleration_y * ELAPSED_TIME; 
      
          // allow player to "swim" a little bit in the air using x axis movement for fun physics
          if (p.input & BUT_RIGHT && p.speed_x >= 0) {
            p.speed_x += p.fall_acceleration_x * ELAPSED_TIME;
            if (p.speed_x > p.run_max_speed) {
              p.speed_x=p.run_max_speed;
            }
          } else if (p.input & BUT_LEFT && p.speed_x <= 0) {
            p.speed_x -= p.fall_acceleration_x * ELAPSED_TIME;
            if (p.speed_x < p.run_max_speed * -1) {
              p.speed_x=p.run_max_speed * -1;
            }
          }
      
          // if user is holding the jump button, continue jump upward speed if jump time hasn't ended
          if (p.input & BUT_A && T1 > 0 && T1 < p.jump_end) {
            p.speed_y -= (p.continue_jump_speed * ELAPSED_TIME);
          }
        }
    
        // at this point speed calculations are complete, update player position
        p.prevX = p.x;
        p.prevY = p.y;
        p.x += p.speed_x * ELAPSED_TIME;
        p.y += p.speed_y * ELAPSED_TIME;

        // now handle events that depend on player location
        // a hitbox is used to outline the player space between this update and last update
        updateHitBox(p);
  
        // is the ground still valid
        if (p.ground && (p.x < p.ground.x || (p.x > p.ground.x + p.ground.width))) {
          p.ground=null;
        }
    
        // handle ground
        if (p.ground) {
          p.y = p.ground.y-p.height;
          p.speed_y=0;
        } else {
          // look for a ground
          for (let g of GROUND.children) {
            if ((p.x >= g.x && p.x <= (g.x + g.width)) && 
                (p.prevY+p.height <= g.y && p.y+p.height >= g.y)) {
              p.ground = g;
              break;
            }
          }
        }
  
        // falling to death?
        if (p.y > GROUND_MAX_Y) {
          if (p.score > 0) p.score--;
          p.die(); 
        }
  
      }
    } // END ! IS_PAUSED

    // remember previous player input
    p.prevInput=p.input;
  }; // END p.update

  // add new player to PLAYERS array and return PLAYERS idx
  let i = PLAYERS.children.length;
  PLAYERS.addChild(p);
  return i;
} // END createPlayer


let SCOREBOARD = new PIXI.Container();
SCREEN.addChild(SCOREBOARD);
SCOREBOARD.position.set(0,0);
SCOREBOARD.update=()=>{
  if (IS_PAUSED) return;
  let i=0, width=200, x=RENDERER.width-width, c=SCOREBOARD.children;
  for (let i=0,l=PLAYERS.children.length;i<l;++i) {
    let s, p=PLAYERS.children[i];

    // if a scoreboard element does not exist for player idx, create one
    if (! c[i]) {
      s = new PIXI.Text(p.score, { fontFamily: "monospace", align: 'right', fontSize: 40, fill: p.playerColor, dropShadowDistance:1, dropShadow:true, dropShadowBlur: 2 });
      s.x = x - (i * width);
      SCOREBOARD.addChild(s);
    }

    // else update player score
    else {
      s=c[i];
      s.style.fill=p.playerColor;
      s.text=p.score;
    }
  }

  // remove any remaining scoreboard elements
  for (let i=c.length-1, l=PLAYERS.children.length; i>=l; --i) {
    SCOREBOARD.removeChild(c[i]);
  }
};



// game loop
let T0=0, T1=0, ELAPSED_TIME=0;
{ let t0=performance.now(), loop=(t1)=>{
    ELAPSED_TIME=t1-t0;
    if (! IS_PAUSED) {
      T0=T1;
      T1+=ELAPSED_TIME;
    }
    updateGamepads();
    SCREEN.update();
    RENDERER.render(SCREEN);
    requestAnimationFrame(loop);
    t0=t1;
  };
  loop(t0);
}
