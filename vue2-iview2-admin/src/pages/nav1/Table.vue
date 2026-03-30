<template>
  <div>
    <Button type="primary" @click="openCreate" style="margin-bottom: 12px;">新增资讯</Button>
    <Table border :columns="columns" :data="infos"></Table>
    <Modal v-model="visible" title="资讯编辑" @on-ok="submit">
      <Input v-model="form.title" placeholder="标题" style="margin-bottom: 10px;" />
      <Input v-model="form.summary" placeholder="摘要" style="margin-bottom: 10px;" />
      <Input v-model="form.source" placeholder="来源" style="margin-bottom: 10px;" />
      <Input v-model="form.category" placeholder="分类" style="margin-bottom: 10px;" />
      <Input v-model="form.content" type="textarea" :rows="6" placeholder="内容" />
    </Modal>
  </div>
</template>

<script>
import { getInfos, createInfo, updateInfo, deleteInfo } from '../../api';

export default {
  data() {
    return {
      infos: [],
      visible: false,
      editingId: null,
      form: { title: '', summary: '', source: '', category: '资讯', content: '' },
      columns: [
        { title: '标题', key: 'title' },
        { title: '分类', key: 'category' },
        { title: '来源', key: 'source' },
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
    this.loadInfos();
  },
  methods: {
    async loadInfos() {
      const res = await getInfos();
      this.infos = res.list || [];
    },
    openCreate() {
      this.editingId = null;
      this.form = { title: '', summary: '', source: '', category: '资讯', content: '' };
      this.visible = true;
    },
    openEdit(row) {
      this.editingId = row.id;
      this.form = { ...row };
      this.visible = true;
    },
    async submit() {
      if (this.editingId) await updateInfo(this.editingId, this.form);
      else await createInfo(this.form);
      this.loadInfos();
    },
    async remove(id) {
      await deleteInfo(id);
      this.loadInfos();
    }
  }
};
</script>
