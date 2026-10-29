// Menu mengambang, penanda bagian aktif, dan ilustrasi interaktif.
(() => {
  const menu = document.querySelector('.mmenu');
  if (menu) {
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => menu.removeAttribute('open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.removeAttribute('open'); });
    document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) menu.removeAttribute('open'); });
  }

  const links = [...document.querySelectorAll('a[data-spy]')];
  const targets = [...new Set(links.map((a) => a.dataset.spy))].map((id) => document.getElementById(id)).filter(Boolean);
  if ('IntersectionObserver' in window && targets.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('on', a.dataset.spy === en.target.id));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    targets.forEach((t) => io.observe(t));
  }

  // Ilustrasi mode interactive: ketuk untuk menyalakan denyut cahaya (HP tidak punya hover).
  document.querySelectorAll('.figure.live').forEach((f) => {
    const toggle = () => f.classList.toggle('on');
    f.addEventListener('click', toggle);
    f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
})();
