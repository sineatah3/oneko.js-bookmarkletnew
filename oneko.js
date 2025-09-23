// oneko.js
(function(){
  if(window.__onekoActive){
    window.__onekoActive=false;
    cancelAnimationFrame(window.__onekoFrameId);
    try{window.__onekoEl.remove();}catch(e){}
    try{window.__onekoMenu.remove();}catch(e){}
    window.__onekoEl=null;
    window.__onekoMenu=null;
    window.__onekoHandlers&&window.__onekoHandlers.forEach(h=>window.removeEventListener(h.ev,h.fn));
    return;
  }
  window.__onekoActive=true;

  const BASE="https://raw.githubusercontent.com/kyrie25/spicetify-oneko/main/assets/oneko/oneko-";
  const VARIANTS=["classic","vaporwave","maia"];
  const MODES=["follow","drift","orbit","physics","dvd"];
  const SIZE=32,RADIUS_ORBIT=80,GRAVITY=0.6,FLOOR_BOUNCE=-0.45,WALL_BOUNCE=-0.6,TOP_BOUNCE=-0.6,IDLE_MS=1400;

  const spriteSets={
    idle:[[-3,-3]],alert:[[-7,-3]],tired:[[-3,-2]],sleeping:[[-2,0],[-2,-1]],
    N:[[-1,-2],[-1,-3]],NE:[[0,-2],[0,-3]],E:[[-3,0],[-3,-1]],SE:[[-5,-1],[-5,-2]],
    S:[[-6,-3],[-7,-2]],SW:[[-5,-3],[-6,-1]],W:[[-4,-2],[-4,-3]],NW:[[-1,0],[-1,-1]]
  };

  let centerX=Math.min(Math.max(16,window.innerWidth/2),window.innerWidth-16),
      centerY=Math.min(Math.max(16,window.innerHeight/2),window.innerHeight-16),
      mouseX=centerX, mouseY=centerY,
      vx=0, vy=0, dragging=false,
      lastMoveAt=Date.now(),
      idleAnim=null, animTick=0, animFrame=0,
      direction="S", mode="follow", variant="classic",
      physicsSticky=false,
      dvdScale=1, dvdDirX=1, dvdDirY=1, dvdVX=1.5, dvdVY=1.2;

  let handlers=[]; window.__onekoHandlers=handlers;

  // borders
  const ceiling=document.createElement("div");
  ceiling.style.position="fixed"; ceiling.style.top=0; ceiling.style.left=0;
  ceiling.style.width="100%"; ceiling.style.height="16px"; ceiling.style.background="rgba(255,0,0,0.25)";
  ceiling.style.zIndex=2147483646;
  document.body.appendChild(ceiling);
  const leftBorder=document.createElement("div");
  leftBorder.style.position="fixed"; leftBorder.style.left=0; leftBorder.style.top=0;
  leftBorder.style.width="16px"; leftBorder.style.height="100%"; leftBorder.style.background="rgba(0,255,0,0.25)";
  leftBorder.style.zIndex=2147483646; document.body.appendChild(leftBorder);
  const rightBorder=document.createElement("div");
  rightBorder.style.position="fixed"; rightBorder.style.right=0; rightBorder.style.top=0;
  rightBorder.style.width="16px"; rightBorder.style.height="100%"; rightBorder.style.background="rgba(0,0,255,0.25)";
  rightBorder.style.zIndex=2147483646; document.body.appendChild(rightBorder);
  const floor=document.createElement("div");
  floor.style.position="fixed"; floor.style.bottom=0; floor.style.left=0;
  floor.style.width="100%"; floor.style.height="16px"; floor.style.background="rgba(255,255,0,0.25)";
  floor.style.zIndex=2147483646; document.body.appendChild(floor);

  // cat element
  const neko=document.createElement("div");
  neko.id="__oneko_el";
  neko.style.width=SIZE+"px"; neko.style.height=SIZE+"px";
  neko.style.position="fixed"; neko.style.left=centerX-SIZE/2+"px"; neko.style.top=centerY-SIZE/2+"px";
  neko.style.zIndex=2147483647; neko.style.imageRendering="pixelated"; neko.style.cursor="grab";
  neko.style.pointerEvents="auto"; neko.style.backgroundImage=`url('${BASE+variant}.gif')`;
  neko.style.backgroundRepeat="no-repeat"; document.body.appendChild(neko);
  window.__onekoEl=neko;

  // menu
  const menu=document.createElement("div");
  menu.id="__oneko_menu";
  menu.style.position="fixed"; menu.style.top="8px"; menu.style.right="8px";
  menu.style.background="rgba(20,20,20,0.95)"; menu.style.color="#fff"; menu.style.padding="8px";
  menu.style.borderRadius="8px"; menu.style.fontFamily="sans-serif"; menu.style.zIndex=2147483647;
  menu.style.display="flex"; menu.style.flexDirection="column"; menu.style.gap="6px";
  menu.style.minWidth="160px";

  // mode selection
  const modeRow=document.createElement("div"); modeRow.style.display="flex"; modeRow.style.flexWrap="wrap"; modeRow.style.gap="4px";
  MODES.forEach(m=>{
    const b=document.createElement("button");
    b.textContent=m; b.style.padding="4px 6px"; b.style.cursor="pointer"; b.style.border="none"; b.style.borderRadius="4px";
    b.style.background=(m===mode)?"#444":"#333"; b.style.color="#fff";
    b.onclick=()=>{mode=m;Array.from(modeRow.children).forEach(btn=>btn.style.background="#333"); b.style.background="#444"; vx=vy=0; idleAnim=null; dvdScale=1; dvdDirX=1; dvdDirY=1;};
    modeRow.appendChild(b);
  });
  menu.appendChild(modeRow);

  // variant selection
  const varRow=document.createElement("div"); varRow.style.display="flex"; varRow.style.flexWrap="wrap"; varRow.style.gap="6px";
  VARIANTS.forEach(v=>{
    const d=document.createElement("div"); d.title=v; d.style.width="40px"; d.style.height="40px"; d.style.borderRadius="6px"; d.style.cursor="pointer";
    d.style.backgroundImage=`url('${BASE+v}.gif')`; d.style.backgroundSize="cover"; d.style.border=(v===variant)?"2px solid #888":"2px solid transparent";
    d.onclick=()=>{variant=v; neko.style.backgroundImage=`url('${BASE+variant}.gif')`; Array.from(varRow.children).forEach(el=>el.style.border="2px solid transparent"); d.style.border="2px solid #888";};
    varRow.appendChild(d);
  });
  menu.appendChild(varRow);

  // physics sticky toggle
  const physToggle=document.createElement("button"); physToggle.textContent="Physics: bouncy"; physToggle.style.marginTop="4px";
  physToggle.onclick=()=>{physicsSticky=!physicsSticky; physToggle.textContent="Physics: "+(physicsSticky?"sticky":"bouncy");};
  menu.appendChild(physToggle);

  document.body.appendChild(menu);
  window.__onekoMenu=menu; window.__onekoVariant=varRow;

  // helpers
  function clampCenter(){const min=SIZE/2, maxX=window.innerWidth-SIZE/2, maxY=window.innerHeight-SIZE/2; centerX=Math.min(Math.max(min,centerX),maxX); centerY=Math.min(Math.max(min,centerY),maxY);}
  function getDirFromDelta(dx,dy){const a=Math.atan2(dy,dx)*180/Math.PI; if(a>=-22.5&&a<22.5)return"E"; if(a>=22.5&&a<67.5)return"SE"; if(a>=67.5&&a<112.5)return"S"; if(a>=112.5&&a<157.5)return"SW"; if(a>=157.5||a<-157.5)return"W"; if(a>=-157.5&&a<-112.5)return"NW"; if(a>=-112.5&&a<-67.5)return"N"; return"NE";}
  function setSprite(name,frame){const arr=spriteSets[name]; if(!arr)return; const s=arr[frame%arr.length]; neko.style.backgroundPosition=`${s[0]*SIZE}px ${s[1]*SIZE}px`; }

  // dragging
  let dragInfo={};
  function onNekoMouseDown(e){if(e.button!==0)return;e.preventDefault(); dragging=true; neko.style.cursor="grabbing"; dragInfo.startClientX=e.clientX; dragInfo.startClientY=e.clientY; dragInfo.startCenterX=centerX; dragInfo.startCenterY=centerY; dragInfo.startTime=Date.now(); dragInfo.lastX=e.clientX; dragInfo.lastY=e.clientY; dragInfo.lastT=dragInfo.startTime; window.addEventListener("mousemove",onWindowDrag); window.addEventListener("mouseup",onWindowDrop);}
  function onWindowDrag(e){if(!dragging)return; const dx=e.clientX-dragInfo.startClientX, dy=e.clientY-dragInfo.startClientY; centerX=dragInfo.startCenterX+dx; centerY=dragInfo.startCenterY+dy; const now=Date.now(); dragInfo.lastVX=(e.clientX-dragInfo.lastX)/Math.max(1,now-dragInfo.lastT); dragInfo.lastVY=(e.clientY-dragInfo.lastY)/Math.max(1,now-dragInfo.lastT); dragInfo.lastX=e.clientX; dragInfo.lastY=e.clientY; dragInfo.lastT=now; clampCenter(); setSprite("alert",0); neko.style.left=centerX-SIZE/2+"px"; neko.style.top=centerY-SIZE/2+"px";}
  function onWindowDrop(e){if(!dragging)return; dragging=false; neko.style.cursor="grab"; vx=dragInfo.lastVX*16; vy=dragInfo.lastVY*16; lastMoveAt=Date.now(); dragInfo={}; window.removeEventListener("mousemove",onWindowDrag); window.removeEventListener("mouseup",onWindowDrop);}
  neko.addEventListener("mousedown",onNekoMouseDown);
  handlers.push({ev:"mousedown",fn:onNekoMouseDown,el:neko});

  window.addEventListener("mousemove",e=>{mouseX=e.clientX; mouseY=e.clientY; lastMoveAt=Date.now();});
  handlers.push({ev:"mousemove",fn:e=>{mouseX=e.clientX; mouseY=e.clientY; lastMoveAt=Date.now();}});

  window.addEventListener("resize",()=>{clampCenter();}); handlers.push({ev:"resize",fn:()=>clampCenter()});

  // confetti
  function createConfetti(x,y){for(let i=0;i<10;i++){const c=document.createElement("div"); c.style.position="fixed"; c.style.left=x+"px"; c.style.top=y+"px"; c.style.width="4px"; c.style.height="4px"; c.style.backgroundColor=["red","yellow","lime","cyan","magenta"][Math.floor(Math.random()*5)]; c.style.zIndex=2147483647; document.body.appendChild(c); let vyc=-2+Math.random()*4; let vxC=-2+Math.random()*4; let lifetime=50; const fall=setInterval(()=>{c.style.left=(parseFloat(c.style.left)+vxC)+"px"; c.style.top=(parseFloat(c.style.top)+vyC)+"px"; vyc+=0.1; lifetime--; if(lifetime<=0){clearInterval(fall); c.remove();}},16); } }

  // tick
  let lastTick=performance.now();
  function tick(now){
    const dt=Math.max(1,now-lastTick); lastTick=now;
    const prevX=centerX, prevY=centerY;
    if(!dragging){
      if(mode==="follow"){centerX+=(mouseX-centerX)*0.14; centerY+=(mouseY-centerY)*0.14; vx=centerX-prevX; vy=centerY-prevY;}
      else if(mode==="drift"){vx+=(mouseX-centerX)*0.01; vy+=(mouseY-centerY)*0.01; vx*=0.92; vy*=0.92; centerX+=vx; centerY+=vy;}
      else if(mode==="orbit"){const angSpeed=0.12,t=now/1000; const tx=mouseX+Math.cos(t*angSpeed*10)*RADIUS_ORBIT, ty=mouseY+Math.sin(t*angSpeed*10)*RADIUS_ORBIT; centerX+=(tx-centerX)*0.28; centerY+=(ty-centerY)*0.28; vx=centerX-prevX; vy=centerY-prevY;}
      else if(mode==="physics"){vy+=GRAVITY*(dt/16); centerX+=vx*(dt/16); centerY+=vy*(dt/16); vx*=0.995; vy*=0.998;}
      else if(mode==="dvd"){dvdScale+=0.008*dvdDirX; dvdScale=Math.min(Math.max(1,dvdScale),2); centerX+=dvdVX*dt/16*10; centerY+=dvdVY*dt/16*10;
        let hit=false;
        if(centerX<SIZE/2||centerX>window.innerWidth-SIZE/2){dvdVX*=-1; dvdDirX*=-1; hit=true;}
        if(centerY<SIZE/2||centerY>window.innerHeight-SIZE/2){dvdVY*=-1; dvdDirY*=-1; hit=true;}
        if(hit) createConfetti(centerX,centerY);
      }
    }

    // clamp walls
    const minX=SIZE/2,maxX=window.innerWidth-SIZE/2,minY=SIZE/2,maxY=window.innerHeight-SIZE/2;
    if(centerX<minX){centerX=minX; vx*=WALL_BOUNCE;}
    else if(centerX>maxX){centerX=maxX; vx*=WALL_BOUNCE;}
    if(centerY>maxY){centerY=maxY; if(mode==="physics") vy=physicsSticky?0:(Math.abs(vy)>0.5?vy*FLOOR_BOUNCE:0); else vy=0;}
    if(centerY<minY){centerY=minY; vy*=TOP_BOUNCE;}

    // animations
    const moveDX=centerX-prevX, moveDY=centerY-prevY, speed=Math.hypot(moveDX,moveDY);
    let facingDX=moveDX,facingDY=moveDY;
    if(speed<0.8){facingDX=mouseX-centerX; facingDY=mouseY-centerY;}
    if(Math.hypot(facingDX,facingDY)>0.1) direction=getDirFromDelta(facingDX,facingDY);

    animFrame++; let frameDelay=Math.max(4,10-Math.floor(speed*2)); if(mode==="physics") frameDelay*=2;
    if(animFrame%frameDelay===0) animTick++;
    let spriteState=(speed>1.2)?direction:"idle";
    setSprite(spriteState, animTick);

    neko.style.left=centerX-SIZE/2+"px"; neko.style.top=centerY-SIZE/2+"px";
    neko.style.transform=(mode==="dvd")?`scale(${dvdScale})`:"scale(1)";

    window.__onekoFrameId=requestAnimationFrame(tick);
  }

  lastMoveAt=Date.now();
  window.__onekoFrameId=requestAnimationFrame(tick);

})();
