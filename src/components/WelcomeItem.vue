<!--
  ============================================================
  WelcomeItem.vue — 欢迎页的单个卡片组件
  作用：规定每个"功能介绍卡片"的布局格式——
        左边一个图标，右边是标题和文字内容。

  这个组件使用了 Vue 的"插槽"（slot）功能。
  插槽的概念：就像一个"洞"，使用这个组件的人可以往洞里填内容。
  ============================================================
-->

<template>
  <!-- 最外层容器，class="item" 控制整体布局 -->
  <div class="item">
    <!--
      <i> 标签内放图标
      <slot name="icon"> 是"具名插槽"——
      使用者在父组件中写 <template #icon>...</template> 时，
      那部分内容就会被插入到这里
    -->
    <i>
      <slot name="icon"></slot>
    </i>

    <!-- 右侧详情区域 -->
    <div class="details">
      <!--
        <slot name="heading"> 是标题插槽
        使用者写 <template #heading>标题文字</template>
        就会被插到这里
      -->
      <h3>
        <slot name="heading"></slot>
      </h3>

      <!--
        <slot></slot> 是"默认插槽"（没有 name 属性）
        使用者在组件标签中间直接写的内容都会被插到这里
        比如：<WelcomeItem>这是一段文字</WelcomeItem>
        "这是一段文字"就会出现在这里
      -->
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
/* 整体布局：横向排列，flex 布局 */
.item {
  margin-top: 2rem;       /* 上外边距：2rem */
  display: flex;          /* Flex 弹性布局（让子元素横向排列） */
  position: relative;     /* 相对定位，为绝对定位的伪元素提供基准 */
}

/* 右侧详情区域占据剩余空间 */
.details {
  flex: 1;               /* flex: 1 表示自动填满剩余空间 */
  margin-left: 1rem;     /* 左边留出间距 */
}

/* 图标区域样式 */
i {
  display: flex;
  place-items: center;    /* 垂直居中 */
  place-content: center;  /* 水平居中 */
  width: 32px;
  height: 32px;
  color: var(--color-text);  /* var(--xxx) 是 CSS 变量，值在 base.css 中定义 */
}

/* 标题样式 */
h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
  color: var(--color-heading);
}

/*
  响应式设计：屏幕宽度 >= 1024px 时的样式
  在大屏幕上，图标移到卡片左边，并用竖线连接每个卡片
*/
@media (min-width: 1024px) {
  .item {
    margin-top: 0;
    padding: 0.4rem 0 1rem calc(var(--section-gap) / 2);
  }

  /* 大屏幕上图标变大约 50px，并绝对定位到左边 */
  i {
    top: calc(50% - 25px);
    left: -26px;
    position: absolute;          /* 绝对定位，脱离正常文档流 */
    border: 1px solid var(--color-border);
    background: var(--color-background);
    border-radius: 8px;          /* 圆角 */
    width: 50px;
    height: 50px;
  }

  /* 伪元素 ::before 和 ::after 画出连接卡片的竖线（装饰效果） */
  .item:before {
    content: ' ';                /* 伪元素必须有 content 属性才会显示 */
    border-left: 1px solid var(--color-border);  /* 画一条竖线 */
    position: absolute;
    left: 0;
    bottom: calc(50% + 25px);
    height: calc(50% - 25px);
  }

  .item:after {
    content: ' ';
    border-left: 1px solid var(--color-border);
    position: absolute;
    left: 0;
    top: calc(50% + 25px);
    height: calc(50% - 25px);
  }

  /* 第一个卡片的上面不画线，最后一个卡片的下面不画线 */
  .item:first-of-type:before { display: none; }
  .item:last-of-type:after { display: none; }
}
</style>
