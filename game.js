(() => {
  const COLS=10,ROWS=18,GOAL=5,REQUIRED_MARI=1000;
  const MARI_MINT_ADDRESS='MARtUR3miHwtv2jodAeXLM1b7uz5qrfnr6s3GvpSSTJ';
  const RPC_URL='https://api.mainnet-beta.solana.com';
  const stages=[null,{name:'LUCKY BUNNY',image:'assets/stage-01.png'},{name:'HIGH ROLLER',image:'assets/stage-02.png'},{name:'JACKPOT HEAT',image:'assets/stage-03.png'},{name:'ROYAL FLUSH',image:'assets/stage-04.png'}];
  const canvas=document.getElementById('board'),ctx=canvas.getContext('2d'),nextCanvas=document.getElementById('next'),nctx=nextCanvas.getContext('2d');
  const colors=['','#42e8ff','#ffd43b','#bd5cff','#45ef8c','#ff4a70','#4f75ff','#ff843d'];
  const shapes=[[[1,1,1,1]],[[2,2],[2,2]],[[0,3,0],[3,3,3]],[[0,4,4],[4,4,0]],[[5,5,0],[0,5,5]],[[6,0,0],[6,6,6]],[[0,0,7],[7,7,7]]];
  let board,piece,nextPiece,score=0,lines=0,level=1,playing=false,paused=false,over=false,last=0,dropMs=760,selectedStage=1;
  const unlocked=new Set(JSON.parse(localStorage.getItem('mariStripUnlocked')||'[]'));

  function nextPlayable(){for(let n=1;n<=4;n++)if(!unlocked.has(n)&&stageAvailable(n))return n;return 4}
  function updateHomePreview(){
    const n=nextPlayable();selectedStage=n;
    document.querySelector('.home-art').style.backgroundImage='url("'+stages[n].image+'")';
    document.querySelector('.mini-label').textContent='STAGE 0'+n;
    document.querySelector('.mini-title').textContent=stages[n].name;
    document.querySelector('.mini-go').textContent=unlocked.size===4?'PLAY AGAIN':'NEXT';
  }
  function showView(id){if(playing&&id!=='game')playing=false;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.modal').forEach(m=>m.classList.remove('show'));if(id==='album')renderAlbum();if(id==='home')updateHomePreview();scrollTo(0,0)}
  function openStageModal(){document.getElementById('stageSelectModal').classList.remove('show');document.getElementById('modalStage').textContent='STAGE 0'+selectedStage;document.getElementById('modalTitle').textContent=stages[selectedStage].name;document.getElementById('startModal').classList.add('show')}
  function stageAvailable(n){return n===1||unlocked.has(n-1)}
  function showLockedNotice(n){
    document.getElementById('noticeTitle').textContent='CLEAR STAGE 0'+(n-1)+' FIRST';
    document.getElementById('noticeText').textContent='Complete '+stages[n-1].name+' before you can play Stage 0'+n+'.';
    document.getElementById('noticeModal').classList.add('show');
  }
  function selectStage(n){
    selectedStage=n;
    document.querySelectorAll('[data-stage]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.stage)===n));
    document.querySelector('.home-art').style.backgroundImage='url("'+stages[n].image+'")';
    document.querySelector('.mini-label').textContent='STAGE 0'+n;
    document.querySelector('.mini-title').textContent=stages[n].name;
    renderStageSelect();
    if(!stageAvailable(n)){showLockedNotice(n);return}
    document.getElementById('stageSelectModal').classList.remove('show');
    n===4?document.getElementById('walletModal').classList.add('show'):openStageModal();
  }
  function previewAlbum(n){
    document.getElementById('previewImage').src=stages[n].image;
    document.getElementById('previewStage').textContent='STAGE 0'+n;
    document.getElementById('previewTitle').textContent=stages[n].name;
    document.getElementById('albumPreview').classList.add('show');
  }

  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
  document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>selectStage(Number(b.dataset.stage)));
  document.getElementById('playBtn').onclick=()=>selectStage(nextPlayable());
  document.getElementById('selectStageBtn').onclick=()=>{renderStageSelect();document.getElementById('stageSelectModal').classList.add('show')};
  document.getElementById('closeStageSelect').onclick=()=>document.getElementById('stageSelectModal').classList.remove('show');
  document.getElementById('stagePreview').onclick=()=>selectStage(nextPlayable());
  document.getElementById('closeModal').onclick=()=>document.getElementById('startModal').classList.remove('show');
  document.getElementById('closeWallet').onclick=()=>document.getElementById('walletModal').classList.remove('show');
  document.getElementById('closeNotice').onclick=()=>document.getElementById('noticeModal').classList.remove('show');
  document.getElementById('closePreview').onclick=()=>document.getElementById('albumPreview').classList.remove('show');
  document.getElementById('startGame').onclick=()=>{document.getElementById('startModal').classList.remove('show');showView('game');startGame()};
  document.getElementById('pauseBtn').onclick=()=>{if(playing){paused=true;document.getElementById('pauseOverlay').classList.add('show')}};
  document.getElementById('resumeBtn').onclick=()=>{paused=false;last=performance.now();document.getElementById('pauseOverlay').classList.remove('show')};
  document.getElementById('viewAlbum').onclick=()=>showView('album');
  document.getElementById('nextStageBtn').onclick=()=>{
    document.getElementById('clearOverlay').classList.remove('show');
    if(selectedStage>=4){showView('album');return}
    selectStage(selectedStage+1);
  };
  document.querySelectorAll('[data-album]').forEach(card=>card.onclick=()=>{
    const n=Number(card.dataset.album);
    if(unlocked.has(n)){previewAlbum(n);return}
    selectStage(n);
  });

  document.getElementById('connectWallet').onclick=async()=>{
    const status=document.getElementById('walletStatus');
    if(!window.solana?.isPhantom){status.textContent='Open this game in Phantom, or install the Phantom wallet.';return}
    try{
      status.textContent='Connecting…';const {publicKey}=await window.solana.connect();
      status.textContent='Checking MARI balance…';
      const response=await fetch(RPC_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTokenAccountsByOwner',params:[publicKey.toString(),{mint:MARI_MINT_ADDRESS},{encoding:'jsonParsed'}]})});
      const data=await response.json(),balance=(data.result?.value||[]).reduce((sum,a)=>sum+(a.account?.data?.parsed?.info?.tokenAmount?.uiAmount||0),0);
      document.querySelector('.wallet-pill strong').textContent=balance.toLocaleString(undefined,{maximumFractionDigits:2});
      if(balance<REQUIRED_MARI){status.textContent='You hold '+balance.toLocaleString()+' MARI. 1,000 MARI is required.';return}
      status.textContent='Access granted.';setTimeout(()=>{document.getElementById('walletModal').classList.remove('show');openStageModal()},500);
    }catch(e){status.textContent='Wallet connection was cancelled or the balance could not be checked.'}
  };

  function makePiece(){const t=Math.floor(Math.random()*shapes.length);return{m:shapes[t].map(r=>r.slice()),x:Math.floor((COLS-shapes[t][0].length)/2),y:-1}}
  function startGame(){const s=stages[selectedStage];document.querySelector('.game-bg').style.backgroundImage='url("'+s.image+'")';document.getElementById('gameStage').textContent='STAGE 0'+selectedStage;document.getElementById('gameTitle').textContent=s.name;board=Array.from({length:ROWS},()=>Array(COLS).fill(0));score=0;lines=0;level=1;dropMs=760;playing=true;paused=false;over=false;nextPiece=makePiece();spawn();updateHud();last=performance.now();requestAnimationFrame(loop)}
  function spawn(){piece=nextPiece;piece.x=Math.floor((COLS-piece.m[0].length)/2);piece.y=-1;nextPiece=makePiece();drawNext();if(collide(piece,0,1)){over=true;playing=false;setTimeout(()=>{alert('Blocks reached the top. Try again!');showView('home')},80)}}
  function collide(p,dx=0,dy=0,m=p.m){for(let y=0;y<m.length;y++)for(let x=0;x<m[y].length;x++)if(m[y][x]){const nx=p.x+x+dx,ny=p.y+y+dy;if(nx<0||nx>=COLS||ny>=ROWS||(ny>=0&&board[ny][nx]))return true}return false}
  function merge(){piece.m.forEach((r,y)=>r.forEach((v,x)=>{if(v&&piece.y+y>=0)board[piece.y+y][piece.x+x]=v}));clearLines();if(lines>=GOAL){win();return}spawn()}
  function clearLines(){let count=0;for(let y=ROWS-1;y>=0;y--)if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(COLS).fill(0));count++;y++}if(count){lines+=count;score+=[0,100,300,500,800][count]*level;level=1+Math.floor(lines/6);dropMs=Math.max(230,760-(level-1)*75);updateHud();canvas.animate([{filter:'brightness(2)'},{filter:'brightness(1)'}],{duration:260})}}
  function move(dx){if(playing&&!paused&&!collide(piece,dx,0)){piece.x+=dx;draw()}}
  function down(){if(!playing||paused)return;if(!collide(piece,0,1)){piece.y++;score++}else merge();updateHud();draw()}
  function rotate(){if(!playing||paused)return;const m=piece.m[0].map((_,i)=>piece.m.map(r=>r[i]).reverse());for(const k of[0,-1,1,-2,2])if(!collide(piece,k,0,m)){piece.m=m;piece.x+=k;draw();break}}
  function hardDrop(){if(!playing||paused)return;let d=0;while(!collide(piece,0,1)){piece.y++;d++}score+=d*2;merge();updateHud();draw()}
  function ghostY(){let y=piece.y;while(!collide({...piece,y},0,1))y++;return y}
  function cell(c,x,y,s,a=1){const px=x*s,py=y*s;ctx.globalAlpha=a;ctx.fillStyle=colors[c];ctx.fillRect(px+1,py+1,s-2,s-2);ctx.fillStyle='#ffffff47';ctx.fillRect(px+2,py+2,s-4,2);ctx.strokeStyle='#ffffff40';ctx.strokeRect(px+1.5,py+1.5,s-3,s-3);ctx.globalAlpha=1}
  function draw(){const s=canvas.width/COLS;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#ffffff0e';for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*s,0);ctx.lineTo(x*s,canvas.height);ctx.stroke()}for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*s);ctx.lineTo(canvas.width,y*s);ctx.stroke()}board?.forEach((r,y)=>r.forEach((v,x)=>v&&cell(v,x,y,s)));if(!piece)return;const gy=ghostY();piece.m.forEach((r,y)=>r.forEach((v,x)=>v&&gy+y>=0&&cell(v,piece.x+x,gy+y,s,.15)));piece.m.forEach((r,y)=>r.forEach((v,x)=>v&&piece.y+y>=0&&cell(v,piece.x+x,piece.y+y,s)))}
  function drawNext(){nctx.clearRect(0,0,72,72);const m=nextPiece.m,s=15,ox=(72-m[0].length*s)/2,oy=(72-m.length*s)/2;m.forEach((r,y)=>r.forEach((v,x)=>{if(v){nctx.fillStyle=colors[v];nctx.fillRect(ox+x*s+1,oy+y*s+1,s-2,s-2)}}))}
  function updateHud(){document.getElementById('score').textContent=String(score).padStart(6,'0');document.getElementById('lines').textContent=Math.min(lines,GOAL);document.getElementById('level').textContent=String(level).padStart(2,'0');const p=Math.min(100,lines/GOAL*100);document.getElementById('progress').style.width=p+'%';document.getElementById('veil').style.opacity=String(.65-p*.0052)}
  function win(){
    playing=false;unlocked.add(selectedStage);localStorage.setItem('mariStripUnlocked',JSON.stringify([...unlocked]));
    document.getElementById('clearTitle').textContent=stages[selectedStage].name;
    document.getElementById('clearImage').src=stages[selectedStage].image;
    const finalStage=selectedStage===4;
    document.getElementById('clearMessage').textContent=finalStage?'You uncovered every side of MARI. View the complete collection in My Album.':'Want to undress MARI a little more?';
    document.getElementById('nextStageBtn').textContent=finalStage?'VIEW COMPLETE ALBUM':'PLAY STAGE 0'+(selectedStage+1)+' →';
    document.getElementById('veil').style.opacity='0';
    setTimeout(()=>document.getElementById('clearOverlay').classList.add('show'),600);
  }
  function loop(t){if(!playing||over)return;if(!paused&&t-last>dropMs){down();last=t}requestAnimationFrame(loop)}
  function renderAlbum(){document.querySelectorAll('[data-album]').forEach(c=>{const yes=unlocked.has(Number(c.dataset.album));c.classList.toggle('locked',!yes);c.classList.toggle('unlocked',yes)});document.getElementById('albumCount').textContent=unlocked.size+' / 4'}
  function renderStageSelect(){
    const ready=nextPlayable();
    document.querySelectorAll('[data-stage]').forEach(card=>{
      const n=Number(card.dataset.stage);
      card.classList.toggle('completed',unlocked.has(n));
      card.classList.toggle('selected',!unlocked.has(n)&&n===ready);
      card.classList.toggle('locked',!unlocked.has(n)&&!stageAvailable(n));
    });
  }
  document.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();({left:()=>move(-1),right:()=>move(1),down,rotate,drop:hardDrop}[b.dataset.move]())}));
  addEventListener('keydown',e=>{const m={ArrowLeft:()=>move(-1),ArrowRight:()=>move(1),ArrowDown:down,ArrowUp:rotate,' ':hardDrop};if(m[e.key]){e.preventDefault();m[e.key]()}});
  let sx=0,sy=0;canvas.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});canvas.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)<18&&Math.abs(dy)<18)rotate();else if(Math.abs(dx)>Math.abs(dy))move(dx>0?1:-1);else if(dy>60)hardDrop()},{passive:true});
  renderAlbum();renderStageSelect();updateHomePreview();draw();
})();
