<template>
  <div>
    <Card dis-hover style="margin-bottom: 16px;">
      <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
        <Input v-model="filters.keyword" placeholder="搜索学号、姓名、院系、班级、手机号" style="width: 280px;" @on-enter="loadUsers" />
        <Select v-model="filters.role" clearable style="width: 140px;" placeholder="角色">
          <Option value="user">普通用户</Option>
          <Option value="admin">管理员</Option>
        </Select>
        <Select v-model="filters.status" clearable style="width: 140px;" placeholder="状态">
          <Option value="active">启用</Option>
          <Option value="disabled">禁用</Option>
        </Select>
        <Select v-model="filters.department" clearable style="width: 180px;" placeholder="院系">
          <Option v-for="item in departmentOptions" :key="item.value" :value="item.value">
            {{ item.label }} ({{ item.count }})
          </Option>
        </Select>
        <Button type="primary" @click="loadUsers">筛选</Button>
        <Button @click="resetFilters">重置</Button>
      </div>
    </Card>

    <Table border :columns="columns" :data="users"></Table>

    <Modal v-model="detailVisible" title="学生信息查看" footer-hide width="720">
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">学号</div>
          <div class="detail-value">{{ detailForm.studentId || '-' }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">姓名</div>
          <div class="detail-value">{{ detailForm.name || '-' }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">角色</div>
          <div class="detail-value">{{ formatRole(detailForm.role) }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">状态</div>
          <div class="detail-value">{{ formatStatus(detailForm.status) }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">院系</div>
          <div class="detail-value">{{ detailForm.department || '-' }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">班级</div>
          <div class="detail-value">{{ detailForm.className || '-' }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">手机号</div>
          <div class="detail-value">{{ detailForm.phone || '-' }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">最近登录</div>
          <div class="detail-value">{{ detailForm.lastLoginAt || '-' }}</div>
        </div>
        <div class="detail-item detail-item--full">
          <div class="detail-label">兴趣方向</div>
          <div class="detail-value">{{ detailInterests }}</div>
        </div>
        <div class="detail-item detail-item--full">
          <div class="detail-label">未来规划</div>
          <div class="detail-value detail-value--multiline">{{ detailForm.futurePlan || '-' }}</div>
        </div>
      </div>
    </Modal>

    <Modal v-model="visible" title="编辑用户" :mask-closable="false" @on-ok="submitEdit">
      <Form :label-width="80">
        <Form-item label="学号">
          <Input :value="form.studentId" disabled />
        </Form-item>
        <Form-item label="姓名">
          <Input v-model="form.name" placeholder="请输入姓名" />
        </Form-item>
        <Form-item label="角色">
          <Select v-model="form.role">
            <Option value="user">普通用户</Option>
            <Option value="admin">管理员</Option>
          </Select>
        </Form-item>
        <Form-item label="状态">
          <Select v-model="form.status">
            <Option value="active">启用</Option>
            <Option value="disabled">禁用</Option>
          </Select>
        </Form-item>
        <Form-item label="院系">
          <Input v-model="form.department" placeholder="请输入院系" />
        </Form-item>
        <Form-item label="班级">
          <Input v-model="form.className" placeholder="请输入班级" />
        </Form-item>
      </Form>
    </Modal>
  </div>
</template>

<script>
import { getUsers, updateUser, deleteUser } from '../../api';

const createFilters = () => ({
  keyword: '',
  role: '',
  status: '',
  department: ''
});

export default {
  data() {
    return {
      users: [],
      departmentOptions: [],
      visible: false,
      detailVisible: false,
      editingId: null,
      filters: createFilters(),
      detailForm: {
        studentId: '',
        name: '',
        role: 'user',
        status: 'active',
        department: '',
        className: '',
        phone: '',
        interests: [],
        futurePlan: '',
        lastLoginAt: ''
      },
      form: {
        studentId: '',
        name: '',
        role: 'user',
        status: 'active',
        department: '',
        className: ''
      },
      columns: [
        { title: '学号', key: 'studentId', minWidth: 120 },
        { title: '姓名', key: 'name', minWidth: 100 },
        { title: '角色', key: 'role', minWidth: 100 },
        { title: '状态', key: 'status', minWidth: 100 },
        { title: '院系', key: 'department', minWidth: 140 },
        { title: '班级', key: 'class', minWidth: 120 },
        { title: '最近登录', key: 'lastLoginAt', minWidth: 180 },
        {
          title: '操作',
          minWidth: 390,
          render: (h, params) => h('div', [
            h('Button', {
              props: { size: 'small', type: 'info' },
              on: { click: () => this.openDetail(params.row) }
            }, '查看'),
            h('Button', {
              props: { size: 'small' },
              style: { marginLeft: '8px' },
              on: { click: () => this.openEdit(params.row) }
            }, '编辑'),
            h('Button', {
              props: { size: 'small', type: params.row.status === 'disabled' ? 'success' : 'warning' },
              style: { marginLeft: '8px' },
              on: { click: () => this.toggleStatus(params.row) }
            }, params.row.status === 'disabled' ? '启用' : '禁用'),
            h('Button', {
              props: { size: 'small', type: 'primary' },
              style: { marginLeft: '8px' },
              on: { click: () => this.toggleRole(params.row) }
            }, params.row.role === 'admin' ? '设为用户' : '设为管理员'),
            h('Button', {
              props: { size: 'small', type: 'error' },
              style: { marginLeft: '8px' },
              on: { click: () => this.remove(params.row) }
            }, '删除')
          ])
        }
      ]
    };
  },
  computed: {
    detailInterests() {
      const interests = this.detailForm.interests || [];
      return interests.length ? interests.join('、') : '-';
    }
  },
  mounted() {
    this.loadUsers();
  },
  methods: {
    formatRole(role) {
      return role === 'admin' ? '管理员' : '普通用户';
    },
    formatStatus(status) {
      return status === 'disabled' ? '禁用' : '启用';
    },
    async loadUsers() {
      const res = await getUsers(this.filters);
      this.users = res.list || [];
      this.departmentOptions = (res.filters && res.filters.departments) || [];
    },
    resetFilters() {
      this.filters = createFilters();
      this.loadUsers();
    },
    openDetail(row) {
      this.detailForm = {
        studentId: row.studentId,
        name: row.name,
        role: row.role,
        status: row.status,
        department: row.department,
        className: row.class || '',
        phone: row.phone || '',
        interests: row.interests || [],
        futurePlan: row.futurePlan || '',
        lastLoginAt: row.lastLoginAt || ''
      };
      this.detailVisible = true;
    },
    openEdit(row) {
      this.editingId = row.id;
      this.form = {
        studentId: row.studentId,
        name: row.name,
        role: row.role,
        status: row.status,
        department: row.department,
        className: row.class || ''
      };
      this.visible = true;
    },
    async submitEdit() {
      await updateUser(this.editingId, this.form);
      this.$Message.success('用户信息已更新');
      this.loadUsers();
    },
    async toggleRole(row) {
      await updateUser(row.id, {
        role: row.role === 'admin' ? 'user' : 'admin',
        status: row.status,
        name: row.name,
        department: row.department,
        className: row.class || ''
      });
      this.$Message.success('角色已更新');
      this.loadUsers();
    },
    async toggleStatus(row) {
      await updateUser(row.id, {
        role: row.role,
        status: row.status === 'disabled' ? 'active' : 'disabled',
        name: row.name,
        department: row.department,
        className: row.class || ''
      });
      this.$Message.success('账户状态已更新');
      this.loadUsers();
    },
    remove(row) {
      this.$Modal.confirm({
        title: '确认删除',
        content: `确定删除用户“${row.name}”吗？该操作不可恢复。`,
        onOk: async () => {
          await deleteUser(row.id);
          this.$Message.success('用户已删除');
          this.loadUsers();
        }
      });
    }
  }
};
</script>

<style scoped>
.detail-grid {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -8px;
}

.detail-item {
  width: 50%;
  padding: 8px;
  box-sizing: border-box;
}

.detail-item--full {
  width: 100%;
}

.detail-label {
  margin-bottom: 6px;
  color: #999;
}

.detail-value {
  min-height: 36px;
  padding: 10px 12px;
  line-height: 1.7;
  color: #333;
  background: #f7f8fa;
  border-radius: 6px;
}

.detail-value--multiline {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
