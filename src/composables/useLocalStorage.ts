import { watch, ref } from "vue";

export const useLocalStorage = <T = any>(storageName: string, defaultData?: T) => {
  const storage = window.localStorage;

  const value = ref<T | null>(
    JSON.parse(storage.getItem(storageName) || (defaultData ? JSON.stringify(defaultData) : 'null'))
  )

  watch(value, (newValue) => storage.setItem(storageName, JSON.stringify(newValue ?? null)), { immediate: true, deep: true })

  return { value }
}