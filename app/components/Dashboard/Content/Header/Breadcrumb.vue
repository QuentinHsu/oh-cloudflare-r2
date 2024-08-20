<script setup lang="ts">
const listBreadcrumb = ref([
  {
    text: '页面 1',
  },
  {
    text: '页面 2',
  },
  {
    text: '页面 3',
  },
])
function onClockItem(params: any) {
  console.info('onClockItem', params)
}
function isFinalLevel(index: number) {
  return index === listBreadcrumb.value.length - 1
}
</script>

<template>
  <t-breadcrumb>
    <t-breadcrumb-item v-for="(item, index) in listBreadcrumb" :key="index" @click="onClockItem(item)">
      <template #icon>
        <Icon
          :name="!isFinalLevel(index) ? 'material-symbols:folder' : 'material-symbols:folder-open'" style="margin-right: 5px;"
        />
      </template>
      {{ item.text }}
    </t-breadcrumb-item>
  </t-breadcrumb>
</template>

<style lang="scss" scoped></style>
