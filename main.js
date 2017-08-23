'use strict';

let RENDERER = PIXI.autoDetectRenderer(640,480);
RENDERER.backgroundColor = 0x7cd3ff;
document.body.appendChild(RENDERER.view);

let IS_PAUSED=false;
document.getElementById('PauseBut').onclick=()=>{
  if (IS_PAUSED) {
    T0=performance.now();
    requestAnimationFrame(GAME_LOOP);
  }
  IS_PAUSED=!IS_PAUSED;
}


// keyboard controller
let KEYBOARD_CONTROLLER;
{ let c={ x:0, y:0, space:0 };
  window.addEventListener("keydown", (e)=>{
    switch(e.keyCode) {
      case 32: c.space=1; break; // spacebar
      case 37: c.x=-1; break; // left
      case 38: c.y=-1; break; // up
      case 39: c.x= 1; break; // right
      case 40: c.y= 1; break; // down
    }
  });
  window.addEventListener("keyup", (e)=>{
    switch(e.keyCode) {
      case 32: c.space=0; break; // spacebar
      case 37: c.x=0; break; // left
      case 38: c.y=0; break; // up
      case 39: c.x=0; break; // right
      case 40: c.y=0; break; // down
    }
  });
  KEYBOARD_CONTROLLER=c;
}


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
  STAGE.x -= ((STAGE.x - ((PLAYER.x - (RENDERER.width/2)) * -1)) / (RENDERER.width/2)) * ELAPSED_TIME;
  STAGE.y -= ((STAGE.y - ((PLAYER.y - (RENDERER.height/2)) * -1)) / (RENDERER.height/2)) * ELAPSED_TIME;
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
  m(10,440,800,1,0x4f844e);
}

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
  p.acceleration_x = .0008;
  p.acceleration_y = .0008;
  p.stop_acceleration_x = .001;
  p.stop_acceleration_y = .0008;
  p.fall_acceleration_y = .002;
  p.fall_acceleration_x = .0006;
  p.max_speed_x = 1;
  p.max_speed_y = 1;
  p.start_jump_speed = .5;
  p.continue_jump_speed = .001;
  p.continue_jump_ms = 900;
  p.jump_end = 0;
  p.controller = null;
  p.update=()=>{
    if (p.ground) {
      // handle x movement (walking)
      if (p.controller.x==1 && p.speed_x >= 0) {
        p.speed_x += p.acceleration_x * ELAPSED_TIME;
      } else if (p.controller.x==-1 && p.speed_x <= 0) {
        p.speed_x -= p.acceleration_x * ELAPSED_TIME;
      } else if (p.speed_x > 0) {
        p.speed_x -= p.stop_acceleration_x * ELAPSED_TIME;
        if (p.speed_x < 0) p.speed_x=0;
      } else if (p.speed_x < 0) {
        p.speed_x += p.stop_acceleration_x * ELAPSED_TIME;
        if (p.speed_x > 0) p.speed_x=0;
      }
  
      // handle y movement (climbing)
      if (p.controller.y==1 && p.speed_y >= 0) {
        p.speed_y += p.acceleration_y * ELAPSED_TIME;
      } else if (p.controller.y==-1 && p.speed_y <= 0) {
        p.speed_y -= p.acceleration_y * ELAPSED_TIME;
      } else if (p.speed_y > 0) {
        p.speed_y -= p.stop_acceleration_y * ELAPSED_TIME;
        if (p.speed_y < 0) p.speed_y=0;
      } else if (p.speed_y < 0) {
        p.speed_y += p.stop_acceleration_y * ELAPSED_TIME;
        if (p.speed_y > 0) p.speed_y=0;
      }
  
      // handle jump
      if (p.controller.space) {
        p.ground=null;
        p.jump_end = T1 + p.continue_jump_ms;
        p.speed_y = p.start_jump_speed * -1;
      }
    }
  
    // handle falling
    else {
      p.speed_y += p.fall_acceleration_y * ELAPSED_TIME; 
  
      // handle x movement
      if (p.controller.x==1 && p.speed_x >= 0) {
        p.speed_x += p.fall_acceleration_x * ELAPSED_TIME;
      } else if (p.controller.x==-1 && p.speed_x <= 0) {
        p.speed_x -= p.fall_acceleration_x * ELAPSED_TIME;
      }
  
      if (p.controller.space) {
        if (T1 > 0 && T1 < p.jump_end) {
          p.speed_y -= (p.continue_jump_speed * ELAPSED_TIME);
        }
      }
    }
  
    // handle maximum veolcities
    if (p.speed_x > p.max_speed_x)
      p.speed_x=p.max_speed_x;
    else if (p.speed_x < -1*p.max_speed_x)
      p.speed_x=p.max_speed_x*-1;
    if (p.speed_y > p.max_speed_y)
      p.speed_y=p.max_speed_y;
    else if (p.speed_y < -1*p.max_speed_y)
      p.speed_y=p.max_speed_y*-1;
    
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
  return p;
}
let PLAYER=createPlayer();
PLAYER.controller=KEYBOARD_CONTROLLER;
  


let MSG = new PIXI.Text("", {
  fontFamily: "monospace",
  fontSize: 14,
  fill: "white"
});
SCREEN.addChild(MSG);
MSG.position.set(0, 0);
MSG.update=()=>{
  MSG.text =
      " x:"  + PLAYER.x.toFixed(1)
    + " y:"  + PLAYER.y.toFixed(1)
    + " vx:" + PLAYER.speed_x.toFixed(1)
    + " vy:" + PLAYER.speed_y.toFixed(1)
    + " stageX: " + STAGE.x.toFixed(1);
}



// game loop
let T0=performance.now();
let T1=0;
let ELAPSED_TIME=0;
let GAME_LOOP=(t1)=>{
  T1=t1;
  ELAPSED_TIME=T1-T0;
  SCREEN.update();
  RENDERER.render(SCREEN);
  T0=T1;
  if (! IS_PAUSED) requestAnimationFrame(GAME_LOOP);
};
GAME_LOOP(T0);
