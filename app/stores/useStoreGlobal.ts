export const useStoreGlobal = defineStore('global', () => {
  const loadingFullScreen = ref<{ status: boolean, text: string }>({
    status: false,
    text: '',
  })

  function setLoadingFullScreen(loading: boolean, text: string = '加载中...') {
    loadingFullScreen.value.status = loading
    loadingFullScreen.value.text = text
  }
  return { loadingFullScreen, setLoadingFullScreen }
})
