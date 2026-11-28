(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  document.getElementById("yr").textContent = new Date().getFullYear();

  /* Nav */
  var nav = $("#nav"), menu = $("#menu"), links = $("#links");
  function navState() { nav.classList.toggle("solid", window.scrollY > 30); }
  navState();
  menu.addEventListener("click", function () {
    var open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", open);
    menu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    links.classList.toggle("open", open);
    nav.classList.add("solid");
  });
  $$("a", links).forEach(function (a) { a.addEventListener("click", function () {
    menu.setAttribute("aria-expanded", "false"); links.classList.remove("open");
  }); });

  /* Reveal on scroll */
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("vis"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el, i) {
      el.style.transitionDelay = (el.closest(".hero") ? i * 0.12 : 0) + "s";
      io.observe(el);
    });
  } else { $$(".reveal").forEach(function (el) { el.classList.add("vis"); }); }

  /* Lazy / offscreen video play-pause */
  var vids = $$("video[data-lazy], .svc-thumb, .hero-video");
  if ("IntersectionObserver" in window) {
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && !reduce) { if (v.preload === "none") v.preload = "auto"; var p = v.play(); if (p) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.15 });
    vids.forEach(function (v) { if (v.offsetParent !== null || v.classList.contains("hero-video")) vio.observe(v); });
  }
  if (reduce) $$("video").forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });

  /* Rotating hero word */
  var words = ["the way you do.", "for your people.", "without jargon.", "in harmony."];
  var rot = $("#rot"), wi = 0;
  if (!reduce) setInterval(function () {
    rot.classList.add("out");
    setTimeout(function () {
      wi = (wi + 1) % words.length;
      rot.textContent = words[wi];
      rot.classList.remove("out"); rot.classList.add("in");
      void rot.offsetWidth;
      rot.classList.remove("in");
    }, 600);
  }, 3200);

  /* Canvas helpers */
  function fit(c) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    var ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }
  function inView(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; }

  /* HERO: harmony waves. Lines start out of tune, then drift into step. */
  var wc = $("#waves"), W = fit(wc), mouse = { x: .5, y: .5, tx: .5, ty: .5 };
  var lines = [];
  for (var i = 0; i < 9; i++) lines.push({ f: 1 + Math.random() * 2.4, p: Math.random() * 6.28, a: .5 + Math.random() * .8, s: .4 + Math.random() * .9 });
  var harmony = 0, t0 = performance.now();
  window.addEventListener("pointermove", function (e) { mouse.tx = e.clientX / innerWidth; mouse.ty = e.clientY / innerHeight; }, { passive: true });
  function drawWaves(now) {
    var t = (now - t0) / 1000, ctx = W.ctx, w = W.w, h = W.h;
    var target = clamp((t - 1.2) / 5, 0, 1) * .85 + clamp(1 - Math.abs(mouse.y - .55) * 2.2, 0, 1) * .15;
    harmony += (target - harmony) * .02;
    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    var cy = h * .62, amp = Math.min(h * .12, 110);
    for (var k = 0; k < lines.length; k++) {
      var L = lines[k];
      var f = L.f + (1.6 - L.f) * harmony, p = L.p + (0 - L.p) * harmony, a = L.a + (1 - L.a) * harmony;
      var sp = L.s + (.7 - L.s) * harmony;
      var g = ctx.createLinearGradient(0, 0, w, 0);
      var alpha = .18 + harmony * .22;
      g.addColorStop(0, "rgba(22,141,226,0)");
      g.addColorStop(.25 + (mouse.x - .5) * .3, "rgba(124,196,255," + alpha + ")");
      g.addColorStop(.75 + (mouse.x - .5) * .3, "rgba(22,141,226," + alpha + ")");
      g.addColorStop(1, "rgba(22,141,226,0)");
      ctx.strokeStyle = g; ctx.lineWidth = 1.2 + (k === 4 ? 1.2 : 0);
      ctx.beginPath();
      for (var x = 0; x <= w; x += 6) {
        var u = x / w;
        var env = Math.sin(u * Math.PI);
        var y = cy + Math.sin(u * 6.28 * f + p + t * sp) * amp * a * env + (k - 4) * (6 * (1 - harmony) + 2);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /* STATEMENT: two waves (people / tools) that converge as you scroll */
  var dc = $("#duo"), D = fit(dc), statement = $("#statement");
  function duoProgress() {
    var r = statement.getBoundingClientRect();
    return clamp((innerHeight - r.top) / (innerHeight + r.height * .6), 0, 1);
  }
  function drawDuo(now) {
    var t = now / 1000, ctx = D.ctx, w = D.w, h = D.h, pr = duoProgress();
    var m = clamp((pr - .15) / .6, 0, 1);
    ctx.clearRect(0, 0, w, h);
    var cy = h * .5, amp = Math.min(h * .22, 150);
    [["255,255,255", 2.1, 1.3, .9], ["22,141,226", 3.4, -1.1, 1.3]].forEach(function (c, idx) {
      var f = c[1] + (2.6 - c[1]) * m, ph = c[2] + (0 - c[2]) * m, sp = c[3] + (1.1 - c[3]) * m;
      for (var pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = "rgba(" + c[0] + "," + (pass ? .5 : .08) + ")";
        ctx.lineWidth = pass ? 2 : 10;
        ctx.beginPath();
        for (var x = 0; x <= w; x += 5) {
          var u = x / w;
          var y = cy + Math.sin(u * 6.28 * f + ph + t * sp) * amp * Math.sin(u * Math.PI) * (.6 + .4 * m) + (idx ? 1 : -1) * 40 * (1 - m);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    });
  }

  /* Word-by-word light-up */
  var say = $("#say");
  var hl = { "people,": 1, "harmony.": 1, "judgment,": 1, "busywork.": 1 };
  say.innerHTML = say.textContent.trim().split(/\s+/).map(function (w) {
    return '<span class="w' + (hl[w] ? " hl" : "") + '">' + w + "</span>";
  }).join(" ");
  var sw = $$(".w", say);
  function lightWords() {
    var r = say.getBoundingClientRect();
    var p = clamp((innerHeight * .85 - r.top) / (r.height + innerHeight * .35), 0, 1);
    var n = Math.round(p * sw.length);
    for (var i = 0; i < sw.length; i++) sw[i].classList.toggle("lit", i < n);
  }

  /* Horizontal scroll steps */
  var hs = $("#hs"), track = $("#hstrack"), bar = $("#hsbar");
  var hsOn = !reduce && window.innerWidth > 700;
  if (!hsOn) document.documentElement.classList.add("no-hs");
  function hScroll() {
    if (!hsOn) return;
    var r = hs.getBoundingClientRect();
    var total = hs.offsetHeight - innerHeight;
    var p = clamp(-r.top / total, 0, 1);
    var max = track.scrollWidth - innerWidth;
    track.style.transform = "translate3d(" + (-p * max) + "px,0,0)";
    bar.style.transform = "scaleX(" + p + ")";
  }

  /* Hover video peek on services */
  var peek = $("#peek"), pv = $("video", peek), px = 0, py = 0, tx = 0, ty = 0, cur = "";
  if (finePointer && !reduce) {
    $$(".svc").forEach(function (row) {
      row.addEventListener("mouseenter", function () {
        var src = row.getAttribute("data-video");
        if (src !== cur) { cur = src; pv.src = src; }
        var p = pv.play(); if (p) p.catch(function () {});
        peek.classList.add("on");
      });
      row.addEventListener("mouseleave", function () { peek.classList.remove("on"); pv.pause(); });
    });
    window.addEventListener("mousemove", function (e) { tx = e.clientX + 30; ty = e.clientY - 110; }, { passive: true });
  }

  /* Hero parallax */
  var heroIn = $(".hero-in"), heroVid = $(".hero-video");
  function parallax() {
    var y = window.scrollY;
    if (y < innerHeight * 1.2) {
      heroIn.style.transform = "translate3d(0," + y * .25 + "px,0)";
      heroIn.style.opacity = clamp(1 - y / (innerHeight * .8), 0, 1);
      heroVid.style.transform = "scale(" + (1.08 + y * .0002) + ") translate3d(0," + y * .15 + "px,0)";
    }
  }

  /* Main loop */
  function frame(now) {
    if (inView(wc)) drawWaves(now);
    if (inView(dc)) drawDuo(now);
    if (peek.classList.contains("on")) {
      px += (tx - px) * .15; py += (ty - py) * .15;
      peek.style.left = px + "px"; peek.style.top = py + "px";
    }
    requestAnimationFrame(frame);
  }
  function onScroll() { navState(); lightWords(); hScroll(); if (!reduce) parallax(); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    W = fit(wc); D = fit(dc);
    hsOn = !reduce && window.innerWidth > 700;
    document.documentElement.classList.toggle("no-hs", !hsOn);
    if (!hsOn) track.style.transform = "";
    onScroll();
  });
  onScroll();
  if (reduce) { drawWaves(t0 + 8000); drawDuo(0); sw.forEach(function (s) { s.classList.add("lit"); }); }
  else requestAnimationFrame(frame);

  /* Contact form -> email */
  var form = $("#form"), err = $("#err");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements, name = f.name.value.trim(), email = f.email.value.trim(), phone = f.phone.value.trim();
    if (!name || (!email && !phone)) { err.textContent = "Please add your name and a way to reach you (email or phone)."; return; }
    err.textContent = "";
    var needs = $$("input[name=need]:checked", form).map(function (c) { return c.value; });
    var body = ["Name: " + name];
    if (f.company.value.trim()) body.push("Company: " + f.company.value.trim());
    if (email) body.push("Email: " + email);
    if (phone) body.push("Phone: " + phone);
    if (needs.length) body.push("Interested in: " + needs.join(", "));
    if (f.msg.value.trim()) body.push("", f.msg.value.trim());
    location.href = "mailto:harmonylabsllc@gmail.com?subject=" + encodeURIComponent("Website inquiry from " + name) + "&body=" + encodeURIComponent(body.join("\n"));
  });
})();
