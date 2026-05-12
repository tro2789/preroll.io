import { describe, it, expect } from 'vitest'
import {
  formatFileSize,
  formatDuration,
  formatTimecode,
  secsToFrameIoTimecode,
  frameIoTimecodeToSecs,
} from '../format'

describe('formatFileSize', () => {
  it('formats zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB')
    expect(formatFileSize(5242880)).toBe('5.0 MB')
  })

  it('formats gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1.0 GB')
  })
})

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(45)).toBe('0:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(125)).toBe('2:05')
    expect(formatDuration(600)).toBe('10:00')
  })

  it('formats hours', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
    expect(formatDuration(3661)).toBe('1:01:01')
    expect(formatDuration(7200)).toBe('2:00:00')
  })

  it('formats zero', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('truncates fractional seconds', () => {
    expect(formatDuration(5.7)).toBe('0:05')
  })
})

describe('formatTimecode', () => {
  it('formats with leading zeros', () => {
    expect(formatTimecode(0)).toBe('00:00')
    expect(formatTimecode(5)).toBe('00:05')
    expect(formatTimecode(65)).toBe('01:05')
  })

  it('formats larger values', () => {
    expect(formatTimecode(600)).toBe('10:00')
    expect(formatTimecode(3599)).toBe('59:59')
  })
})

describe('secsToFrameIoTimecode', () => {
  it('converts seconds to HH:MM:SS:FF format', () => {
    expect(secsToFrameIoTimecode(0)).toBe('00:00:00:00')
    expect(secsToFrameIoTimecode(61)).toBe('00:01:01:00')
    expect(secsToFrameIoTimecode(3661)).toBe('01:01:01:00')
  })
})

describe('frameIoTimecodeToSecs', () => {
  it('converts HH:MM:SS timecode to seconds', () => {
    expect(frameIoTimecodeToSecs('00:01:01')).toBe(61)
    expect(frameIoTimecodeToSecs('01:00:00')).toBe(3600)
  })

  it('handles HH:MM:SS:FF with frames', () => {
    const result = frameIoTimecodeToSecs('00:01:00:12')
    expect(result).toBe(60.5)
  })

  it('converts numeric frame count to seconds at 24fps', () => {
    expect(frameIoTimecodeToSecs(48)).toBe(2)
    expect(frameIoTimecodeToSecs(24)).toBe(1)
  })

  it('returns null for null/undefined', () => {
    expect(frameIoTimecodeToSecs(null)).toBeNull()
  })

  it('returns null for invalid string', () => {
    expect(frameIoTimecodeToSecs('invalid')).toBeNull()
  })
})
