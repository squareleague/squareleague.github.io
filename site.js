// Store tabs and the YouTube video list (data from videos.json, refreshed by a GitHub Action).
(function () {
  // ---- store tabs ----
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs [role="tab"]'));
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next); next.focus();
    });
  });

  // ---- videos ----
  var CATS = [
    { id: 'tournament', label: 'Tournaments', re: /tournament|world cup|league|elimination/i },
    { id: 'race', label: 'Races', re: /race/i },
    { id: 'maze', label: 'Mazes', re: /maze/i },
    { id: 'battle', label: 'Battles', re: /battle|war|fight|shotgun|trident|arrow|enter/i },
    { id: 'survival', label: 'Survival', re: /surviv|escape/i }
  ];
  var TINTS = ['#FFE88A', '#FFD4CC', '#FFF3C4', '#FFD84D'];
  var PLAY = '<svg class="icon" width="22" height="22" viewBox="0 0 8 8" aria-hidden="true"><path d="M2 0h1v1h1v1h1v1h1v2H5v1H4v1H3v1H2z" fill="#1E1A1A"/></svg>';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function category(title) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].re.test(title)) return CATS[i];
    return { id: 'other', label: 'Video' };
  }
  function views(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(n);
  }
  function date(iso) {
    var p = iso.split('-');
    return MONTHS[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0];
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function thumb(v, i, big) {
    var t = el('div', 'thumb');
    t.style.background = TINTS[i % TINTS.length];
    var img = el('img');
    img.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/' + (big ? 'maxresdefault' : 'hqdefault') + '.jpg';
    img.alt = '';
    img.loading = big ? 'eager' : 'lazy';
    if (big) img.onerror = function () { img.onerror = null; img.src = img.src.replace('maxresdefault', 'hqdefault'); };
    t.appendChild(img);
    var play = el('span', 'play'); play.innerHTML = PLAY; t.appendChild(play);
    if (!big) t.appendChild(el('span', 'tag kind', v.cat.label));
    return t;
  }
  function link(v, cls) {
    var a = el('a', cls);
    a.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(v.id);
    a.target = '_blank'; a.rel = 'noopener';
    return a;
  }

  var grid = document.getElementById('video-grid');
  var featuredBox = document.getElementById('featured');
  var filterBox = document.getElementById('filters');
  if (!grid) return;

  fetch('videos.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var ch = data.channel || {};
      if (ch.subscribers) document.querySelectorAll('[data-subs]').forEach(function (n) { n.textContent = ch.subscribers; });
      if (ch.videoCount) document.querySelectorAll('[data-count]').forEach(function (n) { n.textContent = ch.videoCount; });

      var list = (data.videos || []).map(function (v) { v.cat = category(v.title); return v; });
      if (!list.length) throw new Error('no videos');

      // featured = newest upload
      var f = list[0];
      var fa = link(f, 'featured box');
      fa.appendChild(thumb(f, 0, true));
      var info = el('div', 'info');
      var badge = el('span', 'tag', 'New!'); badge.style.alignSelf = 'flex-start'; badge.style.background = 'var(--butter)';
      info.appendChild(badge);
      info.appendChild(el('h3', null, f.title));
      info.appendChild(el('span', 'meta', views(f.views) + ' views · ' + date(f.published)));
      fa.appendChild(info);
      featuredBox.appendChild(fa);

      var rest = list.slice(1);
      var current = 'all';
      function render() {
        grid.textContent = '';
        var shown = rest.filter(function (v) { return current === 'all' || v.cat.id === current; }).slice(0, current === 'all' ? 8 : 12);
        shown.forEach(function (v, i) {
          var a = link(v, 'vid box');
          a.appendChild(thumb(v, i + 1, false));
          var txt = el('div', 'txt');
          txt.appendChild(el('span', 'title', v.title));
          txt.appendChild(el('span', 'meta', views(v.views) + ' views · ' + date(v.published)));
          a.appendChild(txt);
          grid.appendChild(a);
        });
        if (!shown.length) grid.appendChild(el('p', 'empty', 'No videos in this category yet.'));
      }

      var used = [{ id: 'all', label: 'All' }].concat(CATS.filter(function (c) {
        return rest.some(function (v) { return v.cat.id === c.id; });
      }));
      used.forEach(function (c) {
        var b = el('button', null, c.label);
        b.type = 'button';
        b.setAttribute('aria-pressed', c.id === current ? 'true' : 'false');
        b.addEventListener('click', function () {
          current = c.id;
          filterBox.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          render();
        });
        filterBox.appendChild(b);
      });
      render();
    })
    .catch(function () {
      var p = el('p', 'empty');
      p.innerHTML = 'Watch all our videos on <a href="https://www.youtube.com/@squareleague2d/videos" target="_blank" rel="noopener">YouTube</a>.';
      grid.appendChild(p);
    });
})();
