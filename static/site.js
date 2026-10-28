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
})();
