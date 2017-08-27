"use strict";

let RENDERER = PIXI.autoDetectRenderer(window.innerWidth,window.innerHeight);
RENDERER.backgroundColor = 0x7cd3ff;
document.body.appendChild(RENDERER.view);

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

  let p = PLAYERS[keyboardPlayerIdx];
  p.input |=  
    (k==38 && BUT_UP)      ||
    (k==40 && BUT_DOWN)    ||
    (k==37 && BUT_LEFT)    ||
    (k==39 && BUT_RIGHT)   ||
    (k==16 && BUT_RUN)     ||
    (k==32 && BUT_JUMP)    ||
    (k== 0 && BUT_FIRE)    ||
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
  p.input &= ~( 
    (k==38 && BUT_UP)      ||
    (k==40 && BUT_DOWN)    ||
    (k==37 && BUT_LEFT)    ||
    (k==39 && BUT_RIGHT)   ||
    (k==16 && BUT_RUN)     ||
    (k==32 && BUT_JUMP)    ||
    (k== 0 && BUT_FIRE)    ||
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
STAGE.scroll_acceleration = .001;
STAGE.scroll_speed_x = 0;
STAGE.scroll_speed_y = 0;
SCREEN.addChild(STAGE);
STAGE.update=()=>{
  updateChildren(STAGE);

  var totalPlayers = 0;
  let x=0,y=0;
  for (let p of PLAYERS) {
    if (p) {
      totalPlayers++; 
      x+=p.x;
      y+=p.y;
    }
  }
  if (totalPlayers > 0) {
    x /= totalPlayers;
    y /= totalPlayers;
    STAGE.x -= ((STAGE.x - ((x - (RENDERER.width/2)) * -1)) / (RENDERER.width/2)) * ELAPSED_TIME;
    STAGE.y -= ((STAGE.y - ((y - (RENDERER.height/2)) * -1)) / (RENDERER.height/2)) * ELAPSED_TIME;
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

let PLAYERS=[];
let createPlayer=()=>{
  let p = new PIXI.Graphics();
  STAGE.addChild(p);
  p.beginFill(0x0e47a3);
  p.lineStyle(1, 0x000000, 1);
  p.drawRect(0, 0, 4, 20);
  p.endFill();
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
  p.jump_end = 0;
  p.destroy=()=>{
    STAGE.removeChild(p);
    var i = PLAYERS.indexOf(p);
    if (i!=-1) PLAYERS.splice(i, 1);
  };

  p.input=0;
  p.prevInput=0;
  p.update=()=>{

    // if player hit pause key
    if (p.input & BUT_START && !(p.prevInput & BUT_START)) {
      togglePause();
    }

    if (! IS_PAUSED) {
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
    } 
    p.prevInput=p.input;
  }

  let i = PLAYERS.length;
  PLAYERS[i]=p;
  return i;
}


let MSG = new PIXI.Text("", {
  fontFamily: "monospace",
  fontSize: 14,
  fill: "white"
});
SCREEN.addChild(MSG);
MSG.position.set(0, 0);
MSG.update=()=>{
  let p = PLAYERS[0];
  if (p) {
    MSG.text =
      " x:"  + p.x.toFixed(1)
    + " y:"  + p.y.toFixed(1)
    + " vx:" + p.speed_x.toFixed(1)
    + " vy:" + p.speed_y.toFixed(1)
    + " stageX: " + STAGE.x.toFixed(1);
  } else {
    MSG.text='';
  }
}



// game loop
let T0=performance.now();
let T1=0;
let ELAPSED_TIME=0;
let GAME_LOOP=(t1)=>{
  T1=t1;
  ELAPSED_TIME=T1-T0;
  updateGamepads();
  SCREEN.update();
  RENDERER.render(SCREEN);
  T0=T1;
  requestAnimationFrame(GAME_LOOP);
};
GAME_LOOP(T0);
