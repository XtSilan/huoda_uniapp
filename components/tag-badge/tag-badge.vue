<template>
  <view class="badge" :class="`badge--${tone}`">
    <text class="badge__text">{{ text }}</text>
  </view>
</template>

<script>
export default {
  name: 'TagBadge',
  props: {
    text: {
      type: String,
      default: ''
    },
    tone: {
      type: String,
      default: 'purple'
    }
  }
};
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx 14rpx;
  border-radius: 8rpx;
}

.badge__text {
  font-size: 22rpx;
  line-height: 1;
  font-weight: 600;
}

.badge--purple {
  background: var(--primary-light);
}

.badge--purple .badge__text {
  color: var(--primary-color);
}

.badge--yellow {
  background: var(--yellow-bg);
}

.badge--yellow .badge__text {
  color: var(--yellow-color);
}

.badge--green {
  background: var(--green-bg);
}

.badge--green .badge__text {
  color: var(--green-color);
}

.badge--blue {
  background: var(--blue-bg);
}

.badge--blue .badge__text {
  color: var(--blue-color);
}

.badge--danger {
  background: var(--danger-bg);
}

.badge--danger .badge__text {
  color: var(--danger-color);
}
</style>
