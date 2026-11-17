#!/usr/bin/env python3
"""Run in a checkout of Julia's English Quest 9.12.7 (or pass its path)."""
from pathlib import Path
import sys
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path.cwd()
paths=['app.js','index.html','sw.js','version.json']
files={p:(root/p).read_text(encoding='utf-8') for p in paths}
old="for(let u of incoming){let existing=units.find(x=>x.id===u.id);if(existing){let ids=new Set(existing.words.map(w=>w.id));for(let w of u.words){if(!ids.has(w.id))existing.words.push(w)}}else{u.released=false;units.push(u)}}"
helper=r'''function canReplaceUnit(u){return !isReleased(u)&&!settings.tests?.[u.id]?.result&&!u.words.some(w=>Object.prototype.hasOwnProperty.call(progress,w.id))}
function planUnitImport(incoming,choose){
  const next=units.map(u=>({...u,words:[...u.words]})), seen=new Set();
  for(const u of incoming){
    if(typeof u.id!=='string'||!u.id.trim()||typeof u.title!=='string'||!u.title.trim()||!u.words.length||seen.has(u.id))throw Error('Ungültige oder doppelte Unit');
    seen.add(u.id);
    const ids=new Set();
    for(const w of u.words){
      if(typeof w.id!=='string'||!w.id.trim()||typeof w.en!=='string'||!w.en.trim()||typeof w.de!=='string'||!w.de.trim()||ids.has(w.id))throw Error('Ungültige oder doppelte Vokabel in '+u.title);
      ids.add(w.id);
    }
    if(next.some(other=>other.id!==u.id&&other.words.some(w=>ids.has(w.id))))throw Error('Vokabel-ID gehört zu einer anderen Unit');
    const existing=next.find(x=>x.id===u.id);
    if(!existing){next.push({...u,released:false});continue}
    const mode=choose(existing,u,canReplaceUnit(existing));
    if(mode==='cancel')return null;
    if(mode==='replace'){
      if(!canReplaceUnit(existing))throw Error('Diese Unit kann nicht ersetzt werden');
      if(u.words.some(w=>Object.prototype.hasOwnProperty.call(progress,w.id)))throw Error('Import enthält Vokabeln mit vorhandenem Lernstand');
      Object.assign(existing,u,{released:false});
    }else if(mode==='append'){
      const oldIds=new Set(existing.words.map(w=>w.id));
      for(const w of u.words)if(!oldIds.has(w.id))existing.words.push(w);
    }else throw Error('Unbekannter Importmodus');
  }
  return next;
}
function chooseUnitImport(existing,incoming,replaceAllowed){
  if(replaceAllowed&&confirm(existing.title+' vollständig ersetzen?\n'+existing.words.length+' bisherige → '+incoming.words.length+' neue Wörter.\nOK: Ersetzen · Abbrechen: weitere Optionen'))return 'replace';
  return confirm(existing.title+' ergänzen? Bestehende Vokabeln bleiben erhalten.\nOK: Ergänzen · Abbrechen: Import abbrechen')?'append':'cancel';
}
'''
app=files['app.js']
if "APP_VERSION='9.12.7'" not in app: sys.exit('Abbruch: Erwartet wird Version 9.12.7.')
changes=[('function manage(){',helper+'function manage(){'),(old,'const next=planUnitImport(incoming,chooseUnitImport);if(!next)return;units=next;'),('Neue Unit importieren','Unit importieren, ergänzen oder ersetzen'),('Bereits gelernte Wörter bleiben erhalten.','Noch nicht freigegebene Units können vollständig ersetzt werden. Freigegebene Units können nur ergänzt werden.'),("catch(err){alert('Import fehlgeschlagen: '+err.message)}}","catch(err){alert('Import fehlgeschlagen: '+err.message)}finally{e.target.value=''}}")]
for a,b in changes:
    if app.count(a)!=1: sys.exit('Abbruch: Quellcode stimmt nicht mit erwarteter Version überein: '+a[:70])
    app=app.replace(a,b,1)
files['app.js']=app
for p,s in files.items():
    if '9.12.7' not in s and '9-12-7' not in s: sys.exit('Abbruch: Versionskennung fehlt in '+p)
files={p:s.replace('9.12.7','9.12.8').replace('9-12-7','9-12-8') for p,s in files.items()}
for p,s in files.items(): (root/p).write_text(s,encoding='utf-8')
print('Version 9.12.8 vorbereitet. Bitte git diff und node --check app.js ausführen.')
