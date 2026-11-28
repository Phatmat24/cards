(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var play = function (v) { if (reduce) return; if (v.preload === "none") v.preload = "auto"; var p = v.play(); if (p) p.catch(function () {}); };

  $("#yr").textContent = new Date().getFullYear();

  /* Nav */
  var nav = $("#nav"), menu = $("#menu"), links = $("#links");
  function navState() { nav.classList.toggle("solid", window.scrollY > 30); }
  menu.addEventListener("click", function () {
    var open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", open);
    menu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    links.classList.toggle("open", open); nav.classList.add("solid");
  });
  $$("a", links).forEach(function (a) { a.addEventListener("click", function () { menu.setAttribute("aria-expanded", "false"); links.classList.remove("open"); }); });

  /* Reveal */
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("vis"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el, i) {
      if (el.closest(".hero")) el.style.transitionDelay = (i * 0.12) + "s";
      io.observe(el);
    });
  } else $$(".reveal").forEach(function (el) { el.classList.add("vis"); });

  /* Play videos only while on screen */
  var vio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.isIntersecting ? play(e.target) : e.target.pause(); });
  }, { threshold: 0.1 });
  $$(".hero-video, #pgm, .cam video").forEach(function (v) { vio.observe(v); });
  if (reduce) $$("video").forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });

  /* Timecodes */
  var start = performance.now();
  function tc(ms) {
    var f = Math.floor(ms / 33.333) % 30, s = Math.floor(ms / 1000), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(Math.floor(s / 3600)) + ":" + p(Math.floor(s / 60) % 60) + ":" + p(s % 60) + ":" + p(f);
  }
  var tcEl = $("#tc"), mvtc = $("#mvtc");

  /* Audio meters */
  function fit(c) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    var ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }
  function level(t, seed) {
    return clamp(.45 + .25 * Math.sin(t * 7.1 + seed) * Math.sin(t * 2.3 + seed * 2) + .25 * Math.sin(t * 17 + seed * 3) * Math.random(), 0, 1);
  }
  var mc = $("#meters"), M = fit(mc), peaks = [0, 0];
  function drawMeters(t) {
    var ctx = M.ctx, w = M.w, h = M.h, seg = 26, gap = 2, sh = (h - gap * seg) / seg;
    ctx.clearRect(0, 0, w, h);
    for (var ch = 0; ch < 2; ch++) {
      var lv = level(t, ch * 1.7), lit = Math.round(lv * seg);
      peaks[ch] = Math.max(peaks[ch] - .15, lit);
      var x = ch * (w / 2 + 1), bw = w / 2 - 2;
      for (var i = 0; i < seg; i++) {
        var y = h - (i + 1) * (sh + gap);
        var col = i > seg * .85 ? "255,59,59" : i > seg * .65 ? "255,196,0" : "41,211,106";
        ctx.fillStyle = "rgba(" + col + "," + (i < lit || i === Math.round(peaks[ch]) ? .95 : .12) + ")";
        ctx.fillRect(x, y, bw, sh);
      }
    }
  }
  var bc = $("#bus"), B = fit(bc);
  function drawBus(t) {
    var ctx = B.ctx, w = B.w, h = B.h, n = Math.floor(w / 6);
    ctx.clearRect(0, 0, w, h);
    for (var c = 0; c < 2; c++) {
      var lit = Math.round(level(t, 4 + c) * n);
      for (var i = 0; i < n; i++) {
        var col = i > n * .85 ? "255,59,59" : i > n * .65 ? "255,196,0" : "41,211,106";
        ctx.fillStyle = "rgba(" + col + "," + (i < lit ? .9 : .12) + ")";
        ctx.fillRect(i * 6, c * (h / 2 + 1), 4, h / 2 - 1);
      }
    }
  }

  /* Rundown hover background */
  var rdbg = $("#rdbg"), rdv = $("video", rdbg), curBg = "";
  if (finePointer && !reduce) {
    $$(".rd-row[data-bg]").forEach(function (row) {
      row.addEventListener("mouseenter", function () {
        var s = row.getAttribute("data-bg");
        if (s !== curBg) { curBg = s; rdv.src = s; }
        play(rdv); rdbg.classList.add("on");
      });
    });
    $(".rd").addEventListener("mouseleave", function () { rdbg.classList.remove("on"); rdv.pause(); });
  }

  /* Multiview switcher */
  var cams = $$(".cam"), pgm = $("#pgm"), pgmBox = $(".mv-pgm"), l3 = $("#l3"), l3sub = $("#l3sub");
  var live = 0, userHold = 0, mvVisible = false;
  function cut(i, byUser) {
    if (i === live && !byUser) return;
    live = i;
    var cam = cams[i];
    pgmBox.classList.add("cut");
    l3.classList.remove("show");
    setTimeout(function () {
      pgm.src = cam.getAttribute("data-src");
      pgm.poster = cam.querySelector("video").poster;
      if (mvVisible) play(pgm);
      pgmBox.classList.remove("cut");
      l3sub.textContent = cam.getAttribute("data-l3");
      setTimeout(function () { l3.classList.add("show"); }, 500);
    }, 120);
    cams.forEach(function (c, k) {
      c.classList.toggle("on", k === i);
      c.classList.toggle("pvw", k === (i + 1) % cams.length);
      c.setAttribute("aria-pressed", k === i);
    });
    if (byUser) userHold = performance.now() + 12000;
  }
  cams.forEach(function (c, i) { c.addEventListener("click", function () { cut(i, true); }); });
  cams[1].classList.add("pvw");
  cams.forEach(function (c, k) { c.setAttribute("aria-pressed", k === 0); });
  new IntersectionObserver(function (es) {
    mvVisible = es[0].isIntersecting;
    if (mvVisible) setTimeout(function () { l3.classList.add("show"); }, 700);
  }, { threshold: .3 }).observe($("#mv"));
  if (!reduce) setInterval(function () {
    if (mvVisible && performance.now() > userHold) cut((live + 1) % cams.length);
  }, 5000);
  if (reduce) l3.classList.add("show");

  /* Count-up stats */
  var cio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      var el = e.target, end = +el.getAttribute("data-count"), from = end > 1000 ? end - 40 : 0, t0 = performance.now();
      if (reduce) return;
      (function step(now) {
        var p = clamp((now - t0) / 1400, 0, 1), eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (end - from) * eased);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: .6 });
  $$("[data-count]").forEach(function (el) { cio.observe(el); });

  /* Process line + band parallax */
  var pr = $("#pr"), bandImg = $("#bandimg"), band = $(".band");
  function onScroll() {
    navState();
    var r = pr.getBoundingClientRect();
    pr.style.setProperty("--p", clamp((innerHeight * .8 - r.top) / (r.height + innerHeight * .3), 0, 1).toFixed(3));
    if (!reduce) {
      var b = band.getBoundingClientRect();
      if (b.bottom > 0 && b.top < innerHeight) bandImg.style.transform = "translate3d(0," + ((b.top + b.height / 2 - innerHeight / 2) * -0.15) + "px,0)";
      var y = window.scrollY;
      if (y < innerHeight) $(".hero-in").style.transform = "translate3d(0," + y * .2 + "px,0)";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { M = fit(mc); B = fit(bc); onScroll(); });
  onScroll();

  /* Animation loop */
  function inView(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }
  var last = 0;
  function frame(now) {
    var t = (now - start) / 1000;
    if (now - last > 50) {
      last = now;
      if (inView(mc)) { drawMeters(t); tcEl.textContent = tc(now - start); }
      if (mvVisible) { drawBus(t); mvtc.textContent = tc(now - start + 3723000); }
    }
    requestAnimationFrame(frame);
  }
  if (!reduce) requestAnimationFrame(frame); else { drawMeters(1); drawBus(1); }

  /* Contact form -> email */
  var form = $("#form"), err = $("#err");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements, name = f.name.value.trim(), email = f.email.value.trim(), phone = f.phone.value.trim();
    if (!name || (!email && !phone)) { err.textContent = "Please add your name and a way to reach you (email or phone)."; return; }
    err.textContent = "";
    var needs = $$("input[name=need]:checked", form).map(function (c) { return c.value; });
    var body = ["Name: " + name];
    if (f.company.value.trim()) body.push("Show/organization: " + f.company.value.trim());
    if (email) body.push("Email: " + email);
    if (phone) body.push("Phone: " + phone);
    if (needs.length) body.push("Needs: " + needs.join(", "));
    if (f.msg.value.trim()) body.push("", f.msg.value.trim());
    location.href = "mailto:harmonylabsllc@gmail.com?subject=" + encodeURIComponent("MediaWorks inquiry from " + name) + "&body=" + encodeURIComponent(body.join("\n"));
  });
})();
