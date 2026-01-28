import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export const Route = createFileRoute('/')({
  component: App,
})

const STRETCH_FACTOR = 0.003
const SKEW_FACTOR = 0.05
const SPRING_STIFFNESS = 0.15
const SPRING_DAMPING = 0.72
const REST_THRESHOLD = 0.0005

function useRubberStretch() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const grabPointRef = useRef({ x: 0, y: 0 })
  const transformOriginRef = useRef('center center')
  const springRef = useRef({ sx: 0, sy: 0, skx: 0, sky: 0 })
  const velocityRef = useRef({ sx: 0, sy: 0, skx: 0, sky: 0 })
  const targetRef = useRef({ sx: 0, sy: 0, skx: 0, sky: 0 })
  const animFrameRef = useRef<number>(0)
  const [, forceRender] = useState(0)

  const animateSpring = useCallback(() => {
    const spring = springRef.current
    const vel = velocityRef.current
    const target = targetRef.current

    vel.sx = (vel.sx + (target.sx - spring.sx) * SPRING_STIFFNESS) * SPRING_DAMPING
    vel.sy = (vel.sy + (target.sy - spring.sy) * SPRING_STIFFNESS) * SPRING_DAMPING
    vel.skx = (vel.skx + (target.skx - spring.skx) * SPRING_STIFFNESS) * SPRING_DAMPING
    vel.sky = (vel.sky + (target.sky - spring.sky) * SPRING_STIFFNESS) * SPRING_DAMPING

    spring.sx += vel.sx
    spring.sy += vel.sy
    spring.skx += vel.skx
    spring.sky += vel.sky

    const el = containerRef.current
    if (el) {
      el.style.transform = `scaleX(${1 + spring.sx}) scaleY(${1 + spring.sy}) skewX(${spring.skx}deg) skewY(${spring.sky}deg)`
      el.style.transformOrigin = transformOriginRef.current
    }

    const isAtRest =
      !isDraggingRef.current &&
      Math.abs(vel.sx) < REST_THRESHOLD &&
      Math.abs(vel.sy) < REST_THRESHOLD &&
      Math.abs(vel.skx) < REST_THRESHOLD &&
      Math.abs(vel.sky) < REST_THRESHOLD &&
      Math.abs(spring.sx - target.sx) < REST_THRESHOLD &&
      Math.abs(spring.sy - target.sy) < REST_THRESHOLD

    if (isAtRest) {
      spring.sx = 0
      spring.sy = 0
      spring.skx = 0
      spring.sky = 0
      if (el) el.style.transform = 'none'
      animFrameRef.current = 0
      return
    }
    animFrameRef.current = requestAnimationFrame(animateSpring)
  }, [])

  const startAnimLoop = useCallback(() => {
    if (!animFrameRef.current) animFrameRef.current = requestAnimationFrame(animateSpring)
  }, [animateSpring])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDraggingRef.current = true
      grabPointRef.current = { x: e.clientX, y: e.clientY }
      forceRender((n) => n + 1)

      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const localX = e.clientX - rect.left
        const localY = e.clientY - rect.top
        const percX = (localX / rect.width) * 100
        const percY = (localY / rect.height) * 100
        transformOriginRef.current = `${100 - percX}% ${100 - percY}%`
      }
      targetRef.current = { sx: 0, sy: 0, skx: 0, sky: 0 }
      startAnimLoop()
    },
    [startAnimLoop],
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - grabPointRef.current.x
      const dy = e.clientY - grabPointRef.current.y
      targetRef.current = {
        sx: dx * STRETCH_FACTOR,
        sy: dy * STRETCH_FACTOR,
        skx: dy * SKEW_FACTOR,
        sky: dx * SKEW_FACTOR,
      }
    }
    const handleMouseUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      targetRef.current = { sx: 0, sy: 0, skx: 0, sky: 0 }
      forceRender((n) => n + 1)
      startAnimLoop()
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [startAnimLoop])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return { containerRef, handleMouseDown, isDraggingRef }
}

const DEPTH_BOING_SENSITIVITY = 0.12
const DEPTH_BOING_STIFFNESS = 0.18
const DEPTH_BOING_DAMPING = 0.75
const DEPTH_BOING_REST = 0.002

function useDepthBoing() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const grabPointRef = useRef({ x: 0, y: 0 })
  const offsetRef = useRef(0)
  const targetRef = useRef(0)
  const velocityRef = useRef(0)
  const animFrameRef = useRef<number>(0)
  const [depthOffset, setDepthOffset] = useState(0)

  const animateSpring = useCallback(() => {
    let vel = velocityRef.current
    const target = targetRef.current
    const offset = offsetRef.current

    vel = (vel + (target - offset) * DEPTH_BOING_STIFFNESS) * DEPTH_BOING_DAMPING
    velocityRef.current = vel
    const next = offset + vel
    offsetRef.current = next
    setDepthOffset(next)

    const atRest =
      !isDraggingRef.current &&
      Math.abs(vel) < DEPTH_BOING_REST &&
      Math.abs(next - target) < DEPTH_BOING_REST

    if (atRest) {
      offsetRef.current = 0
      velocityRef.current = 0
      setDepthOffset(0)
      animFrameRef.current = 0
      return
    }
    animFrameRef.current = requestAnimationFrame(animateSpring)
  }, [])

  const startAnimLoop = useCallback(() => {
    if (!animFrameRef.current) animFrameRef.current = requestAnimationFrame(animateSpring)
  }, [animateSpring])

  const [, forceRender] = useState(0)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDraggingRef.current = true
      grabPointRef.current = { x: e.clientX, y: e.clientY }
      targetRef.current = 0
      forceRender((n) => n + 1)
      startAnimLoop()
    },
    [startAnimLoop],
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const dy = e.clientY - grabPointRef.current.y
      targetRef.current = dy * DEPTH_BOING_SENSITIVITY
    }
    const handleMouseUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      targetRef.current = 0
      forceRender((n) => n + 1)
      startAnimLoop()
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [startAnimLoop])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return { containerRef, handleMouseDown, isDraggingRef, depthOffset }
}

function App() {
  const [sliderValue, setSliderValue] = useState(50)
  const [backgroundColor, setBackgroundColor] = useState('#111111')
  const [depthStretch, setDepthStretch] = useState(20)
  const [depthBoing, setDepthBoing] = useState(20)
  const tvStaticDepth = 20
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dotted' | 'dashed'>(
    'solid',
  )
  const [isAnimationPaused, setIsAnimationPaused] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [isCircle, setIsCircle] = useState(false)
  const [colors, setColors] = useState([
    '#000000',
    '#ffffff',
    '#ff0000',
    '#0000ff',
  ])

  const prismStretch = useRubberStretch()
  const concentricStretch = useRubberStretch()
  const depthBoingEffect = useDepthBoing()
  const staticLargeBoing = useDepthBoing()

  // Convert slider value to animation duration
  // Lower slider value = slower (longer duration)
  // Higher slider value = faster (shorter duration)
  // Slider at 0 = 5 seconds, Slider at 100 = 0.001 seconds (super fast!)
  const animationDuration = `${5 - (sliderValue / 100) * 4.999}s`

  const updateColor = (index: number, newColor: string) => {
    const newColors = [...colors]
    newColors[index] = newColor
    setColors(newColors)
  }

  const addColor = () => {
    setColors([...colors, '#888888'])
  }

  const removeColor = (index: number) => {
    if (colors.length > 2) {
      setColors(colors.filter((_, i) => i !== index))
    }
  }

  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }
  }

  // Generate SVG with multiple colors mapped to noise
  const noiseSvg = useMemo(() => {
    const filterId = `noise-${Math.random().toString(36).substr(2, 9)}`

    // Convert colors to RGB and create discrete table values
    const numSteps = 256
    const rValues: Array<number> = []
    const gValues: Array<number> = []
    const bValues: Array<number> = []

    for (let i = 0; i < numSteps; i++) {
      const position = i / (numSteps - 1) // 0 to 1
      const colorIndex = position * (colors.length - 1)
      const lowerIndex = Math.floor(colorIndex)
      const upperIndex = Math.ceil(colorIndex)
      const t = colorIndex - lowerIndex

      const lowerColor = hexToRgb(colors[lowerIndex])
      const upperColor = hexToRgb(colors[Math.min(upperIndex, colors.length - 1)])

      // Linear interpolation
      const r = lowerColor.r + (upperColor.r - lowerColor.r) * t
      const g = lowerColor.g + (upperColor.g - lowerColor.g) * t
      const b = lowerColor.b + (upperColor.b - lowerColor.b) * t

      rValues.push(r / 255)
      gValues.push(g / 255)
      bValues.push(b / 255)
    }

    const svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" result="turbulence"/>
          <feColorMatrix in="turbulence" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 1 0" result="grayscale"/>
          <feComponentTransfer in="grayscale">
            <feFuncR type="table" tableValues="${rValues.join(' ')}"/>
            <feFuncG type="table" tableValues="${gValues.join(' ')}"/>
            <feFuncB type="table" tableValues="${bValues.join(' ')}"/>
            <feFuncA type="identity"/>
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#${filterId})" fill="white"/>
    </svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }, [colors])

  // Fine-grain static noise for 700×700 container (high baseFrequency)
  const fineGrainNoiseSvg = useMemo(() => {
    const filterId = `fine-${Math.random().toString(36).substr(2, 9)}`
    const svg = `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}">
          <feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="5" stitchTiles="stitch" result="turbulence"/>
          <feColorMatrix in="turbulence" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 1 0" result="grayscale"/>
          <feComponentTransfer in="grayscale">
            <feFuncR type="table" tableValues="0 0.2 0.4 0.6 0.8 1"/>
            <feFuncG type="table" tableValues="0 0.2 0.4 0.6 0.8 1"/>
            <feFuncB type="table" tableValues="0 0.2 0.4 0.6 0.8 1"/>
            <feFuncA type="identity"/>
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#${filterId})" fill="white"/>
    </svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }, [])

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '2rem',
        padding: '2rem 0',
      }}
    >
      <div
        className="tv-static"
        style={{
          backgroundColor: backgroundColor,
        }}
      >
        <div
          className={`tv-static-inner ${isRotating ? 'rotating' : ''}`}
          style={{
            animationDuration: animationDuration,
            backgroundImage: `url("${noiseSvg}")`,
            animationPlayState: isAnimationPaused ? 'paused' : 'running',
          }}
        />
        {Array.from({ length: 20 }).map((_, index) => {
          // Calculate cumulative offset with decreasing spacing
          let cumulativeOffset = 0
          for (let i = 0; i < index; i++) {
            // Each step's spacing decreases as we go inward
            const stepSpacing = tvStaticDepth * Math.pow(1 - i / 20, 2)
            cumulativeOffset += stepSpacing
          }

          return (
            <div
              key={index}
              className="concentric-square"
              style={{
                width: `${800 - cumulativeOffset * 2}px`,
                height: `${600 - cumulativeOffset * 2}px`,
                borderStyle: borderStyle,
                borderRadius: isCircle ? '50%' : '0',
              }}
            />
          )
        })}
      </div>

      <div className="all-controls">
        <div className="slider-container">
          <span className="slider-label">pace</span>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="slider"
          />
        </div>

        <div className="slider-container">
          <span className="slider-label">motion</span>
          <button
            onClick={() => setIsAnimationPaused(!isAnimationPaused)}
            className="add-button"
          >
            {isAnimationPaused ? 'play' : 'pause'}
          </button>
        </div>

        <div className="slider-container">
          <span className="slider-label">rotation</span>
          <button
            onClick={() => setIsRotating(!isRotating)}
            className="add-button"
          >
            {isRotating ? 'stop' : 'spin'}
          </button>
        </div>

        <div className="slider-container">
          <span className="slider-label">background</span>
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="color-picker"
          />
        </div>

        {colors.map((color, index) => (
          <div key={index} className="slider-container">
            <span className="slider-label">color {index + 1}</span>
            <input
              type="color"
              value={color}
              onChange={(e) => updateColor(index, e.target.value)}
              className="color-picker"
            />
            {colors.length > 2 && (
              <button
                onClick={() => removeColor(index)}
                className="remove-button"
              >
                ×
              </button>
            )}
          </div>
        ))}

        <button onClick={addColor} className="add-button">
          + add color
        </button>

        <div className="slider-container">
          <span className="slider-label">border style</span>
          <div className="button-group">
            <button
              onClick={() => setBorderStyle('solid')}
              className={`style-button ${borderStyle === 'solid' ? 'active' : ''}`}
            >
              solid
            </button>
            <button
              onClick={() => setBorderStyle('dotted')}
              className={`style-button ${borderStyle === 'dotted' ? 'active' : ''}`}
            >
              dotted
            </button>
            <button
              onClick={() => setBorderStyle('dashed')}
              className={`style-button ${borderStyle === 'dashed' ? 'active' : ''}`}
            >
              dashed
            </button>
          </div>
        </div>

        <div className="slider-container">
          <span className="slider-label">shape</span>
          <button
            onClick={() => setIsCircle(!isCircle)}
            className="add-button"
          >
            {isCircle ? 'squares' : 'circles'}
          </button>
        </div>
      </div>

      <div className="concentric-stretch-wrapper">
        <div
          ref={concentricStretch.containerRef}
          className={`concentric-stretch-container ${concentricStretch.isDraggingRef.current ? 'dragging' : ''}`}
          onMouseDown={concentricStretch.handleMouseDown}
        >
          <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
            {Array.from({ length: 20 }).map((_, index) => {
              let cumulativeOffset = 0
              for (let i = 0; i < index; i++) {
                const stepSpacing = depthStretch * Math.pow(1 - i / 20, 2)
              cumulativeOffset += stepSpacing
            }
            const w = 800 - cumulativeOffset * 2
            const h = 600 - cumulativeOffset * 2
            const strokeDash =
              borderStyle === 'dashed'
                ? '10 5'
                : borderStyle === 'dotted'
                  ? '2 4'
                  : undefined
            if (isCircle) {
              return (
                <ellipse
                  key={index}
                  cx={400}
                  cy={300}
                  rx={w / 2}
                  ry={h / 2}
                  fill="none"
                  stroke="white"
                  strokeWidth={1}
                  strokeDasharray={strokeDash}
                />
              )
            }
            return (
              <rect
                key={index}
                x={cumulativeOffset}
                y={cumulativeOffset}
                width={w}
                height={h}
                fill="none"
                stroke="white"
                strokeWidth={1}
                strokeDasharray={strokeDash}
              />
            )
          })}
          </svg>
        </div>
        <div className="slider-container">
          <span className="slider-label">depth</span>
          <input
            type="range"
            min="5"
            max="40"
            value={depthStretch}
            onChange={(e) => setDepthStretch(Number(e.target.value))}
            className="slider"
          />
        </div>
      </div>

      <div className="concentric-boing-wrapper">
        <div
          ref={depthBoingEffect.containerRef}
          className={`concentric-boing-container ${depthBoingEffect.isDraggingRef.current ? 'dragging' : ''}`}
          onMouseDown={depthBoingEffect.handleMouseDown}
        >
          <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
            {Array.from({ length: 20 }).map((_, index) => {
              const effectiveDepth = Math.max(2, Math.min(60, depthBoing + depthBoingEffect.depthOffset))
              let cumulativeOffset = 0
              for (let i = 0; i < index; i++) {
                const stepSpacing = effectiveDepth * Math.pow(1 - i / 20, 2)
                cumulativeOffset += stepSpacing
              }
              const w = 800 - cumulativeOffset * 2
              const h = 600 - cumulativeOffset * 2
              const strokeDash =
                borderStyle === 'dashed'
                  ? '10 5'
                  : borderStyle === 'dotted'
                    ? '2 4'
                    : undefined
              if (isCircle) {
                return (
                  <ellipse
                    key={index}
                    cx={400}
                    cy={300}
                    rx={w / 2}
                    ry={h / 2}
                    fill="none"
                    stroke="white"
                    strokeWidth={1}
                    strokeDasharray={strokeDash}
                  />
                )
              }
              return (
                <rect
                  key={index}
                  x={cumulativeOffset}
                  y={cumulativeOffset}
                  width={w}
                  height={h}
                  fill="none"
                  stroke="white"
                  strokeWidth={1}
                  strokeDasharray={strokeDash}
                />
              )
            })}
          </svg>
        </div>
        <div className="slider-container">
          <span className="slider-label">depth</span>
          <input
            type="range"
            min="5"
            max="40"
            value={depthBoing}
            onChange={(e) => setDepthBoing(Number(e.target.value))}
            className="slider"
          />
        </div>
      </div>

      <div
        ref={prismStretch.containerRef}
        className={`new-feature-container ${prismStretch.isDraggingRef.current ? 'dragging' : ''}`}
        onMouseDown={prismStretch.handleMouseDown}
      >
        <svg viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="topGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#d4ff8f', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#b8ff6f', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#ffff99', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="leftGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#a8e68f', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#8fcc7f', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#ffcc88', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="rightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#d4ff99', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#b8e68f', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#ffaa88', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="pastelTexture">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={4} result="noise" />
              <feColorMatrix in="noise" type="saturate" values="0.3" />
              <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
            </filter>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g opacity="0.6" filter="url(#glow)">
            <path d="M 400 150 L 600 280 L 600 540 L 400 670" fill="none" stroke="#9b8fcc" strokeWidth="3" />
            <path d="M 400 150 L 200 280 L 200 540 L 400 670" fill="none" stroke="#8f7fbb" strokeWidth="3" />
            <path d="M 200 280 L 400 410 L 600 280" fill="none" stroke="#a89fdd" strokeWidth="3" />
          </g>
          <path d="M 400 150 L 200 280 L 200 540 L 400 670 L 400 410 Z" fill="url(#leftGrad)" filter="url(#pastelTexture)" opacity="0.95" />
          <path d="M 400 150 L 600 280 L 600 540 L 400 670 L 400 410 Z" fill="url(#rightGrad)" filter="url(#pastelTexture)" opacity="0.95" />
          <path d="M 400 150 L 200 280 L 400 410 L 600 280 Z" fill="url(#topGrad)" filter="url(#pastelTexture)" opacity="0.98" />
          <g opacity="0.7">
            <line x1="400" y1="150" x2="400" y2="410" stroke="#ffffff" strokeWidth="4" opacity="0.6" />
            <line x1="200" y1="280" x2="600" y2="280" stroke="#ffffff" strokeWidth="3" opacity="0.5" />
            <line x1="300" y1="215" x2="500" y2="345" stroke="#ffffff" strokeWidth="2" opacity="0.4" />
            <line x1="500" y1="215" x2="300" y2="345" stroke="#ffffff" strokeWidth="2" opacity="0.4" />
          </g>
          <g opacity="0.3">
            <circle cx="350" cy="250" r="15" fill="#4a5f3f" />
            <circle cx="450" cy="300" r="20" fill="#3f4f3f" />
            <circle cx="380" cy="380" r="12" fill="#5f4f3f" />
            <circle cx="250" cy="350" r="18" fill="#4a5f4a" />
            <circle cx="520" cy="320" r="16" fill="#5f5a3f" />
            <circle cx="300" cy="480" r="14" fill="#6f5a4a" />
            <circle cx="500" cy="500" r="17" fill="#5f4f4f" />
          </g>
        </svg>
      </div>

      <div className="tv-static-large-wrapper">
        <div
          ref={staticLargeBoing.containerRef}
          className={`tv-static-large ${staticLargeBoing.isDraggingRef.current ? 'dragging' : ''}`}
          onMouseDown={staticLargeBoing.handleMouseDown}
        >
          <div
            className="tv-static-large-inner"
            style={{
              backgroundImage: `url("${fineGrainNoiseSvg}")`,
              animationDuration: '0.3s',
              animationPlayState: isAnimationPaused ? 'paused' : 'running',
            }}
          />
          <div
            className="tv-static-large-blue-tint"
            style={{
              opacity: Math.min(0.65, Math.abs(staticLargeBoing.depthOffset) * 0.035),
            }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}
