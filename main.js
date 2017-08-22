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
  window.KEYBOARD_CONTROLLER = c;
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
}


let GROUND = [];
let makeGround=(x,y,w,h,color)=>{
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
makeGround(10,440,800,1,0x4f844e);
makeGround(100,200,90,1,0x4f844e);
makeGround(40,100,50,1,0x4f844e);


let PLAYER = new PIXI.Graphics();
STAGE.addChild(PLAYER);
PLAYER.beginFill(0x0e47a3);
PLAYER.lineStyle(1, 0x000000, 1);
PLAYER.drawRect(0, 0, 4, 20);
PLAYER.endFill();
PLAYER.ground = null;
PLAYER.x = PLAYER.prevX = 100;
PLAYER.y = PLAYER.prevY = 100;
PLAYER.speed_x = 0;
PLAYER.speed_y = 0;
PLAYER.acceleration_x = .0003;
PLAYER.stop_acceleration_x = .0008;
PLAYER.acceleration_y = .0004;
PLAYER.stop_acceleration_y = .0008;
PLAYER.fall_acceleration_y = .001;
PLAYER.fall_acceleration_x = .0003;
PLAYER.max_speed_x = 1;
PLAYER.max_speed_y = 1;
PLAYER.jump_speed = .2;
PLAYER.jump_end = 0;
PLAYER.controller = window.KEYBOARD_CONTROLLER;
PLAYER.update=()=>{
  if (PLAYER.ground) {
    // handle x movement (walking)
    if (PLAYER.controller.x==1 && PLAYER.speed_x >= 0) {
      PLAYER.speed_x += PLAYER.acceleration_x * ELAPSED_TIME;
    } else if (PLAYER.controller.x==-1 && PLAYER.speed_x <= 0) {
      PLAYER.speed_x -= PLAYER.acceleration_x * ELAPSED_TIME;
    } else if (PLAYER.speed_x > 0) {
      PLAYER.speed_x -= PLAYER.stop_acceleration_x * ELAPSED_TIME;
      if (PLAYER.speed_x < 0) PLAYER.speed_x=0;
    } else if (PLAYER.speed_x < 0) {
      PLAYER.speed_x += PLAYER.stop_acceleration_x * ELAPSED_TIME;
      if (PLAYER.speed_x > 0) PLAYER.speed_x=0;
    }

    // handle y movement (climbing)
    if (PLAYER.controller.y==1 && PLAYER.speed_y >= 0) {
      PLAYER.speed_y += PLAYER.acceleration_y * ELAPSED_TIME;
    } else if (PLAYER.controller.y==-1 && PLAYER.speed_y <= 0) {
      PLAYER.speed_y -= PLAYER.acceleration_y * ELAPSED_TIME;
    } else if (PLAYER.speed_y > 0) {
      PLAYER.speed_y -= PLAYER.stop_acceleration_y * ELAPSED_TIME;
      if (PLAYER.speed_y < 0) PLAYER.speed_y=0;
    } else if (PLAYER.speed_y < 0) {
      PLAYER.speed_y += PLAYER.stop_acceleration_y * ELAPSED_TIME;
      if (PLAYER.speed_y > 0) PLAYER.speed_y=0;
    }

    // handle jump
    if (PLAYER.controller.space) {
      PLAYER.ground=null;
      PLAYER.jump_end = T1 + 1000;
      PLAYER.speed_y = -.3;
    }
  }

  // handle falling
  else {
    PLAYER.speed_y += PLAYER.fall_acceleration_y * ELAPSED_TIME; 

    // handle x movement
    if (PLAYER.controller.x==1 && PLAYER.speed_x >= 0) {
      PLAYER.speed_x += PLAYER.fall_acceleration_x * ELAPSED_TIME;
    } else if (PLAYER.controller.x==-1 && PLAYER.speed_x <= 0) {
      PLAYER.speed_x -= PLAYER.fall_acceleration_x * ELAPSED_TIME;
    }

    if (PLAYER.controller.space) {
      if (T1 > 0 && T1 < PLAYER.jump_end) {
        PLAYER.speed_y -= .01;
      }
    }
  }

  // handle maximum veolcities
  if (PLAYER.speed_x > PLAYER.max_speed_x)
    PLAYER.speed_x=PLAYER.max_speed_x;
  else if (PLAYER.speed_x < -1*PLAYER.max_speed_x)
    PLAYER.speed_x=PLAYER.max_speed_x*-1;
  if (PLAYER.speed_y > PLAYER.max_speed_y)
    PLAYER.speed_y=PLAYER.max_speed_y;
  else if (PLAYER.speed_y < -1*PLAYER.max_speed_y)
    PLAYER.speed_y=PLAYER.max_speed_y*-1;
  
  // update position
  PLAYER.prevX = PLAYER.x;
  PLAYER.prevY = PLAYER.y;
  PLAYER.x += PLAYER.speed_x * ELAPSED_TIME;
  PLAYER.y += PLAYER.speed_y * ELAPSED_TIME;

  // is the ground still valid
  if (PLAYER.ground && (PLAYER.x < PLAYER.ground.x || (PLAYER.x > PLAYER.ground.x + PLAYER.ground.width))) {
    PLAYER.ground=null;
  }

  // handle ground
  if (PLAYER.ground) {
    PLAYER.y = PLAYER.ground.y-PLAYER.height;
    PLAYER.speed_y=0;
  } else {

    // look for a ground
    for (let g of GROUND) {
      if ((PLAYER.x >= g.x && PLAYER.x <= (g.x + g.width)) && 
          (PLAYER.prevY+PLAYER.height <= g.y && PLAYER.y+PLAYER.height >= g.y)) {
        PLAYER.ground = g;
        break;
      }
    }
  }
};



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
