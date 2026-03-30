import infoService from '../services/info';
import aiService from '../services/ai';

const apiPlugin = {
  install(Vue) {
    Vue.prototype.$api = {
      info: infoService,
      ai: aiService
    };
  }
};

export default apiPlugin;
