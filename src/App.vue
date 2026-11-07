<template>
  <router-view />
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* =====================================================================
   Element Plus 覆盖：春芽浅绿 / 草木青 / 深林墨绿
   ===================================================================== */

.el-button.el-button--primary {
  color: var(--accent-ink);
  font-weight: 600;
  border: 1px solid var(--accent);
  border-radius: var(--r);
  background: var(--accent);
  box-shadow: none;
  text-shadow: none;
  transition: var(--slide-trans);
}

.el-button.el-button--primary:hover {
  color: var(--accent-ink);
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  transform: none;
  box-shadow: none;
}

.el-button.el-button--primary:active {
  transform: translateY(1px);
}

.el-button.el-button--primary:focus-visible {
  outline: 2px solid var(--accent-soft);
  outline-offset: 1px;
}

.el-button.el-button--primary.is-loading,
.el-button.el-button--primary.is-disabled,
.el-button.el-button--primary.is-disabled:hover {
  color: var(--body-muted);
  background: var(--surface-2);
  border-color: var(--hairline);
  opacity: 1;
  transform: none;
}

.el-button {
  --el-button-text-color: var(--ink);
  --el-button-bg-color: var(--surface);
  --el-button-border-color: var(--hairline);
  --el-button-hover-text-color: var(--accent-hover);
  --el-button-hover-bg-color: var(--canvas-2);
  --el-button-hover-border-color: var(--accent);
  --el-button-active-bg-color: var(--canvas-2);
  --el-button-active-border-color: var(--accent-hover);
  border-radius: var(--r);
  font-weight: 500;
  box-shadow: none;
  transition: var(--slide-trans);
}

.el-button:hover {
  transform: none;
  box-shadow: none;
}

.el-button:active {
  transform: translateY(1px);
}

.el-button.is-text {
  background: transparent;
  border: none;
  --el-button-text-color: var(--body-muted);
}

.el-button.is-text:hover {
  background: var(--canvas-2);
  color: var(--ink);
  transform: none;
}

/* 输入框 */
.el-input__wrapper,
.el-textarea__inner,
.el-select__wrapper {
  background-color: var(--surface);
  color: var(--ink);
  border-radius: var(--r);
  box-shadow: 0 0 0 1px var(--hairline) inset;
}

.el-textarea__inner {
  border-color: var(--hairline);
  box-shadow: none;
}

.el-input__inner {
  color: var(--ink);
}

.el-input__inner::placeholder,
.el-textarea__inner::placeholder {
  color: var(--ink-muted-48);
}

.el-input__wrapper.is-focus,
.el-textarea__inner:focus,
.el-select__wrapper.is-focused {
  box-shadow: 0 0 0 1px var(--accent) inset !important;
}

.el-form-item__label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: var(--track-eyebrow);
  text-transform: uppercase;
  color: var(--body-muted);
}

/* 弹窗：材质 / 颜色 / 圆角 / 描边 全部对齐卡片（base.css 的 body .card）。
   为什么不像原来那样用纯色 --surface：卡片的 --card-grad 是【半透明渐变】，
   叠了 backdrop-filter 才是「柔光玻璃」。用纯色的话，浮层与它盖住的卡片之间
   会显出一道实体色差，反而不像同一套材质。

   阴影在卡片那套（顶部高光 + 向下衰减的亮雾）之前又叠了一层 --shadow-lg：
   卡片是平铺在页面里的，浮层必须额外给出「浮起来」的高度差。 */
.el-dialog,
.el-message-box {
  border-radius: var(--rad-card) !important;
  border: 1px solid var(--hairline) !important;
  background: var(--card-grad) !important;
  color: var(--ink);
  box-shadow: var(--shadow-lg), inset 0 1px 0 var(--sheen),
    inset 0 14px 28px -22px var(--sheen) !important;
  backdrop-filter: blur(36px) saturate(170%);
  -webkit-backdrop-filter: blur(36px) saturate(170%);
  overflow: hidden !important;
}

.el-dialog__title,
.el-message-box__title,
.el-message-box__message,
.el-dialog__body {
  color: var(--ink);
}

.el-overlay {
  background-color: rgba(20, 51, 43, 0.42);
}

/* 下拉 / 日期面板：与卡片同一套材质。
   箭头（.el-popper__arrow::before）只能填纯色，而 --card-grad 是渐变 ——
   渐变无法延续到箭头上，留着就会出现一块与面板对不上的实色小三角。
   所以直接隐藏箭头：玻璃面板本身有 1px 描边和阴影，
   与触发元素的从属关系依然清楚。 */
.el-popper.is-light,
.el-dropdown__popper,
.el-select__popper,
.el-picker__popper {
  border: 1px solid var(--hairline) !important;
  background: var(--card-grad) !important;
  color: var(--ink);
  border-radius: var(--rad-block) !important;
  box-shadow: var(--shadow-md), inset 0 1px 0 var(--sheen) !important;
  backdrop-filter: blur(26px) saturate(170%);
  -webkit-backdrop-filter: blur(26px) saturate(170%);
}
.el-popper.is-light > .el-popper__arrow,
.el-dropdown__popper > .el-popper__arrow,
.el-select__popper > .el-popper__arrow,
.el-picker__popper > .el-popper__arrow {
  display: none;
}

.el-select-dropdown__item {
  color: var(--ink);
}

.el-select-dropdown__item.is-hovering,
.el-select-dropdown__item:hover {
  background: var(--canvas-2);
}

.el-select-dropdown__item.is-selected {
  color: var(--accent-hover);
  font-weight: 600;
}

.el-tag {
  --el-tag-bg-color: var(--chip);
  --el-tag-border-color: var(--hairline);
  --el-tag-text-color: var(--accent-hover);
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-eyebrow);
  text-transform: uppercase;
}

/* .el-picker__popper 已并入上面那条下拉面板规则，这里不再单独写 */

/* 表格 */
.el-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: var(--canvas-2);
  --el-table-border-color: var(--hairline);
  --el-table-text-color: var(--body);
  --el-table-header-text-color: var(--body-muted);
}

.el-table th.el-table__cell {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-label);
  text-transform: uppercase;
}

.el-table__body tr:hover > td {
  background: var(--canvas-2) !important;
}

/* 提示条（刷新成功 / 输出异常…）：材质与卡片一致，语义靠左侧色条承载。
   为什么不保持原来的语义底色：底色一变色，它就不再是「同一套材质」了 ——
   而语义也不能只靠图标，小尺寸下图标很难一眼分辨。
   所以底色统一成卡片玻璃，另加一道 3px 的左侧色条。

   注意这里【不能】设 position: relative —— Element Plus 的 .el-message
   本身就是 position: fixed，居中的那种（.is-center）还要靠 transform 定位，
   改成 relative 会把居中布局顶掉。::before 用 fixed 定位的父元素做基准即可。 */
.el-message {
  overflow: hidden;
  border-radius: var(--rad-block) !important;
  border: 1px solid var(--hairline) !important;
  background: var(--card-grad) !important;
  color: var(--ink);
  box-shadow: var(--shadow-md), inset 0 1px 0 var(--sheen) !important;
  backdrop-filter: blur(26px) saturate(170%);
  -webkit-backdrop-filter: blur(26px) saturate(170%);
  /* 左侧让出 3px 给色条，避免文字压上去 */
  padding-left: 22px;
}
.el-message::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent);
}
.el-message--success::before {
  background: var(--success);
}
.el-message--error::before {
  background: var(--danger);
}
.el-message--warning::before {
  background: var(--warn);
}
.el-message--info::before {
  background: var(--accent);
}

.el-pagination {
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: var(--body);
  --el-pagination-button-bg-color: transparent;
  --el-pagination-hover-color: var(--accent-hover);
}
</style>
