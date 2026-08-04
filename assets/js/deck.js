/* ============================================================
   SunStack pitch deck — behaviour
   Scroll-snap tiles + keyboard nav, a top "chapter" section roadmap,
   progress bar, slide counter, reveal-on-enter, number counters,
   video lightbox, resize re-snap. Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tiles = Array.prototype.slice.call(document.querySelectorAll(".tile"));
  var total = tiles.length;
  var current = 0;

  /* ---- the section roadmap: name + first tile (1-based) of each chapter ---- */
  var SECTIONS = [
    { name: "Overview", start: 1 },      // cover, overview (idea + value flow)
    { name: "Why now", start: 3 },       // the gap, why Australia
    { name: "How it works", start: 5 },  // node, three sides, network
    { name: "Prototype", start: 8 },     // buyer demo, operator console, safety
    { name: "Who wins", start: 12 },     // homeowners, buyers, society+university
    { name: "The plan", start: 15 }      // roadmap, thank-you
  ];
  function sectionForTile(n) {
    var idx = 0;
    for (var s = 0; s < SECTIONS.length; s++) if (n >= SECTIONS[s].start) idx = s;
    return idx;
  }

  /* ---- chrome elements ---- */
  var topbar = document.getElementById("topbar");
  var chaptersWrap = document.getElementById("chapters");
  var counter = document.getElementById("counter");
  var progressbar = document.getElementById("progressbar");
  var kbdhint = document.getElementById("kbdhint");

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* ---- build the chapter stepper ---- */
  var chapterBtns = [];
  SECTIONS.forEach(function (sec, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chapter";
    b.innerHTML = '<span class="cn">' + pad(i + 1) + "</span>" + sec.name;
    b.setAttribute("aria-label", "Go to section: " + sec.name);
    b.addEventListener("click", function () { goTo(sec.start - 1); });
    chaptersWrap.appendChild(b);
    chapterBtns.push(b);
  });

  var curSection = -1;
  function setSection(secIdx) {
    if (secIdx === curSection) return;
    curSection = secIdx;
    chapterBtns.forEach(function (b, j) {
      b.classList.toggle("active", j === secIdx);
      b.setAttribute("aria-current", j === secIdx ? "true" : "false");
    });
  }

  /* ---- theme the chrome to the active tile's surface ---- */
  function applySurface(tile) {
    var dark = tile.getAttribute("data-surface") === "dark";
    if (topbar) topbar.classList.toggle("on-dark", dark);
    if (counter) counter.classList.toggle("on-dark", dark);
  }

  /* ---- mark active tile (section + counter + progress + topbar visibility) ---- */
  function setActive(i) {
    if (i === current) { /* still refresh visibility on first call */ }
    current = i;
    var tileNum = i + 1;
    setSection(sectionForTile(tileNum));
    if (counter) counter.innerHTML = "<b>" + pad(tileNum) + "</b> / " + pad(total);
    applySurface(tiles[i]);
    // show the roadmap on the substantive tiles; hide on the cover + the closing thank-you
    if (topbar) topbar.classList.toggle("show", tileNum >= 2 && tileNum <= total - 1);
    if (total > 1) setProgress(i / (total - 1));
  }

  function setProgress(frac) {
    if (progressbar) progressbar.style.width = (Math.max(0, Math.min(1, frac)) * 100) + "%";
  }

  /* ---- navigation ---- */
  function goTo(i) {
    i = Math.max(0, Math.min(total - 1, i));
    tiles[i].scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    hideHint();
  }

  /* ---- IntersectionObserver: reveal + active tracking ---- */
  var seenCounters = new Set();
  if ("IntersectionObserver" in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio >= 0.35) {
          e.target.classList.add("in");
          runCounters(e.target);
        }
      });
    }, { threshold: [0.35, 0.6] });
    tiles.forEach(function (t) { revealObs.observe(t); });

    var activeObs = new IntersectionObserver(function (entries) {
      var best = null, bestRatio = 0;
      entries.forEach(function (e) {
        if (e.intersectionRatio > bestRatio) { bestRatio = e.intersectionRatio; best = e.target; }
      });
      if (best && bestRatio > 0.5) setActive(tiles.indexOf(best));
    }, { threshold: [0.5, 0.75, 1] });
    tiles.forEach(function (t) { activeObs.observe(t); });
  } else {
    tiles.forEach(function (t) { t.classList.add("in"); runCounters(t); });
  }

  /* fine-grained progress bar on scroll */
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0) setProgress(window.scrollY / max);
      ticking = false;
    });
  }, { passive: true });

  /* ---- number counters ---- */
  function runCounters(scope) {
    var els = scope.querySelectorAll("[data-count]");
    els.forEach(function (el) {
      if (seenCounters.has(el)) return;
      seenCounters.add(el);
      var target = parseFloat(el.getAttribute("data-count"));
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      if (isNaN(target)) return;
      if (reduce) { el.textContent = prefix + format(target) + suffix; return; }
      var dur = 1100, start = null;
      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + format(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      el.textContent = prefix + format(0) + suffix;
      requestAnimationFrame(frame);
    });
  }
  function format(n) { return n.toLocaleString("en-US"); }

  /* ---- keyboard navigation ---- */
  var NEXT = { "ArrowDown": 1, "ArrowRight": 1, "PageDown": 1, " ": 1, "Spacebar": 1 };
  var PREV = { "ArrowUp": 1, "ArrowLeft": 1, "PageUp": 1 };
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "Escape") { closeLightbox(); return; }
    if (NEXT[e.key]) { e.preventDefault(); goTo(current + 1); }
    else if (PREV[e.key]) { e.preventDefault(); goTo(current - 1); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(total - 1); }
  });

  /* ---- keyboard hint: hide after first interaction or a few seconds ---- */
  var hintHidden = false;
  function hideHint() { if (!hintHidden && kbdhint) { hintHidden = true; kbdhint.classList.add("hide"); } }
  window.addEventListener("wheel", hideHint, { passive: true, once: true });
  window.addEventListener("touchstart", hideHint, { passive: true, once: true });
  setTimeout(hideHint, 6000);

  /* ---- re-align the current tile after a window resize ----
     Some browsers (Safari/Firefox) don't re-snap on resize, leaving a gap
     between tiles. Re-snap once resizing settles — only when snapping is
     actually active (desktop / tall enough). ---- */
  var snapActive = window.matchMedia("(min-width: 821px) and (min-height: 761px)");
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (snapActive.matches) tiles[current].scrollIntoView({ behavior: "auto", block: "start" });
    }, 150);
  });

  /* ---- cover background image (only set once loaded, so a missing file
          leaves the dark fallback instead of a broken frame) ---- */
  var coverBg = document.getElementById("coverBg");
  if (coverBg) {
    var probe = new Image();
    probe.onload = function () {
      coverBg.style.backgroundImage = 'url("assets/img/cover-hero.png")';
      coverBg.classList.add("has-img");
    };
    probe.src = "assets/img/cover-hero.png";
  }

  /* ---- video lightbox (works for every .videowrap) ---- */
  var lightbox = document.getElementById("lightbox");
  var lbVideo = document.getElementById("lightboxVideo");
  function openLightbox(src) {
    if (!lightbox) return;
    if (lbVideo && src && lbVideo.getAttribute("src") !== src) lbVideo.setAttribute("src", src);
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    if (lbVideo) { try { lbVideo.currentTime = 0; lbVideo.play(); } catch (e) {} }
  }
  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains("open")) return;
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    if (lbVideo) { try { lbVideo.pause(); } catch (e) {} }
  }
  Array.prototype.forEach.call(document.querySelectorAll(".videowrap"), function (vw) {
    var v = vw.querySelector("video");
    var src = v ? v.getAttribute("src") : null;
    vw.addEventListener("click", function () { openLightbox(src); });
    vw.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(src); }
    });
  });
  if (lightbox) lightbox.addEventListener("click", closeLightbox);

  /* ---- init ---- */
  tiles[0].classList.add("in");
  runCounters(tiles[0]);
  current = -1;        // force setActive to run its side effects on first call
  setActive(0);
})();
