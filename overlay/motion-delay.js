(() => {
  const nativeSetTimeout = window.setTimeout.bind(window);

  // Os bots eram chamados com um atraso interno de 20 ms. Mantemos o resto dos
  // temporizadores intacto e transformamos apenas esse avanço automático em 3 s.
  window.setTimeout = function (fn, delay, ...args) {
    const adjusted = delay === 20 ? 3000 : delay;
    return nativeSetTimeout(fn, adjusted, ...args);
  };

  const seenCards = new Set();
  let lockUntil = 0;
  let blocker = null;

  function ensureBlocker() {
    if (blocker?.isConnected) return blocker;
    blocker = document.createElement('div');
    blocker.id = 'king-play-delay';
    blocker.setAttribute('aria-hidden', 'true');
    blocker.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9998', 'display:none',
      'pointer-events:auto', 'background:transparent', 'touch-action:none'
    ].join(';');
    document.body.appendChild(blocker);
    return blocker;
  }

  function lockNextPlay(ms = 3000) {
    const end = performance.now() + ms;
    if (end <= lockUntil) return;
    lockUntil = end;
    const b = ensureBlocker();
    b.style.display = 'block';
    nativeSetTimeout(() => {
      if (performance.now() >= lockUntil - 20 && b.isConnected) b.style.display = 'none';
    }, ms + 25);
  }

  function seatFor(played) {
    if (played.classList.contains('bottom')) return document.querySelector('.seat.bottom .cards');
    if (played.classList.contains('left')) return document.querySelector('.seat.left .cards');
    if (played.classList.contains('top')) return document.querySelector('.seat.top .cards');
    if (played.classList.contains('right')) return document.querySelector('.seat.right .cards');
    return null;
  }

  function animatePlayedCard(played) {
    const card = played.querySelector('.card[data-card]');
    if (!card) return;
    const id = card.dataset.card;
    if (!id || seenCards.has(id)) return;
    seenCards.add(id);

    const source = seatFor(played);
    const to = card.getBoundingClientRect();
    const from = source?.getBoundingClientRect();
    if (from && to.width && to.height) {
      const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
      const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
      card.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(.82)`, opacity: 0.72 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 }
      ], {
        duration: 520,
        easing: 'cubic-bezier(.22,.8,.24,1)',
        fill: 'both'
      });
    }
    lockNextPlay(3000);
  }

  function scan(root = document) {
    root.querySelectorAll?.('.trick-board .played-card').forEach(animatePlayedCard);
  }

  function start() {
    ensureBlocker();
    scan();
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (!(n instanceof Element)) continue;
          if (n.matches?.('.played-card')) animatePlayedCard(n);
          scan(n);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
