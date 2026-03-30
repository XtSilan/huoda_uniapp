<template>
  <div>
    <Row :gutter="16">
      <Col span="6" v-for="(item, key) in cards" :key="key">
        <Card>
          <p slot="title">{{ item.label }}</p>
          <div class="card-num">{{ item.value }}</div>
        </Card>
      </Col>
    </Row>
    <Row :gutter="16" style="margin-top: 16px;">
      <Col span="12">
        <Card title="最新用户">
          <p v-for="item in latestUsers" :key="item.id">{{ item.name }} / {{ item.role }}</p>
        </Card>
      </Col>
      <Col span="12">
        <Card title="最新资讯">
          <p v-for="item in latestInfos" :key="item.id">{{ item.title }}</p>
        </Card>
      </Col>
    </Row>
  </div>
</template>

<script>
import { getDashboard } from '../api';

export default {
  data() {
    return {
      cards: {
        userCount: { label: '用户总数', value: 0 },
        infoCount: { label: '资讯总数', value: 0 },
        activityCount: { label: '活动总数', value: 0 },
        bannerCount: { label: '轮播图数量', value: 0 }
      },
      latestUsers: [],
      latestInfos: []
    };
  },
  mounted() {
    this.loadData();
  },
  methods: {
    async loadData() {
      const res = await getDashboard();
      Object.keys(this.cards).forEach((key) => {
        this.cards[key].value = res.cards[key];
      });
      this.latestUsers = res.latestUsers || [];
      this.latestInfos = res.latestInfos || [];
    }
  }
};
</script>

<style scoped>
.card-num { font-size: 32px; color: #2d8cf0; font-weight: 700; text-align: center; padding: 16px 0; }
</style>
