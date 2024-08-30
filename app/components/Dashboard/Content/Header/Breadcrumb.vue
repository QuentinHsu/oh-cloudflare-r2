<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useStoreFileManager } from '~/stores/useStoreFileManager'

const fileManagerStore = useStoreFileManager()
const { currentPath } = storeToRefs(fileManagerStore)

// 计算当前路径的分段
const pathSegments = computed(() => currentPath.value.split('/').filter(Boolean))

/**
 * 判断是否为最后一级目录
 * @param index - 当前路径段的索引
 * @returns 是否为最后一级
 */
function isFinalLevel(index: number): boolean {
  return index === pathSegments.value.length - 1
}

/**
 * 根据路径段的位置返回对应的图标
 * @param index - 当前路径段的索引
 * @returns 图标名称
 */
function iconFile(index: number): string {
  if (isFinalLevel(index)) {
    return 'flat-color-icons:opened-folder'
  }
  return 'flat-color-icons:folder'
}

/**
 * 获取到指定索引的路径
 * @param index - 目标索引
 * @returns 截至该索引的路径字符串
 */
const getPathUpTo = (index: number): string => `${pathSegments.value.slice(0, index + 1).join('/')}/`

/**
 * 导航到上级目录
 * @param path - 目标路径
 */
function navigateUp(path: string): void {
  fileManagerStore.navigateUp(path)
}
</script>

<template>
  <t-breadcrumb>
    <t-breadcrumb-item @click="navigateUp('')">
      <template #icon>
        <Icon :name="currentPath === '' ? 'flat-color-icons:opened-folder' : 'flat-color-icons:folder'" class="text-6 mr-1" />
      </template>
      Root
    </t-breadcrumb-item>
    <t-breadcrumb-item
      v-for="(segment, index) in pathSegments"
      :key="index"
      @click="navigateUp(getPathUpTo(index))"
    >
      <template #icon>
        <Icon :name="iconFile(index)" class="text-6 mr-1" />
      </template>
      {{ segment }}
    </t-breadcrumb-item>
  </t-breadcrumb>
</template>

<style lang="scss" scoped></style>
