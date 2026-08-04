<!--
  ============================================================
  HelloWorld.vue — 欢迎展示组件
  作用：显示一条欢迎消息，通常放在首页。
  这个组件接收一个外部传入的 msg 参数，然后把它显示为标题。
  ============================================================
  组件就像一个"函数"：外部传参数进来，内部决定怎么展示。
  这里的 defineProps 就是定义"这个组件可以接收哪些参数"。
-->

<script setup>
// ============================================================
// defineProps() — 定义组件的"参数表"
//   告诉使用这个组件的人："你可以传一个叫 msg 的参数给我"
//   使用方式：<HelloWorld msg="你好世界" />
//   如果没传 msg，Vue 会报警告（因为 required: true）
// ============================================================
defineProps({
  msg: {
    type: String,      // 参数类型：必须是字符串（文字）
    required: true,    // 必填：不传这个参数就会报错
  },
})
</script>

<template>
  <!-- 包围文字的外层容器，class="greetings" 用于 CSS 样式选择 -->
  <div class="greetings">
    <!-- class="green" 让文字变绿色 -->
    <!-- {{ msg }} 是 Vue 的"插值语法"，会把 msg 参数的实际值填入这里 -->
    <h1 class="green">{{ msg }}</h1>

    <!-- 一段欢迎文字，里面包含 Vite 和 Vue 3 的官方链接 -->
    <h3>
      You’ve successfully created a project with
      <!-- target="_blank" 表示点击链接在新标签页打开 -->
      <a href="https://vite.dev/" target="_blank" rel="noopener">Vite</a> +
      <a href="https://vuejs.org/" target="_blank" rel="noopener">Vue 3</a>.
    </h3>
  </div>
</template>

<style scoped>
/*
  scoped 属性：表示这些 CSS 样式只对当前这个 .vue 文件生效，
  不会影响到其他组件里的同名 class。这是 Vue 的保护机制。
*/

/* h1 标题的样式 */
h1 {
  font-weight: 500;        /* 字体粗细：500 是中等偏粗 */
  font-size: 2.6rem;       /* 字体大小：2.6rem 约等于浏览器的 2.6 倍基准字号 */
  position: relative;      /* 相对定位，让 top 属性可以生效 */
  top: -10px;              /* 向上偏移 10 像素（微调位置） */
}

/* h3 副标题的样式 */
h3 {
  font-size: 1.2rem;
}

/* .greetings 下面的 h1 和 h3 都居中 */
.greetings h1,
.greetings h3 {
  text-align: center;
}

/*
  @media — 媒体查询（响应式设计）
  意思是：当屏幕宽度 >= 1024px 时，应用下面的样式
  手机上看居左 → 电脑上看居中，同一个网页在不同设备上都好看
*/
@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
