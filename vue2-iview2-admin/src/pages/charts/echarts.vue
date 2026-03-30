<template>
  <div class="chart">
    <Row :gutter="16">
      <Col span="12"><Card title="用户角色分布"><div id="roleChart" style="height:360px;"></div></Card></Col>
      <Col span="12"><Card title="资讯分类分布"><div id="infoChart" style="height:360px;"></div></Card></Col>
      <Col span="12" style="margin-top:16px;"><Card title="活动类型分布"><div id="activityChart" style="height:360px;"></div></Card></Col>
      <Col span="12" style="margin-top:16px;"><Card title="乐跑里程趋势"><div id="runChart" style="height:360px;"></div></Card></Col>
    </Row>
  </div>
</template>

<script>
import echarts from 'echarts';
import { getReports } from '../../api';

export default {
  async mounted() {
    const data = await getReports();
    this.renderPie('roleChart', '用户角色', data.usersByRole || []);
    this.renderPie('infoChart', '资讯分类', data.infosByCategory || []);
    this.renderPie('activityChart', '活动类型', data.activitiesByType || []);
    this.renderLine('runChart', '乐跑里程', data.runTrend || []);
  },
  methods: {
    renderPie(id, title, data) {
      const chart = echarts.init(document.getElementById(id));
      chart.setOption({
        title: { text: title, left: 'center' },
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: '55%', data }]
      });
    },
    renderLine(id, title, data) {
      const chart = echarts.init(document.getElementById(id));
      chart.setOption({
        title: { text: title, left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: data.map((item) => item.name) },
        yAxis: { type: 'value' },
        series: [{ type: 'line', data: data.map((item) => item.value), smooth: true }]
      });
    }
  }
};
</script>
