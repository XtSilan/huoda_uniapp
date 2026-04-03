<template>
  <web-view :src="url"></web-view>
</template>

<script>
export default {
  data() {
    return {
      url: ''
    };
  },
  onLoad(options) {
    this.url = decodeURIComponent(options.url || '');
    const title = decodeURIComponent(options.title || '链接详情');
    if (title) {
      uni.setNavigationBarTitle({
        title
      });
    }
  }
};
</script>
