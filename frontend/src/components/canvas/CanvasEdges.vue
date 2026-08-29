<script setup>
import { ref } from 'vue'

/**
 * CanvasEdges.vue
 * 连线渲染层：SVG 箭头标记、正交折线本体、标签胶囊、
 * 可拖拽的中间线段命中区与转折点手柄（Multisim 电路图风格）。
 * 交互事件全部上抛，由 WorkflowCanvas 统一编排。
 */
defineProps({
  connections: {
    type: Array,
    required: true,
  },
  selectedEdgeId: {
    type: String,
    default: null,
  },
  previewPath: {
    type: String,
    default: '',
  },
  previewPortType: {
    type: String,
    default: 'next',
  },
})

const emit = defineEmits([
  'select',
  'reset-route',
  'disconnect',
  'context-menu',
  'segment-pointerdown',
  'vertex-pointerdown',
])

const hoveredEdgeId = ref(null)

// 中间线段（首末两段与端口锚点相连，位置固定，不可拖拽）：
// v-for i in count 生成下标 1..count，即排除首段(0)与末段(n-2)
const draggableSegmentCount = (conn) => {
  const n = conn.waypoints?.length || 0
  return Math.max(0, n - 3)
}

const segmentPath = (conn, i) => {
  const p1 = conn.waypoints[i]
  const p2 = conn.waypoints[i + 1]
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
}

// 中间转折点下标列表（1 .. length-2）
const vertexIndices = (conn) => {
  const n = conn.waypoints?.length || 0
  const list = []
  for (let i = 1; i < n - 1; i++) list.push(i)
  return list
}
</script>

<template>
  <svg class="canvas-svg-layer">
    <defs>
      <!-- Arrowhead Markers: 尖端锚定在线段终点 (refX=10.5)，userSpaceOnUse 保证悬停加粗时箭头不变形 -->
      <marker
        id="arrow-next"
        viewBox="0 0 12 12"
        refX="10.5"
        refY="6"
        markerWidth="11"
        markerHeight="11"
        markerUnits="userSpaceOnUse"
        orient="auto-start-reverse"
      >
        <path d="M 1 1.8 L 10.8 6 L 1 10.2 L 3.1 6 Z" class="arrow-success" />
      </marker>

      <marker
        id="arrow-then"
        viewBox="0 0 12 12"
        refX="10.5"
        refY="6"
        markerWidth="11"
        markerHeight="11"
        markerUnits="userSpaceOnUse"
        orient="auto-start-reverse"
      >
        <path d="M 1 1.8 L 10.8 6 L 1 10.2 L 3.1 6 Z" class="arrow-success" />
      </marker>

      <marker
        id="arrow-else"
        viewBox="0 0 12 12"
        refX="10.5"
        refY="6"
        markerWidth="11"
        markerHeight="11"
        markerUnits="userSpaceOnUse"
        orient="auto-start-reverse"
      >
        <path d="M 1 1.8 L 10.8 6 L 1 10.2 L 3.1 6 Z" class="arrow-warning" />
      </marker>

      <marker
        id="arrow-fail"
        viewBox="0 0 12 12"
        refX="10.5"
        refY="6"
        markerWidth="11"
        markerHeight="11"
        markerUnits="userSpaceOnUse"
        orient="auto-start-reverse"
      >
        <path d="M 1 1.8 L 10.8 6 L 1 10.2 L 3.1 6 Z" class="arrow-warning" />
      </marker>
    </defs>

    <!-- Existing Active Connections -->
    <g
      v-for="conn in connections"
      :key="conn.id"
      class="edge-group"
      :class="{
        'edge-is-selected': selectedEdgeId === conn.id,
        'edge-has-custom': conn.hasCustomRoute,
      }"
      @click="emit('select', conn, $event)"
      @dblclick="emit('reset-route', conn, $event)"
      @contextmenu="emit('context-menu', { conn, event: $event })"
      @mouseenter="hoveredEdgeId = conn.id"
      @mouseleave="hoveredEdgeId = null"
    >
      <!-- Background wider hit-box path for easier selection -->
      <path
        :d="conn.pathD"
        class="edge-hitbox"
      />

      <!-- Selection Outer Glow -->
      <path
        v-if="selectedEdgeId === conn.id"
        :d="conn.pathD"
        class="edge-selection-halo"
        :style="{ stroke: conn.color }"
      />

      <!-- Visible Connection Line -->
      <path
        :d="conn.pathD"
        class="edge-path"
        :class="{ 'edge-active': conn.isActive, 'edge-selected': selectedEdgeId === conn.id }"
        :style="{ stroke: conn.color }"
        :marker-end="`url(#arrow-${conn.type})`"
      />

      <!-- Draggable Middle Segment Hitboxes（水平段上下拖 / 垂直段左右拖，网格吸附） -->
      <path
        v-for="i in draggableSegmentCount(conn)"
        :key="`seg-${i}`"
        :d="segmentPath(conn, i)"
        class="edge-seg-hitbox"
        @pointerdown.stop="emit('segment-pointerdown', { conn, segIndex: i, event: $event })"
      />

      <!-- Edge Label Pill（已做碰撞避让，点击断开该跳转连线） -->
      <g
        v-if="conn.hasLabel && conn.labelAnchor"
        :transform="`translate(${conn.labelAnchor.x}, ${conn.labelAnchor.y})`"
      >
        <g
          class="edge-label-group"
          :class="{ 'label-plain': conn.type === 'next' }"
          @click.stop="emit('disconnect', conn)"
          title="点击断开该跳转连线"
        >
          <rect
            :x="-(conn.labelWidth || 60) / 2"
            :y="-(conn.labelHeight || 19) / 2"
            :width="conn.labelWidth || 60"
            :height="conn.labelHeight || 19"
            :rx="3"
            class="edge-label-pill"
            :style="{ stroke: conn.color }"
          />
          <text
            x="0"
            y="3"
            text-anchor="middle"
            class="edge-label-text"
            :style="{ fill: conn.color }"
            font-size="8.5"
            font-weight="600"
          >
            {{ conn.label }}
          </text>
        </g>
      </g>

      <!-- Vertex Handles（中间转折点，悬停/选中时显示，可拖拽、自动吸附网格） -->
      <g v-if="hoveredEdgeId === conn.id || selectedEdgeId === conn.id">
        <g
          v-for="j in vertexIndices(conn)"
          :key="`vtx-${j}`"
          class="edge-vertex-handle"
          :transform="`translate(${conn.waypoints[j].x}, ${conn.waypoints[j].y})`"
          @pointerdown.stop="emit('vertex-pointerdown', { conn, vertIndex: j, event: $event })"
        >
          <circle r="10" class="vertex-hitbox" fill="transparent" />
          <rect
            x="-4"
            y="-4"
            width="8"
            height="8"
            class="vertex-square"
            :style="{ stroke: conn.color }"
          />
        </g>
      </g>
    </g>

    <!-- Live Dragging Connection Line -->
    <path
      v-if="previewPath"
      :d="previewPath"
      class="edge-preview"
      :style="{ stroke: previewPortType === 'fail' ? 'var(--color-warning)' : 'var(--color-success)' }"
      stroke-dasharray="5 5"
    />
  </svg>
</template>

<style scoped>
.canvas-svg-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.arrow-success {
  fill: var(--color-success);
}

.arrow-warning {
  fill: var(--color-warning);
}

.edge-group {
  pointer-events: auto;
  cursor: pointer;
}

.edge-hitbox {
  fill: none;
  stroke: transparent;
  stroke-width: 22;
  cursor: pointer;
}

.edge-selection-halo {
  fill: none;
  stroke-width: 8;
  opacity: 0.35;
  filter: drop-shadow(0 0 8px currentColor);
  pointer-events: none;
}

.edge-path {
  fill: none;
  stroke-width: 2.2;
  stroke-linejoin: miter;
  stroke-linecap: butt;
  transition: stroke-width var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);
}

.edge-group:hover .edge-path {
  stroke-width: 3.5;
  filter: drop-shadow(0 0 6px currentColor);
}

.edge-path.edge-selected {
  stroke-width: 3.5;
  filter: drop-shadow(0 0 8px currentColor);
}

.edge-path.edge-active {
  stroke-width: 3.2;
  stroke-dasharray: 6 6;
  animation: flow-dash 1s linear infinite;
  filter: drop-shadow(0 0 10px currentColor);
}

@keyframes flow-dash {
  from {
    stroke-dashoffset: 24;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.edge-preview {
  fill: none;
  stroke-width: 2.2;
  stroke-linejoin: miter;
  stroke-linecap: butt;
  animation: flow-dash 0.6s linear infinite;
}

.edge-seg-hitbox {
  fill: none;
  stroke: transparent;
  stroke-width: 14;
  cursor: move;
}

/* Vertex Handles */
.edge-vertex-handle {
  cursor: move;
}

.vertex-hitbox {
  cursor: move;
}

.vertex-square {
  fill: var(--bg-input);
  stroke-width: 2;
  filter: drop-shadow(0 2px 5px rgba(15, 23, 42, 0.5));
  transition: transform var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);
  transform-origin: center;
  transform-box: fill-box;
}

.edge-vertex-handle:hover .vertex-square {
  transform: scale(1.35);
  filter: drop-shadow(0 0 8px currentColor);
}

.edge-label-pill {
  fill: var(--edge-label-bg);
  stroke-opacity: 0.75;
  stroke-width: 1.1;
}

.edge-label-text {
  pointer-events: none;
}

.edge-label-group {
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out);
}

.edge-label-group:hover {
  transform: scale(1.12);
}
</style>
