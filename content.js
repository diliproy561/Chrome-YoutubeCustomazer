const styleId = 'yt-master-v37';
let currentPins = [];
let observer = null;
let debounceTimer = null;

function getCSS(s) {
    const w = s.width || 100;
    return `
        ${s.width ? `
            ytd-watch-flexy { 
                --ytd-watch-flexy-player-width: ${w}vw !important; 
                --ytd-watch-flexy-max-player-width: ${w}vw !important; 
                --ytd-watch-flexy-player-height: calc(${w}vw * 0.5625) !important; 
                --ytd-watch-flexy-min-player-height: calc(${w}vw * 0.5625) !important; 
            }
            #columns { 
                position: relative !important; 
                left: ${s.posX||0}px !important; 
                top: ${s.posY||0}px !important; 
                margin: 0 auto !important; 
            }
            .ytp-chrome-bottom { width: 100% !important; left: 0 !important; margin: 0 !important; }
        ` : ''}

        ${s.stretch ? `
            video.html5-main-video { object-fit: fill !important; width: 100% !important; height: 100% !important; }
            .html5-video-container { width: 100% !important; height: 100% !important; }
        ` : ''}

        /* STICKY SIDEBAR CSS: Makes sidebar manually scrollable */
        ${s.autoScroll ? `
            #secondary {
                height: 100vh !important;
                overflow-y: auto !important;
                position: sticky !important;
                top: 0 !important;
                scrollbar-width: thin;
                right: 0 !important;
            }
            #secondary::-webkit-scrollbar { width: 6px; }
            #secondary::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
            #secondary::-webkit-scrollbar-thumb:hover { background: #00f2ff; }
            #secondary::-webkit-scrollbar-track { background: #000; }
        ` : ''}

        .yt-pin-trigger { position:absolute; right:8px; top:8px; width:28px; height:28px; background:rgba(0,0,0,0.9); border:1px solid #00f2ff; border-radius:50%; color:#00f2ff; display:none; align-items:center; justify-content:center; cursor:pointer; z-index:9999; font-size:14px; box-shadow: 0 0 10px rgba(0, 242, 255, 0.3); }
        .yt-pin-trigger:hover { background:#00f2ff; color:black; box-shadow: 0 0 15px rgba(0, 242, 255, 0.6); }
        ytd-guide-entry-renderer:hover .yt-pin-trigger, ytd-grid-playlist-renderer:hover .yt-pin-trigger, ytd-rich-item-renderer:hover .yt-pin-trigger, ytd-playlist-renderer:hover .yt-pin-trigger { display:flex!important; }
        
        #yt-pinned-area { border-bottom:1px solid rgba(0, 242, 255, 0.2); margin-bottom:10px; padding-bottom:5px; }
        .yt-pin-link { display:flex; align-items:center; padding:8px 10px; color:#e0faff; text-decoration:none; font-size:1.3rem; border-radius:8px; }
        .yt-pin-link:hover { background:rgba(0, 242, 255, 0.1); color: #00f2ff; }
    `;
}

// NOTE: Auto-scroll timer function REMOVED as per request. 
// Now it relies solely on CSS 'overflow-y: auto' for manual scrolling.

function apply() {
    chrome.storage.sync.get(['settings','pins'], res => {
        currentPins = res.pins || [];
        const settings = res.settings || {};
        
        let el = document.getElementById(styleId);
        if(!el){ el=document.createElement('style'); el.id=styleId; document.head.appendChild(el); }
        el.textContent = getCSS(settings);
        
        injectUI();
        // No handleAutoScroll() call anymore
    });
}

function injectUI() {
    const guide = document.querySelector('#sections.ytd-guide-renderer'); 
    if(guide) {
        let area = document.getElementById('yt-pinned-area');
        if(!area) { 
            area=document.createElement('div'); 
            area.id='yt-pinned-area'; 
            guide.insertBefore(area, guide.firstChild); 
        }
        const pinCount = area.getAttribute('data-count');
        if (pinCount != currentPins.length) {
            let h = `<div style="padding:10px 12px; font-weight:bold; color:#00f2ff; font-size:1.2rem; letter-spacing:1px; margin-bottom:5px;">PINNED</div>`;
            currentPins.slice(0,6).forEach(p => {
                h += `<a href="${p.url}" class="yt-pin-link"><span style="margin-right:10px">📌</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${p.name}">${p.name}</span></a>`;
            });
            area.innerHTML = h;
            area.setAttribute('data-count', currentPins.length);
        }
    }
}

function attachBtns() {
    if(document.hidden) return; 
    const els = document.querySelectorAll('ytd-guide-entry-renderer a#endpoint, ytd-grid-playlist-renderer, ytd-rich-item-renderer, ytd-playlist-renderer');
    for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if(el.querySelector('.yt-pin-trigger')) continue; 
        const link = el.tagName==='A' ? el : el.querySelector('a');
        if(!link) continue;
        const btn = document.createElement('div'); 
        btn.className = 'yt-pin-trigger'; btn.innerHTML = '📌';
        btn.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            let title = '';
            if(el.tagName === 'YTD-GUIDE-ENTRY-RENDERER') {
                const tEl = el.querySelector('yt-formatted-string');
                if(tEl) title = tEl.innerText;
                if(!title) title = link.getAttribute('title');
            } else {
                const tEl = el.querySelector('#video-title');
                if(tEl) title = tEl.innerText;
                if(!title) title = el.querySelector('h3')?.innerText;
            }
            if(title) title = title.trim();
            if(!title || /^d+s*videos?$/i.test(title)) title = 'Playlist Item';
            const url = link.href.split('&')[0];
            chrome.storage.sync.get(['pins'], r => {
                const p = r.pins || []; 
                if(!p.find(x => x.url === url)) { 
                    p.push({name: title, url: url}); 
                    chrome.storage.sync.set({pins: p}, () => apply()); 
                }
            });
        };
        if(getComputedStyle(el).position === 'static') el.style.position = 'relative';
        el.appendChild(btn);
    }
}

function startObserver() {
    if (observer) return; 
    observer = new MutationObserver((mutations) => {
        if(document.hidden) return;
        if (!document.getElementById('yt-pinned-area')) injectUI();
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { attachBtns(); }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((m,s,r)=>{if(m.action==='refresh'){apply();r('ok');}});
apply();
startObserver();
setTimeout(attachBtns, 1000);