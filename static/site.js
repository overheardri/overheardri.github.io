// Overheard RI: reading modes, in-page video player, search and filters.
(function () {
  var KEY = 'risalah-mode', body = document.body;
  function setMode(m) {
    body.dataset.mode = m;
    document.querySelectorAll('[data-set-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.setMode === m); });
    try { localStorage.setItem(KEY, m); } catch (e) {}
  }
  var mode = body.dataset.mode;
  if (!document.querySelector('[data-set-mode="' + mode + '"]')) mode = 'santai';
  setMode(mode);
  document.querySelectorAll('[data-set-mode]').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.dataset.setMode); });
  });

  // Meeting pages: every minute link plays the embedded video from that second instead of leaving the page
  var player = document.querySelector('.player');
  function play(sec) {
    var f = player.querySelector('iframe'), poster = player.querySelector('.poster');
    if (poster) poster.remove();
    if (!f) {
      f = document.createElement('iframe');
      f.title = 'Video rapat';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      player.appendChild(f);
    }
    f.src = 'https://www.youtube-nocookie.com/embed/' + player.dataset.vid + '?autoplay=1&rel=0&start=' + (sec || 0);
  }
  if (player) {
    player.querySelector('.poster').addEventListener('click', function () { play(0); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a.ts');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.href.indexOf(player.dataset.vid) < 0) return;
      var t = /[?&]t=(\d+)s/.exec(a.href);
      if (!t) return;
      e.preventDefault();
      play(t[1]);
      var r = player.getBoundingClientRect();
      if (r.top < 70 || r.bottom > innerHeight) player.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Home: search across meetings
  var q = document.getElementById('q');
  if (q) {
    var idx = [], info = document.getElementById('qinfo');
    fetch(q.dataset.index).then(function (r) { return r.json(); }).then(function (j) { idx = j; }).catch(function () {});
    var cards = [].slice.call(document.querySelectorAll('[data-id]'));
    q.addEventListener('input', function () {
      var term = q.value.trim().toLowerCase();
      if (!term) { cards.forEach(function (c) { c.hidden = false; }); info.textContent = ''; return; }
      var hits = {};
      idx.forEach(function (m) { if ((m.judul + ' ' + m.badan + ' ' + m.jenis + ' ' + m.teks).toLowerCase().indexOf(term) >= 0) hits[m.id] = 1; });
      cards.forEach(function (c) { c.hidden = !hits[c.dataset.id]; });
      var n = Object.keys(hits).length;
      info.textContent = n ? n + ' rapat cocok.' : 'Tidak ada rapat yang cocok.';
    });
  }

  // Profiles: filter statements by topic
  var chips = [].slice.call(document.querySelectorAll('.chips button'));
  var rows = [].slice.call(document.querySelectorAll('.said li'));
  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      rows.forEach(function (r) { r.hidden = !!b.dataset.topik && r.dataset.topik !== b.dataset.topik; });
    });
  });

  // Transcript search
  var trq = document.getElementById('trq');
  if (trq) {
    var lines = [].slice.call(document.querySelectorAll('#tr p')), trn = document.getElementById('trn');
    trq.addEventListener('input', function () {
      var t = trq.value.trim().toLowerCase(), c = 0;
      lines.forEach(function (r) { var hit = !t || r.textContent.toLowerCase().indexOf(t) >= 0; r.hidden = !hit; if (hit && t) c++; });
      trn.textContent = t ? c + ' bagian cocok' : '';
    });
  }
  // Plain-language tooltips: the first use of each official term in a block gets a dotted underline;
  // tapping or hovering shows an everyday explanation from static/kamus.json.
  var root = document.querySelector('main');
  var base = (document.querySelector('script[src$="site.js"]') || {}).src || '';
  if (root && base) {
    fetch(base.replace(/site\.js.*$/, 'kamus.json')).then(function (r) { return r.json(); }).then(function (kamus) {
      var arti = {}, words = [];
      kamus.forEach(function (k) { k.t.forEach(function (w) { arti[w.toLowerCase()] = k.a; words.push(w); }); });
      words.sort(function (a, b) { return b.length - a.length; });
      var esc = words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
      var re = new RegExp('(^|[^A-Za-z0-9])(' + esc.join('|') + ')(?![A-Za-z0-9])', 'i');
      var SKIP = 'a,button,h1,h2,h3,dt,input,script,style,.ts,.tr,.tags,.meta,.crumb,.facts,.modes,.chips,.term,.wm,.giant,.sticker,.ticker,.mast-meta';
      var seen = new Map();
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (node) {
        var el = node.parentElement;
        if (!el || el.closest(SKIP)) return;
        var scope = el.closest('.mode-santai,.mode-gosip,.mode-serius,.mode-santai-inline,.mode-gosip-inline,.mode-serius-inline') || root;
        if (!seen.has(scope)) seen.set(scope, {});
        var used = seen.get(scope);
        var text = node.nodeValue, m, frag = null, last = 0, offset = 0;
        while ((m = re.exec(text.slice(offset)))) {
          var start = offset + m.index + m[1].length, word = m[2], key = word.toLowerCase();
          offset = start + word.length;
          if (used[arti[key]]) continue;
          used[arti[key]] = 1;
          frag = frag || document.createDocumentFragment();
          frag.appendChild(document.createTextNode(text.slice(last, start)));
          var t = document.createElement('span');
          t.className = 'term'; t.tabIndex = 0; t.textContent = word;
          t.setAttribute('role', 'button'); t.dataset.arti = arti[key];
          t.setAttribute('aria-label', word + ': ' + arti[key]);
          frag.appendChild(t);
          last = offset;
        }
        if (frag) { frag.appendChild(document.createTextNode(text.slice(last))); node.parentNode.replaceChild(frag, node); }
      });
      var tip = document.createElement('div');
      tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
      document.body.appendChild(tip);
      var current = null;
      function show(t) {
        current = t; tip.textContent = t.dataset.arti; tip.hidden = false;
        var r = t.getBoundingClientRect(), w = Math.min(300, innerWidth - 32);
        tip.style.width = w + 'px';
        tip.style.left = Math.max(16, Math.min(r.left + scrollX, scrollX + innerWidth - w - 16)) + 'px';
        tip.style.top = (r.bottom + scrollY + 8) + 'px';
      }
      function hide() { tip.hidden = true; current = null; }
      document.addEventListener('click', function (e) {
        var t = e.target.closest('.term');
        if (t) { if (current === t) hide(); else show(t); } else if (!e.target.closest('.tip')) hide();
      });
      document.addEventListener('keydown', function (e) {
        var t = e.target.closest && e.target.closest('.term');
        if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); show(t); }
        if (e.key === 'Escape') hide();
      });
      if (matchMedia('(hover: hover)').matches) {
        root.addEventListener('mouseover', function (e) { var t = e.target.closest('.term'); if (t) show(t); });
        root.addEventListener('mouseout', function (e) { if (e.target.closest('.term')) hide(); });
      }
      addEventListener('scroll', function () { if (current) show(current); }, { passive: true });
    }).catch(function () {});
  }
})();
