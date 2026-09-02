import React, { useRef, useEffect, useState, useCallback } from 'react'

/**
 * ReportGraph — Canvas-based force-directed graph visualization
 * Shows a selected report at center with linked reports orbiting it.
 * Edges represent shared attributes (cause, site, category, location).
 *
 * Props:
 *   graphData  — { nodes: [...], edges: [...], source_id }
 *   onNodeClick — (reportId) => void
 */

const RISK_COLORS = {
  HIGH:   { fill: '#dc2626', stroke: '#991b1b', glow: 'rgba(220,38,38,0.25)' },
  MEDIUM: { fill: '#d97706', stroke: '#92400e', glow: 'rgba(217,119,6,0.20)' },
  LOW:    { fill: '#2563eb', stroke: '#1e40af', glow: 'rgba(37,99,235,0.18)' },
}

const SOURCE_COLOR = { fill: '#091426', stroke: '#091426', glow: 'rgba(9,20,38,0.30)' }

function getNodeColor(node) {
  if (node.type === 'source') return SOURCE_COLOR
  return RISK_COLORS[node.risk_level] || RISK_COLORS.LOW
}

// Simple force simulation
function createSimulation(nodes, edges, width, height) {
  const positions = new Map()
  const velocities = new Map()

  // Place source at center, others in a ring
  const sourceNode = nodes.find(n => n.type === 'source')
  const linkedNodes = nodes.filter(n => n.type !== 'source')
  const angleStep = (2 * Math.PI) / Math.max(linkedNodes.length, 1)
  const ringRadius = Math.min(width, height) * 0.32

  if (sourceNode) {
    positions.set(sourceNode.id, { x: width / 2, y: height / 2 })
    velocities.set(sourceNode.id, { vx: 0, vy: 0 })
  }

  linkedNodes.forEach((n, i) => {
    const angle = angleStep * i - Math.PI / 2
    const jitter = (Math.random() - 0.5) * 30
    positions.set(n.id, {
      x: width / 2 + Math.cos(angle) * (ringRadius + jitter),
      y: height / 2 + Math.sin(angle) * (ringRadius + jitter),
    })
    velocities.set(n.id, { vx: 0, vy: 0 })
  })

  return { positions, velocities }
}

function simulate(nodes, edges, positions, velocities, width, height) {
  const alpha = 0.15
  const repulsion = 2800
  const attraction = 0.008
  const damping = 0.85
  const centerGravity = 0.01

  // Repulsion between all nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const pi = positions.get(nodes[i].id)
      const pj = positions.get(nodes[j].id)
      if (!pi || !pj) continue

      let dx = pi.x - pj.x
      let dy = pi.y - pj.y
      let dist = Math.sqrt(dx * dx + dy * dy) || 1
      let force = repulsion / (dist * dist)

      const fx = (dx / dist) * force * alpha
      const fy = (dy / dist) * force * alpha

      const vi = velocities.get(nodes[i].id)
      const vj = velocities.get(nodes[j].id)
      if (vi) { vi.vx += fx; vi.vy += fy }
      if (vj) { vj.vx -= fx; vj.vy -= fy }
    }
  }

  // Attraction along edges
  for (const edge of edges) {
    const ps = positions.get(edge.source)
    const pt = positions.get(edge.target)
    if (!ps || !pt) continue

    let dx = pt.x - ps.x
    let dy = pt.y - ps.y
    let dist = Math.sqrt(dx * dx + dy * dy) || 1
    const idealDist = 120 + (1 - (edge.strength || 0.5)) * 80

    const force = (dist - idealDist) * attraction * alpha

    const fx = (dx / dist) * force
    const fy = (dy / dist) * force

    const vs = velocities.get(edge.source)
    const vt = velocities.get(edge.target)
    if (vs) { vs.vx += fx; vs.vy += fy }
    if (vt) { vt.vx -= fx; vt.vy -= fy }
  }

  // Center gravity
  for (const node of nodes) {
    const p = positions.get(node.id)
    const v = velocities.get(node.id)
    if (!p || !v) continue
    v.vx += (width / 2 - p.x) * centerGravity * alpha
    v.vy += (height / 2 - p.y) * centerGravity * alpha
  }

  // Apply velocities
  for (const node of nodes) {
    const p = positions.get(node.id)
    const v = velocities.get(node.id)
    if (!p || !v) continue

    // Source node is pinned at center
    if (node.type === 'source') {
      p.x = width / 2
      p.y = height / 2
      v.vx = 0
      v.vy = 0
      continue
    }

    v.vx *= damping
    v.vy *= damping
    p.x += v.vx
    p.y += v.vy

    // Contain within bounds
    const margin = 40
    p.x = Math.max(margin, Math.min(width - margin, p.x))
    p.y = Math.max(margin, Math.min(height - margin, p.y))
  }
}

export default function ReportGraph({ graphData, onNodeClick }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const simRef = useRef(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const frameCount = useRef(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !graphData || !simRef.current) return

    const ctx = canvas.getContext('2d')
    const { positions } = simRef.current
    const { nodes, edges } = graphData
    const w = canvas.width
    const h = canvas.height
    const dpr = window.devicePixelRatio || 1

    ctx.clearRect(0, 0, w, h)
    ctx.save()

    // Draw edges
    for (const edge of edges) {
      const ps = positions.get(edge.source)
      const pt = positions.get(edge.target)
      if (!ps || !pt) continue

      const strength = edge.strength || 0.5
      const lineWidth = 1 + strength * 2

      ctx.beginPath()
      ctx.moveTo(ps.x * dpr, ps.y * dpr)
      ctx.lineTo(pt.x * dpr, pt.y * dpr)
      ctx.strokeStyle = `rgba(69, 71, 76, ${0.15 + strength * 0.35})`
      ctx.lineWidth = lineWidth * dpr
      ctx.setLineDash([4 * dpr, 4 * dpr])
      ctx.stroke()
      ctx.setLineDash([])

      // Edge label at midpoint
      const mx = (ps.x + pt.x) / 2
      const my = (ps.y + pt.y) / 2
      ctx.fillStyle = 'rgba(69, 71, 76, 0.6)'
      ctx.font = `${9 * dpr}px "JetBrains Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(edge.label || '', mx * dpr, (my - 6) * dpr)
    }

    // Draw nodes
    for (const node of nodes) {
      const pos = positions.get(node.id)
      if (!pos) continue

      const colors = getNodeColor(node)
      const isSource = node.type === 'source'
      const isHovered = hoveredNode === node.id
      const radius = isSource ? 28 : (isHovered ? 22 : 18)

      // Glow
      if (isSource || isHovered) {
        ctx.beginPath()
        ctx.arc(pos.x * dpr, pos.y * dpr, (radius + 8) * dpr, 0, Math.PI * 2)
        ctx.fillStyle = colors.glow
        ctx.fill()
      }

      // SIF pulse ring
      if (node.sif_potential && !isSource) {
        const pulseSize = 4 + Math.sin(frameCount.current * 0.06) * 3
        ctx.beginPath()
        ctx.arc(pos.x * dpr, pos.y * dpr, (radius + pulseSize) * dpr, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(186, 26, 26, 0.3)'
        ctx.lineWidth = 1.5 * dpr
        ctx.stroke()
      }

      // Node circle
      ctx.beginPath()
      ctx.arc(pos.x * dpr, pos.y * dpr, radius * dpr, 0, Math.PI * 2)
      ctx.fillStyle = colors.fill
      ctx.fill()
      ctx.strokeStyle = isHovered ? '#091426' : colors.stroke
      ctx.lineWidth = (isHovered ? 2.5 : 1.5) * dpr
      ctx.stroke()

      // Label
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${(isSource ? 10 : 9) * dpr}px "JetBrains Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Shorten label to fit
      const label = node.label.replace('RPT-SAP-', 'S').replace('RPT-', '')
      ctx.fillText(label, pos.x * dpr, pos.y * dpr)

      // Category label below
      if (!isSource) {
        ctx.fillStyle = 'rgba(69, 71, 76, 0.8)'
        ctx.font = `${8 * dpr}px "JetBrains Mono", monospace`
        ctx.fillText(node.risk_level || '', pos.x * dpr, (pos.y + radius + 10) * dpr)
      } else {
        ctx.fillStyle = '#091426'
        ctx.font = `bold ${9 * dpr}px "JetBrains Mono", monospace`
        ctx.fillText('SOURCE', pos.x * dpr, (pos.y + radius + 12) * dpr)
      }
    }

    ctx.restore()
    frameCount.current++
  }, [graphData, hoveredNode])

  // Initialize and run simulation
  useEffect(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.parentElement.getBoundingClientRect()
    const w = rect.width || 400
    const h = rect.height || 350

    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const { positions, velocities } = createSimulation(graphData.nodes, graphData.edges, w, h)
    simRef.current = { positions, velocities }

    let ticks = 0
    const maxTicks = 200

    function tick() {
      if (ticks < maxTicks) {
        simulate(graphData.nodes, graphData.edges, positions, velocities, w, h)
      }
      draw()
      ticks++
      animRef.current = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [graphData, draw])

  // Mouse interaction
  const handleMouseMove = useCallback((e) => {
    if (!graphData || !simRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const { positions } = simRef.current

    let found = null
    for (const node of graphData.nodes) {
      const pos = positions.get(node.id)
      if (!pos) continue
      const dx = mx - pos.x
      const dy = my - pos.y
      const r = node.type === 'source' ? 28 : 18
      if (dx * dx + dy * dy < r * r) {
        found = node
        break
      }
    }

    if (found) {
      setHoveredNode(found.id)
      canvas.style.cursor = 'pointer'

      // Find edge for tooltip
      const edge = graphData.edges.find(e => e.target === found.id || e.source === found.id)
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        node: found,
        reasons: edge ? edge.reasons : [],
        strength: edge ? edge.strength : 0,
      })
    } else {
      setHoveredNode(null)
      setTooltip(null)
      canvas.style.cursor = 'default'
    }
  }, [graphData])

  const handleClick = useCallback((e) => {
    if (!graphData || !simRef.current || !onNodeClick) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const { positions } = simRef.current

    for (const node of graphData.nodes) {
      const pos = positions.get(node.id)
      if (!pos) continue
      const dx = mx - pos.x
      const dy = my - pos.y
      const r = node.type === 'source' ? 28 : 18
      if (dx * dx + dy * dy < r * r) {
        onNodeClick(node.id)
        break
      }
    }
  }, [graphData, onNodeClick])

  if (!graphData || !graphData.nodes || graphData.nodes.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
        <span className="material-symbols-outlined text-[32px] mb-2" style={{ opacity: 0.3 }}>hub</span>
        <span className="font-body-sm text-body-sm">No linked reports found</span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={() => { setHoveredNode(null); setTooltip(null) }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none bg-inverse-surface text-inverse-on-surface rounded px-3 py-2 shadow-lg max-w-[220px]"
          style={{
            left: Math.min(tooltip.x + 12, (canvasRef.current?.parentElement?.offsetWidth || 300) - 230),
            top: tooltip.y - 60,
          }}
        >
          <div className="font-label-caps text-label-caps font-bold mb-1">{tooltip.node.label}</div>
          <div className="font-body-sm text-body-sm opacity-80 mb-1">{tooltip.node.category}</div>
          {tooltip.reasons.map((r, i) => (
            <div key={i} className="font-body-sm text-body-sm opacity-70 flex items-center gap-1">
              <span className="inline-block w-1 h-1 rounded-full bg-inverse-on-surface opacity-50" />
              {r}
            </div>
          ))}
          {tooltip.strength > 0 && (
            <div className="mt-1 font-data-tabular text-data-tabular opacity-60">
              Strength: {Math.round(tooltip.strength * 100)}%
            </div>
          )}
          <div className="font-body-sm text-body-sm opacity-50 mt-1 truncate">{tooltip.node.preview}</div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex gap-3 font-body-sm text-body-sm text-on-surface-variant opacity-70">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-[#091426]" /> Source
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-error" /> High
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-[#d97706]" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-[#2563eb]" /> Low
        </span>
      </div>

      {/* Stats */}
      <div className="absolute top-2 right-2 font-data-tabular text-data-tabular text-on-surface-variant opacity-60">
        {graphData.nodes.length} nodes · {graphData.edges.length} edges
      </div>
    </div>
  )
}
