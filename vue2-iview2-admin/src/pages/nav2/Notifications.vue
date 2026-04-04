<template>
  <div>
    <Alert show-icon style="margin-bottom: 16px;">
      用户消息通知中心
      <template slot="desc">
        这里可以发布系统通知、活动通知、签到通知和版本通知。支持全员发送，也支持按用户搜索后定向发送，适合处理请假结果、班级提醒等场景。
      </template>
    </Alert>

    <Card title="发布通知" style="margin-bottom: 16px;">
      <Form :label-width="110">
        <FormItem label="通知类型">
          <RadioGroup v-model="form.type">
            <Radio label="system">系统通知</Radio>
            <Radio label="activity">活动通知</Radio>
            <Radio label="sign">签到通知</Radio>
            <Radio label="version">版本通知</Radio>
          </RadioGroup>
        </FormItem>

        <FormItem label="通知模板">
          <Select v-model="selectedTemplate" placeholder="可选模板" @on-change="applyTemplate">
            <Option v-for="item in templates" :key="item.key" :value="item.key">{{ item.label }}</Option>
          </Select>
        </FormItem>

        <FormItem label="通知标题">
          <Input v-model="form.title" placeholder="例如：请假结果通知" />
        </FormItem>

        <FormItem label="通知内容">
          <Input v-model="form.content" type="textarea" :rows="5" placeholder="填写推送给用户的消息内容" />
        </FormItem>

        <FormItem label="发送范围">
          <RadioGroup v-model="form.targetScope">
            <Radio label="all">全体用户</Radio>
            <Radio label="specific">指定用户</Radio>
          </RadioGroup>
        </FormItem>

        <FormItem v-if="form.targetScope === 'specific'" label="选择用户">
          <div class="user-search-row">
            <Input
              v-model="userKeyword"
              placeholder="搜索手机号、学号、姓名、院系、班级"
              style="width: 320px;"
              @on-enter="searchUsers"
            />
            <Button type="primary" @click="searchUsers">搜索</Button>
          </div>
          <div v-if="userOptions.length" class="candidate-panel">
            <div
              v-for="item in userOptions"
              :key="item.id"
              class="candidate-item"
            >
              <div class="candidate-main">
                <div class="candidate-title">{{ item.name }} / {{ item.studentId }}</div>
                <div class="candidate-meta">{{ item.department || '未填写院系' }} · {{ item.class || '未填写班级' }} · {{ item.phone || '未填写手机号' }}</div>
              </div>
              <Button size="small" type="primary" ghost @click="addUser(item)">添加</Button>
            </div>
          </div>
          <div v-if="selectedUsers.length" class="selected-panel">
            <Tag
              v-for="item in selectedUsers"
              :key="item.id"
              closable
              color="blue"
              @on-close="removeUser(item.id)"
            >
              {{ item.name }} / {{ item.studentId }}
            </Tag>
          </div>
        </FormItem>

        <FormItem label="跳转目标">
          <Select v-model="form.targetType" placeholder="点击通知后跳转">
            <Option value="">仅查看</Option>
            <Option value="info">资讯详情</Option>
            <Option value="activity">活动详情</Option>
            <Option value="sign">签到页面</Option>
            <Option value="version">版本更新</Option>
          </Select>
        </FormItem>

        <FormItem v-if="form.targetType === 'info' || form.targetType === 'activity'" label="目标 ID">
          <Input v-model="form.targetId" placeholder="例如：12" />
        </FormItem>

        <FormItem>
          <Button type="primary" :loading="saving" @click="submit">发布通知</Button>
          <Button style="margin-left: 8px;" @click="loadData">刷新列表</Button>
        </FormItem>
      </Form>
    </Card>

    <Card title="最近通知">
      <Table :columns="columns" :data="list"></Table>
    </Card>
  </div>
</template>

<script>
import { createNotification, getNotifications, getUsers } from '../../api';

function createEmptyForm() {
  return {
    type: 'system',
    title: '',
    content: '',
    targetScope: 'all',
    targetType: '',
    targetId: ''
  };
}

export default {
  data() {
    return {
      saving: false,
      selectedTemplate: '',
      userKeyword: '',
      form: createEmptyForm(),
      list: [],
      userOptions: [],
      selectedUsers: [],
      templates: [
        { key: 'leave-approved', label: '请假通过', type: 'sign', title: '请假申请已通过', content: '你的请假申请已通过，请注意后续课程安排。', targetType: 'sign' },
        { key: 'leave-rejected', label: '请假驳回', type: 'sign', title: '请假申请未通过', content: '你的请假申请未通过，请及时查看原因并重新提交。', targetType: 'sign' },
        { key: 'activity-remind', label: '活动提醒', type: 'activity', title: '活动提醒', content: '你关注的活动即将开始，记得准时参加。', targetType: 'activity' },
        { key: 'system-maintain', label: '系统维护', type: 'system', title: '系统通知', content: '平台将在今晚进行维护，请提前保存你的操作内容。', targetType: '' }
      ],
      columns: [
        { title: '时间', key: 'createdAt', minWidth: 160 },
        { title: '类型', key: 'type', width: 100 },
        { title: '标题', key: 'title', minWidth: 180 },
        { title: '内容', key: 'content', minWidth: 260 },
        { title: '用户', key: 'userName', minWidth: 120 },
        { title: '学号', key: 'studentId', minWidth: 120 },
        {
          title: '状态',
          key: 'isRead',
          width: 90,
          render: (h, params) => h('Tag', { props: { color: params.row.isRead ? 'green' : 'orange' } }, params.row.isRead ? '已读' : '未读')
        }
      ]
    };
  },
  mounted() {
    this.loadData();
  },
  methods: {
    async loadData() {
      const res = await getNotifications();
      this.list = res.list || [];
    },
    async searchUsers() {
      const res = await getUsers({
        keyword: this.userKeyword,
        role: 'user',
        status: 'active'
      });
      const selectedIds = new Set(this.selectedUsers.map((item) => String(item.id)));
      this.userOptions = (res.list || []).filter((item) => !selectedIds.has(String(item.id)));
    },
    addUser(user) {
      if (this.selectedUsers.some((item) => String(item.id) === String(user.id))) {
        return;
      }
      this.selectedUsers.push(user);
      this.userOptions = this.userOptions.filter((item) => String(item.id) !== String(user.id));
    },
    removeUser(userId) {
      this.selectedUsers = this.selectedUsers.filter((item) => String(item.id) !== String(userId));
    },
    applyTemplate(key) {
      const template = this.templates.find((item) => item.key === key);
      if (!template) {
        return;
      }
      this.form = {
        ...this.form,
        type: template.type,
        title: template.title,
        content: template.content,
        targetType: template.targetType,
        targetId: ''
      };
    },
    async submit() {
      if (!String(this.form.title || '').trim()) {
        this.$Message.warning('请填写通知标题');
        return;
      }
      if (!String(this.form.content || '').trim()) {
        this.$Message.warning('请填写通知内容');
        return;
      }
      const userIds = this.form.targetScope === 'specific' ? this.selectedUsers.map((item) => Number(item.id || 0)).filter(Boolean) : [];
      if (this.form.targetScope === 'specific' && !userIds.length) {
        this.$Message.warning('请至少添加一个接收用户');
        return;
      }
      this.saving = true;
      try {
        const res = await createNotification({
          ...this.form,
          userIds
        });
        this.$Message.success(`通知已发布，覆盖 ${res.count || 0} 个用户`);
        this.form = createEmptyForm();
        this.userKeyword = '';
        this.userOptions = [];
        this.selectedUsers = [];
        this.selectedTemplate = '';
        this.loadData();
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '发布失败');
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.user-search-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.candidate-panel,
.selected-panel {
  margin-top: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.candidate-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
}

.candidate-item + .candidate-item {
  border-top: 1px solid #eef1f7;
}

.candidate-main {
  min-width: 0;
  flex: 1;
}

.candidate-title {
  font-weight: 600;
  color: #17233d;
}

.candidate-meta {
  margin-top: 4px;
  color: #808695;
  word-break: break-all;
}

.selected-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
