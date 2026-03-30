<template>
  <div>
    <Button type="primary" @click="openCreate" style="margin-bottom: 12px;">新增轮播图</Button>
    <Table border :columns="columns" :data="banners"></Table>
    <Modal v-model="visible" title="轮播图编辑" @on-ok="submit">
      <Input v-model="form.title" placeholder="标题" style="margin-bottom: 10px;" />
      <Input v-model="form.imageUrl" placeholder="图片地址" style="margin-bottom: 10px;" />
      <Input v-model="form.linkUrl" placeholder="跳转地址" style="margin-bottom: 10px;" />
      <Input v-model="form.linkType" placeholder="跳转类型" style="margin-bottom: 10px;" />
      <Input v-model="form.sortOrder" placeholder="排序" style="margin-bottom: 10px;" />
    </Modal>
  </div>
</template>

<script>
import { getBanners, createBanner, updateBanner, deleteBanner } from '../../api';

export default {
  data() {
    return {
      banners: [],
      visible: false,
      editingId: null,
      form: { title: '', imageUrl: '', linkUrl: '', linkType: 'placeholder', sortOrder: 1, isActive: true },
      columns: [
        { title: '标题', key: 'title' },
        { title: '图片', key: 'imageUrl' },
        { title: '跳转地址', key: 'linkUrl' },
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
    this.loadBanners();
  },
  methods: {
    async loadBanners() {
      const res = await getBanners();
      this.banners = res.list || [];
    },
    openCreate() {
      this.editingId = null;
      this.form = { title: '', imageUrl: '', linkUrl: '', linkType: 'placeholder', sortOrder: 1, isActive: true };
      this.visible = true;
    },
    openEdit(row) {
      this.editingId = row.id;
      this.form = { ...row };
      this.visible = true;
    },
    async submit() {
      if (this.editingId) await updateBanner(this.editingId, this.form);
      else await createBanner(this.form);
      this.loadBanners();
    },
    async remove(id) {
      await deleteBanner(id);
      this.loadBanners();
    }
  }
};
</script>
