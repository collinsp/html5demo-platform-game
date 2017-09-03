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
let
  BUT_UP     =1<<0,
  BUT_DOWN   =1<<1,
  BUT_LEFT   =1<<2,
  BUT_RIGHT  =1<<3,
  BUT_RUN    =1<<4,
  BUT_JUMP   =1<<5,
  BUT_FIRE   =1<<6,
  BUT_SHEILD =1<<7,
  BUT_MISSILE=1<<8,
  BUT_BOMB   =1<<9,
  BUT_START  =1<<10,
  BUT_SELECT =1<<11;


// gamepad and keyboard controllers
let gamePadPlayerIdxMap=[];
let updateGamepads=()=>{
  let gps = navigator.getGamepads();
  for (let i=0,l=gps.length; i<l; ++i) {
    // if gampepad is active
    if (gps[i]) {
      if (gamePadPlayerIdxMap[i]==undefined) {
        gamePadPlayerIdxMap[i]=createPlayer();
      }
      let p = PLAYERS[gamePadPlayerIdxMap[i]];
      let b = gps[i].buttons;
      p.input =  
        (b[12].pressed && BUT_UP) |
        (b[13].pressed && BUT_DOWN) |
        (b[14].pressed && BUT_LEFT) |
        (b[15].pressed && BUT_RIGHT) |
        (b[ 2].pressed && BUT_RUN) |
        (b[ 0].pressed && BUT_JUMP) |
        (b[ 7].pressed && BUT_FIRE) |
        (b[ 6].pressed && BUT_SHEILD) |
        (b[ 5].pressed && BUT_MISSILE) |
        (b[ 4].pressed && BUT_BOMB) |
        (b[13].pressed && BUT_DOWN) |
        (b[ 9].pressed && BUT_START) |
        (b[ 8].pressed && BUT_SELECT);
    }

    // else inactive
    else if (gamePadPlayerIdxMap[i]) {
      let p = PLAYERS[gamePadPlayerIdxMap[i]];
      p.destroy();
      gamePadPlayerIdxMap[i]=undefined;
    }
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
  let p = PLAYERS[keyboardPlayerIdx];
  p.input |=  
    (k==38 && BUT_UP)      ||
    (k==40 && BUT_DOWN)    ||
    (k==37 && BUT_LEFT)    ||
    (k==39 && BUT_RIGHT)   ||
    (k==16 && BUT_RUN)     ||
    (k==32 && BUT_JUMP)    ||
    (k==17 && BUT_FIRE)    ||
    (k== 0 && BUT_SHEILD)  ||
    (k== 0 && BUT_MISSILE) ||
    (k== 0 && BUT_BOMB)    ||
    (k== 0 && BUT_DOWN)    ||
    (k== 0 && BUT_START)   ||
    (k== 0 && BUT_SELECT);
});

window.addEventListener("keyup", (e)=>{
  if (keyboardPlayerIdx===null) return;
  let k = e.keyCode;
  let p = PLAYERS[keyboardPlayerIdx];

  // update the player input mask
  p.input &= ~( 
    (k==38 && BUT_UP)      ||
    (k==40 && BUT_DOWN)    ||
    (k==37 && BUT_LEFT)    ||
    (k==39 && BUT_RIGHT)   ||
    (k==16 && BUT_RUN)     ||
    (k==32 && BUT_JUMP)    ||
    (k==17 && BUT_FIRE)    ||
    (k== 0 && BUT_SHEILD)  ||
    (k== 0 && BUT_MISSILE) ||
    (k== 0 && BUT_BOMB)    ||
    (k== 0 && BUT_DOWN)    ||
    (k== 0 && BUT_START)   ||
    (k== 0 && BUT_SELECT) );
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
  if (IS_PAUSED) return;

  let totalPlayers = 0;

  // find target x,y coords
  let x=0,y=0;
  for (let p of PLAYERS) {
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
let GROUND = [];
{ let m=(x,y,w,h,color)=>{
    let g = new PIXI.Graphics();
    if (! x) x=0;
    if (! y) y=0;
    if (! w) w=200;
    if (! h) w=20;
    g.beginFill(color);
    g.drawRect(0, 0, w, h);
    g.endFill();
    g.x=x;
    g.y=y;
    g.climbable = false;
    STAGE.addChild(g);
    GROUND.push(g);
  }
  m(40,100,50,1,0x4f844e);
  m(100,200,90,1,0x4f844e);
  m(50,300,400,1,0x4f844e);
  m(80,400,80,1,0x4f844e);
  m(-200,440,2800,10,0x4f844e);
}

let BADGUYS=[];
let createEnemy=(x,y)=>{
  let b = new PIXI.Graphics();
  STAGE.addChild(b);
  b.beginFill(0xA04A00);
  b.lineStyle(1, 0x00000, 1);
  b.drawRect(0, 0, 20, 20);
  b.endFill();
  if (y==undefined) y=100;
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
      for (let g of GROUND) {
        if ((b.x >= g.x && b.x <= (g.x + g.width)) && 
            (b.prevY+b.height <= g.y && b.y+b.height >= g.y)) {
          b.ground = g;
          break;
        }
      }
    }

    if (! b.ground) {
      // falling to death?
      if (b.y > 2000) {
        b.destroy();
        return;
      }
      b.speed_y += b.fall_acceleration_y * ELAPSED_TIME; 
    }

    // if hits player
    else {
      for (let p of PLAYERS) {
        if (hitTest(b, p)) {
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
    for (let p of PLAYERS) {
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

let PLAYERS=[];
let createPlayer=()=>{
  let p = new PIXI.Graphics();
  STAGE.addChild(p);
  p.playerColor=getNextPlayerColor();
  p.beginFill(p.playerColor);
  p.lineStyle(1, 0x000000, 1);
  p.drawRect(0, 0, 4, 20);
  p.endFill();
  p.visible=false;
  p.ground = null;
  p.x = p.prevX = 100;
  p.y = p.prevY = 100;
  p.speed_x = 0;
  p.speed_y = 0;
  p.walk_acceleration_x = .0004;
  p.walk_acceleration_y = .0004;
  p.run_acceleration_x = .0008;
  p.run_acceleration_y = .0008;
  p.stop_acceleration_x = .001;
  p.stop_acceleration_y = .0008;
  p.fall_acceleration_y = .002;
  p.fall_acceleration_x = .0004;
  p.walk_max_speed_x = .2;
  p.walk_max_speed_y = .2;
  p.run_max_speed_x = .4;
  p.run_max_speed_y = .4;
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
    p.prevY = p.y = -1*STAGE.y;
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
    STAGE.removeChild(p);
    let i = PLAYERS.indexOf(p);
    if (i!=-1) PLAYERS.splice(i, 1);
  };

  p.input=0;
  p.prevInput=0;
  p.update=()=>{

    // if player hit pause key
    if (p.input & BUT_START && !(p.prevInput & BUT_START)) {
      togglePause();
    }

    // if player is dead, can they respawn
    if (p.is_dead && T1 > p.can_respawn_ms && p.input) p.spawn();

    if (! IS_PAUSED && ! p.is_dead) {

      if (p.input & BUT_LEFT) p.facing=-1;
      else if (p.input & BUT_RIGHT) p.facing=1;

      if (p.input & BUT_FIRE && T1 >= p.next_fire_time) {
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

      if (p.ground) {
  
        // handle walk/run x axis movement
        if (p.input & BUT_RIGHT && p.speed_x >= 0) {
          if (p.input & BUT_RUN) {
            p.speed_x += p.run_acceleration_x * ELAPSED_TIME;
            if (p.speed_x > p.run_max_speed_x) {
              p.speed_x=p.run_max_speed_x;
            }
          } else {
            p.speed_x += p.walk_acceleration_x * ELAPSED_TIME;
            if (p.speed_x > p.walk_max_speed_x) {
              p.speed_x=p.walk_max_speed_x;
            }
          }
        } else if (p.input & BUT_LEFT && p.speed_x <= 0) {
          if (p.input & BUT_RUN) {
            p.speed_x -= p.run_acceleration_x * ELAPSED_TIME;
            if (p.speed_x < (p.run_max_speed_x * -1)) {
              p.speed_x=p.run_max_speed_x * -1;
            }
          } else {
            p.speed_x -= p.walk_acceleration_x * ELAPSED_TIME;
            if (p.speed_x < (p.walk_max_speed_x * -1)) {
              p.speed_x=p.walk_max_speed_x * -1;
            }
          }
        } else if (p.speed_x > 0) {
          p.speed_x -= p.stop_acceleration_x * ELAPSED_TIME;
          if (p.speed_x < 0) p.speed_x=0;
        } else if (p.speed_x < 0) {
          p.speed_x += p.stop_acceleration_x * ELAPSED_TIME;
          if (p.speed_x > 0) p.speed_x=0;
        }
  
        // handle y movement (climbing)
        if (p.input & BUT_DOWN && p.speed_y >= 0) {
          p.speed_y += p.walk_acceleration_y * ELAPSED_TIME;
        } else if (p.input & BUT_UP && p.speed_y <= 0) {
          p.speed_y -= p.walk_acceleration_y * ELAPSED_TIME;
        } else if (p.speed_y > 0) {
          p.speed_y -= p.stop_acceleration_y * ELAPSED_TIME;
          if (p.speed_y < 0) p.speed_y=0;
        } else if (p.speed_y < 0) {
          p.speed_y += p.stop_acceleration_y * ELAPSED_TIME;
          if (p.speed_y > 0) p.speed_y=0;
        }
    
        // handle jump
        if (p.input & BUT_JUMP && !(p.prevInput & BUT_JUMP)) {
          SFX.jump();
          p.ground=null;
          p.jump_end = T1 + p.continue_jump_ms;
          p.speed_y = p.start_jump_speed * -1;
        }
      }
    
      // handle falling
      else {
        p.speed_y += p.fall_acceleration_y * ELAPSED_TIME; 
    
        // handle x movement
        if (p.input & BUT_RIGHT && p.speed_x >= 0) {
          p.speed_x += p.fall_acceleration_x * ELAPSED_TIME;
          if (p.speed_x > p.run_max_speed_x) {
            p.speed_x=p.run_max_speed_x;
          }
        } else if (p.input & BUT_LEFT && p.speed_x <= 0) {
          p.speed_x -= p.fall_acceleration_x * ELAPSED_TIME;
          if (p.speed_x < p.run_max_speed_x * -1) {
            p.speed_x=p.run_max_speed_x * -1;
          }
        }
    
        if (p.input & BUT_JUMP) {
          if (T1 > 0 && T1 < p.jump_end) {
            p.speed_y -= (p.continue_jump_speed * ELAPSED_TIME);
          }
        }
      }
  
      // update position
      p.prevX = p.x;
      p.prevY = p.y;
      p.x += p.speed_x * ELAPSED_TIME;
      p.y += p.speed_y * ELAPSED_TIME;
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
        for (let g of GROUND) {
          if ((p.x >= g.x && p.x <= (g.x + g.width)) && 
              (p.prevY+p.height <= g.y && p.y+p.height >= g.y)) {
            p.ground = g;
            break;
          }
        }
      }

      // falling to death?
      if (p.y > 2000) {
        p.y = -100;
        p.x = 100;
        p.die(); 
      }

    } 
    p.prevInput=p.input;
  }

  let i = PLAYERS.length;
  PLAYERS[i]=p;
  return i;
}


let SCOREBOARD = new PIXI.Container();
SCREEN.addChild(SCOREBOARD);
SCOREBOARD.position.set(0,0);
SCOREBOARD.update=()=>{
  if (IS_PAUSED) return;
  let i=0, width=200, x=RENDERER.width-width, c=SCOREBOARD.children;
  for (let i=0,l=PLAYERS.length;i<l;++i) {
    let s, p=PLAYERS[i];

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
  for (let i=c.length-1, l=PLAYERS.length; i>=l; --i) {
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
