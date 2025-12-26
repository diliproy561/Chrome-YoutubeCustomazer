let posX=0, posY=0; const STEP=50;
function switchTab(id) {
    document.querySelectorAll('.content').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(e => e.classList.remove('active'));
    if(id==='main') { document.getElementById('view-main').classList.add('active'); document.getElementById('t-main').classList.add('active'); }
    else { document.getElementById('view-pin').classList.add('active'); document.getElementById('t-pin').classList.add('active'); }
}
function updatePos(dx, dy, isReset) {
    if(isReset) { posX=0; posY=0; document.getElementById('rng-vertical').value=0; }
    else { posX+=dx; posY+=dy; if(dy!==0) document.getElementById('rng-vertical').value=posY; }
    save();
}
function save() {
    const s = {
        width: document.getElementById('rng-size').value,
        stretch: document.getElementById('chk-stretch').checked,
        // Keeping variable name 'autoScroll' for compatibility, but it now only means 'Sticky/Scrollable'
        autoScroll: document.getElementById('chk-scroll').checked,
        posX: posX, posY: parseInt(document.getElementById('rng-vertical').value)
    };
    posY = s.posY; 
    document.getElementById('val-size').innerText = s.width + '%';
    chrome.storage.sync.set({settings: s});
    chrome.tabs.query({active:true,currentWindow:true}, t=>{ if(t[0]?.url.includes('youtube')) chrome.tabs.sendMessage(t[0].id, {action:'refresh'}); });
}
function renderPins(pins) {
    const c = document.getElementById('pin-list'); c.innerHTML='';
    if(!pins?.length) { c.innerHTML='<div style="text-align:center;color:#555;padding:15px;font-size:11px">No saved videos.</div>'; return; }
    pins.forEach(p => {
        const d = document.createElement('div'); d.className='pin-item';
        d.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px">${p.name}</span><span class="pin-del" title="Delete">✕</span>`;
        d.querySelector('.pin-del').onclick = () => {
            const newPins = pins.filter(x => x.url !== p.url);
            chrome.storage.sync.set({pins: newPins}, () => { renderPins(newPins); save(); });
        };
        c.appendChild(d);
    });
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('t-main').onclick = () => switchTab('main');
    document.getElementById('t-pin').onclick = () => switchTab('pin');
    ['rng-size','chk-stretch','chk-scroll'].forEach(id=>document.getElementById(id).oninput=save);
    document.getElementById('rng-vertical').oninput=save;
    document.getElementById('btn-left').onclick=()=>updatePos(-STEP,0);
    document.getElementById('btn-right').onclick=()=>updatePos(STEP,0);
    document.getElementById('btn-up').onclick=()=>updatePos(0,-STEP);
    document.getElementById('btn-down').onclick=()=>updatePos(0,STEP);
    document.getElementById('btn-reset').onclick=()=>updatePos(0,0,true);
    document.getElementById('btn-clear').onclick=()=>{ chrome.storage.sync.set({pins:[]}, ()=>{renderPins([]); save();}); };
    chrome.storage.sync.get(['settings','pins'], res => {
        const s = res.settings||{};
        if(s.width) document.getElementById('rng-size').value=s.width;
        if(s.stretch) document.getElementById('chk-stretch').checked=s.stretch;
        if(s.autoScroll) document.getElementById('chk-scroll').checked=s.autoScroll;
        posX=s.posX||0; posY=s.posY||0;
        document.getElementById('rng-vertical').value=posY;
        renderPins(res.pins||[]);
        save();
    });
});