/* Aula Viva · interacciones */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- barra superior ---------- */
  const nav = $('#topnav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- aparición suave ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal').forEach((el) => io.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('in'));
  }

  /* ---------- presentación ---------- */
  const deck = $('#deck');
  const stage = $('#deck-stage');
  const slides = $$('.slide', stage);
  const vine = $('#vine');
  const stemDone = $('#stem-done');
  const count = $('#deck-count');
  const prev = $('#deck-prev');
  const next = $('#deck-next');
  const total = slides.length;
  let cur = 0;

  const leaves = slides.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', `Diapositiva ${i + 1}: ${s.dataset.title}`);
    b.innerHTML = `<svg viewBox="0 0 13 17" aria-hidden="true"><use href="#leaf"/></svg><span class="tip">${i + 1} · ${s.dataset.title}</span>`;
    b.addEventListener('click', () => go(i));
    vine.appendChild(b);
    s.setAttribute('aria-label', `Diapositiva ${i + 1} de ${total}: ${s.dataset.title}`);
    return b;
  });

  // carga anticipada de las imágenes vecinas
  const warm = (i) => {
    const s = slides[i];
    if (!s) return;
    $$('img[loading="lazy"]', s).forEach((img) => { img.loading = 'eager'; });
  };

  function go(i) {
    i = Math.max(0, Math.min(total - 1, i));
    if (i === cur && slides[i].classList.contains('is-active')) { render(); return; }
    // las anteriores se van a la izquierda, las siguientes esperan a la derecha
    slides.forEach((s, k) => {
      s.classList.remove('is-active', 'is-before');
      if (k < i) s.classList.add('is-before');
    });
    slides[i].classList.add('is-active');
    cur = i;
    warm(i + 1); warm(i - 1);
    render();
  }

  function render() {
    leaves.forEach((b, k) => {
      b.classList.toggle('done', k < cur);
      b.classList.toggle('current', k === cur);
      b.setAttribute('aria-selected', k === cur ? 'true' : 'false');
    });
    // largo del tallo hasta la hoja actual
    const a = leaves[0].getBoundingClientRect();
    const c = leaves[cur].getBoundingClientRect();
    stemDone.style.width = `${Math.max(0, c.left + c.width / 2 - (a.left + a.width / 2))}px`;
    stemDone.style.left = `${leaves[0].offsetLeft + leaves[0].offsetWidth / 2}px`;
    count.textContent = `${cur + 1} / ${total}`;
    prev.disabled = cur === 0;
    next.disabled = cur === total - 1;
    slides.forEach((s, k) => s.setAttribute('aria-hidden', k === cur ? 'false' : 'true'));
  }

  prev.addEventListener('click', () => go(cur - 1));
  next.addEventListener('click', () => go(cur + 1));
  window.addEventListener('resize', render);
  if (document.fonts) document.fonts.ready.then(render);

  // teclado: cuando la presentación está a la vista
  let deckVisible = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { deckVisible = e.intersectionRatio > 0.5; }, { threshold: [0, 0.5, 1] }).observe(deck);
  }
  document.addEventListener('keydown', (e) => {
    if ($('#lightbox').open) return;
    const inDeck = deck.contains(document.activeElement) || document.fullscreenElement === deck || deckVisible;
    if (!inDeck || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && document.fullscreenElement === deck)) { e.preventDefault(); go(cur + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); }
    else if (e.key === 'Home' && document.fullscreenElement === deck) { e.preventDefault(); go(0); }
    else if (e.key === 'End' && document.fullscreenElement === deck) { e.preventDefault(); go(total - 1); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFull(); }
  });

  // deslizar con el dedo
  const swipe = (el, onLeft, onRight) => {
    let x0 = null, y0 = null, t0 = 0;
    el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; x0 = e.clientX; y0 = e.clientY; t0 = Date.now(); });
    el.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && Date.now() - t0 < 800) (dx < 0 ? onLeft : onRight)();
    });
    el.addEventListener('pointercancel', () => { x0 = null; });
  };
  swipe(stage, () => go(cur + 1), () => go(cur - 1));

  // pantalla completa
  const fullBtn = $('#deck-full');
  function toggleFull() {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else deck.requestFullscreen().then(() => stage.focus()).catch(() => {});
  }
  if (!document.fullscreenEnabled) fullBtn.hidden = true;
  fullBtn.addEventListener('click', toggleFull);
  document.addEventListener('fullscreenchange', () => {
    fullBtn.setAttribute('aria-label', document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa');
    requestAnimationFrame(render);
  });

  go(0);
  warm(1);

  /* ---------- red de espacios: resaltar en ambos lados ---------- */
  const nodes = $$('.web .node');
  const items = $$('#network-list li');
  const light = (k) => {
    nodes.forEach((n) => n.classList.toggle('is-on', n.dataset.k === k));
    items.forEach((n) => n.classList.toggle('is-on', n.dataset.k === k));
  };
  [...nodes, ...items].forEach((el) => {
    el.addEventListener('mouseenter', () => light(el.dataset.k));
    el.addEventListener('mouseleave', () => light(null));
  });

  /* ---------- galería y visor ---------- */
  const lb = $('#lightbox');
  const lbImg = $('#lb-img');
  const lbCap = $('#lb-caption');
  const lbCount = $('#lb-count');
  const shots = $$('.shot button');
  let li = 0;
  let lastFocus = null;

  const preload = (k) => { const b = shots[k]; if (b) { const im = new Image(); im.src = b.dataset.full; } };

  function show(k) {
    li = (k + shots.length) % shots.length;
    const b = shots[li];
    const cap = $('figcaption', b).textContent;
    lbImg.classList.add('loading');
    lbImg.onload = () => lbImg.classList.remove('loading');
    lbImg.src = b.dataset.full;
    lbImg.alt = cap;
    lbCap.textContent = cap;
    lbCount.textContent = `${li + 1} / ${shots.length}`;
    preload(li + 1); preload(li - 1);
  }
  function open(k) {
    lastFocus = document.activeElement;
    show(k);
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    if (typeof lb.close === 'function') lb.close(); else lb.removeAttribute('open');
  }
  lb.addEventListener('close', () => { document.body.style.overflow = ''; lastFocus?.focus(); });

  shots.forEach((b, k) => b.addEventListener('click', () => open(k)));
  $('#lb-prev').addEventListener('click', () => show(li - 1));
  $('#lb-next').addEventListener('click', () => show(li + 1));
  $('#lb-close').addEventListener('click', close);
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.id === 'lb-stage') close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(li + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(li - 1); }
  });
  swipe($('#lb-stage'), () => show(li + 1), () => show(li - 1));
})();
