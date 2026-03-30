import authService from '../services/auth';
import userService from '../services/user';
import infoService from '../services/info';
import runService from '../services/run';
import signService from '../services/sign';
import publishService from '../services/publish';
import aiService from '../services/ai';

const apiPlugin = {
  install(Vue) {
    Vue.prototype.$api = {
      auth: authService,
      user: userService,
      info: infoService,
      run: runService,
      sign: signService,
      publish: publishService,
      ai: aiService
    };
  }
};

export default apiPlugin;
