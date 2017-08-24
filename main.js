"use strict";

let RENDERER = PIXI.autoDetectRenderer(640,480);
RENDERER.backgroundColor = 0x7cd3ff;
document.body.appendChild(RENDERER.view);

// pause button
let IS_PAUSED=false;
document.getElementById('PauseBut').onclick=()=>{
  if (IS_PAUSED) {
    T0=performance.now();
    requestAnimationFrame(GAME_LOOP);
  }
  IS_PAUSED=!IS_PAUSED;
}


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
      let c = PLAYERS[gamePadPlayerIdxMap[i]].controller;
      let b=gps[i].buttons;
      c.up     =b[12].pressed;
      c.down   =b[13].pressed;
      c.left   =b[14].pressed;
      c.right  =b[15].pressed;
      c.run    =b[ 2].pressed;
      c.jump   =b[ 0].pressed;
      c.fire   =b[ 7].pressed;
      c.sheild =b[ 6].pressed;
      c.missile=b[ 5].pressed;
      c.bomb   =b[ 4].pressed;
      c.down   =b[13].pressed;
      c.start  =b[ 9].pressed;
      c.select =b[ 8].pressed;
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
  if (keyboardPlayerIdx===null && e.keyCode >=37 && e.keyCode <= 40) {
    keyboardPlayerIdx=createPlayer();
    console.log('created new player for keyboard');
  }
  if (keyboardPlayerIdx===null) return;
  let c = PLAYERS[keyboardPlayerIdx].controller;
  switch(e.keyCode) {
    case 16: c.run  =true; break; // shift
    case 32: c.jump =true; break; // spacebar
    case 37: c.left =true; break; // left
    case 38: c.up   =true; break; // up
    case 39: c.right=true; break; // right
    case 40: c.down =true; break; // down
  }
});
window.addEventListener("keyup", (e)=>{
  if (keyboardPlayerIdx===null) return;
  let c = PLAYERS[keyboardPlayerIdx].controller;
  switch(e.keyCode) {
    case 16: c.run  =false; break; // shift
    case 32: c.jump =false; break; // spacebar
    case 37: c.left =false; break; // left
    case 38: c.up   =false; break; // up
    case 39: c.right=false; break; // right
    case 40: c.down =false; break; // down
  }
});



let SCREEN = new PIXI.Container();
SCREEN.update=()=>{
  for (let e of SCREEN.children) e.update();
}

let STAGE = new PIXI.Container();
STAGE.x=0;
STAGE.y=0;
STAGE.scroll_acceleration = .001;
STAGE.scroll_speed_x = 0;
STAGE.scroll_speed_y = 0;
SCREEN.addChild(STAGE);
STAGE.update=()=>{
  for (let e of STAGE.children) e.update();

  // move the stage so the player is near the center of the screen
  let p = PLAYERS[0];
  if (p) {
    STAGE.x -= ((STAGE.x - ((p.x - (RENDERER.width/2)) * -1)) / (RENDERER.width/2)) * ELAPSED_TIME;
    STAGE.y -= ((STAGE.y - ((p.y - (RENDERER.height/2)) * -1)) / (RENDERER.height/2)) * ELAPSED_TIME;
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
    g.update=()=>{};
    STAGE.addChild(g);
    GROUND.push(g);
  }
  m(40,100,50,1,0x4f844e);
  m(100,200,90,1,0x4f844e);
  m(50,300,400,1,0x4f844e);
  m(80,400,80,1,0x4f844e);
  m(10,440,2800,1,0x4f844e);
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
  p.controller={up:false,down:false,left:false,right:false,run:false,jump:false,fire:false,sheild:false,missile:false,bomb:false,start:false,select:false};
  p.update=()=>{
    if (p.ground) {

      // handle walk/run x axis movement
      if (p.controller.right && p.speed_x >= 0) {
        if (p.controller.run) {
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
      } else if (p.controller.left && p.speed_x <= 0) {
        if (p.controller.run) {
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
      if (p.controller.down && p.speed_y >= 0) {
        p.speed_y += p.walk_acceleration_y * ELAPSED_TIME;
      } else if (p.controller.up && p.speed_y <= 0) {
        p.speed_y -= p.walk_acceleration_y * ELAPSED_TIME;
      } else if (p.speed_y > 0) {
        p.speed_y -= p.stop_acceleration_y * ELAPSED_TIME;
        if (p.speed_y < 0) p.speed_y=0;
      } else if (p.speed_y < 0) {
        p.speed_y += p.stop_acceleration_y * ELAPSED_TIME;
        if (p.speed_y > 0) p.speed_y=0;
      }
  
      // handle jump
      if (p.controller.jump) {
        p.ground=null;
        p.jump_end = T1 + p.continue_jump_ms;
        p.speed_y = p.start_jump_speed * -1;
      }
    }
  
    // handle falling
    else {
      p.speed_y += p.fall_acceleration_y * ELAPSED_TIME; 
  
      // handle x movement
      if (p.controller.right && p.speed_x >= 0) {
        p.speed_x += p.fall_acceleration_x * ELAPSED_TIME;
        if (p.speed_x > p.run_max_speed_x) {
          p.speed_x=p.run_max_speed_x;
        }
      } else if (p.controller.left && p.speed_x <= 0) {
        p.speed_x -= p.fall_acceleration_x * ELAPSED_TIME;
        if (p.speed_x < p.run_max_speed_x * -1) {
          p.speed_x=p.run_max_speed_x * -1;
        }
      }
  
      if (p.controller.jump) {
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
  if (! IS_PAUSED) requestAnimationFrame(GAME_LOOP);
};
GAME_LOOP(T0);
