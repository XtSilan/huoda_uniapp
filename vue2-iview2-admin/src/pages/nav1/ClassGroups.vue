<template>
  <div>
    <Table border :columns="columns" :data="groups"></Table>
    <Modal v-model="visible" title="班级群配置" @on-ok="submit">
      <Input v-model="form.className" placeholder="班级名称" style="margin-bottom: 10px;" />
      <Input v-model="form.groupName" placeholder="群名称" style="margin-bottom: 10px;" />
      <Input v-model="form.announcement" placeholder="群公告" style="margin-bottom: 10px;" />
      <Input v-model="form.qrCode" placeholder="二维码地址" style="margin-bottom: 10px;" />
      <InputNumber v-model="form.onlineCount" :min="0" style="width: 100%; margin-bottom: 10px;" />
      <Input v-model="classmatesText" type="textarea" :rows="4" placeholder='同学列表 JSON，例如 [{"id":1,"name":"张同学","role":"班长"}]' style="margin-bottom: 10px;" />
      <Input v-model="messagesText" type="textarea" :rows="4" placeholder='聊天消息 JSON，例如 [{"id":1,"sender":"班长","text":"今晚开班会","time":"2026-03-31T12:00:00.000Z"}]' />
    </Modal>
  </div>
</template>

<script>
import { getClassGroups, updateClassGroup } from '../../api';

export default {
  data() {
    return {
      groups: [],
      visible: false,
      editingId: null,
      classmatesText: '[]',
      messagesText: '[]',
      form: {
        className: '',
        groupName: '',
        announcement: '',
        qrCode: '',
        onlineCount: 0
      },
      columns: [
        { title: '班级', key: 'className' },
        { title: '群名称', key: 'groupName' },
        { title: '在线人数', key: 'onlineCount' },
        {
          title: '操作',
          render: (h, params) => h('Button', {
            props: { size: 'small' },
            on: { click: () => this.openEdit(params.row) }
          }, '编辑')
        }
      ]
    };
  },
  mounted() {
    this.loadGroups();
  },
  methods: {
    async loadGroups() {
      const res = await getClassGroups();
      this.groups = res.list || [];
    },
    openEdit(row) {
      this.editingId = row.id;
      this.form = {
        className: row.className,
        groupName: row.groupName,
        announcement: row.announcement,
        qrCode: row.qrCode,
        onlineCount: row.onlineCount
      };
      this.classmatesText = JSON.stringify(row.classmates || [], null, 2);
      this.messagesText = JSON.stringify(row.messages || [], null, 2);
      this.visible = true;
    },
    async submit() {
      const payload = {
        ...this.form,
        classmates: JSON.parse(this.classmatesText || '[]'),
        messages: JSON.parse(this.messagesText || '[]')
      };
      await updateClassGroup(this.editingId, payload);
      this.loadGroups();
    }
  }
};
</script>
