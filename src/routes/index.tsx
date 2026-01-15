import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [sliderValue, setSliderValue] = useState(50)
  const [backgroundColor, setBackgroundColor] = useState('#111111')
  const [depth, setDepth] = useState(20) // spacing between squares
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

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
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
            const stepSpacing = depth * Math.pow(1 - i / 20, 2)
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
          <span className="slider-label">depth</span>
          <input
            type="range"
            min="5"
            max="40"
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="slider"
          />
        </div>

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
    </div>
  )
}
