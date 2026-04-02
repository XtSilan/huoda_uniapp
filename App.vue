<script>
import authService from './services/auth';
import { clearSession, redirectToLogin, restoreSessionFromBackup, saveSession } from './utils/session';

export default {
  async onLaunch() {
    console.log('Huoda app launched');
    await this.restoreLoginSession();
  },
  methods: {
    async restoreLoginSession() {
      try {
        const { token } = await restoreSessionFromBackup();
        if (!token) {
          redirectToLogin();
          return;
        }
        const res = await authService.refresh();
        await saveSession(res.token, res.user);
      } catch (error) {
        await clearSession();
        redirectToLogin();
      }
    }
  }
};
</script>

<style>
page {
  --primary-color: #6b48ff;
  --primary-light: #f0edff;
  --primary-gradient: linear-gradient(135deg, #8a64ff 0%, #6b48ff 100%);
  --bg-color: #f4f6f9;
  --card-bg: #ffffff;
  --text-main: #2c3246;
  --text-sub: #8b94a7;
  --text-light: #c0c6d4;
  --yellow-color: #f5a623;
  --yellow-bg: #fef7ea;
  --green-color: #2dca73;
  --green-bg: #eaf9f1;
  --blue-color: #4a90e2;
  --blue-bg: #edf4fc;
  --danger-color: #ef5a6f;
  --danger-bg: #fff0f3;
  --shadow-sm: 0 4rpx 15rpx rgba(0, 0, 0, 0.03);
  --shadow-md: 0 10rpx 30rpx rgba(107, 72, 255, 0.2);
  --shadow-lg: 0 24rpx 60rpx rgba(44, 50, 70, 0.08);
  --radius-md: 24rpx;
  --radius-lg: 32rpx;
  --radius-full: 999rpx;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  background: var(--bg-color);
  color: var(--text-main);
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

view,
text,
button,
input,
textarea,
scroll-view,
swiper,
swiper-item,
image {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
}

button::after {
  border: none;
}

.page-shell {
  min-height: 100vh;
  padding: calc(24rpx + env(safe-area-inset-top)) 24rpx calc(40rpx + env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at top right, rgba(138, 100, 255, 0.16), transparent 28%),
    linear-gradient(180deg, #f7f8fc 0%, var(--bg-color) 100%);
  animation: page-fade-in 220ms ease;
}

.page-header {
  position: relative;
  padding-top: 4rpx;
  margin-bottom: 28rpx;
}

.page-eyebrow {
  display: none;
}

.page-title {
  margin-top: 22rpx;
  font-size: 52rpx;
  line-height: 1.2;
  font-weight: 700;
  color: var(--text-main);
}

.page-subtitle {
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--text-sub);
}

.surface-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.section-block {
  margin-top: 28rpx;
}

.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-heading {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-main);
}

.section-action {
  font-size: 24rpx;
  color: var(--primary-color);
}

.empty-state {
  padding: 48rpx 24rpx;
  text-align: center;
  color: var(--text-sub);
  font-size: 26rpx;
}

.surface-card,
.profile-card,
.group-card,
.hero-card {
  transition: transform 220ms ease, box-shadow 220ms ease, opacity 220ms ease;
}

.surface-card:active,
.profile-card:active,
.group-card:active,
.hero-card:active {
  transform: translateY(2rpx) scale(0.995);
}

@keyframes page-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
