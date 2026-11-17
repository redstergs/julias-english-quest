#!/usr/bin/env python3
"""Run in the Julia's English Quest repository: python quest-update-9.12.8.py"""
from pathlib import Path
import sys, shutil, subprocess, tempfile
root = Path(sys.argv[1]) if len(sys.argv)>1 else Path.cwd()
paths = ['app.js','index.html','sw.js','version.json']
original = {p:(root/p).read_text(encoding='utf-8') for p in paths}
s = original['app.js']
def rep(a,b):
    global s
    if s.count(a)!=1:
        raise SystemExit('Abbruch: Ausgangscode stimmt nicht überein: '+a[:100])
    s=s.replace(a,b,1)
rep("const APP_VERSION='9.12.7'", "const APP_VERSION='9.12.8'")
rep('function manage(){', '''function unitHasLearning(u){return !!settings.tests?.[u.id]?.result||u.words.some(w=>Object.prototype.hasOwnProperty.call(progress,w.id))}
function canRelock(u){return isReleased(u)&&!unitHasLearning(u)}
function manage(){''')
rep('Bereits freigegebene Units bleiben aktiv.', 'Noch nicht geübte Units kannst du wieder sperren.')
rep('isReleased(u)?\'<span class="muted small">✓ Aktiv</span>\':', '''isReleased(u)?(canRelock(u)?`<button class="secondary" data-relock="${esc(u.id)}">🔒 Wieder sperren</button>`:'<span class="muted small">✓ Aktiv · Lernstand geschützt</span>'):''')
rep("$('#export').onclick=()=>download", '''document.querySelectorAll('[data-relock]').forEach(b=>b.onclick=async()=>{const u=units.find(x=>x.id===b.dataset.relock);if(!u||!canRelock(u))return;if(!confirm(u.title+' wieder sperren?'))return;u.released=false;await save();manage()});$('#export').onclick=()=>download''')
rep('Bereits gelernte Wörter bleiben erhalten.', 'Gesperrte Units ohne Lernstand können vollständig ersetzt werden. Aktive Units sind geschützt.')
rep('for(let u of incoming){let existing=units.find(x=>x.id===u.id);if(existing){let ids=new Set(existing.words.map(w=>w.id));for(let w of u.words){if(!ids.has(w.id))existing.words.push(w)}}else{u.released=false;units.push(u)}}', '''if(new Set(incoming.map(u=>u.id)).size!==incoming.length)throw Error('Doppelte Unit-ID');for(const u of incoming){const existing=units.find(x=>x.id===u.id);if(existing&&(isReleased(existing)||unitHasLearning(existing)))throw Error(existing.title+' ist aktiv oder hat einen Lernstand');}const replacements=incoming.filter(u=>units.some(x=>x.id===u.id));if(replacements.length&&!confirm('Gesperrte Units vollständig ersetzen: '+replacements.map(u=>u.title).join(', ')+'?'))return;for(const u of incoming){u.released=false;const i=units.findIndex(x=>x.id===u.id);if(i>=0)units[i]=u;else units.push(u)}''')
updated = {'app.js':s}
for p in paths[1:]:
    if '9.12.7' not in original[p]:
        raise SystemExit('Abbruch: Versionsnummer fehlt in '+p)
    updated[p]=original[p].replace('9.12.7','9.12.8').replace('9-12-7','9-12-8')
if shutil.which('node'):
    with tempfile.TemporaryDirectory() as tmp:
        for p in ['app.js','sw.js']:
            f=Path(tmp)/p; f.write_text(updated[p],encoding='utf-8')
            subprocess.run(['node','--check',str(f)],check=True)
else:
    print('Hinweis: Node.js fehlt; JavaScript-Syntaxprüfung übersprungen.')
backup=root.parent/(root.resolve().name+'-backup-9.12.7')
if backup.exists():
    raise SystemExit('Abbruch: Backup-Ordner existiert bereits: '+str(backup))
backup.mkdir()
for p in paths:
    shutil.copy2(root/p,backup/p)
for p in paths:
    (root/p).write_text(updated[p],encoding='utf-8')
print('Update 9.12.8 installiert im lokalen Repository. Backup:',backup)
print('Bitte Änderungen überprüfen, committen und zu GitHub pushen.')
