<template>
  <div>
    <Button type="primary" @click="openCreate" style="margin-bottom: 12px;">新增默认模型</Button>
    <Table border :columns="columns" :data="models"></Table>
    <Modal v-model="visible" title="AI 默认模型配置" width="760" :mask-closable="false" @on-ok="submit">
      <Input v-model="form.name" placeholder="配置名称" style="margin-bottom: 10px;" />
      <Input v-model="form.provider" placeholder="供应商：openai / anthropic" style="margin-bottom: 10px;" />
      <Input v-model="form.baseUrl" placeholder="Base URL" style="margin-bottom: 10px;" />
      <Input v-model="form.apiKey" placeholder="API Key" style="margin-bottom: 10px;" />
      <Input v-model="form.model" placeholder="模型名称" style="margin-bottom: 10px;" />
      <Input v-model="form.temperature" placeholder="Temperature" style="margin-bottom: 10px;" />
      <Input v-model="form.topP" placeholder="Top P" style="margin-bottom: 10px;" />
      <Input v-model="form.maxTokens" placeholder="Max Tokens" style="margin-bottom: 10px;" />
      <Input v-model="form.presencePenalty" placeholder="Presence Penalty" style="margin-bottom: 10px;" />
      <Input v-model="form.frequencyPenalty" placeholder="Frequency Penalty" style="margin-bottom: 10px;" />
      <Input v-model="form.systemPrompt" type="textarea" :rows="5" placeholder="System Prompt" style="margin-bottom: 10px;" />
      <div style="display:flex; gap:16px;">
        <Checkbox v-model="form.isDefault">设为默认</Checkbox>
        <Checkbox v-model="form.isActive">启用</Checkbox>
      </div>
    </Modal>
  </div>
</template>

<script>
import { getAiModels, createAiModel, updateAiModel, deleteAiModel } from '../../api';

const defaultForm = () => ({
  name: '',
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: '',
  temperature: 0.7,
  topP: 1,
  maxTokens: 512,
  presencePenalty: 0,
  frequencyPenalty: 0,
  systemPrompt: '你是小达老师，是一个面向校园场景的 AI 助手。请优先用简洁、友好的中文回答。',
  isDefault: false,
  isActive: true
});

export default {
  data() {
    return {
      models: [],
      visible: false,
      editingId: null,
      form: defaultForm(),
      columns: [
        { title: '名称', key: 'name' },
        { title: '供应商', key: 'provider' },
        { title: '模型', key: 'model' },
        { title: 'Base URL', key: 'baseUrl' },
        {
          title: '状态',
          render: (h, params) => h('span', `${params.row.isDefault ? '默认 / ' : ''}${params.row.isActive ? '启用' : '停用'}`)
        },
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
    this.loadData();
  },
  methods: {
    async loadData() {
      const res = await getAiModels();
      this.models = res.list || [];
    },
    openCreate() {
      this.editingId = null;
      this.form = defaultForm();
      this.visible = true;
    },
    openEdit(row) {
      this.editingId = row.id;
      this.form = { ...row };
      this.visible = true;
    },
    async submit() {
      const payload = {
        ...this.form,
        temperature: Number(this.form.temperature),
        topP: Number(this.form.topP),
        maxTokens: Number(this.form.maxTokens),
        presencePenalty: Number(this.form.presencePenalty),
        frequencyPenalty: Number(this.form.frequencyPenalty)
      };
      if (this.editingId) {
        await updateAiModel(this.editingId, payload);
      } else {
        await createAiModel(payload);
      }
      this.loadData();
    },
    async remove(id) {
      await deleteAiModel(id);
      this.loadData();
    }
  }
};
</script>
