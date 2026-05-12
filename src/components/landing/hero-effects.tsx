'use client'

import { useEffect, useRef } from 'react'

export function AuroraBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />
      <div className="grid-overlay" />
    </div>
  )
}

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let tx = innerWidth / 2, ty = innerHeight * 0.4, gx = tx, gy = ty
    let raf: number | null = null
    let visible = false

    function tick() {
      gx += (tx - gx) * 0.14
      gy += (ty - gy) * 0.14
      el!.style.transform = `translate(${gx.toFixed(1)}px,${gy.toFixed(1)}px)`
      if (Math.abs(tx - gx) > 0.4 || Math.abs(ty - gy) > 0.4) {
        raf = requestAnimationFrame(tick)
      } else {
        raf = null
      }
    }

    function onMove(e: PointerEvent) {
      if (e.pointerType === 'touch') return
      tx = e.clientX
      ty = e.clientY
      if (!visible) { el!.style.opacity = '1'; visible = true }
      if (!raf) raf = requestAnimationFrame(tick)
    }

    function onLeave() {
      el!.style.opacity = '0'
      visible = false
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    tick()

    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={ref}
      className="cursor-glow fixed left-0 top-0 w-[540px] h-[540px] -ml-[270px] -mt-[270px] rounded-full pointer-events-none z-[60] opacity-0 transition-opacity duration-500"
      style={{
        background: 'radial-gradient(circle, oklch(0.74 0.16 38 / 0.14), oklch(0.62 0.15 22 / 0.05) 42%, transparent 70%)',
        filter: 'blur(26px)',
        mixBlendMode: 'screen',
      }}
      aria-hidden="true"
    />
  )
}

export function useScrollReveal() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'))
      return
    }

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )

    document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

export function ScrollRevealInit() {
  useScrollReveal()
  return null
}

export function NavScrollEffect() {
  useEffect(() => {
    const nav = document.getElementById('landing-nav')
    if (!nav) return

    function onScroll() {
      nav!.classList.toggle('scrolled', window.scrollY > 12)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return null
}
