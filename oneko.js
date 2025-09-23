(function(){
  if(window.__onekoActive){
    window.__onekoActive=false;
    cancelAnimationFrame(window.__onekoFrameId);
    try{window.__onekoEl.remove()}catch(e){}
    try{window.__onekoMenu.remove()}catch(e){}
    window.__onekoEl = null;
    window.__onekoMenu = null;
    window.__onekoHandlers && window.__onekoHandlers.forEach(h=>window.removeEventListener(h.ev,h.fn));
    return;
  }

  window.__onekoActive = true;

  const BASE = "https://raw.githubusercontent.com/sineatah3/oneko.js-bookmarkletnew/main/assets/oneko/oneko-";
  const VARIANTS = ["classic","vaporwave","maia"];
  const MODES = ["follow","drift","orbit","physics","dvd"];
  const SIZE = 32, RADIUS_ORBIT = 80, IDLE_MS = 1400, GRAVITY = 0.6;
  const FLOOR_BOUNCE=-0.45, WALL_BOUNCE=-0.6, TOP_BOUNCE=-0.6;

  // sprite sets
  const spriteSets = {
    idle:[[-3,-3]], alert:[[-7,-3]], N:[[-1,-2],[-1,-3]], S:[[-6,-3],[-7,-2]],
    E:[[-3,0],[-3,-1]], W:[[-4,-2],[-4,-3]], NE:[[0,-2],[0,-3]], NW:[[-1,0],[-1,-1]],
    SE:[[-5,-1],[-5,-2]], SW:[[-5,-3],[-6,-1]]
  };

  let centerX = window.innerWidth/2,
      centerY = window.innerHeight/2,
      mouseX = centerX, mouseY = centerY,
      vx = 0, vy = 0,
      dragging = false,
      lastMoveAt = Date.now(),
      animTick = 0, animFrame = 0,
      direction = "S",
      mode = "follow",
      variant = "classic",
      physicsSticky = false;

  let handlers = [];
  window.__onekoHandlers = handlers;

  // create borders
  const ceiling = document.createElement("div");
  ceiling.style.position = "fixed";
  ceiling.style.top = "0"; ceiling.style.left = "0"; ceiling.style.width = "100%";
  ceiling.style.height = "16px"; ceiling.style.background="rgba(255,0,0,0.25)";
  ceiling.style.zIndex = 2147483646;
  document.body.appendChild(ceiling);

  const leftWall = document.createElement("div");
  leftWall.style.position = "fixed";
  leftWall.style.left = "0"; leftWall.style.top="0"; leftWall.style.height="100%";
  leftWall.style.width="16px"; leftWall.style.background="rgba(0,255,0,0.25)";
  leftWall.style.zIndex=2147483646;
  document.body.appendChild(leftWall);

  const rightWall = document.createElement("div");
  rightWall.style.position = "fixed";
  rightWall.style.right="0"; rightWall.style.top="0"; rightWall.style.height="100%";
  rightWall.style.width="16px"; rightWall.style.background="rgba(0,0,255,0.25)";
  rightWall.style.zIndex=2147483646;
  document.body.appendChild(rightWall);

  // create cat element
  const neko = document.createElement("div");
  neko.id="__oneko_el";
  neko.style.width = SIZE+"px";
  neko.style.height = SIZE+"px";
  neko.style.position="fixed";
  neko.style.left = (centerX-SIZE/2)+"px";
  neko.style.top = (centerY-SIZE/2)+"px";
  neko.style.zIndex = 2147483647;
  neko.style.imageRendering = "pixelated";
  neko.style.cursor="grab";
  neko.style.pointerEvents="auto";
  neko.style.backgroundImage = `url('${BASE+variant}.gif')`;
  neko.style.backgroundRepeat="no-repeat";
  document.body.appendChild(neko);
  window.__onekoEl = neko;

  // create menu
  const menu = document.createElement("div");
  menu.id="__oneko_menu";
  menu.style.position="fixed";
  menu.style.top="8px"; menu.style.right="8px";
  menu.style.background="rgba(20,20,20,0.95)";
  menu.style.color="#fff"; menu.style.padding="8px";
  menu.style.borderRadius="8px"; menu.style.fontFamily="sans-serif";
  menu.style.zIndex=2147483647;
  menu.style.display="flex"; menu.style.flexDirection="column"; menu.style.gap="6px";
  menu.style.minWidth="160px";

  // mode buttons
  const modeRow = document.createElement("div");
  modeRow.style.display="flex"; modeRow.style.flexWrap="wrap"; modeRow.style.gap="4px";
  MODES.forEach(m=>{
    const b=document.createElement("button");
    b.textContent=m;
    b.style.padding="4px 6px";
    b.style.cursor="pointer";
    b.style.border="none";
    b.style.borderRadius="4px";
    b.style.background = (m===mode)?"#444":"#333";
    b.style.color="#fff";
    b.onclick = ()=>{ mode=m; vx=vy=0; };
    modeRow.appendChild(b);
  });
  menu.appendChild(modeRow);

  // variant buttons
  const varRow = document.createElement("div");
  varRow.style.display="flex"; varRow.style.flexWrap="wrap"; varRow.style.gap="6px";
  VARIANTS.forEach(v=>{
    const d=document.createElement("div");
    d.title=v;
    d.style.width="40px"; d.style.height="40px"; d.style.borderRadius="6px"; d.style.cursor="pointer";
    d.style.backgroundImage = `url('${BASE+v}.gif')`;
    d.style.backgroundSize="cover";
    d.onclick = ()=>{ variant=v; neko.style.backgroundImage=`url('${BASE+variant}.gif')`; };
    varRow.appendChild(d);
  });
  menu.appendChild(varRow);

  // append menu
  document.body.appendChild(menu);
  window.__onekoMenu = menu;

  // animation and movement loop
  function tick(){
    if(!dragging){
      if(mode==="follow"){ centerX+=(mouseX-centerX)*0.14; centerY+=(mouseY-centerY)*0.14; }
      else if(mode==="drift"){ vx+=(mouseX-centerX)*0.01; vy+=(mouseY-centerY)*0.01; vx*=0.92; vy*=0.92; centerX+=vx; centerY+=vy; }
      else if(mode==="orbit"){ const t=Date.now()/1000; centerX = mouseX + Math.cos(t*0.3)*RADIUS_ORBIT; centerY = mouseY + Math.sin(t*0.3)*RADIUS_ORBIT; }
      else if(mode==="physics"){ vy += GRAVITY; centerX+=vx; centerY+=vy; if(centerY>window.innerHeight-SIZE/2){centerY=window.innerHeight-SIZE/2; vy*=FLOOR_BOUNCE; } }
    }

    neko.style.left = centerX-SIZE/2+"px";
    neko.style.top = centerY-SIZE/2+"px";

    animTick++; animFrame++;
    requestAnimationFrame(tick);
  }
  tick();

})();
