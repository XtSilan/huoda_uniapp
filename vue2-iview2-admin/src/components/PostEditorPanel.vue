<template>
  <div class="post-editor">
    <div class="post-editor__header">
      <div class="post-editor__tabs">
        <button type="button" class="post-editor__tab" :class="{ active: activeMode === 'visual' }" @click="switchMode('visual')">可视化</button>
        <button type="button" class="post-editor__tab" :class="{ active: activeMode === 'text' }" @click="switchMode('text')">文本</button>
      </div>
      <div class="post-editor__toolbar">
        <button type="button" class="post-editor__tool post-editor__tool--primary" :disabled="uploading" @click="triggerImageUpload">
          {{ uploading ? '上传中...' : '添加媒体' }}
        </button>
        <span class="post-editor__sep"></span>
        <button type="button" class="post-editor__tool" title="加粗" @click="applyFormat('bold')"><strong>B</strong></button>
        <button type="button" class="post-editor__tool" title="斜体" @click="applyFormat('italic')"><em>I</em></button>
        <button type="button" class="post-editor__tool" title="标题2" @click="insertHeading">H2</button>
        <button type="button" class="post-editor__tool" title="无序列表" @click="applyFormat('insertUnorderedList')">UL</button>
        <button type="button" class="post-editor__tool" title="有序列表" @click="applyFormat('insertOrderedList')">OL</button>
        <button type="button" class="post-editor__tool" title="插入链接" @click="insertLink">链接</button>
        <button type="button" class="post-editor__tool" title="引用" @click="insertQuote">“</button>
        <button type="button" class="post-editor__tool" title="分割线" @click="insertHorizontalRule">HR</button>
        <button type="button" class="post-editor__tool" title="代码" @click="insertCode">{ }</button>
        <button type="button" class="post-editor__tool" title="图片URL" @click="insertImageByUrl">图片URL</button>
      </div>
      <div v-if="selectedImage" class="post-editor__image-tools">
        <span class="post-editor__hint">已选中图片</span>
        <span>宽度</span>
        <input
          class="post-editor__width-input"
          type="number"
          min="80"
          max="1200"
          :value="selectedImageWidth"
          @input="updateSelectedImageWidth($event.target.value)"
        />
        <span>px</span>
        <button type="button" class="post-editor__tool" @click="setSelectedImageAlign('left')">左对齐</button>
        <button type="button" class="post-editor__tool" @click="setSelectedImageAlign('center')">居中</button>
        <button type="button" class="post-editor__tool" @click="setSelectedImageAlign('right')">右对齐</button>
      </div>
    </div>

    <div v-show="activeMode === 'visual'" class="post-editor__visual-wrap">
      <div
        ref="visualEditor"
        class="post-editor__visual"
        :style="{ minHeight: `${minHeight}px` }"
        contenteditable="true"
        :data-placeholder="placeholder"
        @input="handleVisualInput"
      ></div>
    </div>

    <div v-show="activeMode === 'text'" class="post-editor__text-wrap">
      <textarea
        ref="textEditor"
        class="post-editor__text"
        :style="{ minHeight: `${minHeight}px` }"
        :placeholder="placeholder"
        v-model="innerHtml"
        @input="emitChange"
      ></textarea>
    </div>

    <input ref="imageInput" type="file" accept="image/*" style="display: none" @change="handleImageUpload" />
  </div>
</template>

<script>
export default {
  name: 'PostEditorPanel',
  props: {
    value: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: '请输入内容...'
    },
    minHeight: {
      type: Number,
      default: 320
    },
    uploadImage: {
      type: Function,
      default: null
    }
  },
  data() {
    return {
      activeMode: 'visual',
      innerHtml: '',
      uploading: false,
      selectedImage: null,
      selectedImageWidth: 360
    };
  },
  watch: {
    value: {
      immediate: true,
      handler(next) {
        const normalized = String(next || '');
        if (normalized !== this.innerHtml) {
          this.innerHtml = normalized;
          this.syncVisualContent();
        }
      }
    }
  },
  mounted() {
    this.syncVisualContent();
    this.bindVisualEvents();
  },
  beforeDestroy() {
    this.unbindVisualEvents();
  },
  methods: {
    bindVisualEvents() {
      if (!this.$refs.visualEditor) {
        return;
      }
      this.$refs.visualEditor.addEventListener('click', this.handleVisualClick);
      this.$refs.visualEditor.addEventListener('keyup', this.handleSelectionChange);
    },
    unbindVisualEvents() {
      if (!this.$refs.visualEditor) {
        return;
      }
      this.$refs.visualEditor.removeEventListener('click', this.handleVisualClick);
      this.$refs.visualEditor.removeEventListener('keyup', this.handleSelectionChange);
    },
    syncVisualContent() {
      if (!this.$refs.visualEditor) {
        return;
      }
      const html = this.innerHtml || '';
      if (this.$refs.visualEditor.innerHTML !== html) {
        this.$refs.visualEditor.innerHTML = html;
      }
    },
    emitChange() {
      this.$emit('input', this.innerHtml);
      if (this.activeMode === 'text') {
        this.syncVisualContent();
      }
    },
    switchMode(mode) {
      this.activeMode = mode;
      if (mode === 'visual') {
        this.$nextTick(() => {
          this.syncVisualContent();
          this.focusVisualEditor();
        });
      } else {
        this.clearSelectedImage();
      }
    },
    focusVisualEditor() {
      if (this.$refs.visualEditor) {
        this.$refs.visualEditor.focus();
      }
    },
    handleVisualInput() {
      const html = this.$refs.visualEditor ? this.$refs.visualEditor.innerHTML : '';
      this.innerHtml = html;
      this.$emit('input', this.innerHtml);
    },
    handleVisualClick(event) {
      const target = event && event.target;
      if (target && target.tagName === 'IMG') {
        this.selectImage(target);
        return;
      }
      this.clearSelectedImage();
    },
    handleSelectionChange() {
      const selection = window.getSelection();
      if (!selection || !selection.anchorNode) {
        return;
      }
      const element = selection.anchorNode.nodeType === 1 ? selection.anchorNode : selection.anchorNode.parentElement;
      if (!element || !this.$refs.visualEditor || !this.$refs.visualEditor.contains(element)) {
        this.clearSelectedImage();
      }
    },
    selectImage(imageEl) {
      this.clearImageOutline();
      this.selectedImage = imageEl;
      imageEl.classList.add('post-editor__image--selected');
      const width = parseInt(String(imageEl.style.width || '').replace('px', ''), 10);
      this.selectedImageWidth = Number.isFinite(width) && width > 0 ? width : 360;
    },
    clearImageOutline() {
      if (!this.$refs.visualEditor) {
        return;
      }
      const images = this.$refs.visualEditor.querySelectorAll('img.post-editor__image--selected');
      images.forEach((img) => img.classList.remove('post-editor__image--selected'));
    },
    clearSelectedImage() {
      this.clearImageOutline();
      this.selectedImage = null;
    },
    hasVisualTextSelection() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return false;
      }
      const range = selection.getRangeAt(0);
      return this.$refs.visualEditor && this.$refs.visualEditor.contains(range.commonAncestorContainer);
    },
    ensureTextSelection(actionLabel) {
      if (this.activeMode === 'visual') {
        const ok = this.hasVisualTextSelection();
        if (!ok) {
          this.$Message.warning(`请先选中要${actionLabel}的文字`);
        }
        return ok;
      }
      const el = this.$refs.textEditor;
      const hasSelection = !!el && Number(el.selectionEnd || 0) > Number(el.selectionStart || 0);
      if (!hasSelection) {
        this.$Message.warning(`请先选中要${actionLabel}的文字`);
      }
      return hasSelection;
    },
    insertHtml(html) {
      if (!html) {
        return;
      }
      if (this.activeMode === 'visual') {
        this.focusVisualEditor();
        document.execCommand('insertHTML', false, html);
        this.handleVisualInput();
        return;
      }
      this.replaceTextSelection(html);
    },
    applyFormat(command) {
      if (this.activeMode === 'visual') {
        if (!this.ensureTextSelection(command === 'bold' ? '加粗' : command === 'italic' ? '斜体' : '设置格式')) {
          return;
        }
        this.focusVisualEditor();
        document.execCommand(command, false, null);
        this.handleVisualInput();
        return;
      }
      if (command === 'bold') {
        this.wrapTextSelection('<strong>', '</strong>', '加粗');
      } else if (command === 'italic') {
        this.wrapTextSelection('<em>', '</em>', '斜体');
      } else if (command === 'insertUnorderedList') {
        this.wrapTextSelection('<ul>\n<li>', '</li>\n</ul>', '列表');
      } else if (command === 'insertOrderedList') {
        this.wrapTextSelection('<ol>\n<li>', '</li>\n</ol>', '列表');
      }
    },
    insertHeading() {
      if (this.activeMode === 'visual') {
        if (!this.ensureTextSelection('设置标题')) {
          return;
        }
        this.focusVisualEditor();
        document.execCommand('formatBlock', false, 'h2');
        this.handleVisualInput();
        return;
      }
      this.wrapTextSelection('<h2>', '</h2>', '标题');
    },
    insertQuote() {
      if (!this.ensureTextSelection('转换为引用')) {
        return;
      }
      this.wrapByMode('<blockquote>', '</blockquote>');
    },
    insertHorizontalRule() {
      this.insertHtml('<hr />');
    },
    insertCode() {
      if (!this.ensureTextSelection('转换为代码')) {
        return;
      }
      this.wrapByMode('<pre><code>', '</code></pre>');
    },
    insertLink() {
      if (!this.ensureTextSelection('添加链接')) {
        return;
      }
      const url = window.prompt('请输入链接地址（https://...）');
      if (!url) {
        return;
      }
      if (this.activeMode === 'visual') {
        this.focusVisualEditor();
        document.execCommand('createLink', false, url);
        this.handleVisualInput();
        return;
      }
      this.wrapTextSelection(`<a href="${url}" target="_blank" rel="noopener noreferrer">`, '</a>', '添加链接');
    },
    insertImageByUrl() {
      const url = window.prompt('请输入图片地址（https://...）');
      if (!url) {
        return;
      }
      this.insertImage(url);
    },
    insertImage(url) {
      if (!url) {
        return;
      }
      const html = `<p><img src="${url}" alt="" style="width:360px;max-width:100%;height:auto;display:block;margin:12px auto;" data-align="center" /></p>`;
      this.insertHtml(html);
    },
    updateSelectedImageWidth(width) {
      const value = Number(width);
      this.selectedImageWidth = value;
      if (!this.selectedImage) {
        return;
      }
      if (!Number.isFinite(value) || value < 80) {
        return;
      }
      this.selectedImage.style.width = `${Math.min(value, 1200)}px`;
      this.selectedImage.style.maxWidth = '100%';
      this.selectedImage.style.height = 'auto';
      this.handleVisualInput();
    },
    setSelectedImageAlign(align) {
      if (!this.selectedImage) {
        return;
      }
      const target = this.selectedImage;
      target.dataset.align = align;
      target.style.display = 'block';
      if (align === 'left') {
        target.style.margin = '12px auto 12px 0';
      } else if (align === 'right') {
        target.style.margin = '12px 0 12px auto';
      } else {
        target.style.margin = '12px auto';
      }
      this.handleVisualInput();
    },
    wrapByMode(prefix, suffix) {
      if (this.activeMode === 'visual') {
        this.focusVisualEditor();
        document.execCommand('insertHTML', false, `${prefix}${window.getSelection().toString()}${suffix}`);
        this.handleVisualInput();
        return;
      }
      this.wrapTextSelection(prefix, suffix, '设置格式');
    },
    wrapTextSelection(prefix, suffix, actionLabel) {
      if (!this.ensureTextSelection(actionLabel)) {
        return;
      }
      const el = this.$refs.textEditor;
      const start = Number(el.selectionStart || 0);
      const end = Number(el.selectionEnd || 0);
      const source = String(this.innerHtml || '');
      const selected = source.slice(start, end);
      this.innerHtml = `${source.slice(0, start)}${prefix}${selected}${suffix}${source.slice(end)}`;
      this.emitChange();
      this.$nextTick(() => {
        const cursor = start + prefix.length + selected.length + suffix.length;
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    },
    replaceTextSelection(content) {
      const el = this.$refs.textEditor;
      if (!el) {
        this.innerHtml = `${this.innerHtml || ''}${content}`;
        this.emitChange();
        return;
      }
      const start = Number(el.selectionStart || 0);
      const end = Number(el.selectionEnd || 0);
      const source = String(this.innerHtml || '');
      this.innerHtml = `${source.slice(0, start)}${content}${source.slice(end)}`;
      this.emitChange();
      this.$nextTick(() => {
        const cursor = start + content.length;
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    },
    triggerImageUpload() {
      if (!this.uploadImage) {
        this.$Message.warning('当前页面未配置图片上传能力，可先使用图片 URL 插入');
        return;
      }
      if (this.$refs.imageInput) {
        this.$refs.imageInput.click();
      }
    },
    async handleImageUpload(event) {
      const files = Array.from((event.target && event.target.files) || []);
      if (!files.length || !this.uploadImage) {
        return;
      }
      this.uploading = true;
      try {
        for (const file of files) {
          const uploaded = await this.uploadImage(file);
          const inserted = uploaded && (uploaded.url || uploaded.path || uploaded);
          if (inserted) {
            this.insertImage(inserted);
          }
        }
      } catch (error) {
        this.$Message.error((error && error.message) || '图片上传失败');
      } finally {
        this.uploading = false;
        if (event.target) {
          event.target.value = '';
        }
      }
    }
  }
};
</script>

<style scoped>
.post-editor {
  border: 1px solid #dcdcde;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.post-editor__header {
  border-bottom: 1px solid #dcdcde;
  background: #f6f7f7;
}

.post-editor__tabs {
  display: flex;
  gap: 6px;
  padding: 8px 10px 4px;
}

.post-editor__tab {
  appearance: none;
  border: 1px solid #dcdcde;
  border-bottom: none;
  background: #f0f0f1;
  color: #2c3338;
  font-size: 12px;
  padding: 7px 12px;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
}

.post-editor__tab.active {
  background: #fff;
  color: #1d2327;
  font-weight: 600;
}

.post-editor__toolbar,
.post-editor__image-tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px 10px;
}

.post-editor__image-tools {
  background: #fff;
  border-top: 1px dashed #dcdcde;
  padding-top: 8px;
}

.post-editor__hint {
  color: #2271b1;
  font-size: 12px;
  font-weight: 600;
}

.post-editor__width-input {
  width: 76px;
  border: 1px solid #c3c4c7;
  border-radius: 4px;
  height: 28px;
  padding: 0 8px;
}

.post-editor__sep {
  width: 1px;
  height: 20px;
  background: #dcdcde;
  margin: 0 2px;
}

.post-editor__tool {
  appearance: none;
  border: 1px solid #c3c4c7;
  border-radius: 4px;
  background: #fff;
  color: #2c3338;
  font-size: 12px;
  padding: 4px 8px;
  min-width: 34px;
  cursor: pointer;
}

.post-editor__tool--primary {
  border-color: #2271b1;
  color: #2271b1;
}

.post-editor__tool:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.post-editor__visual,
.post-editor__text {
  width: 100%;
  border: none;
  outline: none;
  font-size: 14px;
  line-height: 1.7;
  padding: 14px;
  color: #1d2327;
}

.post-editor__text {
  resize: vertical;
}

.post-editor__visual:empty:before {
  content: attr(data-placeholder);
  color: #8c8f94;
}

.post-editor__visual img {
  max-width: 100%;
  height: auto;
  border-radius: 3px;
}

.post-editor__visual img.post-editor__image--selected {
  outline: 2px solid #2271b1;
  outline-offset: 1px;
}
</style>
