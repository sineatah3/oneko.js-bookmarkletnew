(function(){
  if(window.__onekoActive){
    window.__onekoActive=false;
    cancelAnimationFrame(window.__onekoFrameId);
    try{window.__onekoEl.remove()}catch(e){}
    try{window.__onekoMenu.remove()}catch(e){}
    window.__onekoEl=null; window.__onekoMenu=null;
    window.__onekoHandlers && window.__onekoHandlers.forEach(h=>window.removeEventListener(h.ev,h.fn));
    return;
  }

  window.__onekoActive=true;

  const BASE="https://raw.githubusercontent.com/sineatah3/oneko.js-bookmarkletnew/main/assets/oneko/oneko-";
  const VARIANTS=["classic","vaporwave","maia"];
  const MODES=["follow","drift","orbit","physics","dvd"];
  const SIZE=48,RADIUS_ORBIT=100,GRAVITY=0.6,FLOOR_BOUNCE=-0.45,WALL_BOUNCE=-0.6,TOP_BOUNCE=-0.6;

  const spriteSets={
    idle:[[-3,-3]], alert:[[-7,-3]], N:[[-1,-2],[-1,-3]], S:[[-6,-3],[-7,-2]],
    E:[[-3,0],[-3,-1]], W:[[-4,-2],[-4,-3]], NE:[[0,-2],[0,-3]], NW:[[-1,0],[-1,-1]],
    SE:[[-5,-1],[-5,-2]], SW:[[-5,-3],[-6,-1]]
  };

  let centerX=window.innerWidth/2,centerY=window.innerHeight/2,
      mouseX=centerX,mouseY=centerY,
      vx=0,vy=0,dragging=false,
      lastMoveAt=Date.now(),animTick=0,animFrame=0,
      direction="S",mode="follow",variant="classic",physicsSticky=false;

  let handlers=[];
  window.__onekoHandlers=handlers;

  // create borders
  const createBorder=(top,left,width,height,bg)=>{ const d=document.createElement("div"); d.style.position="fixed"; d.style.top=top; d.style.left=left; d.style.width=width; d.style.height=height; d.style.background=bg; d.style.zIndex=2147483646; document.body.appendChild(d); };
  createBorder("0","0","100%","16px","rgba(255,0,0,0.25)");
  createBorder("0","0","16px","100%","rgba(0,255,0,0.25)");
  createBorder("0","", "16px","100%","rgba(0,0,255,0.25)").style.right="0";

  // create cat element
  const neko=document.createElement("div");
  neko.id="__oneko_el";
  neko.style.width=SIZE+"px"; neko.style.height=SIZE+"px";
  neko.style.position="fixed";
  neko.style.left=centerX-SIZE/2+"px"; neko.style.top=centerY-SIZE/2+"px";
  neko.style.zIndex=2147483647;
  neko.style.imageRendering="pixelated"; neko.style.cursor="grab"; neko.style.pointerEvents="auto";
  neko.style.backgroundImage=`url('${BASE+variant}.gif')`; neko.style.backgroundRepeat="no-repeat";
  document.body.appendChild(neko);
  window.__onekoEl=neko;

  // create menu
  const menu=document.createElement("div");
  menu.id="__oneko_menu";
  menu.style.position="fixed"; menu.style.top="8px"; menu.style.right="8px";
  menu.style.background="rgba(20,20,20,0.95)"; menu.style.color="#fff"; menu.style.padding="8px";
  menu.style.borderRadius="8px"; menu.style.fontFamily="sans-serif"; menu.style.zIndex=2147483647;
  menu.style.display="flex"; menu.style.flexDirection="column"; menu.style.gap="6px"; menu.style.minWidth="160px";

  // mode buttons
  const modeRow=document.createElement("div");
  modeRow.style.display="flex"; modeRow.style.flexWrap="wrap"; modeRow.style.gap="4px";
  MODES.forEach(m=>{
    const b=document.createElement("button");
    b.textContent=m;
    b.style.padding="4px 6px"; b.style.cursor="pointer"; b.style.border="none"; b.style.borderRadius="4px";
    b.style.background=(m===mode)?"#444":"#333"; b.style.color="#fff";
    b.onclick=()=>{ mode=m; vx=vy=0; dvdScale=1; dvdDirX=1; dvdDirY=1; };
    modeRow.appendChild(b);
  });
  menu.appendChild(modeRow);

  // variant buttons
  const varRow=document.createElement("div");
  varRow.style.display="flex"; varRow.style.flexWrap="wrap"; varRow.style.gap="6px";
  VARIANTS.forEach(v=>{
    const d=document.createElement("div"); d.title=v;
    d.style.width="40px"; d.style.height="40px"; d.style.borderRadius="6px"; d.style.cursor="pointer";
    d.style.backgroundImage=`url('${BASE+v}.gif')`; d.style.backgroundSize="cover";
    d.onclick=()=>{ variant=v; neko.style.backgroundImage=`url('${BASE+variant}.gif')`; };
    varRow.appendChild(d);
  });
  menu.appendChild(varRow);

  // physics toggle
  const physToggle=document.createElement("button");
  physToggle.textContent="Physics: bouncy";
  physToggle.style.marginTop="4px";
  physToggle.onclick=()=>{ physicsSticky=!physicsSticky; physToggle.textContent="Physics: "+(physicsSticky?"sticky":"bouncy"); };
  menu.appendChild(physToggle);

  document.body.appendChild(menu);
  window.__onekoMenu=menu;
  window.__onekoVariant=varRow;

  // DVD confetti
  let dvdScale=1,dvdDirX=1,dvdDirY=1, dvdVX=3, dvdVY=2;
  function confettiDrop(){
    for(let i=0;i<15;i++){
      const c=document.createElement("div");
      c.style.width="6px"; c.style.height="6px"; c.style.background=["red","yellow","blue","green","purple"][Math.floor(Math.random()*5)];
      c.style.position="fixed"; c.style.top="0px"; c.style.left=(centerX+SIZE/2)+"px";
      c.style.zIndex=2147483646;
      document.body.appendChild(c);
      let y=0;
      const fall=()=>{ y+=4; c.style.top=y+"px"; if(y>window.innerHeight) c.remove(); else requestAnimationFrame(fall); };
      fall();
    }
  }

  function tick(){
    if(!dragging){
      if(mode==="follow"){ centerX+=(mouseX-centerX)*0.14; centerY+=(mouseY-centerY)*0.14; }
      else if(mode==="drift"){ vx+=(mouseX-centerX)*0.01; vy+=(mouseY-centerY)*0.01; vx*=0.92; vy*=0.92; centerX+=vx; centerY+=vy; }
      else if(mode==="orbit"){ const t=Date.now()/1000; centerX=mouseX+Math.cos(t*0.6)*RADIUS_ORBIT; centerY=mouseY+Math.sin(t*0.6)*RADIUS_ORBIT; }
      else if(mode==="physics"){ vy+=GRAVITY; centerX+=vx; centerY+=vy; if(centerY>window.innerHeight-SIZE/2){ centerY=window.innerHeight-SIZE/2; vy*=physicsSticky?0:FLOOR_BOUNCE; } }
      else if(mode==="dvd"){ dvdScale+=0.01*dvdDirX; dvdScale=Math.min(Math.max(1,dvdScale),2); centerX+=dvdVX; centerY+=dvdVY;
        if(centerX<SIZE/2||centerX>window.innerWidth-SIZE/2){ dvdVX*=-1; dvdDirX*=-1; if(centerX<SIZE) confettiDrop(); }
        if(centerY<SIZE/2||centerY>window.innerHeight-SIZE/2){ dvdVY*=-1; dvdDirY*=-1; if(centerY<SIZE) confettiDrop(); }
      }
    }

    // clamp
    if(centerX<SIZE/2){centerX=SIZE/2; vx*=WALL_BOUNCE;} else if(centerX>window.innerWidth-SIZE/2){centerX=window.innerWidth-SIZE/2; vx*=WALL_BOUNCE;}
    if(centerY<SIZE/2){centerY=SIZE/2; vy*=TOP_BOUNCE;} else if(centerY>window.innerHeight-SIZE/2){centerY=window.innerHeight-SIZE/2; vy*=FLOOR_BOUNCE;}

    neko.style.left=centerX-SIZE/2+"px"; neko.style.top=centerY-SIZE/2+"px"; 
    neko.style.transform=mode==="dvd"?`scale(${dvdScale})`:"scale(1)";

    animTick++; animFrame++;
    requestAnimationFrame(tick);
  }
  tick();

  window.addEventListener("mousemove",e=>{ mouseX=e.clientX; mouseY=e.clientY; lastMoveAt=Date.now(); });
})();
