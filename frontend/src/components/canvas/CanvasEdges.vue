<script setup>
import { ref } from 'vue'

/**
 * CanvasEdges.vue
 * 连线渲染层：SVG 箭头标记、连线本体、标签胶囊与途经点控制手柄。
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
  draggingEdge: {
    type: Object,
    required: true,
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
  'reset-waypoint',
  'disconnect',
  'handle-pointerdown',
])

const hoveredEdgeId = ref(null)
</script>

<template>
  <svg class="canvas-svg-layer">
    <defs>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

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
      @dblclick="emit('reset-waypoint', conn, $event)"
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
            :rx="(conn.labelHeight || 19) / 2"
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

      <!-- Interactive Waypoint Control Drag Handle -->
      <g
        v-if="hoveredEdgeId === conn.id || selectedEdgeId === conn.id || conn.hasCustomRoute"
        :transform="`translate(${conn.labelAnchor.x}, ${conn.labelAnchor.y})`"
      >
        <g
          class="edge-control-handle"
          :class="{
            'is-dragging': draggingEdge.isDragging && draggingEdge.sourceIndex === conn.fromIndex && draggingEdge.portType === conn.type,
            'has-custom': conn.hasCustomRoute
          }"
          @pointerdown="emit('handle-pointerdown', { event: $event, conn })"
          @dblclick.stop="emit('reset-waypoint', conn, $event)"
        >
          <circle r="14" class="handle-hitbox" fill="transparent" />
          <circle
            r="7"
            class="handle-outer"
            :style="{ stroke: conn.color }"
          />
          <circle
            r="3.5"
            class="handle-inner"
            :style="{ fill: conn.color }"
          />

          <!-- Tooltip text when hovered -->
          <g v-if="hoveredEdgeId === conn.id" class="handle-tooltip" transform="translate(0, -18)">
            <rect x="-44" y="-9" width="88" height="18" rx="4" class="handle-tooltip-box" />
            <text x="0" y="3" text-anchor="middle" class="handle-tooltip-text" font-size="8.5" font-weight="500">
              {{ conn.hasCustomRoute ? '拖拽调整 / 双击复位' : '拖动调整连线位置' }}
            </text>
          </g>
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
  stroke-linejoin: round;
  stroke-linecap: round;
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
  stroke-linejoin: round;
  stroke-linecap: round;
  animation: flow-dash 0.6s linear infinite;
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

/* Edge Control Handle */
.edge-control-handle {
  cursor: grab;
  transition: transform var(--duration-fast) var(--ease-out);
}

.edge-control-handle:active,
.edge-control-handle.is-dragging {
  cursor: grabbing;
  transform: scale(1.25);
}

.handle-hitbox {
  cursor: grab;
}

.handle-outer {
  fill: var(--bg-input);
  stroke-width: 2;
  transition: transform var(--duration-fast) var(--ease-out),
    stroke-width var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);
  filter: drop-shadow(0 2px 5px rgba(15, 23, 42, 0.5));
}

.edge-control-handle:hover .handle-outer {
  transform: scale(1.3);
  stroke-width: 2.5;
  filter: drop-shadow(0 0 8px currentColor);
}

.handle-inner {
  transition: fill var(--duration-fast) var(--ease-out);
}

.edge-control-handle.has-custom .handle-outer {
  stroke-dasharray: 2 2;
}

.handle-tooltip {
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 4px 8px rgba(15, 23, 42, 0.45));
}

.handle-tooltip-box {
  fill: var(--edge-tooltip-bg);
  stroke: var(--border-strong);
  stroke-width: 1;
}

.handle-tooltip-text {
  fill: var(--edge-tooltip-text);
}
</style>
