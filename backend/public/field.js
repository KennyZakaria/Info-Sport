async function fetchMatch(matchId){
  if(!matchId) return null;
  try{
    const res = await fetch(`/api/matches/${encodeURIComponent(matchId)}`);
    if(!res.ok) return null;
    return await res.json();
  }catch(e){
    console.warn('fetch error',e);
    return null;
  }
}

function normalizePlayers(raw){
  // Expect participants array or fallback
  const participants = raw?.participants || raw || [];
  // Each participant: may have user object or userId
  return participants.map(p=>{
    const user = p.user || { id: p.userId, name: p.userName || 'Joueur' };
    return {
      id: user.id || p.userId || p.id,
      name: user.name || user.id || 'Joueur',
      rating: user.rating || 50,
      team: p.team || null,
      status: p.status || 'présent'
    };
  }).filter(p=>p.status === 'présent');
}

function assignTeams(players, format){
  // try keep existing team if present
  const withTeam = players.filter(p=>p.team === 'A' || p.team === 'B');
  if(withTeam.length === players.length){
    return {
      A: players.filter(p=>p.team==='A'),
      B: players.filter(p=>p.team==='B')
    }
  }

  // otherwise sort by rating and greedy balance
  const sorted = [...players].sort((a,b)=>b.rating - a.rating);
  const target = (format||6);
  const A=[],B=[];
  let scoreA=0,scoreB=0;
  for(const p of sorted){
    if(A.length>=target){ B.push(p); scoreB+=p.rating; continue; }
    if(B.length>=target){ A.push(p); scoreA+=p.rating; continue; }
    if(scoreA<=scoreB){ A.push(p); scoreA+=p.rating; } else { B.push(p); scoreB+=p.rating; }
  }
  return {A,B};
}

function renderTeam(container, players, side){
  container.innerHTML='';
  players.forEach((p,i)=>{
    const div=document.createElement('div');
    div.className='player '+(side==='A'?'team-left':'team-right');
    const badge=document.createElement('div'); badge.className='badge'; badge.textContent = (i+1);
    const name=document.createElement('div'); name.className='name'; name.textContent = p.name;
    div.appendChild(badge); div.appendChild(name);
    container.appendChild(div);
  });
}

async function load(matchId){
  const data = await fetchMatch(matchId);
  let players;
  let format = 6;
  if(data){
    // API returned formattedMatch in routes: participants => array of { user: {...} }
    players = normalizePlayers(data.participants || data);
    format = data.format || format;
  } else {
    // demo players
    players = [
      {id:'1',name:'Abdel',rating:60},
      {id:'2',name:'Karim',rating:55},
      {id:'3',name:'Omar',rating:70},
      {id:'4',name:'Sami',rating:40},
      {id:'5',name:'Yassine',rating:50},
      {id:'6',name:'Hicham',rating:45},
      {id:'7',name:'Rami',rating:65},
      {id:'8',name:'Nabil',rating:52},
      {id:'9',name:'Bilal',rating:48},
      {id:'10',name:'Ziad',rating:58},
      {id:'11',name:'Imad',rating:46},
      {id:'12',name:'Fares',rating:47}
    ];
  }

  const {A,B} = assignTeams(players, format);
  renderTeam(document.getElementById('teamA'), A, 'A');
  renderTeam(document.getElementById('teamB'), B, 'B');
}

document.getElementById('loadBtn').addEventListener('click', ()=>{
  const id = document.getElementById('matchId').value.trim();
  load(id||null);
});

document.getElementById('demoBtn').addEventListener('click', ()=>{ load(null); });

// on load, check query param
(function(){
  const params = new URLSearchParams(window.location.search);
  const id = params.get('matchId');
  if(id) document.getElementById('matchId').value = id;
  load(id);
})();