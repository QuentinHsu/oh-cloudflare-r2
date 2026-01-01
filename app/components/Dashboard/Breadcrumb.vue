<script setup lang="ts">
  const fileManagerStore = useStoreFileManager();
  const { currentPath } = storeToRefs(fileManagerStore);

  const pathSegments = computed(() => currentPath.value.split('/').filter(Boolean));

  function isFinalLevel(index: number): boolean {
    return index === pathSegments.value.length - 1;
  }

  function iconFile(index: number): string {
    if (isFinalLevel(index)) {
      return 'flat-color-icons:opened-folder';
    }
    return 'flat-color-icons:folder';
  }

  const getPathUpTo = (index: number): string => `${pathSegments.value.slice(0, index + 1).join('/')}/`;

  function navigateUp(path: string): void {
    fileManagerStore.navigateUp(path);
  }
</script>

<template>
  <t-breadcrumb>
    <t-breadcrumb-item @click="navigateUp('')">
      <template #icon>
        <Icon
          :name="currentPath === '' ? 'flat-color-icons:opened-folder' : 'flat-color-icons:folder'"
          class="text-6 mr-1"
        />
      </template>
      Root
    </t-breadcrumb-item>
    <t-breadcrumb-item v-for="(segment, index) in pathSegments" :key="index" @click="navigateUp(getPathUpTo(index))">
      <template #icon>
        <Icon :name="iconFile(index)" class="text-6 mr-1" />
      </template>
      {{ segment }}
    </t-breadcrumb-item>
  </t-breadcrumb>
</template>
