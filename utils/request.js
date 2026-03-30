// 网络请求封装

const request = (url, options = {}) => {
  const token = uni.getStorageSync('token');
  
  const defaultOptions = {
    method: 'GET',
    header: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    ...options
  };
  
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      ...defaultOptions,
      success: res => {
        if (res.statusCode === 200) {
          // 处理用户信息API的返回数据，将username和avatar转换为name和avatarUrl
          if (url === 'http://localhost:3000/api/user/profile') {
            const data = res.data;
            if (data.username) {
              data.name = data.username;
              delete data.username;
            }
            if (data.avatar) {
              data.avatarUrl = data.avatar;
              delete data.avatar;
            }
          }
          
          // 处理信息列表API的返回数据，将旧字段转换为前端期望的字段
          if (url.includes('http://localhost:3000/api/info/list')) {
            const data = res.data;
            if (data.list) {
              data.list.forEach(item => {
                if (item.createdAt) {
                  item.publishTime = new Date(item.createdAt).toISOString();
                  delete item.createdAt;
                }
                if (item.author) {
                  item.source = item.author;
                  delete item.author;
                }
                if (item.collectCount) {
                  delete item.collectCount;
                }
                if (item.commentCount) {
                  delete item.commentCount;
                }
                item.isCollected = false;
              });
            }
            data.page = 1;
            data.pageSize = 10;
          }
          
          // 处理信息详情API的返回数据，将旧字段转换为前端期望的字段
          if (url.includes('http://localhost:3000/api/info/detail')) {
            const data = res.data;
            if (data.createdAt) {
              data.publishTime = new Date(data.createdAt).toISOString();
              delete data.createdAt;
            }
            if (data.author) {
              data.source = data.author;
              delete data.author;
            }
            if (data.collectCount) {
              delete data.collectCount;
            }
            if (data.commentCount) {
              delete data.commentCount;
            }
            data.isCollected = false;
            if (!data.comments) {
              data.comments = [];
            }
          }
          
          // 处理乐跑历史API的返回数据，将旧字段转换为前端期望的字段
          if (url.includes('http://localhost:3000/api/run/history')) {
            const data = res.data;
            if (data.list) {
              data.list.forEach(item => {
                if (item.createdAt) {
                  item.date = new Date(item.createdAt).toISOString();
                  delete item.createdAt;
                }
                if (item.calories) {
                  // 将卡路里值转换为整数
                  item.calories = Math.round(item.calories * 10000);
                }
                if (item.averageSpeed) {
                  delete item.averageSpeed;
                }
                if (item.userId) {
                  delete item.userId;
                }
                if (!item.path) {
                  item.path = [];
                }
              });
            }
          }
          
          // 处理乐跑排行榜API的返回数据，将旧字段转换为前端期望的字段
          if (url.includes('http://localhost:3000/api/run/ranking')) {
            const data = res.data;
            if (data.list) {
              data.list.forEach((item, index) => {
                if (item._id) {
                  item.userId = item._id;
                  delete item._id;
                }
                if (item.total) {
                  item.distance = item.total;
                  delete item.total;
                }
                if (!item.name) {
                  item.name = `用户${index + 1}`;
                }
                if (!item.rank) {
                  item.rank = index + 1;
                }
              });
            }
          }
          
          // 处理签到历史API的返回数据，将旧字段转换为前端期望的字段
          if (url.includes('http://localhost:3000/api/sign/history')) {
            const data = res.data;
            if (data.list) {
              data.list.forEach(item => {
                if (item.createdAt) {
                  item.time = new Date(item.createdAt).toISOString();
                  delete item.createdAt;
                }
                if (item.signId && item.signId.className) {
                  item.courseName = item.signId.className;
                } else {
                  item.courseName = '未知课程';
                }
                // 模拟教师名称
                item.teacher = '张老师';
                // 模拟签到状态
                item.status = 'success';
                // 删除不需要的字段
                delete item.location;
                delete item.signId;
                delete item.userId;
              });
            }
          }
          
          // 处理活动发布列表API的返回数据，将旧字段转换为前端期望的字段
          if (url.includes('http://localhost:3000/api/publish/list')) {
            const data = res.data;
            if (data.list) {
              data.list.forEach(item => {
                if (item.time) {
                  item.startTime = new Date(item.time).toISOString();
                  item.endTime = new Date(item.time).toISOString();
                  delete item.time;
                }
                if (item.currentParticipants) {
                  item.applyCount = item.currentParticipants;
                  delete item.currentParticipants;
                }
                if (!item.organizer) {
                  item.organizer = '校学生会';
                }
                if (!item.status) {
                  item.status = 'ongoing';
                }
                // 删除不需要的字段
                delete item.createdAt;
                delete item.coverImage;
                delete item.maxParticipants;
                delete item.userId;
              });
            }
          }
          
          // 处理AI对话API的返回数据，将旧字段转换为前端期望的字段
          if (url.includes('http://localhost:3000/api/ai/chat')) {
            const data = res.data;
            if (data.context) {
              delete data.context;
            }
            if (!data.relatedInfos) {
              data.relatedInfos = [];
            }
          }
          
          // 处理AI推荐API的返回数据，将旧字段转换为前端期望的字段
          if (url.includes('http://localhost:3000/api/ai/recommend')) {
            const data = res.data;
            if (data.recommendations) {
              data.recommendations.forEach(item => {
                if (item.createdAt) {
                  item.publishTime = new Date(item.createdAt).toISOString();
                  delete item.createdAt;
                }
                if (item.author) {
                  item.source = item.author;
                  delete item.author;
                }
              });
            }
          }
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: error => {
        reject(error);
      }
    });
  });
};

export default request;
