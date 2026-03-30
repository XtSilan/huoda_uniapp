<template>
  <div>
    <Button type="primary" @click="openCreate" style="margin-bottom: 12px;">新增活动</Button>
    <Table border :columns="columns" :data="activities"></Table>
    <Modal v-model="visible" title="活动编辑" @on-ok="submit">
      <Input v-model="form.title" placeholder="标题" style="margin-bottom: 10px;" />
      <Input v-model="form.summary" placeholder="摘要" style="margin-bottom: 10px;" />
      <Input v-model="form.organizer" placeholder="组织方" style="margin-bottom: 10px;" />
      <Input v-model="form.location" placeholder="地点" style="margin-bottom: 10px;" />
      <Input v-model="form.activityType" placeholder="类型" style="margin-bottom: 10px;" />
      <Input v-model="form.startTime" placeholder="开始时间 ISO" style="margin-bottom: 10px;" />
      <Input v-model="form.endTime" placeholder="结束时间 ISO" style="margin-bottom: 10px;" />
      <Input v-model="form.content" type="textarea" :rows="6" placeholder="内容" />
    </Modal>
  </div>
</template>

<script>
import { getActivities, createActivity, updateActivity, deleteActivity } from '../../api';

export default {
  data() {
    return {
      activities: [],
      visible: false,
      editingId: null,
      form: {
        title: '', summary: '', organizer: '', location: '', activityType: '其他',
        startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(),
        content: '', locationType: '校内', status: 'upcoming'
      },
      columns: [
        { title: '标题', key: 'title' },
        { title: '类型', key: 'activityType' },
        { title: '组织方', key: 'organizer' },
        { title: '报名人数', key: 'applyCount' },
        {
          title: '操作',
          render: (h, params) => h('div', [
            h('Button', { props: { size: 'small' }, on: { click: () => this.openEdit(params.row) } }, '编辑'),
            h('Button', { props: { size: 'small', type: 'error' }, style: { marginLeft: '8px' }, on: { click: () => this.remove(params.row.id) } }, '删除')
          ])
        }
      ]
    };
  },
  mounted() {
    this.loadActivities();
  },
  methods: {
    async loadActivities() {
      const res = await getActivities();
      this.activities = res.list || [];
    },
    openCreate() {
      this.editingId = null;
      this.visible = true;
    },
    openEdit(row) {
      this.editingId = row.id;
      this.form = { ...row };
      this.visible = true;
    },
    async submit() {
      if (this.editingId) await updateActivity(this.editingId, this.form);
      else await createActivity(this.form);
      this.loadActivities();
    },
    async remove(id) {
      await deleteActivity(id);
      this.loadActivities();
    }
  }
};
</script>
