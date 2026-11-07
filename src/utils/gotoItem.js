import { useRoute, useRouter } from 'vue-router'
import { activeItem, pendingItem } from '@/theme/workspace.js'

/**
 * 跨工作台跳转到指定条目。
 *
 * 为什么需要它：WorkspaceLayout 在切换工作台时会把 activeItem 重置为该工作台第一项，
 * 所以跨工作台跳转必须先把目标条目登记到 pendingItem，否则会落到「模拟面试」。
 * 已经在目标工作台内时则直接切条目，不走路由。
 *
 * 注意：必须在 setup 中调用（依赖 useRoute / useRouter 的注入上下文），
 * 返回的函数可以安全地用在图表回调等 setup 之外的地方。
 */
export function useGotoItem() {
  const route = useRoute()
  const router = useRouter()

  return (item, path = '/app/interview', routeName = 'InterviewWorkspace') => {
    if (!item) return
    if (route.name === routeName) {
      activeItem.value = item
      return
    }
    pendingItem.value = item
    router.push(path)
  }
}

export default { useGotoItem }
