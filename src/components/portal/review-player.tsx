'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatTimecode } from '@/lib/format'

interface ReviewPlayerProps {
  src: string
  mimeType: string
  duration?: number | null
  thumbnailUrl?: string | null
  seekToTime?: number | null
  fillContainer?: boolean
  onTimeUpdate?: (seconds: number) => void
  onRefreshNeeded?: () => Promise<string | null>
}

export function ReviewPlayer({
  src,
  mimeType,
  duration: externalDuration,
  thumbnailUrl,
  seekToTime,
  fillContainer,
  onTimeUpdate,
  onRefreshNeeded,
}: ReviewPlayerProps) {
  const isVideo = mimeType.startsWith('video/')
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [mediaSrc, setMediaSrc] = useState(src)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(externalDuration ?? 0)
  const [volume, setVolume] = useState(1)
  const [hoveringProgress, setHoveringProgress] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Sync external src changes
  useEffect(() => {
    setMediaSrc(src)
  }, [src])

  // Seek to time when prop changes
  useEffect(() => {
    if (seekToTime != null && mediaRef.current) {
      mediaRef.current.currentTime = seekToTime
    }
  }, [seekToTime])

  const handleTimeUpdate = useCallback(() => {
    const el = mediaRef.current
    if (!el) return
    setCurrentTime(el.currentTime)
    onTimeUpdate?.(el.currentTime)
  }, [onTimeUpdate])

  const handleLoadedMetadata = useCallback(() => {
    const el = mediaRef.current
    if (!el) return
    if (el.duration && isFinite(el.duration)) {
      setDuration(el.duration)
    }
  }, [])

  const handleError = useCallback(async () => {
    if (!onRefreshNeeded) return
    const el = mediaRef.current
    const resumeTime = el?.currentTime ?? 0
    const newUrl = await onRefreshNeeded()
    if (newUrl) {
      setMediaSrc(newUrl)
      // After src changes, wait for loadeddata to resume position
      const onLoaded = () => {
        if (mediaRef.current) {
          mediaRef.current.currentTime = resumeTime
          mediaRef.current.play().catch(() => {})
        }
      }
      // Use a timeout to let React re-render with new src
      setTimeout(() => {
        mediaRef.current?.addEventListener('loadeddata', onLoaded, { once: true })
        mediaRef.current?.load()
      }, 0)
    }
  }, [onRefreshNeeded])

  const togglePlay = useCallback(() => {
    const el = mediaRef.current
    if (!el) return
    if (el.paused) {
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [])

  const handlePlayState = useCallback(() => setPlaying(true), [])
  const handlePauseState = useCallback(() => setPlaying(false), [])

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = mediaRef.current
      const bar = progressRef.current
      if (!el || !bar || !duration) return
      const rect = bar.getBoundingClientRect()
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      el.currentTime = fraction * duration
    },
    [duration],
  )

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (mediaRef.current) {
      mediaRef.current.volume = v
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen()
    }
  }, [])

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'f') {
        toggleFullscreen()
      } else if (e.key === 'ArrowLeft') {
        if (mediaRef.current) mediaRef.current.currentTime = Math.max(0, mediaRef.current.currentTime - 5)
      } else if (e.key === 'ArrowRight') {
        if (mediaRef.current) mediaRef.current.currentTime = Math.min(duration, mediaRef.current.currentTime + 5)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, toggleFullscreen, duration])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const mediaProps = {
    src: mediaSrc,
    onTimeUpdate: handleTimeUpdate,
    onLoadedMetadata: handleLoadedMetadata,
    onError: handleError,
    onPlay: handlePlayState,
    onPause: handlePauseState,
  }

  return (
    <div ref={containerRef} className={`w-full ${isFullscreen ? 'flex flex-col h-full bg-black' : fillContainer ? 'flex flex-col h-full' : ''}`}>
      {/* Media area */}
      {isVideo ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          className={`w-full bg-black object-contain ${isFullscreen || fillContainer ? 'flex-1 min-h-0 rounded-t-lg' : 'aspect-video rounded-t-lg'}`}
          onDoubleClick={toggleFullscreen}
          {...mediaProps}
        />
      ) : (
        <>
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            className="hidden"
            {...mediaProps}
          />
          <div className="w-full aspect-video rounded-t-lg overflow-hidden flex items-center justify-center bg-surface-overlay">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="Album art"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-accent/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
            )}
          </div>
        </>
      )}

      {/* Controls bar */}
      <div className={`bg-surface-raised px-3 py-2 space-y-2 ${isFullscreen ? 'shrink-0' : 'rounded-b-lg border border-t-0 border-border-subtle'}`}>
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="group relative h-1.5 cursor-pointer rounded-full bg-surface-overlay"
          onClick={handleProgressClick}
          onMouseEnter={() => setHoveringProgress(true)}
          onMouseLeave={() => setHoveringProgress(false)}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
          {hoveringProgress && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent shadow-sm transition-[left] duration-100"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="shrink-0 text-text-primary hover:text-accent transition-colors"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Timecode */}
          <span className="text-xs text-text-secondary font-mono tabular-nums">
            {formatTimecode(currentTime)} / {formatTimecode(duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Volume */}
          <div className="flex items-center gap-1.5 shrink-0">
            <svg
              className="w-4 h-4 text-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              {volume === 0 ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-3.15a.75.75 0 011.28.53v13.74a.75.75 0 01-1.28.53L6.75 14.25H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-3.15a.75.75 0 011.28.53v12.74a.75.75 0 01-1.28.53l-4.72-3.15H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                />
              )}
            </svg>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 accent-accent cursor-pointer"
              aria-label="Volume"
            />
          </div>

          {/* Fullscreen */}
          {isVideo && (
            <button
              onClick={toggleFullscreen}
              className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
