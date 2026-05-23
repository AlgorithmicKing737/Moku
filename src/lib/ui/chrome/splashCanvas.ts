const CARD_COUNT  = 18
const CARD_W      = 52
const CARD_H      = 72
const CARD_RADIUS = 6
const DRIFT_SPEED = 0.018

interface Card {
  x:       number
  y:       number
  vx:      number
  vy:      number
  rot:     number
  vrot:    number
  opacity: number
  scale:   number
  hue:     number
}

function makeCard(w: number, h: number): Card {
  const side   = Math.floor(Math.random() * 4)
  const margin = 80
  let x = 0, y = 0
  if (side === 0) { x = Math.random() * w;          y = -margin }
  if (side === 1) { x = w + margin;                 y = Math.random() * h }
  if (side === 2) { x = Math.random() * w;          y = h + margin }
  if (side === 3) { x = -margin;                    y = Math.random() * h }
  const cx = w / 2, cy = h / 2
  const dx = cx - x, dy = cy - y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const spd = 0.12 + Math.random() * 0.1
  return {
    x,
    y,
    vx:      (dx / len) * spd * (0.3 + Math.random() * 0.4),
    vy:      (dy / len) * spd * (0.3 + Math.random() * 0.4),
    rot:     Math.random() * Math.PI * 2,
    vrot:    (Math.random() - 0.5) * 0.006,
    opacity: 0.025 + Math.random() * 0.055,
    scale:   0.7 + Math.random() * 0.7,
    hue:     120 + Math.random() * 40,
  }
}

function drawCard(ctx: CanvasRenderingContext2D, c: Card) {
  ctx.save()
  ctx.globalAlpha = c.opacity
  ctx.translate(c.x, c.y)
  ctx.rotate(c.rot)
  ctx.scale(c.scale, c.scale)

  const w = CARD_W, h = CARD_H, r = CARD_RADIUS
  const x = -w / 2, y = -h / 2

  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()

  ctx.strokeStyle = `hsla(${c.hue}, 28%, 62%, 0.9)`
  ctx.lineWidth   = 1 / c.scale
  ctx.stroke()

  const grad = ctx.createLinearGradient(x, y, x, y + h)
  grad.addColorStop(0,   `hsla(${c.hue}, 20%, 40%, 0.18)`)
  grad.addColorStop(1,   `hsla(${c.hue}, 20%, 20%, 0.06)`)
  ctx.fillStyle = grad
  ctx.fill()

  ctx.restore()
}

export function mountCardCanvas(canvas: HTMLCanvasElement) {
  const ctx   = canvas.getContext('2d')!
  let cards   = Array.from({ length: CARD_COUNT }, () => makeCard(canvas.offsetWidth || 800, canvas.offsetHeight || 600))
  let raf     = 0
  let running = true

  function resize() {
    const dpr = window.devicePixelRatio || 1
    canvas.width  = canvas.offsetWidth  * dpr
    canvas.height = canvas.offsetHeight * dpr
    ctx.scale(dpr, dpr)
    cards = Array.from({ length: CARD_COUNT }, () => makeCard(canvas.offsetWidth, canvas.offsetHeight))
  }

  function tick() {
    if (!running) return
    const w = canvas.offsetWidth, h = canvas.offsetHeight
    ctx.clearRect(0, 0, w, h)
    for (const c of cards) {
      c.x   += c.vx
      c.y   += c.vy
      c.rot += c.vrot
      const pad = 120
      if (c.x < -pad || c.x > w + pad || c.y < -pad || c.y > h + pad) {
        Object.assign(c, makeCard(w, h))
      }
      drawCard(ctx, c)
    }
    raf = requestAnimationFrame(tick)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()
  tick()

  return {
    destroy() {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
    },
  }
}

export function ringGeometry(r: number, pad: number) {
  const size = (r + pad) * 2
  const c    = size / 2
  const circ = 2 * Math.PI * r
  return { size, c, circ }
}

const RING_STEPS = [
  { target: 0.15, duration: 400  },
  { target: 0.45, duration: 800  },
  { target: 0.72, duration: 600  },
  { target: 0.88, duration: 1000 },
  { target: 0.96, duration: 700  },
]

export function animateRingProgress(onProgress: (p: number) => void): () => void {
  let current  = 0.025
  let stepIdx  = 0
  let start    = performance.now()
  let raf      = 0
  let stopped  = false

  function ease(t: number) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  function tick(now: number) {
    if (stopped) return
    if (stepIdx >= RING_STEPS.length) return

    const step     = RING_STEPS[stepIdx]
    const elapsed  = now - start
    const t        = Math.min(elapsed / step.duration, 1)
    const from     = stepIdx === 0 ? 0.025 : RING_STEPS[stepIdx - 1].target
    current        = from + (step.target - from) * ease(t)
    onProgress(current)

    if (t >= 1) {
      stepIdx++
      start = now
    }

    raf = requestAnimationFrame(tick)
  }

  raf = requestAnimationFrame(tick)
  return () => { stopped = true; cancelAnimationFrame(raf) }
}