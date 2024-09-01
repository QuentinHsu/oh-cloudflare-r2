export interface IResponse {
  status: number
  message: string
}
export default eventHandler(() => {
  const { siteName } = useAppConfig()
  return {
    status: 200,
    message: `Welcome to ${siteName}!`,
  }
})
