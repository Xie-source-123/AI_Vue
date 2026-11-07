import { nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

/**
 * 挂载 ECharts 实例，并保证画布尺寸始终跟随容器。
 *
 * 必须处理的两个场景：
 * 1) 图表容器用 v-show 控制显隐时，同步 init 会量到 0×0
 *    （赋 hasData = true 后 Vue 尚未把 display: none 改掉），
 *    必须等 DOM 真正可见（nextTick）后再初始化；
 * 2) 侧栏折叠等布局变化只改 CSS 栅格宽度，不会触发 window.resize，
 *    用 ResizeObserver 兜住，否则图表会停留在旧宽度。
 */
export function useEchart(elRef) {
  let chart = null
  let ro = null

  async function ensure() {
    await nextTick()
    if (chart || !elRef.value) return chart
    chart = echarts.init(elRef.value)
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        const dom = elRef.value
        /* 容器被 v-show 隐藏时会量到 0，此时跳过，避免把画布缩成 0×0 */
        if (!chart || !dom || !dom.clientWidth || !dom.clientHeight) return
        chart.resize()
      })
      ro.observe(elRef.value)
    }
    return chart
  }

  onBeforeUnmount(() => {
    if (ro) {
      ro.disconnect()
      ro = null
    }
    if (chart) {
      chart.dispose()
      chart = null
    }
  })

  return { ensure }
}

export default { useEchart }
