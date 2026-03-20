import { useRegistries } from './useRegistries'

export function useRegistry() {
  const { activeUrl } = useRegistries()
  return { registryUrl: activeUrl }
}
