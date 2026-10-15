'use strict';
const APP_VERSION='9.12.0';
const FIREBASE_CONFIG=window.QUEST_FIREBASE_CONFIG||null;
let nextQuestionTimer=null;
function cancelAutoAdvance(){if(nextQuestionTimer!==null){clearTimeout(nextQuestionTimer);nextQuestionTimer=null}}
function showAppVersion(){const el=document.getElementById('version-label');if(el)el.textContent="Julia's English Quest · Version "+APP_VERSION}
const $=s=>document.querySelector(s), app=$('#app');let db,units=[],progress={},settings={xp:0,streak:0,lastDay:null,tests:{},awards:[]},session=null;
let cloudTimer=null,cloudBusy=false,cloudDirty=false,cloudBaseline=null,cloudPending=false,cloudLocalRevision=0;
let cloudAuth=null,cloudStore=null,cloudUser=null,cloudAuthReady=false,cloudMessage='';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toLocaleDateString('en-CA');const plusDays=n=>{let d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString('en-CA')};
const longDate=value=>{if(!value)return '–';const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!match)return String(value);const d=new Date(+match[1],+match[2]-1,+match[3],12);return new Intl.DateTimeFormat('de-AT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)};
const shortDate=value=>longDate(value);
const norm=s=>s.toLocaleLowerCase('de').trim().replace(/[.!?]/g,'').replace(/\s+/g,' ').replace(/^to /,'');
// Accepted spellings: alternatives separated by | or /, optional parenthesized
// phrases, and optional infinitive "to". Preserve the original vocabulary data.
function answerVariants(raw){
  const results=new Set();
  const add=(value)=>{
    const clean=value.trim().replace(/\s+/g,' ');
    if(!clean)return;
    results.add(clean);
    if(/^to\s+/i.test(clean))results.add(clean.replace(/^to\s+/i,''));
  };
  for(const alternative of String(raw).split(/\s*[|/]\s*/)){
    // Parentheses denote an optional phrase, e.g. "to be scared (of)".
    const groups=[...alternative.matchAll(/\s*\(([^()]*)\)/g)];
    let candidates=[alternative];
    if(groups.length && groups.length<=5){
      candidates=[alternative];
      for(const group of groups){
        const next=[];
        for(const candidate of candidates){
          next.push(candidate.replace(group[0],''));
          next.push(candidate.replace(group[0],' '+group[1]));
        }
        candidates=next;
      }
    }
    for(const candidate of candidates)add(candidate);
  }
  return [...results];
}
function acceptsAnswer(expected,answer){return answerVariants(expected).some(v=>norm(v)===norm(answer));}

const alpha=(a,b)=>a.en.localeCompare(b.en,'en',{sensitivity:'base'});const sortUnits=()=>{units.sort((a,b)=>{const na=Number((a.id.match(/\d+/)||[])[0]),nb=Number((b.id.match(/\d+/)||[])[0]);return Number.isFinite(na)&&Number.isFinite(nb)?na-nb:a.title.localeCompare(b.title,'de',{numeric:true})});units.forEach(u=>u.words.sort(alpha))};const isReleased=u=>u.released!==false;const activeUnits=()=>units.filter(isReleased);const all=()=>activeUnits().flatMap(u=>u.words.map(w=>({...w,unit:u.id,unitTitle:u.title})));const byId=id=>all().find(w=>w.id===id);
function openDB(){return new Promise((resolve,reject)=>{let r=indexedDB.open('julias-english-quest',1);r.onupgradeneeded=()=>{let d=r.result;d.createObjectStore('data')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function get(key){return new Promise((resolve,reject)=>{let r=db.transaction('data').objectStore('data').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function put(key,value){return new Promise((resolve,reject)=>{let t=db.transaction('data','readwrite');t.objectStore('data').put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error)})}
function ensureSettings(){settings.tests ||= {};settings.awards ||= []}
async function save(){ensureSettings();await Promise.all([put('units',units),put('progress',progress),put('settings',settings)]);cloudDirty=true;cloudLocalRevision++;queueCloudSync()}
function initUnits(raw){return raw.map(u=>({id:u.id,title:u.title,released:u.released!==false,words:u.words.map((w,i)=>Array.isArray(w)?{id:u.id+'-'+String(i+1).padStart(3,'0'),en:w[0],de:w[1],example:''}:{id:w.id||u.id+'-'+String(i+1).padStart(3,'0'),en:w.en,de:w.de,example:w.example||''})}))}
function stat(id){return progress[id]||{stage:0,correct:0,wrong:0,due:today(),last:null}};
function progressUpdate(id,ok,write,voluntary=false){let s={...stat(id)};if(ok){s.correct++;if(!voluntary||s.stage<2)s.stage=Math.min(5,s.stage+1);if(voluntary){/* Freiwilliges MC-Training bis zur Schreibphase fördern; reguläre Fälligkeit nicht verschieben. */}else if(s.schoolMastered){s.reviewStep=Math.min(4,(s.reviewStep||0)+1);s.due=plusDays([7,14,30,60,90][s.reviewStep])}else{s.due=plusDays([0,0,1,3,7,14][s.stage])}settings.xp+=write?20:10}else{s.wrong++;s.schoolMastered=false;s.reviewStep=0;s.stage=2;s.due=today()}if(write){s.writeAttempts=(s.writeAttempts||0)+1;s.writeWrong=(s.writeWrong||0)+(ok?0:1);s.lastWriteOk=ok;s.writeCorrect=(s.writeCorrect||0)+(ok?1:0);s.writeStreak=ok?(s.writeStreak||0)+1:0}else{s.mcAttempts=(s.mcAttempts||0)+1;s.mcCorrect=(s.mcCorrect||0)+(ok?1:0);s.mcWrong=(s.mcWrong||0)+(ok?0:1)} s.last=today();progress[id]=s;save()}
function home(){
 cancelAutoAdvance();sortUnits();ensureSettings();session=null;
 const mastered=overallScore().secure.length;
 const upcoming=activeUnits().map(u=>({u,t:settings.tests[u.id]||{}})).filter(x=>x.t.date&&!x.t.result&&x.t.date>=today()).sort((a,b)=>a.t.date.localeCompare(b.t.date));
 const pending=activeUnits().map(u=>({u,t:settings.tests[u.id]||{}})).filter(x=>x.t.date&&!x.t.result&&x.t.date<today()).sort((a,b)=>b.t.date.localeCompare(a.t.date));
 const nextTest=pending[0]||upcoming[0]||null;
 const unfinished=[...activeUnits()].reverse().find(u=>unitScore(u).secure.length<u.words.length);
 const focus=nextTest?.u||unfinished||null;
 const days=nextTest?Math.round((new Date(nextTest.t.date+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000):null;
 const secure=focus?unitScore(focus).secure.length:0,total=focus?.words.length||0,remaining=total-secure;
 const leftValue=nextTest?(days<0?'✍️':String(days)):focus?'📖':'✓';
 const leftLabel=nextTest?(days<0?'Testergebnis eintragen':days===1?'Tag bis zum Test':'Tage bis zum Test'):focus?'Nächste Unit':'Wiederholen';
 const leftNote=nextTest?longDate(nextTest.t.date):focus?focus.title:'Alles geschafft!';
 const focusNote=nextTest?`Nächster Test: ${longDate(nextTest.t.date)}`:focus?`Dein nächstes Abenteuer: ${focus.title}`:'Alle Wörter sicher – Lust auf eine Wiederholung?';
 const goalNote=focus&&remaining?`🎯 Noch ${remaining} ${remaining===1?'Wort':'Wörter'} zu festigen!`:focus?'🌟 Diese Unit hast du geschafft!':'🌟 Zeit für eine lockere Wiederholung!';
 const unitBar=focus?`<div class="quest-unit-bar" role="progressbar" aria-valuenow="${secure}" aria-valuemin="0" aria-valuemax="${total}" aria-label="Sichere Wörter in ${esc(focus.title)}"><span style="width:${total?secure/total*100:0}%"></span></div>`:'';
 app.innerHTML=`<section class="card quest-banner"><div class="quest-portrait"><img class="quest-heroine" src="heroine.webp" alt="Deine Heldin mit Daumen hoch"></div><div class="quest-banner-content"><h2>Ready for English, Julia? ✨</h2><p class="quest-intro">Du bist schon richtig gut unterwegs!</p><div class="quest-metrics"><div id="hero-test" class="quest-metric"${nextTest?' role="button" tabindex="0"':''}><span class="quest-metric-icon">📅</span><strong>${leftValue}</strong><span>${leftLabel}</span><small>${esc(leftNote)}</small></div><div id="hero-unit" class="quest-metric"${focus?' role="button" tabindex="0"':''}><span class="quest-metric-icon">📚</span><strong>${focus?`${secure}/${total}`:'✓'}</strong><span>${focus?esc(focus.title)+' sicher':'Alle Units sicher'}</span>${unitBar}</div><div class="quest-metric"><span class="quest-metric-icon">🏆</span><strong>${mastered}</strong><span>Insgesamt sicher</span><small>⭐ ${Number(settings.xp||0).toLocaleString('de-AT')} XP</small></div></div><p id="hero-goal" class="quest-goal"${focus&&remaining?' role="button" tabindex="0"':''}>${goalNote}</p></div></section><section class="card quest-training"><h2>Los geht's!</h2><p class="muted quest-training-intro">Was möchtest du heute trainieren?</p><label for="unit">Training</label><select id="unit">${focus&&remaining?`<option value="targeted">🎯 Schwierige und unsichere Wörter üben (${esc(focus.title)})</option>`:''}<option value="daily">🌟 Tagestraining – alle Units</option>${activeUnits().map(u=>`<option value="${esc(u.id)}">${esc(u.title)}</option>`).join('')}</select><label for="direction">Abfragerichtung</label><select id="direction"><option value="de-en">Deutsch → Englisch</option><option value="both">Beide Richtungen</option><option value="en-de">Englisch → Deutsch</option></select><label for="count">Anzahl Wörter</label><select id="count"><option value="10">10 Wörter</option><option value="20">20 Wörter</option><option value="999">Alle verfügbaren</option></select><div class="buttons" style="margin-top:18px"><button id="start">▶ Lernen starten</button><button id="overview" class="secondary">📊 Mein Lernstand · Tests · Erfolge</button><button id="manage" class="secondary">⚙️ Units und Backup</button></div></section>`;
 if(nextTest)bindHeroAction('#hero-test',()=>days<0?schoolResult(nextTest.u.id):targetedTraining(nextTest.u.id,true));
 if(focus)bindHeroAction('#hero-unit',()=>{unitDashboard(focus.id);document.querySelectorAll('details').forEach(d=>d.open=true)});
 if(focus&&remaining)bindHeroAction('#hero-goal',()=>quickPractice(focus.id));
 $('#unit').onchange=e=>applyTheme(e.target.value==='targeted'?'daily':e.target.value);
 $('#start').onclick=()=>{if($('#unit').value==='targeted'&&focus){const groups=unitScore(focus),candidates=[...groups.hard,...groups.unsure];if(!candidates.length)return alert('Alle Wörter dieser Unit sind bereits sicher!');const n=Number($('#count').value),dir=$('#direction').value;const chosen=shuffle(candidates).slice(0,n);session={queue:chosen.map(w=>w.id),voluntaryIds:new Set(chosen.map(w=>w.id)),index:0,dir,review:[],seen:0,correct:0,finished:false,initialMC:[],mcPass:0,writingPass:true,forceWrite:true,mock:false,unitId:focus.id};question()}else start()};
 $('#overview').onclick=overview;$('#manage').onclick=manage;
 applyTheme('daily');
}

function bindHeroAction(selector,action){const el=$(selector);el.onclick=action;el.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();action()}}}
function quickPractice(id){
 cancelAutoAdvance();const u=activeUnits().find(u=>u.id===id);if(!u)return home();
 const groups=unitScore(u),targets=shuffle([...groups.hard,...groups.unsure]).slice(0,10);
 if(!targets.length)return home();
 const ids=new Set(targets.map(w=>w.id));
 const extras=shuffle(all().filter(w=>!ids.has(w.id)&&stat(w.id).stage>=2)).slice(0,Math.min(3,Math.max(0,10-targets.length)));
 const chosen=shuffle([...targets,...extras]);
 session={queue:chosen.map(w=>w.id),voluntaryIds:new Set(chosen.filter(w=>stat(w.id).due>today()).map(w=>w.id)),index:0,dir:'de-en',review:[],seen:0,correct:0,finished:false,initialMC:[],mcPass:0,writingPass:true,forceWrite:true,mock:false,unitId:id};question();
}

function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function start(){const unit=$('#unit').value,dir=$('#direction').value,n=Number($('#count').value);let a=all().filter(w=>unit==='daily'||w.unit===unit);if(!a.length)return alert('Keine Vokabeln vorhanden');let due=shuffle(a.filter(w=>stat(w.id).due<=today())).sort((a,b)=>(stat(a.id).stage-stat(b.id).stage));let other=shuffle(a.filter(w=>stat(w.id).due>today())).sort((x,y)=>{const sx=stat(x.id),sy=stat(y.id);return Number(!!sx.schoolMastered)-Number(!!sy.schoolMastered)||sx.stage-sy.stage});let chosen=[...due,...other].slice(0,n);if(!chosen.length)return alert('Keine Vokabeln vorhanden');applyTheme(unit);session={queue:chosen.map(w=>w.id),voluntaryIds:new Set(chosen.filter(w=>stat(w.id).due>today()).map(w=>w.id)),index:0,dir,review:[],seen:0,correct:0,finished:false,initialMC:chosen.filter(w=>stat(w.id).stage<2).map(w=>w.id),mcPass:0,writingPass:false};question()}
function question(){cancelAutoAdvance();if(!session)return;applyTheme(byId(session.queue[session.index])?.unit||'daily');let s=session,w=byId(s.queue[s.index]);if(!w){complete();return}s.current=w.id;s.ask=s.dir==='both'?(s.index%2===0?'de-en':'en-de'):s.dir;s.write=!!s.forceWrite||stat(w.id).stage>=2;s.answered=false;const target=s.ask==='de-en'?w.en:w.de.split('|')[0];let choices=shuffle([target,...shuffle(all().filter(x=>x.id!==w.id).map(x=>s.ask==='de-en'?x.en:x.de.split('|')[0]).filter(x=>norm(x)!==norm(target))).filter((v,i,a)=>a.indexOf(v)===i).slice(0,3)]);app.innerHTML=`<section class="card"><div class="flex"><span class="muted small">Frage ${s.index+1} von ${s.queue.length}</span><span class="pill">${s.write?'✍️ Schreiben · 20 XP':'🎯 Multiple Choice · 10 XP'}</span></div><div class="bar" style="margin:16px 0"><div class="fill" style="width:${(s.index+1)/s.queue.length*100}%"></div></div><div class="prompt"><div class="muted small">Übersetze auf ${s.ask==='de-en'?'Englisch':'Deutsch'}</div><strong>${esc(s.ask==='de-en'?w.de.split('|').join(' / '):w.en)}</strong></div>${s.write?`<form id="answerform"><input id="answer" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Deine Übersetzung …" required><button style="margin-top:10px;width:100%">Antwort prüfen</button></form>`:`<div class="answer-grid">${choices.map(c=>`<button class="answer" data-choice="${esc(c)}">${esc(c)}</button>`).join('')}</div>`}<div id="feedback"></div><p class="muted small">${esc(w.unitTitle)}</p></section>`;if(s.write){$('#answerform').onsubmit=e=>{e.preventDefault();check($('#answer').value)};const field=$('#answer');if(field){field.focus({preventScroll:true});if(document.activeElement!==field)requestAnimationFrame(()=>field.focus({preventScroll:true}));setTimeout(()=>{if(session===s&&!s.answered&&document.activeElement!==field)field.focus({preventScroll:true})},80)}}else document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>check(b.dataset.choice))}
function check(value){cancelAutoAdvance();let s=session;if(s.answered)return;s.answered=true;let w=byId(s.current);let variants=answerVariants(s.ask==='de-en'?w.en:w.de);if(s.ask==='de-en'&&w.en==='there is')variants.push("there's");let ok=variants.some(v=>norm(v)===norm(value));s.seen++;if(ok)s.correct++;else if(!s.review.includes(w.id))s.review.push(w.id);if(!s.mock)progressUpdate(w.id,ok,s.write,s.voluntaryIds.has(w.id));if(!ok)s.voluntaryIds.delete(w.id);document.querySelectorAll('.answer').forEach(b=>b.disabled=true);let form=$('#answerform');if(form)form.querySelectorAll('input,button').forEach(x=>x.disabled=true);$('#feedback').innerHTML=`<div class="feedback ${ok?'':'bad'}"><strong>${ok?'🌟 Excellent!':'🔁 Das üben wir noch einmal!'}</strong><p>${ok?'Gut gemacht!':'Richtige Antwort: <strong>'+esc(variants.join(' / '))+'</strong>'}</p><button id="next">Weiter →</button></div>`;const nextButton=$('#next');let advanced=false;nextButton.onclick=()=>{if(advanced||session!==s)return;advanced=true;cancelAutoAdvance();s.index++;if(s.index>=s.queue.length){if(s.review.length&&!s.mock){s.queue=shuffle(s.review);s.review=[];s.index=0}else if(!s.writingPass&&s.initialMC.length){const pending=s.initialMC.filter(id=>stat(id).stage<2);if(pending.length&&s.mcPass<2){s.mcPass++;s.queue=shuffle(pending);s.index=0}else{const ready=s.initialMC.filter(id=>stat(id).stage>=2);if(ready.length){s.writingPass=true;s.queue=shuffle(ready);s.index=0}else{return complete()}}}else{return complete()}}question()};if(ok){nextQuestionTimer=setTimeout(()=>{nextQuestionTimer=null;if(session===s&&s.answered&&!advanced&&document.getElementById('next')===nextButton)nextButton.click()},3000)}}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&session?.answered&&$('#next')&&!e.repeat){e.preventDefault();$('#next').click()}});
function advanceOnEnter(e){if(e.key==='Enter'&&session?.answered&&!e.repeat){e.preventDefault();$('#next')?.click()}}
function complete(){cancelAutoAdvance();if(session&&!session.mock){ensureSettings();let dates=settings.studyDays||[];if(!dates.includes(today()))dates.push(today());settings.studyDays=dates;if(dates.length>=5)award('five-days','🔥 Lernheldin · an 5 Tagen geübt');save()}if(cloudUser)queueCloudSync(150);let s=session;app.innerHTML=`<section class="card" style="text-align:center"><div style="font-size:3rem">🏆</div><h2>Fantastic, Julia!</h2><p><strong>${s.correct} von ${s.seen}</strong> Antworten richtig</p><p>${s.mock?'Probetest – '+Math.round(s.correct/Math.max(1,s.seen)*100)+' % richtig':'Gesamt: ⭐ '+settings.xp+' XP'}</p><div class="buttons"><button id="again">Noch eine Runde</button><button id="home" class="secondary">Zur Startseite</button></div></section>`;$('#again').onclick=()=>s.unitId?unitDashboard(s.unitId):home();$('#home').onclick=home}
function overview(){
 cancelAutoAdvance();session=null;ensureSettings();sortUnits();applyTheme('daily');
 const sc=overallScore(),total=all().length,pct=total?Math.round(all().reduce((sum,w)=>sum+wordLearningPercent(w.id),0)/total):0,securePct=total?Math.round(100*sc.secure.length/total):0;
 app.innerHTML=`<section class="card"><div class="flex"><h2>📊 Mein Lernstand</h2><button id="back" class="secondary">← Zurück</button></div>
 <p class="muted">Lernfortschritt, Vokabeltests und Auszeichnungen an einem Ort.</p>
 <div class="stat"><strong>${sc.secure.length}/${total} · ${pct}%</strong><small>Lernfortschritt · ${securePct}% testsicher</small></div>
 <div class="bar" style="margin:12px 0"><div class="fill" style="width:${pct}%"></div></div>
 <div class="triple"><span>🟢 ${sc.secure.length} sicher</span><span>🟠 ${sc.unsure.length} unsicher</span><span>🔴 ${sc.hard.length} schwierig</span></div>
 ${activeUnits().map(u=>{const g=unitScore(u),t=settings.tests[u.id]||{},p=unitLearningPercent(u),safe=u.words.length?Math.round(100*g.secure.length/u.words.length):0;return `<div class="unit-tile"><div class="flex"><strong>${esc(u.title)}</strong><strong>${p}% gelernt · ${safe}% sicher</strong></div><div class="bar"><div class="fill" style="width:${p}%"></div></div><div class="small muted">🟢 ${g.secure.length} · 🟠 ${g.unsure.length} · 🔴 ${g.hard.length}${t.date?' · Test: '+esc(longDate(t.date)):''}${t.result?' · Schule: '+t.result.correct+'/'+t.result.total:''}</div><button data-dashboard="${esc(u.id)}">Unit ansehen & üben →</button></div>`}).join('')}
 <h3>🏅 Meine Erfolge</h3>${settings.awards.length?settings.awards.map(a=>`<div class="wordrow"><span>${esc(a.title)}</span><small>${esc(longDate(a.date))}</small></div>`).join(''):'<p class="muted">Hier erscheinen Julias Auszeichnungen.</p>'}
 </section>`;
 $('#back').onclick=home;document.querySelectorAll('[data-dashboard]').forEach(b=>b.onclick=()=>unitDashboard(b.dataset.dashboard));
}

const THEMES=[['#147eae','#e6f7ff','#d0effb'],['#8752bb','#f4eafd','#e8d4fb'],['#d47a1b','#fff0dc','#ffe1ae'],['#168a74','#e4faf2','#c3f1e2'],['#d44975','#fff0f5','#fbd5e3'],['#3b6bc7','#eaf1ff','#cddfff']];
function themeFor(id){let n=Number((String(id).match(/\d+/)||[])[0]);return THEMES[Number.isFinite(n)&&n>0?(n-1)%THEMES.length:0]}
function applyTheme(id){let [accent,pale,soft]=themeFor(id);document.documentElement.style.setProperty('--accent',accent);document.documentElement.style.setProperty('--pale',pale);document.documentElement.style.setProperty('--soft',soft)}
// Single classification for home, unit dashboards, and focused practice.
function wordStatus(id){
 const st=stat(id);
 if(st.schoolMastered)return 'secure';
 if((st.writeStreak||0)>=2 || (st.stage>=5 && st.lastWriteOk!==false))return 'secure';
 if(st.stage<2 || st.lastWriteOk===false || (st.wrong||0)>(st.correct||0))return 'hard';
 return 'unsure';
}
function wordLearningPercent(id){
 const st=stat(id);
 if(st.schoolMastered)return 100;
 const mc=st.mcCorrect??Math.min(2,st.correct||0);
 const writing=st.writeCorrect??Math.max(0,(st.correct||0)-mc);
 const base=mc<=0?0:mc===1?15:30;
 let score=base;
 if(writing>=1)score=Math.max(score,50);
 if(writing>=2)score=Math.max(score,75);
 if(wordStatus(id)==='secure')score=100;
 return score;
}
function unitLearningPercent(u){return u.words.length?Math.round(u.words.reduce((sum,w)=>sum+wordLearningPercent(w.id),0)/u.words.length):0}
function unitScore(u){const groups={secure:[],unsure:[],hard:[]};for(const w of u.words)groups[wordStatus(w.id)].push(w);return groups}
function overallScore(){const groups={secure:[],unsure:[],hard:[]};for(const u of activeUnits()){const sc=unitScore(u);for(const key of Object.keys(groups))groups[key].push(...sc[key])}return groups}

function award(id,title){ensureSettings();if(!settings.awards.some(a=>a.id===id))settings.awards.push({id,title,date:today()})}
async function checkAppUpdate(){
 const button=document.getElementById('checkupdate');
 if(button)button.disabled=true;
 try{
   // version.json is never served by the service-worker cache.
   const url=new URL('./version.json',location.href);
   url.searchParams.set('_',String(Date.now()));
   const response=await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(!/^\d+\.\d+\.\d+$/.test(data.version||''))throw Error('Ungültige Versionsdatei');
   const cmp=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]-y[i]}return 0};
   if(cmp(data.version,APP_VERSION)>0){
     if(confirm('Version '+data.version+' ist verfügbar (installiert: '+APP_VERSION+'). Jetzt aktualisieren?')){
       if('serviceWorker' in navigator){
         const reg=await navigator.serviceWorker.getRegistration();
         if(reg){await reg.update();if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'})}
       }
       location.reload();
     }
   }else if(cmp(data.version,APP_VERSION)===0){
     alert('Version '+APP_VERSION+' ist aktuell.');
   }else{
     alert('Geladene Version: '+APP_VERSION+'. Der Server meldet noch '+data.version+'. Bitte GitHub Pages prüfen.');
   }
 }catch(e){alert('Versionsprüfung nicht möglich: '+e.message+'\\nBitte Internetverbindung und version.json auf GitHub prüfen.')}
 finally{if(button)button.disabled=false}
}

function testHub(){overview()}

function unitDashboard(id){cancelAutoAdvance();ensureSettings();session=null;let u=activeUnits().find(x=>x.id===id);if(!u)return testHub();applyTheme(id);let t=settings.tests[id]||{},sc=unitScore(u),pct=unitLearningPercent(u),safePct=u.words.length?Math.round(sc.secure.length/u.words.length*100):0;let days=t.date?Math.ceil((new Date(t.date+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000):null;
app.innerHTML=`<section class="card"><div class="flex"><h2>📚 ${esc(u.title)}</h2><button id="back" class="secondary">← Alle Units</button></div><p class="muted">${t.date?'📅 '+esc(longDate(t.date))+' · ':''}${days===null?'Noch kein Testdatum':days>0?'Noch '+days+' Tage bis zum Vokabeltest':days===0?'Heute ist Vokabeltest!':'Vokabeltest liegt '+Math.abs(days)+' Tage zurück'}</p><div class="stat" style="margin-bottom:12px"><strong>${pct} %</strong><small>Lernfortschritt · ${safePct}% testsicher (Trainer-Einschätzung)</small></div><div class="bar"><div class="fill" style="width:${pct}%"></div></div><div class="triple"><span>🟢 ${sc.secure.length} sicher</span><span>🟠 ${sc.unsure.length} unsicher</span><span>🔴 ${sc.hard.length} schwierig</span></div><label for="testdate">Datum des Vokabeltests</label><input type="date" id="testdate" value="${esc(t.date||'')}"><button id="savedate" class="secondary" style="margin-top:8px">Datum speichern</button><h3>Gezielt üben</h3><div class="buttons"><button id="hard">🎯 Schwierige & unsichere Wörter</button><button id="mock" class="secondary">✍️ Probetest (nur Schreiben)</button><button id="school" class="secondary">🏫 Schulergebnis eintragen</button></div><h3>Wörter nach Lernstand</h3>${[['🔴 Schwierig',sc.hard],['🟠 Unsicher',sc.unsure],['🟢 Sicher',sc.secure]].map(([name,words])=>`<details ${name.includes('Schwierig')?'open':''}><summary>${name} (${words.length})</summary>${words.map(w=>`<div class="wordrow"><div><strong>${esc(w.en)}</strong><br><small>${esc(w.de.replaceAll('|',' / '))}</small></div><small>✓ ${stat(w.id).correct||0} richtig · ✗ ${stat(w.id).wrong||0} falsch<br>MC ✓ ${stat(w.id).mcCorrect??'–'} / ✗ ${stat(w.id).mcWrong??'–'} · Schreiben ✓ ${stat(w.id).writeCorrect??'–'} / ✗ ${stat(w.id).writeWrong??'–'}<br>${wordLearningPercent(w.id)}% gelernt</small></div>`).join('')||'<p class="muted small">Keine Wörter in dieser Gruppe.</p>'}</details>`).join('')}</section>`;
$('#back').onclick=overview;$('#savedate').onclick=async()=>{settings.tests[id] ||= {};settings.tests[id].date=$('#testdate').value;await save();unitDashboard(id)};$('#hard').onclick=()=>targetedTraining(id,false);$('#mock').onclick=()=>targetedTraining(id,true);$('#school').onclick=()=>schoolResult(id)}
function targetedTraining(id,mock){let u=activeUnits().find(x=>x.id===id);if(!u)return;let groups=unitScore(u),words=mock?u.words:[...groups.hard,...groups.unsure];if(!words.length)words=u.words;if(!words.length)return;applyTheme(id);session={queue:shuffle(words).map(w=>w.id),voluntaryIds:new Set(words.map(w=>w.id)),index:0,dir:'de-en',review:[],seen:0,correct:0,finished:false,initialMC:[],mcPass:0,writingPass:true,forceWrite:true,mock,unitId:id};question()}
function schoolResult(id){cancelAutoAdvance();ensureSettings();let u=activeUnits().find(x=>x.id===id);if(!u)return;applyTheme(id);let t=settings.tests[id]||{},r=t.result||{};app.innerHTML=`<section class="card"><div class="flex"><h2>🏫 ${esc(u.title)} – Schulergebnis</h2><button id="back" class="secondary">← Zurück</button></div><p>Wie viele Wörter waren im Schultest richtig? Bei <strong>mehr als 50 %</strong> wird die ganze Unit als schulisch beherrscht markiert – außer den ausdrücklich ausgewählten Fehlerwörtern.</p><label for="correct">Richtige Antworten</label><input id="correct" type="number" min="0" step="1" value="${r.correct??''}"><label for="total">Aufgaben insgesamt</label><input id="total" type="number" min="1" step="1" value="${r.total??u.words.length}"><div id="resultPreview"></div><div class="buttons"><button id="saveResult">Schulergebnis speichern</button></div></section>`;
$('#back').onclick=()=>unitDashboard(id);let preview=()=>{let n=Number($('#correct').value),total=Number($('#total').value),valid=$('#correct').value!==''&&Number.isInteger(n)&&Number.isInteger(total)&&total>0&&n>=0&&n<=total;let p=valid?Math.round(n/total*1000)/10:0;let passed=valid&&n/total>.5;let wrong=valid?total-n:0;$('#resultPreview').innerHTML=!valid?'<p class="feedback bad">Bitte gültige Zahlen eingeben.</p>':`<div class="feedback"><strong>${p} % · ${n}/${total}</strong><p>${passed?wrong?'Bitte wähle die im Test falschen Vokabeln. Alle anderen Wörter dieser Unit werden schulisch beherrscht.':'Alle Wörter dieser Unit werden schulisch beherrscht.':'50 % oder weniger: Kein neuer Schulisch-beherrscht-Status wird vergeben.'}</p></div>${passed&&wrong?`<p><strong>Fehlerwörter auswählen</strong> (${wrong} Fehler im Schultest; falls Wörter mehrfach vorkamen oder nicht in der Unit stehen, können weniger Einträge ausgewählt werden.)</p><div class="error-list">${u.words.map(w=>`<label class="error-choice"><input type="checkbox" class="errorword" value="${esc(w.id)}" ${r.errors?.includes(w.id)?'checked':''}> ${esc(w.en)} <small>– ${esc(w.de.replaceAll('|',' / '))}</small></label>`).join('')}</div><p class="muted small">Nur ausdrücklich markierte Wörter bleiben aktiv. Wenn die Fehler nicht zuordenbar sind, bitte erst klären und dann speichern.</p>`:''}`;};$('#correct').oninput=preview;$('#total').oninput=preview;preview();
$('#saveResult').onclick=async()=>{let n=Number($('#correct').value),total=Number($('#total').value);if($('#correct').value===''||!Number.isInteger(n)||!Number.isInteger(total)||total<=0||n<0||n>total)return alert('Bitte gültige Zahlen eingeben.');let passed=n/total>.5,errors=[...document.querySelectorAll('.errorword:checked')].map(e=>e.value);if(passed&&n<total&&errors.length===0)return alert('Bitte mindestens ein Fehlerwort auswählen.');if(passed&&errors.length>total-n)return alert('Mehr Fehlerwörter ausgewählt als Fehler im Test.');if(!confirm(`Schulergebnis ${n}/${total} speichern? ${passed?'Alle Wörter außer den markierten Fehlerwörtern werden schulisch beherrscht.':'Bei höchstens 50 % bleiben die bisherigen Lernstände unverändert.'}`))return;
settings.tests[id]||={};let previous=settings.tests[id].result;settings.tests[id].result={correct:n,total,date:today(),errors};if(passed){for(let w of u.words){let st={...stat(w.id)};if(errors.includes(w.id)){st.schoolMastered=false;st.stage=Math.min(st.stage,2);st.reviewStep=0;st.due=today()}else{st.schoolMastered=true;st.stage=5;st.reviewStep=0;st.due=plusDays(7)}progress[w.id]=st}}
award('school-'+id+'-'+n+'-'+total,n===total?'🏆 Goldener Vokabelstar · '+u.title:n/total>=.9?'🥇 Vokabel-Champion · '+u.title:'🌟 Schultest geschafft · '+u.title);if(!previous)settings.xp+=(n===total?150:n/total>=.9?100:n/total>.5?50:20);await save();alert('🎉 Ergebnis gespeichert! Deine Belohnung wurde vergeben.');unitDashboard(id)}}
function manage(){cancelAutoAdvance();sortUnits();app.innerHTML=`<section class="card"><div class="flex"><h2>⚙️ Units & Backup</h2><button id="back" class="secondary">← Zurück</button></div><p class="muted small">Neue Units sind zunächst gesperrt. Du kannst sie jederzeit zum Üben freigeben. Bereits freigegebene Units bleiben aktiv.</p>${units.map(u=>`<div class="wordrow"><div><strong>${isReleased(u)?'📖':'🔒'} ${esc(u.title)}</strong><br><small>${u.words.length} Wörter · ${isReleased(u)?'Zum Üben freigegeben':'Noch nicht freigegeben'}</small></div>${isReleased(u)?'<span class="muted small">✓ Aktiv</span>':`<button class="secondary" data-release="${esc(u.id)}">🔓 Zum Üben freigeben</button>`}</div>`).join('')}<h3>Neue Unit importieren</h3><p class="muted small">JSON-Datei mit Unit-ID, Titel und englisch/deutschen Vokabeln. Bereits gelernte Wörter bleiben erhalten.</p><label class="filelabel" for="unitfile">📥 Unit-JSON auswählen</label><input id="unitfile" type="file" accept=".json,application/json"><h3>Firebase – Gerätesynchronisierung</h3><p class="muted small">Automatische Anmeldung nach Neustart. Der Lernstand bleibt offline verfügbar. Bei konkurrierenden Änderungen werden Daten niemals automatisch überschrieben.</p><p id="cloud-info" class="muted small">${cloudStatusText()}</p><div class="buttons"><button id="cloud-login" class="secondary">🔐 Mit Google anmelden</button><button id="cloud-now" class="secondary" ${cloudUser?'':'disabled'}>☁️ Jetzt synchronisieren</button><button id="cloud-diagnostic" class="secondary">🔎 Verbindungsdiagnose</button></div><h3>Gesamten Lernstand sichern</h3><div class="buttons"><button id="export">💾 Backup herunterladen</button><label class="filelabel" for="backupfile">📂 Backup wiederherstellen</label><input id="backupfile" type="file" accept=".json,application/json"></div><p class="muted small">Beim Wiederherstellen werden die aktuellen Daten ersetzt. Erstelle vorher ein Backup.</p><h3>Importformat</h3><p class="muted small">Siehe beiliegende Datei BEISPIEL-UNIT-IMPORT.json.</p></section>`;$('#back').onclick=home;$('#cloud-login').onclick=cloudLogin;$('#cloud-now').onclick=()=>cloudSync(true);$('#cloud-diagnostic').onclick=cloudDiagnostics;updateCloudStatus();document.querySelectorAll('[data-release]').forEach(b=>b.onclick=async()=>{const u=units.find(x=>x.id===b.dataset.release);if(!u||isReleased(u))return;u.released=true;await save();manage()});$('#export').onclick=()=>download('julia-english-quest-backup-'+today()+'.json',{format:'julia-english-quest-backup',version:1,units,progress,settings});$('#unitfile').onchange=async e=>{try{let raw=JSON.parse(await e.target.files[0].text());let incoming=initUnits(raw.units||[raw]);for(let u of incoming){let existing=units.find(x=>x.id===u.id);if(existing){let ids=new Set(existing.words.map(w=>w.id));for(let w of u.words){if(!ids.has(w.id))existing.words.push(w)}}else{u.released=false;units.push(u)}}sortUnits();await save();alert('Unit erfolgreich importiert!');manage()}catch(err){alert('Import fehlgeschlagen: '+err.message)}};$('#backupfile').onchange=async e=>{try{let raw=JSON.parse(await e.target.files[0].text());if(raw.format!=='julia-english-quest-backup'||!Array.isArray(raw.units)||!raw.progress||!raw.settings)throw Error('Ungültiges Backup');if(!confirm('Aktuelle Daten durch das Backup ersetzen?'))return;units=raw.units;progress=raw.progress;settings=raw.settings;ensureSettings();sortUnits();await save();alert('Backup wiederhergestellt');home()}catch(err){alert('Wiederherstellung fehlgeschlagen: '+err.message)}}}
function download(name,obj){let blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}

// Firebase Authentication persists the user session across PWA restarts.
// The learning database remains local (IndexedDB), including offline use.
const cloudPayload=()=>({format:'julia-english-quest-backup',version:1,units,progress,settings});
// Firestore normalizes map key ordering. Canonicalize nested objects before comparing.
// Older versions stored the raw JSON string as baseline; normalize that too.
function cloudCanonical(value){
 if(Array.isArray(value))return value.map(cloudCanonical);
 if(value&&typeof value==='object'){
  const sorted={};for(const key of Object.keys(value).sort()){
   if(value[key]!==undefined)sorted[key]=cloudCanonical(value[key]);
  }return sorted;
 }
 return value;
}
const cloudDigest=o=>JSON.stringify(cloudCanonical(o));
function cloudNormalizeBaseline(value){
 if(!value)return null;
 try{return cloudDigest(JSON.parse(value))}catch(e){return null}
}
const cloudBaselineKey=uid=>'firebase-baseline-'+uid;
function cloudStatusText(){
 if(!FIREBASE_CONFIG)return 'Firebase-Konfiguration fehlt.';
 if(!cloudAuthReady)return 'Firebase-Anmeldung wird geprüft …';
 if(!cloudUser)return 'Nicht angemeldet – alle Lernstände bleiben lokal erhalten.';
 return cloudMessage||(cloudBusy?'Firebase synchronisiert …':cloudDirty?'Lokale Änderungen warten auf Synchronisierung.':'Firebase verbunden · '+(cloudUser.email||'Google-Konto'));
}
function updateCloudStatus(message){
 if(message!==undefined)cloudMessage=message;
 const e=$('#cloud-info');if(e)e.textContent=cloudStatusText();
 const s=$('#status');if(s)s.textContent=cloudUser?'☁️ Firebase verbunden':cloudAuthReady?'Offline bereit':'☁️ Anmeldung prüfen';
 const login=$('#cloud-login');if(login){login.textContent=cloudUser?'🔌 Abmelden':'🔐 Mit Google anmelden';login.onclick=cloudUser?cloudLogout:cloudLogin;login.disabled=!cloudAuthReady;}
 const sync=$('#cloud-now');if(sync)sync.disabled=!cloudUser||cloudBusy;
}
function cloudDiagnostics(){alert(['Firebase-Diagnose · '+APP_VERSION,'SDK: '+(cloudAuth?'geladen':'nicht geladen'),'Anmeldung geprüft: '+(cloudAuthReady?'ja':'nein'),'Angemeldet: '+(cloudUser?.email||'nein'),'Benutzer-ID: '+(cloudUser?.uid||'–'),'Lokale Änderungen: '+(cloudDirty?'ja':'nein'),'Synchronisierung läuft: '+(cloudBusy?'ja':'nein'),'Vergleichsbasis: '+(cloudBaseline?'vorhanden':'nicht vorhanden'),'Status: '+cloudStatusText()].join('\n'))}
async function cloudInit(){
 try{
  if(!window.firebase||!FIREBASE_CONFIG)throw Error('Firebase-SDK oder Konfiguration fehlt');
  if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);
  cloudAuth=firebase.auth();cloudStore=firebase.firestore();
  await cloudAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  cloudAuth.onAuthStateChanged(async user=>{
   cloudUser=user;cloudAuthReady=true;cloudMessage='';
   clearTimeout(cloudTimer);cloudBaseline=user?cloudNormalizeBaseline(await get(cloudBaselineKey(user.uid))):null;
   updateCloudStatus();
   if(user)queueCloudSync(1200);
  },error=>{cloudAuthReady=true;updateCloudStatus('Anmeldefehler: '+error.message)});
 }catch(e){cloudAuthReady=true;updateCloudStatus('Firebase nicht verfügbar: '+e.message);console.warn(e)}
}
async function cloudLogin(){
 if(!cloudAuth)return alert('Firebase ist noch nicht geladen. Bitte Verbindung prüfen.');
 try{await cloudAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider())}
 catch(e){updateCloudStatus('Anmeldung fehlgeschlagen: '+e.message);alert('Google-Anmeldung fehlgeschlagen: '+e.message)}
}
async function cloudLogout(){
 if(cloudDirty&&!confirm('Lokale Änderungen sind möglicherweise noch nicht synchronisiert. Trotzdem abmelden?'))return;
 await cloudAuth.signOut();cloudUser=null;cloudBaseline=null;updateCloudStatus();manage();
}
function queueCloudSync(delay=2500){
 if(!cloudUser)return;
 if(cloudBusy){cloudPending=true;return}
 clearTimeout(cloudTimer);
 cloudTimer=setTimeout(()=>cloudSync(false).catch(e=>{console.warn(e);updateCloudStatus('Synchronisierung fehlgeschlagen: '+e.message)}),delay);
}
async function cloudApply(data){
 if(session)throw Error('Bitte zuerst die laufende Lernrunde beenden.');
 if(!data||data.format!=='julia-english-quest-backup'||!Array.isArray(data.units)||!data.progress||!data.settings)throw Error('Ungültiger Firebase-Lernstand');
 units=data.units;progress=data.progress;settings=data.settings;ensureSettings();sortUnits();
 await Promise.all([put('units',units),put('progress',progress),put('settings',settings)]);home();
}
async function cloudSync(interactive=false){
 if(!cloudUser||cloudBusy||!navigator.onLine)return;
 const user=cloudUser;cloudBusy=true;const startRevision=cloudLocalRevision;updateCloudStatus();
 try{
  const ref=cloudStore.collection('users').doc(user.uid).collection('data').doc('learning');
  // Read from server so an old offline cache cannot overwrite a newer device.
  const snap=await ref.get({source:'server'});
  if(cloudUser!==user)return;
  const remote=snap.exists?snap.data().payload:null;
  if(remote&&(!Array.isArray(remote.units)||!remote.progress||!remote.settings))throw Error('Firebase-Datenformat ungültig');
  const local=cloudPayload(),localHash=cloudDigest(local),remoteHash=remote?cloudDigest(remote):null;
  const baseline=cloudBaseline;
  if(remoteHash===localHash){cloudBaseline=localHash;await put(cloudBaselineKey(user.uid),localHash);cloudDirty=cloudLocalRevision!==startRevision;updateCloudStatus('✓ Beide Geräte auf demselben Lernstand.');return}
  let action=null;
  if(!remote){action='upload'}
  else if(baseline===localHash){action='download'}
  else if(baseline===remoteHash){action='upload'}
  else if(interactive){
   const choice=prompt('Unterschiedliche Lernstände in Firebase und auf diesem Gerät.\n\nDRIVE = Firebase-Lernstand übernehmen\nLOKAL = lokalen Lernstand hochladen\nAbbrechen = nichts ändern\n\nACHTUNG: Vor dem Ersetzen nach Möglichkeit beide Stände sichern.','');
   if(choice?.trim().toUpperCase()==='DRIVE')action='download';
   if(choice?.trim().toUpperCase()==='LOKAL')action='upload';
  }
  if(!action){updateCloudStatus('⚠️ Unterschiedliche Lernstände. In „Units & Backup“ auf „Jetzt synchronisieren“ klicken.');return}
  if(action==='download'){
   if(cloudLocalRevision!==startRevision)throw Error('Während des Downloads wurden neue Lernfortschritte gespeichert. Bitte erneut synchronisieren.');
   await cloudApply(remote);cloudBaseline=remoteHash;await put(cloudBaselineKey(user.uid),remoteHash);cloudDirty=false;
   updateCloudStatus('✓ Lernstand aus Firebase übernommen.');return;
  }
  // Transaction re-checks the server document. Never overwrite a change that
  // arrived after our initial read (including changes from another device).
  await cloudStore.runTransaction(async tx=>{
   const current=await tx.get(ref);
   const now=current.exists?cloudDigest(current.data().payload):null;
   if(now!==remoteHash)throw Error('Firebase hat sich seit dem letzten Serverabruf geändert. Bitte erneut synchronisieren.');
   tx.set(ref,{payload:local,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
  });
  cloudBaseline=localHash;await put(cloudBaselineKey(user.uid),localHash);
  cloudDirty=cloudLocalRevision!==startRevision||cloudDigest(cloudPayload())!==localHash;
  updateCloudStatus(cloudDirty?'Neue lokale Änderungen warten auf Synchronisierung.':'✓ Lernstand in Firebase gespeichert.');
  if(cloudDirty)cloudPending=true;
 }catch(e){updateCloudStatus('Synchronisierung fehlgeschlagen: '+e.message);if(interactive)alert('Synchronisierung fehlgeschlagen: '+e.message)}
 finally{cloudBusy=false;updateCloudStatus();if(cloudPending&&cloudUser===user){cloudPending=false;queueCloudSync(1500)}}
}
window.addEventListener('online',()=>{if(cloudUser)queueCloudSync(500)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&cloudUser)queueCloudSync(500)});
setInterval(()=>{if(cloudUser&&!document.hidden)cloudSync(false).catch(console.warn)},60000);

(async()=>{try{db=await openDB();let initial=await (await fetch('words.json')).json();units=await get('units')||initUnits(initial.units);progress=await get('progress')||{};settings=await get('settings')||settings;ensureSettings();sortUnits();home();showAppVersion();cloudInit().catch(console.warn);if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').then(()=>{updateCloudStatus()}).catch(()=>{$('#status').textContent='Offline-Installation prüfen'})}catch(e){app.innerHTML='<section class="card"><h2>Start nicht möglich</h2><p>Bitte die App über localhost oder eine HTTPS-Adresse öffnen. Details: '+esc(e.message)+'</p></section>'}})();
