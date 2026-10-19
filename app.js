(() => {
  const root = document.documentElement
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const chapterLabel = document.getElementById('chapter')
  const progress = document.getElementById('progress')
  const sections = [...document.querySelectorAll('main > section')]

  // Split headings into word masks before anything animates.
  document.querySelectorAll('[data-split]').forEach((el) => {
    const walk = (node) => {
      ;[...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment()
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return
            if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '))
            const w = document.createElement('span')
            w.className = 'w'
            const inner = document.createElement('span')
            inner.textContent = part
            w.appendChild(inner)
            frag.appendChild(w)
          })
          child.replaceWith(frag)
        } else if (child.nodeType === 1) walk(child)
      })
    }
    walk(el)
  })

  const setChapter = (section) => {
    root.dataset.theme = section.dataset.theme || 'dark'
    if (chapterLabel) chapterLabel.textContent = section.dataset.chapter || ''
  }

  if (!window.gsap || !window.ScrollTrigger || reduce) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setChapter(e.target)),
      { rootMargin: '-50% 0px -50% 0px' },
    )
    sections.forEach((s) => io.observe(s))
    return
  }

  gsap.registerPlugin(ScrollTrigger)

  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((t) => lenis.raf(t * 1000))
    gsap.ticker.lagSmoothing(0)
    document.querySelectorAll('a[href^="#"]').forEach((a) =>
      a.addEventListener('click', (e) => {
        const target = document.querySelector(a.getAttribute('href'))
        if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -40 }) }
      }),
    )
  }

  const ease = 'expo.out'

  // Section-to-section transition: palette shifts as the reader crosses the midpoint.
  sections.forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onEnter: () => setChapter(section),
      onEnterBack: () => setChapter(section),
    })
  })

  gsap.to(progress, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
  })

  // Cover plays immediately; everything else waits for the reader.
  const coverWords = document.querySelectorAll('.cover [data-split] .w > span')
  gsap.set(coverWords, { yPercent: 110 })
  gsap.timeline({ delay: 0.2 })
    .to(coverWords, { yPercent: 0, duration: 1.4, ease, stagger: 0.04 })
    .from('.cover [data-reveal]', { opacity: 0, y: 24, duration: 1.1, ease, stagger: 0.12 }, '-=1')

  document.querySelectorAll('main > section:not(.cover) [data-split]').forEach((el) => {
    const words = el.querySelectorAll('.w > span')
    gsap.set(words, { yPercent: 110 })
    gsap.to(words, {
      yPercent: 0, duration: 1.2, ease, stagger: 0.035,
      scrollTrigger: { trigger: el, start: 'top 82%' },
    })
  })

  document.querySelectorAll('main > section:not(.cover) [data-reveal]').forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: 40, duration: 1.2, ease,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    })
  })

  // Captures open like a shutter, then settle with a slow parallax.
  document.querySelectorAll('[data-figure]').forEach((fig) => {
    const device = fig.querySelector('.device')
    const img = fig.querySelector('img')
    gsap.fromTo(device,
      { clipPath: 'inset(12% 8% 12% 8%)', opacity: 0.2 },
      { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 1.6, ease: 'expo.inOut',
        scrollTrigger: { trigger: fig, start: 'top 80%' } },
    )
    gsap.fromTo(img, { scale: 1.14 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true },
    })
    gsap.from(fig.querySelector('figcaption'), {
      opacity: 0, y: 12, duration: 1, ease, delay: 0.5,
      scrollTrigger: { trigger: fig, start: 'top 80%' },
    })
  })

  const mm = gsap.matchMedia()
  mm.add('(min-width: 900px)', () => {
    // The dogma capture grows to full presence as the reader commits to it.
    const pin = document.querySelector('[data-pin-scale] .device')
    if (pin) {
      gsap.fromTo(pin, { scale: 0.82 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top 90%', end: 'center 50%', scrub: true },
      })
    }

    // Earlier layers recede as the next one stacks on top.
    const layers = gsap.utils.toArray('.layer')
    layers.forEach((layer, i) => {
      const next = layers[i + 1]
      if (!next) return
      gsap.to(layer, {
        scale: 0.94, filter: 'brightness(0.45)', ease: 'none',
        scrollTrigger: { trigger: next, start: 'top 85%', end: 'top 20%', scrub: true },
      })
    })
  })

  // Journey steps light up in sequence across the build chapter.
  const steps = gsap.utils.toArray('.journey li')
  if (steps.length) {
    ScrollTrigger.create({
      trigger: '.layers',
      start: 'top 75%',
      end: 'bottom 60%',
      onUpdate: (self) => {
        const active = Math.min(steps.length, Math.ceil(self.progress * steps.length) || 1)
        steps.forEach((s, i) => s.classList.toggle('is-on', i < active))
      },
    })
  }

  window.addEventListener('load', () => ScrollTrigger.refresh())
})()