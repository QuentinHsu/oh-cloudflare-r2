export const useStoreGlobal = defineStore('global', () => {
  const loadingFullScreen = ref(false);

  function setLoadingFullScreen(value: boolean) {
    loadingFullScreen.value = value;
  }

  return {
    loadingFullScreen,
    setLoadingFullScreen,
  };
});
