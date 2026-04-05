<template>
  <div>
    <Card title="发起签到批次" style="margin-bottom: 16px;">
      <Form :label-width="100">
        <FormItem label="班级">
          <Input v-model="form.className" placeholder="例如：计算机 2401" />
        </FormItem>
        <FormItem label="课程">
          <Input v-model="form.courseName" placeholder="例如：高等数学" />
        </FormItem>
        <FormItem label="老师">
          <Input v-model="form.teacher" placeholder="例如：张老师" />
        </FormItem>
        <FormItem label="签到日期">
          <DatePicker type="date" :value="form.signDate" format="yyyy-MM-dd" style="width: 100%;" @on-change="handleDateChange('signDate', $event)" />
        </FormItem>
        <FormItem label="开始时间">
          <DatePicker type="datetime" :value="form.startTime" format="yyyy-MM-dd HH:mm" style="width: 100%;" @on-change="handleDateChange('startTime', $event)" />
        </FormItem>
        <FormItem label="截止时间">
          <DatePicker type="datetime" :value="form.endTime" format="yyyy-MM-dd HH:mm" style="width: 100%;" @on-change="handleDateChange('endTime', $event)" />
        </FormItem>
        <FormItem label="补签截止">
          <DatePicker type="datetime" :value="form.lateEndTime" format="yyyy-MM-dd HH:mm" style="width: 100%;" @on-change="handleDateChange('lateEndTime', $event)" />
        </FormItem>
        <FormItem>
          <Button type="primary" :loading="saving" @click="submitBatch">发起签到</Button>
        </FormItem>
      </Form>
    </Card>

    <Card title="签到批次列表" style="margin-bottom: 16px;">
      <Table :columns="batchColumns" :data="batches"></Table>
    </Card>

    <Card title="请假审核">
      <Table :columns="leaveColumns" :data="leaveRequests"></Table>
    </Card>
  </div>
</template>

<script>
import { createSignBatch, getLeaveRequests, getSignBatches, reviewLeaveRequest } from '../../api';

function pad(value) {
  return `${value}`.padStart(2, '0');
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(date) {
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toApiDateTime(value) {
  return String(value || '').trim().replace(' ', 'T') + ':00';
}

function createEmptyForm() {
  const now = new Date();
  const end = new Date(now.getTime() + 20 * 60 * 1000);
  const late = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    className: '',
    courseName: '',
    teacher: '',
    signDate: formatDate(now),
    startTime: formatDateTime(now),
    endTime: formatDateTime(end),
    lateEndTime: formatDateTime(late),
    status: 'active'
  };
}

function formatFriendlyDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return formatDateTime(date);
}

export default {
  data() {
    return {
      saving: false,
      reviewComment: '',
      form: createEmptyForm(),
      batches: [],
      leaveRequests: [],
      batchColumns: [
        { title: '班级', key: 'className', minWidth: 120 },
        { title: '课程', key: 'courseName', minWidth: 120 },
        { title: '老师', key: 'teacher', minWidth: 100 },
        { title: '签到日期', key: 'signDate', minWidth: 120 },
        { title: '签到人数', key: 'signCount', width: 100 },
        { title: '待审请假', key: 'pendingLeaveCount', width: 100 },
        { title: '状态', key: 'status', width: 100 }
      ],
      leaveColumns: [
        { title: '学生', key: 'userName', minWidth: 100 },
        { title: '学号', key: 'studentId', minWidth: 110 },
        { title: '班级', key: 'className', minWidth: 120 },
        { title: '课程', key: 'courseName', minWidth: 120 },
        { title: '请假时间', key: 'leaveTime', minWidth: 160, render: (h, params) => h('span', params.row.leaveTime || '-') },
        { title: '原因', key: 'reason', minWidth: 220 },
        {
          title: '状态',
          key: 'status',
          width: 100,
          render: (h, params) => h('Tag', { props: { color: params.row.status === 'pending' ? 'orange' : params.row.status === 'approved' ? 'green' : 'red' } }, params.row.status)
        },
        {
          title: '操作',
          minWidth: 180,
          render: (h, params) => h('div', [
            h('Button', {
              props: { size: 'small', type: 'success', disabled: params.row.status !== 'pending' },
              on: { click: () => this.review(params.row, 'approved') }
            }, '通过'),
            h('Button', {
              props: { size: 'small', type: 'error', disabled: params.row.status !== 'pending' },
              style: { marginLeft: '8px' },
              on: { click: () => this.review(params.row, 'rejected') }
            }, '驳回')
          ])
        }
      ]
    };
  },
  mounted() {
    this.loadData();
  },
  methods: {
    handleDateChange(key, value) {
      this.form[key] = value;
    },
    async loadData() {
      const [batchRes, leaveRes] = await Promise.all([getSignBatches(), getLeaveRequests()]);
      this.batches = (batchRes.list || []).map((item) => ({
        ...item,
        startTimeText: formatFriendlyDateTime(item.startTime),
        endTimeText: formatFriendlyDateTime(item.endTime),
        lateEndTimeText: formatFriendlyDateTime(item.lateEndTime)
      }));
      this.leaveRequests = leaveRes.list || [];
    },
    async submitBatch() {
      const payload = {
        ...this.form,
        startTime: toApiDateTime(this.form.startTime),
        endTime: toApiDateTime(this.form.endTime),
        lateEndTime: toApiDateTime(this.form.lateEndTime)
      };
      this.saving = true;
      try {
        await createSignBatch(payload);
        this.$Message.success('签到批次已发起');
        this.form = createEmptyForm();
        this.loadData();
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '发起失败');
      } finally {
        this.saving = false;
      }
    },
    review(row, status) {
      this.$Modal.confirm({
        title: status === 'approved' ? '通过请假' : '驳回请假',
        render: (h) =>
          h('Input', {
            props: {
              value: '',
              type: 'textarea',
              rows: 4,
              placeholder: '可选填写审核意见'
            },
            on: {
              input: (value) => {
                this.reviewComment = value;
              }
            }
          }),
        onOk: async () => {
          await reviewLeaveRequest(row.id, {
            status,
            reviewComment: this.reviewComment || ''
          });
          this.reviewComment = '';
          this.$Message.success('审核完成');
          this.loadData();
        }
      });
    }
  }
};
</script>
