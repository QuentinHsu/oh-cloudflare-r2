<script setup lang="ts">
import { useNuxtApp } from 'nuxt/app'
import { onMounted, ref, watch } from 'vue'

const TRANSITION_STYLE = { transition: 'all 0.3s' } as const
const TOTAL_CIRCLES = 12

enum Theme {
  Light = 'light',
  Dark = 'dark',
}

interface CircleAttributes {
  x: number
  y: number
  width: number
  height: number
  rx: number
  ry: number
  transform: string
  style: {
    transition: string
    transitionDelay: string
    opacity: number
  }
}

const modifiedManually = ref<boolean>(false)
const theme = ref<Theme>(Theme.Light)
const isDark = ref<boolean>(false)

const { $colorMode } = useNuxtApp()

function toggleTheme(): void {
  modifiedManually.value = true
  theme.value = theme.value === Theme.Light ? Theme.Dark : Theme.Light
  isDark.value = theme.value === Theme.Dark
  $colorMode.preference = theme.value
}

function updateThemeAttribute(newTheme: Theme): void {
  if (newTheme === 'dark') {
    document.documentElement.setAttribute('theme-mode', 'dark')
  }
  else {
    document.documentElement.removeAttribute('theme-mode')
  }
}

const outerCircles = ref<CircleAttributes[]>([])

function updateOuterCircles() {
  outerCircles.value = Array.from({ length: TOTAL_CIRCLES }).map((_, i) => {
    const deg = (i * 360) / TOTAL_CIRCLES
    const cx = isDark.value ? 50 : 50 + 24 * Math.cos((deg * Math.PI) / 180)
    const cy = isDark.value ? 50 : 50 + 24 * Math.sin((deg * Math.PI) / 180)
    const width = isDark.value ? 0 : 10
    const height = isDark.value ? 0 : 6

    return {
      x: cx - width / 2,
      y: cy - height / 2,
      width,
      height,
      rx: height / 2,
      ry: height / 2,
      transform: `rotate(${deg}, ${cx}, ${cy})`,
      style: {
        ...TRANSITION_STYLE,
        transitionDelay: isDark.value ? '0s' : `${(i * 0.2) / TOTAL_CIRCLES}s`,
        opacity: isDark.value ? 0 : 1,
      },
    }
  })
}

watch(theme, (newTheme: Theme) => {
  updateThemeAttribute(newTheme)
  updateOuterCircles()
})

onMounted(() => {
  theme.value = $colorMode.value as Theme
  isDark.value = theme.value === Theme.Dark
  updateThemeAttribute(theme.value)
  updateOuterCircles()
})

watch(() => $colorMode.value, (newColorMode) => {
  if (!modifiedManually.value) {
    theme.value = newColorMode as Theme
    isDark.value = theme.value === Theme.Dark
    updateOuterCircles()
  }
})
</script>

<template>
  <button type="button" class="btn-reset" @click="toggleTheme">
    <client-only>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
        <g>
          <rect
            v-for="(attrs, i) in outerCircles"
            :key="i"
            fill="currentColor"
            v-bind="attrs"
          />
        </g>
        <defs>
          <mask id="themeToggleMask">
            <circle :style="TRANSITION_STYLE" cx="50" cy="50" :r="isDark ? 30 : 15" fill="white" />
            <circle
              :style="TRANSITION_STYLE"
              :cx="isDark ? 65 : 80"
              :cy="isDark ? 35 : 20"
              :r="isDark ? 25 : 5"
              fill="black"
            />
          </mask>
        </defs>
        <circle cx="50" cy="50" r="30" fill="currentColor" mask="url(#themeToggleMask)" />
      </svg>
    </client-only>
  </button>
</template>

<style lang="scss" scoped>
.btn-reset {
  all: unset;
  display: inline-block;
  cursor: pointer;
}
</style>import { useNuxtApp, useHead } from 'nuxt/app';
