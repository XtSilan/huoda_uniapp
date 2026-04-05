<template>
  <button class="custom-button" :class="{ 'custom-button--ghost': ghost }" :loading="loading" @click="$emit('click')">
    <text class="custom-button__text">{{ text }}</text>
  </button>
</template>

<script>
export default {
  name: 'CustomButton',
  props: {
    text: {
      type: String,
      default: '立即操作'
    },
    loading: {
      type: Boolean,
      default: false
    },
    ghost: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style scoped>
.custom-button {
  width: 100%;
  height: 90rpx;
  border-radius: var(--radius-full);
  background: var(--primary-gradient);
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-button--ghost {
  background: var(--card-bg);
  box-shadow: var(--shadow-sm);
}

.custom-button__text {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
}

.custom-button--ghost .custom-button__text {
  color: var(--text-main);
}
</style>
