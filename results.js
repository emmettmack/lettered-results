(function () {
  var QUESTIONS = [
    { id: 'q0', title: 'What is your gender?', opts: ['Female', 'Male', 'Other'] },
    { id: 'q1', title: 'Have you spent any time on dating apps in the last 12 months?', opts: ['Yes, regularly', 'Yes, on and off', 'No'] },
    { id: 'q2', title: 'Would you use an exclusive, membership-based platform for athletes to connect and collaborate?', opts: ['Yes', 'Maybe', 'No'] },
    { id: 'q3', title: 'How important is anonymity? Preventing people at your school from finding your profile, blocking all contacts (including selected Instagram profiles), and screenshot prevention.', scale: true, ends: ['Not important', 'Very important'] },
    { id: 'q4', title: "How valuable is setting a future location for dates you know you'll be traveling?", scale: true, ends: ['Not valuable', 'Very valuable'] }
  ];
  var HEAD = ['Submitted', 'Gender', 'Dating apps (12 mo)', 'Would use', 'Anonymity (1-5)', 'Future location (1-5)'];

  var $ = function (id) { return document.getElementById(id); };
  var data = null;
  var key = '';
  var demo = /[?&]demo\b/.test(location.search);
  var endpoint = (window.LETTERED_CONFIG || {}).endpoint || '';

  function store(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pct(n, d) { return d ? Math.round(n / d * 100) : 0; }
  function fmt(t) { var d = new Date(t); return isNaN(d) ? t : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function toast(msg) { var t = document.querySelector('.toast') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toast' })); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('on'); }, 1800); }

  function fetchData(k) {
    if (demo) return Promise.resolve(sample());
    if (!endpoint || endpoint.indexOf('PASTE') > -1) return Promise.reject(new Error('Add the web app URL to config.js first.'));
    return fetch(endpoint, { method: 'POST', body: JSON.stringify({ action: 'results', key: k }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error === 'wrong passcode' ? 'Wrong passcode.' : 'Something went wrong.'); return j; });
  }

  function unlock(k, quiet) {
    $('unlock').disabled = true;
    $('gateErr').textContent = '';
    return fetchData(k).then(function (j) {
      key = k; data = j; store('lettered_key', k);
      $('gate').classList.add('hidden');
      $('dash').classList.remove('hidden');
      $('lock').classList.remove('hidden');
      render();
    }).catch(function (e) {
      store('lettered_key', null);
      if (!quiet) $('gateErr').textContent = e.message || "Couldn't reach the sheet.";
    }).then(function () { $('unlock').disabled = false; });
  }

  function render() {
    var R = data.responses.slice().sort(function (a, b) { return a.t < b.t ? 1 : -1; });
    var C = data.contacts.slice().reverse();
    var yes = R.filter(function (r) { return r.q2 === 'Yes'; }).length;
    var q2n = R.filter(function (r) { return r.q2; }).length;

    $('sTotal').textContent = R.length;
    $('sYes').textContent = q2n ? pct(yes, q2n) + '%' : '–';
    $('sContacts').textContent = C.length;
    $('sLast').textContent = R.length ? new Date(R[0].t).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '–';
    if (data.sheetUrl) { $('sheetLink').href = data.sheetUrl; $('sheetLink').classList.remove('hidden'); }
    document.querySelector('[data-tab=individual]').innerHTML = 'Individual<span class="n">' + R.length + '</span>';
    document.querySelector('[data-tab=contacts]').innerHTML = 'Early access<span class="n">' + C.length + '</span>';

    // summary
    var s = '';
    if (!R.length) s = '<div class="empty glass"><b>No responses yet.</b>Send the survey link out and they\'ll show up here.</div>';
    QUESTIONS.forEach(function (q, i) {
      if (!R.length) return;
      var vals = R.map(function (r) { return String(r[q.id] || ''); }).filter(Boolean);
      var opts = q.scale ? ['1', '2', '3', '4', '5'] : q.opts;
      var counts = opts.map(function (o) { return vals.filter(function (v) { return v === o; }).length; });
      var max = Math.max.apply(null, counts.concat(1));
      var h = '<article class="card glass"><span class="num">0' + (i + 1) + '</span><h3>' + esc(q.title) + '</h3>' +
        '<p class="meta">' + vals.length + ' of ' + R.length + ' answered</p>';
      if (q.scale) {
        var avg = vals.length ? vals.reduce(function (a, v) { return a + Number(v); }, 0) / vals.length : 0;
        h += '<div class="avg"><b>' + (vals.length ? avg.toFixed(1) : '–') + '</b><span>average out of 5</span></div>';
      }
      opts.forEach(function (o, k) {
        var lab = q.scale ? (o === '1' ? '1 · ' + q.ends[0] : o === '5' ? '5 · ' + q.ends[1] : o) : o;
        h += '<div class="dist"><span class="lab">' + esc(lab) + '</span><div class="t"><div class="f" data-w="' + (counts[k] / max) + '"></div></div>' +
          '<span class="v"><b>' + counts[k] + '</b> · ' + pct(counts[k], vals.length) + '%</span></div>';
      });
      if (q.id === 'q0') {
        h += '<div class="split"><p class="meta">Would use the platform, by gender</p>';
        q.opts.forEach(function (g) {
          var grp = R.filter(function (r) { return r.q0 === g && r.q2; });
          var y = grp.filter(function (r) { return r.q2 === 'Yes'; }).length;
          var mb = grp.filter(function (r) { return r.q2 === 'Maybe'; }).length;
          h += '<div class="srow"><span>' + g + '</span><span><b>' + (grp.length ? pct(y, grp.length) + '%' : '\u2013') + '</b> yes \u00b7 ' + (grp.length ? pct(mb, grp.length) + '%' : '\u2013') + ' maybe \u00b7 ' + grp.length + ' answered</span></div>';
        });
        h += '</div>';
      }
      s += h + '</article>';
    });
    $('tab-summary').innerHTML = s;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      document.querySelectorAll('.dist .f').forEach(function (f) { f.style.transform = 'scaleX(' + f.dataset.w + ')'; });
    }); });

    // individual
    $('tab-individual').innerHTML = R.length
      ? '<div class="tablewrap glass"><table><thead><tr>' + HEAD.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>' +
        R.map(function (r) {
          return '<tr><td class="dim">' + esc(fmt(r.t)) + '</td>' + ['q0', 'q1', 'q2', 'q3', 'q4'].map(function (k) {
            return r[k] === '' || r[k] == null ? '<td class="dim">–</td>' : '<td>' + esc(r[k]) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>'
      : '<div class="empty glass"><b>No responses yet.</b></div>';

    // contacts
    $('tab-contacts').innerHTML = C.length
      ? '<div class="cbar"><button class="pill pill-out pill-sm" id="copyEmails" type="button">Copy all emails</button>' +
        '<button class="pill pill-out pill-sm" id="copyPhones" type="button">Copy all phones</button>' +
        '<button class="pill pill-out pill-sm" id="csvC" type="button">Download CSV</button>' +
        '<p>Stored separately from answers.</p></div>' +
        '<div class="tablewrap glass"><table><thead><tr><th>Added</th><th>Email</th><th>Phone</th></tr></thead><tbody>' +
        C.map(function (c) { return '<tr><td class="dim">' + esc(c.d) + '</td><td>' + (esc(c.email) || '<span class="dim">–</span>') + '</td><td>' + (esc(c.phone) || '<span class="dim">–</span>') + '</td></tr>'; }).join('') +
        '</tbody></table></div>'
      : '<div class="empty glass"><b>No signups yet.</b>Emails and phone numbers people leave will show up here.</div>';

    if (C.length) {
      $('copyEmails').onclick = function () { copy(C.map(function (c) { return c.email; }).filter(Boolean).join(', '), 'Emails copied'); };
      $('copyPhones').onclick = function () { copy(C.map(function (c) { return c.phone; }).filter(Boolean).join(', '), 'Phones copied'); };
      $('csvC').onclick = function () { download('lettered-early-access.csv', [['Added', 'Email', 'Phone']].concat(C.map(function (c) { return [c.d, c.email, c.phone]; }))); };
    }
  }

  function copy(text, msg) {
    if (!text) return toast('Nothing to copy');
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast(msg); }, function () { prompt('Copy:', text); });
  }

  function download(name, rows) {
    var csv = rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // tabs
  document.querySelectorAll('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('[data-tab]').forEach(function (x) {
        var on = x === b; x.setAttribute('aria-selected', on);
        $('tab-' + x.dataset.tab).classList.toggle('hidden', !on);
      });
    });
  });

  $('gateForm').addEventListener('submit', function (e) { e.preventDefault(); var k = $('key').value.trim(); if (k || demo) unlock(k); });
  $('refresh').addEventListener('click', function () {
    $('refresh').disabled = true;
    fetchData(key).then(function (j) { data = j; render(); toast('Up to date'); }, function (e) { toast(e.message); })
      .then(function () { $('refresh').disabled = false; });
  });
  $('csv').addEventListener('click', function () {
    download('lettered-responses.csv', [HEAD].concat(data.responses.map(function (r) { return [r.t, r.q0, r.q1, r.q2, r.q3, r.q4]; })));
  });
  $('lock').addEventListener('click', function () { store('lettered_key', null); location.reload(); });

  var saved = read('lettered_key');
  if (saved || demo) unlock(saved || '', true);

  function sample() {
    var a = ['Yes, regularly', 'Yes, on and off', 'No'], b = ['Yes', 'Maybe', 'No'], r = [], now = Date.now();
    for (var i = 0; i < 37; i++) r.push({ t: new Date(now - i * 3.7e6).toISOString(), q0: ['Female','Male','Other'][i % 5 === 0 ? 2 : i % 2], q1: i % 7 ? a[i % 3] : '', q2: b[(i * 5) % 7 > 3 ? 1 : i % 9 === 0 ? 2 : 0], q3: i % 11 ? 3 + (i % 3) : '', q4: 1 + (i * 3) % 5 });
    return { ok: true, responses: r, contacts: [{ d: '2026-11-18', email: 'sample@usc.edu', phone: '' }, { d: '2026-11-18', email: '', phone: '(805) 555-0100' }], sheetUrl: '' };
  }
})();
