<template>
  <view class="container">
    <view class="card">
      <view class="title">轮播图占位页</view>
      <view class="content">当前点击的是轮播图占位页面。</view>
      <view class="content">Banner ID: {{ id }}</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return { id: '' };
  },
  onLoad(options) {
    this.id = options.id || '';
  }
};
</script>
