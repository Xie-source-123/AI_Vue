<template>
  <div class="resume-flat">
    <!-- ===== 已保存的简历记录（2 列） ===== -->
    <section class="card span-2 saved-section">
        <div class="section-heading">
          <span class="section-heading-text">已保存的简历记录</span>
          <span v-if="savedResumes.length > 0" class="section-count">{{ savedResumes.length }}</span>
          <el-button class="model-config-btn" size="small" @click="openModelConfig">
            <el-icon><Setting /></el-icon>添加模型
          </el-button>
        </div>
        <div v-if="savedResumes.length > 0" class="saved-list">
          <div
            v-for="resume in savedResumes"
            :key="resume.id"
            class="resume-card press-lg focus-ring"
            :class="{ 'is-expanded': expandedId === resume.id }"
            @click="toggleExpand(resume.id)"
          >
            <div class="resume-card-summary">
              <div class="resume-card-info">
                <span class="resume-card-name">{{ resume.title || resume.name || '未命名' }}</span>
                <span class="resume-card-detail">{{ resume.phone || '—' }} ｜ {{ resume.school || '—' }}</span>
                <span class="resume-card-detail">求职意向：{{ resume.jobIntention || '—' }}</span>
                <span class="resume-card-date">保存于 {{ formatDate(resume.savedAt) }}</span>
              </div>
              <div class="resume-card-actions">
                <el-icon class="expand-arrow" :class="{ rotated: expandedId === resume.id }"><ArrowDown /></el-icon>
                <el-button class="danger-btn" size="small" @click.stop="deleteResume(resume.id)">删除</el-button>
              </div>
            </div>
            <div v-if="expandedId === resume.id" class="resume-card-detail-panel" @click.stop>
              <div class="detail-basic">
                <img v-if="resume.photo" :src="resume.photo" class="detail-photo" alt="证件照" />
                <div class="detail-basic-info">
                  <div class="detail-row"><span class="detail-label">姓名</span><span class="detail-value detail-value-strong">{{ resume.name || '暂无' }}</span></div>
                  <div class="detail-row"><span class="detail-label">性别</span><span class="detail-value">{{ resume.gender || '暂无' }}</span></div>
                  <div class="detail-row"><span class="detail-label">年龄</span><span class="detail-value">{{ resume.age || '暂无' }}</span></div>
                  <div class="detail-row"><span class="detail-label">手机</span><span class="detail-value">{{ resume.phone || '暂无' }}</span></div>
                </div>
              </div>
              <div class="detail-row"><span class="detail-label">毕业学校</span><span class="detail-value">{{ resume.school || '暂无' }}</span></div>
              <div class="detail-row"><span class="detail-label">个人简介</span><span class="detail-value">{{ resume.resume || '暂无' }}</span></div>
              <div class="detail-row"><span class="detail-label">在校经历</span><span class="detail-value">{{ resume.schoolExperience || '暂无' }}</span></div>
              <div class="detail-row"><span class="detail-label">工作经历</span><span class="detail-value">{{ resume.workExperience || '暂无' }}</span></div>
              <div class="detail-row"><span class="detail-label">项目经历</span><span class="detail-value">{{ resume.projectExperience || '暂无' }}</span></div>
              <div class="detail-row"><span class="detail-label">技能熟练度</span><span class="detail-value">{{ resume.skillProficiency || '暂无' }}</span></div>
              <div class="detail-row"><span class="detail-label">求职意向</span><span class="detail-value">{{ resume.jobIntention || '暂无' }}</span></div>
              <template v-if="resume.customModules && resume.customModules.length">
                <div v-for="(mod, i) in resume.customModules" :key="i" class="detail-row">
                  <span class="detail-label">{{ mod.title || `模块${i + 1}` }}</span>
                  <span class="detail-value">{{ mod.content || '暂无' }}</span>
                </div>
              </template>
              <div class="detail-actions">
                <el-button class="action-btn-blue" size="small" @click.stop="openAiAnalysis(resume)">
                  <el-icon><MagicStick /></el-icon>{{ resume.aiAnalyzed ? '分析结果' : '智能分析' }}
                </el-button>
                <el-button class="action-btn-blue" size="small" @click.stop="downloadWord(resume)">
                  <el-icon><Download /></el-icon>下载 Word
                </el-button>
                <el-button class="action-btn-blue" size="small" @click.stop="openAiEditDialog(resume)">
                  <el-icon><MagicStick /></el-icon>AI 修改简历
                </el-button>
                <el-button class="action-btn-blue" size="small" @click.stop="openEditDialog(resume)">
                  <el-icon><Edit /></el-icon>修改简历
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-hint">
          <el-icon :size="34"><Document /></el-icon>
          <span>暂无已保存的简历记录</span>
        </div>

    </section>

    <!-- ===== 本地文件上传（1 列） ===== -->
    <section v-if="uploadedFiles.length > 0" class="card uploaded-section">
      <div class="section-heading">
        <span class="section-heading-text">本地文件上传</span>
        <span class="section-count">{{ uploadedFiles.length }}</span>
      </div>
      <div v-for="(file, index) in uploadedFiles" :key="file.id || index" class="uploaded-file-card">
        <div class="file-type-tile">
          <el-icon :size="20"><Document /></el-icon>
        </div>
        <div class="uploaded-file-info">
          <span class="file-name">{{ file.title || file.name }}</span>
          <el-tag class="local-file-badge" size="small" effect="plain">本地文件上传</el-tag>
        </div>
        <el-button class="action-btn-blue" size="small" @click="openAiAnalysis(file)">
          <el-icon><MagicStick /></el-icon>{{ file.aiAnalyzed ? '分析结果' : '智能分析' }}
        </el-button>
      </div>
    </section>

    <!-- ===== 上传 / 录入新简历（整宽） ===== -->
    <section class="card span-3 upload-section">
      <div class="section-heading">
        <span class="section-heading-text">上传 / 录入新简历</span>
      </div>
          <el-tabs v-model="activeTab" class="resume-tabs">
            <el-tab-pane label="拖拽上传" name="upload">
              <div class="upload-zone press-lg focus-ring" :class="{ 'is-dragover': isDragOver }"
                @dragover.prevent="isDragOver = true"
                @dragleave.prevent="isDragOver = false"
                @drop.prevent="handleDrop"
                @click="handleBrowse">
                <div class="upload-icon-ring">
                  <el-icon :size="46"><UploadFilled /></el-icon>
                </div>
                <p class="upload-text">点击上传，或将简历拖拽到此处</p>
                <p class="upload-hint">支持 PDF / DOC / DOCX 格式，单个文件不超过 5MB</p>
                <div class="format-badges">
                  <span class="format-badge">PDF</span>
                  <span class="format-badge">DOC</span>
                  <span class="format-badge">DOCX</span>
                </div>
                <el-button class="upload-btn" size="large" @click.stop="handleBrowse">
                  <el-icon><FolderOpened /></el-icon><span>选择文件上传</span>
                </el-button>
                <input ref="fileInput" type="file" accept=".pdf,.doc,.docx" style="display:none" @change="handleFileChange" />
              </div>
              <div v-if="uploadedFiles.length > 0" class="file-list">
                <h3 class="file-list-title">已上传简历</h3>
                <div v-for="(file, index) in uploadedFiles" :key="index"
                  class="file-item press-md focus-ring" :class="{ 'is-expanded': fileExpandedIndex === index }"
                  @click="toggleFileExpand(index)">
                  <div class="file-type-tile">
                    <el-icon :size="22"><Document /></el-icon>
                  </div>
                  <div class="file-info">
                    <div class="file-detail">
                      <span class="file-name">{{ file.title || file.name }}</span>
                      <span class="file-size">{{ formatSize(file.size) }}</span>
                    </div>
                  </div>
                  <el-tag class="file-status-tag" size="small" effect="plain">上传成功</el-tag>
                  <el-icon class="expand-arrow small-arrow" :class="{ rotated: fileExpandedIndex === index }"><ArrowDown /></el-icon>
                  <el-button class="file-remove-btn" :icon="Delete" circle size="small" text @click.stop="removeFile(index)" />
                </div>
                <div v-if="fileExpandedIndex !== null && uploadedFiles[fileExpandedIndex]" class="file-detail-panel">
                  <p>文件名：{{ uploadedFiles[fileExpandedIndex].name }}</p>
                  <p>文件大小：{{ formatSize(uploadedFiles[fileExpandedIndex].size) }}</p>
                  <p class="file-note">提示：文件内容未存储在浏览器中，如需查看请重新上传</p>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="手动录入" name="manual">
              <div class="manual-form">
                <div class="form-section">
                  <div class="form-section-title">
                    <span class="section-title-icon"><el-icon><User /></el-icon></span>
                    <span class="section-title-text">基本信息</span>
                  </div>
                  <div class="form-top">
                    <div class="basic-fields">
                      <div class="form-row">
                        <el-form-item label="姓名"><el-input v-model="form.name" placeholder="请输入姓名" /></el-form-item>
                        <el-form-item label="性别">
                          <el-select v-model="form.gender" placeholder="选择性别">
                            <el-option label="男" value="男" />
                            <el-option label="女" value="女" />
                          </el-select>
                        </el-form-item>
                        <el-form-item label="年龄"><el-input v-model="form.age" placeholder="年龄" /></el-form-item>
                        <el-form-item label="手机号码"><el-input v-model="form.phone" placeholder="手机号码" /></el-form-item>
                      </div>
                    </div>
                    <div class="photo-upload">
                      <div class="photo-box press-lg focus-ring" @click="triggerPhotoSelect">
                        <img v-if="form.photo" :src="form.photo" class="photo-preview" alt="证件照" />
                        <template v-else>
                          <el-icon :size="26"><Camera /></el-icon>
                          <span class="photo-text">上传证件照</span>
                        </template>
                      </div>
                      <input ref="photoInput" type="file" accept="image/*" style="display:none" @change="handlePhotoChange" />
                    </div>
                  </div>
                </div>

                <div class="form-section">
                  <div class="form-section-title">
                    <span class="section-title-icon"><el-icon><School /></el-icon></span>
                    <span class="section-title-text">教育背景</span>
                  </div>
                  <el-form-item label="毕业学校"><el-input v-model="form.school" placeholder="请输入毕业学校" /></el-form-item>
                </div>

                <div class="form-section">
                  <div class="form-section-title">
                    <span class="section-title-icon"><el-icon><Briefcase /></el-icon></span>
                    <span class="section-title-text">个人经历</span>
                  </div>
                  <div class="field-grid">
                    <el-form-item label="个人简介"><el-input v-model="form.resume" type="textarea" :rows="3" placeholder="请填写个人简介" /></el-form-item>
                    <el-form-item label="在校经历"><el-input v-model="form.schoolExperience" type="textarea" :rows="3" placeholder="请填写在校经历" /></el-form-item>
                    <el-form-item label="工作经历"><el-input v-model="form.workExperience" type="textarea" :rows="3" placeholder="请填写工作经历" /></el-form-item>
                    <el-form-item label="项目经历"><el-input v-model="form.projectExperience" type="textarea" :rows="3" placeholder="请填写项目经历" /></el-form-item>
                  </div>
                </div>

                <div class="form-section">
                  <div class="form-section-title">
                    <span class="section-title-icon"><el-icon><Star /></el-icon></span>
                    <span class="section-title-text">技能与意向</span>
                  </div>
                  <div class="field-grid">
                    <el-form-item label="技能熟练度"><el-input v-model="form.skillProficiency" type="textarea" :rows="2" placeholder="如：Java 熟练 / MySQL 掌握" /></el-form-item>
                    <el-form-item label="求职意向"><el-input v-model="form.jobIntention" placeholder="如：数据开发工程师" /></el-form-item>
                  </div>
                </div>

                <div class="form-section">
                  <div class="form-section-title">
                    <span class="section-title-icon"><el-icon><Collection /></el-icon></span>
                    <span class="section-title-text">自定义模块</span>
                    <el-button class="add-module-btn" size="small" @click="addCustomModule">
                      <el-icon><Plus /></el-icon>添加模块
                    </el-button>
                  </div>
                  <div v-for="(mod, index) in form.customModules" :key="mod.id" class="custom-module-item">
                    <el-input v-model="mod.title" placeholder="模块名称（如：获奖证书）" class="module-title-input" />
                    <el-input v-model="mod.content" type="textarea" :rows="2" placeholder="模块内容" />
                    <el-button class="module-remove-btn" :icon="Delete" circle size="small" @click="removeCustomModule(index)" />
                  </div>
                </div>

                <div class="submit-row">
                  <el-button type="primary" class="submit-btn" size="large" @click="handleSubmit">
                    提交简历（生成 Word 文件）
                  </el-button>
                </div>
              </div>
            </el-tab-pane>
      </el-tabs>
    </section>

    <!-- 添加模型弹窗 -->
    <el-dialog v-model="modelDialogVisible" title="添加模型" width="520px" :close-on-click-modal="false">
      <div class="model-dialog">
        <el-form label-position="top">
          <el-form-item label="模型服务商">
            <el-select v-model="modelForm.provider" placeholder="选择模型服务商" @change="onProviderChange">
              <el-option v-for="p in aiProviders" :key="p.label" :label="p.label" :value="p.label" />
            </el-select>
          </el-form-item>
          <el-form-item label="模型">
            <el-input v-model="modelForm.model" placeholder="模型名称，如 deepseek-chat" />
          </el-form-item>
          <el-form-item label="接口地址（Endpoint）">
            <el-input v-model="modelForm.endpoint" placeholder="https://api.deepseek.com/chat/completions" />
          </el-form-item>
          <el-form-item label="API 密钥">
            <el-input v-model="modelForm.apiKey" type="password" show-password placeholder="请输入 API Key" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" class="model-save-btn" @click="saveModelConfig">保存模型</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>

    <!-- AI 分析弹窗 -->
    <el-dialog v-model="aiDialogVisible" title="简历智能分析" width="620px" :close-on-click-modal="false">
      <div class="ai-dialog">
        <div class="ai-target-bar">
          <span class="ai-target-label">分析对象</span>
          <span class="ai-target-name">{{ aiTargetResume?.title || aiTargetResume?.name || '未命名' }}</span>
          <el-tag v-if="modelForm.provider" class="ai-model-tag" effect="plain">{{ modelForm.provider }} · {{ modelForm.model }}</el-tag>
        </div>
        <div v-if="!aiTargetAnalyzed" class="ai-run-row">
          <el-button type="primary" :loading="aiLoading" @click="runAiAnalysis">
            {{ aiLoading ? '分析中...' : '开始分析' }}
          </el-button>
        </div>
        <div v-if="aiLoading" class="ai-streaming">
          <div class="ai-streaming-text">{{ aiStreamText || '正在分析...' }}</div>
          <span class="ai-streaming-cursor"></span>
        </div>
        <div v-if="aiSections.length" class="ai-result">
          <div class="ai-result-header">
            <span>分析结果</span>
            <el-button size="small" text @click="copyAiResult">复制</el-button>
          </div>
          <div class="ai-result-body">
            <div v-for="(sec, i) in aiSections" :key="i" class="ai-section">
              <div class="ai-section-title"><span>{{ sec.title }}</span></div>
              <div class="ai-section-content">{{ sec.content }}</div>
            </div>
          </div>
        </div>
        <div v-else-if="aiResult" class="ai-result">
          <div class="ai-result-header"><span>分析结果</span></div>
          <div class="ai-result-body">{{ aiResult }}</div>
        </div>
      </div>
    </el-dialog>

    <!-- 上传后命名弹窗 -->
    <el-dialog v-model="namingDialogVisible" title="填写简历名称" width="420px" :close-on-click-modal="false" :show-close="false">
      <div class="naming-dialog">
        <p class="naming-hint">请为该简历填写一个名称，作为上传编号</p>
        <el-input v-model="namingInput" placeholder="请输入简历名称（上传编号）" maxlength="50" @keyup.enter="confirmNaming" />
        <div class="naming-actions">
          <el-button type="primary" @click="confirmNaming">确定</el-button>
          <el-button text @click="cancelNaming">取消</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- ===== 修改简历（弹窗） =====
         字段与下方「手动录入」完全一致（13 项），但状态独立：
         关掉弹窗不会影响大表单里已经填了一半的新简历。 -->
    <el-dialog
      v-model="editDialogVisible"
      title="修改简历"
      width="760px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form :model="editForm" label-position="top" class="edit-dialog-form">
        <div class="edit-grid">
          <el-form-item label="姓名"><el-input v-model="editForm.name" placeholder="请输入姓名" /></el-form-item>
          <el-form-item label="性别">
            <el-select v-model="editForm.gender" placeholder="选择性别" style="width: 100%">
              <el-option label="男" value="男" />
              <el-option label="女" value="女" />
            </el-select>
          </el-form-item>
          <el-form-item label="年龄"><el-input v-model="editForm.age" placeholder="年龄" /></el-form-item>
          <el-form-item label="手机号码"><el-input v-model="editForm.phone" placeholder="手机号码" /></el-form-item>
          <el-form-item label="毕业学校" class="edit-span-2">
            <el-input v-model="editForm.school" placeholder="请输入毕业学校" />
          </el-form-item>
          <el-form-item label="求职意向" class="edit-span-2">
            <el-input v-model="editForm.jobIntention" placeholder="如：数据开发工程师" />
          </el-form-item>
        </div>

        <el-form-item label="证件照">
          <div class="photo-upload edit-photo">
            <div class="photo-box press-lg focus-ring" @click="triggerEditPhotoSelect">
              <img v-if="editForm.photo" :src="editForm.photo" class="photo-preview" alt="证件照" />
              <template v-else>
                <el-icon :size="26"><Camera /></el-icon>
                <span class="photo-text">上传证件照</span>
              </template>
            </div>
            <input ref="editPhotoInput" type="file" accept="image/*" style="display:none" @change="handleEditPhotoChange" />
          </div>
        </el-form-item>

        <div class="edit-grid">
          <el-form-item label="个人简介" class="edit-span-2">
            <el-input v-model="editForm.resume" type="textarea" :rows="2" placeholder="请填写个人简介" />
          </el-form-item>
          <el-form-item label="在校经历" class="edit-span-2">
            <el-input v-model="editForm.schoolExperience" type="textarea" :rows="2" placeholder="请填写在校经历" />
          </el-form-item>
          <el-form-item label="工作经历" class="edit-span-2">
            <el-input v-model="editForm.workExperience" type="textarea" :rows="2" placeholder="请填写工作经历" />
          </el-form-item>
          <el-form-item label="项目经历" class="edit-span-2">
            <el-input v-model="editForm.projectExperience" type="textarea" :rows="2" placeholder="请填写项目经历" />
          </el-form-item>
          <el-form-item label="技能熟练度" class="edit-span-2">
            <el-input v-model="editForm.skillProficiency" type="textarea" :rows="2" placeholder="如：Java 熟练 / MySQL 掌握" />
          </el-form-item>
        </div>

        <el-form-item label="自定义模块">
          <div class="edit-modules">
            <div
              v-for="(mod, index) in editForm.customModules"
              :key="mod.id || index"
              class="custom-module-item"
            >
              <el-input v-model="mod.title" placeholder="模块名称（如：获奖证书）" class="module-title-input" />
              <el-input v-model="mod.content" type="textarea" :rows="2" placeholder="模块内容" />
              <el-button
                class="module-remove-btn"
                :icon="Delete"
                circle
                size="small"
                @click="removeEditCustomModule(index)"
              />
            </div>
            <el-button class="add-module-btn" size="small" @click="addEditCustomModule">
              <el-icon><Plus /></el-icon>添加模块
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="submitEditDialog">保存修改</el-button>
      </template>
    </el-dialog>

    <!-- ===== AI 修改简历（弹窗） =====
         模型调用待接入，但入口、要求输入、结果展示与「采纳」落库这条路已通。 -->
    <el-dialog
      v-model="aiEditDialogVisible"
      title="AI 修改简历"
      width="680px"
      :close-on-click-modal="false"
      append-to-body
    >
      <div class="ai-edit">
        <div v-if="aiEditTarget" class="ai-edit-target">
          <span class="ai-edit-name">{{ aiEditTarget.title || aiEditTarget.name || '未命名' }}</span>
          <span class="ai-edit-sub">求职意向：{{ aiEditTarget.jobIntention || '未填写' }}</span>
        </div>

        <el-form label-position="top">
          <el-form-item label="想让 AI 怎么改">
            <el-input
              v-model="aiEditRequirement"
              type="textarea"
              :rows="2"
              placeholder="例如：把工作经历改得突出量化成果，语气再专业一些"
            />
          </el-form-item>
        </el-form>

        <div class="ai-edit-actions">
          <el-button type="primary" :loading="aiEditLoading" @click="startAiEdit">
            <el-icon><MagicStick /></el-icon>开始修改
          </el-button>
          <span class="ai-edit-hint">接口尚未接入，当前只做到入口</span>
        </div>

        <div v-if="aiEditResult" class="ai-edit-result">
          <div class="ai-edit-result-title">AI 修改结果（可直接编辑后再采纳）</div>
          <el-input v-model="aiEditResult" type="textarea" :rows="9" />
        </div>
      </div>

      <template #footer>
        <el-button @click="aiEditDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="aiEditApplying"
          :disabled="!aiEditResult"
          @click="applyAiEdit"
        >
          采纳并覆盖
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Delete, ArrowDown, UploadFilled, FolderOpened, Document,
  Plus, MagicStick, Download, Edit, Camera, User, School, Briefcase, Star, Collection, Setting
} from '@element-plus/icons-vue'
import { getUserItem, setUserItem } from '@/utils/userStorage.js'
import { fetchResumesAPI, saveResumeAPI, importResumesAPI, deleteResumeAPI } from '@/api/index.js'

const fileInput = ref(null)
const photoInput = ref(null)
/* 弹窗里的证件照 input 必须与新建表单的那个分开 ——
   共用同一个 ref 时，后挂载的那个会把它覆盖掉，点「上传证件照」就会弹错文件框 */
const editPhotoInput = ref(null)
const isDragOver = ref(false)
const uploadedFiles = ref([])
const savedResumes = ref([])
const activeTab = ref('upload')
const expandedId = ref(null)
const fileExpandedIndex = ref(null)
/* 「修改简历」弹窗的状态。
   改造前这里是 editingResumeId —— 靠它让下方那个整宽表单在「新建/修改」之间切换。
   现在修改走独立弹窗、大表单只负责新建，那个开关就没有存在意义了。 */
const editDialogVisible = ref(false)
const editSaving = ref(false)
const editTarget = ref(null)

/* 「AI 修改简历」的状态。
   与上面那个手动弹窗是两套独立状态 —— 两者并存，各自不干扰：
   手动弹窗是「你自己改」，这个是「让 AI 改，你过目后再决定要不要采纳」。 */
const aiEditDialogVisible = ref(false)
const aiEditTarget = ref(null)
const aiEditRequirement = ref('')
const aiEditLoading = ref(false)
const aiEditResult = ref('')
const aiEditApplying = ref(false)

const form = reactive({
  name: '',
  gender: '',
  age: '',
  phone: '',
  photo: '',
  school: '',
  resume: '',
  schoolExperience: '',
  workExperience: '',
  projectExperience: '',
  skillProficiency: '',
  jobIntention: '',
  customModules: []
})

/* 弹窗里的表单。字段与下方大表单的 form 一一对应（13 项），
   刻意【不复用同一个对象】：复用的话，关掉弹窗时会把用户已经填了一半的新简历冲掉。 */
const editForm = reactive({
  name: '',
  gender: '',
  age: '',
  phone: '',
  photo: '',
  school: '',
  resume: '',
  schoolExperience: '',
  workExperience: '',
  projectExperience: '',
  skillProficiency: '',
  jobIntention: '',
  customModules: []
})

const STORAGE_KEY = 'saved_resumes'
const UPLOAD_KEY = 'uploaded_files'

const aiDialogVisible = ref(false)
const modelDialogVisible = ref(false)
const aiLoading = ref(false)
const aiResult = ref('')
const aiSections = ref([])
const aiScores = ref(null)
const aiStreamText = ref('')
const aiTargetResume = ref(null)

const aiTargetAnalyzed = computed(() => !!aiTargetResume.value?.aiAnalyzed)

const namingDialogVisible = ref(false)
const namingInput = ref('')
const namingType = ref('file')
const namingPending = ref(null)
const namingQueue = ref([])

const MODEL_KEY = 'ai_model_config'
const modelForm = reactive({
  provider: 'DeepSeek',
  model: 'deepseek-chat',
  endpoint: 'https://api.deepseek.com/chat/completions',
  apiKey: ''
})

const aiProviders = [
  { label: 'DeepSeek', endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' },
  { label: '通义千问', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
  { label: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  { label: 'Kimi (Moonshot)', endpoint: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' }
]

/* ===== 简历的读写路径 =====
   改造前：只读写 localStorage（键名被 userStorage 前缀成 `<用户名>_saved_resumes`）。
   改造后：以服务端为准，首次加载把本地存量迁上去，本地留一份镜像做离线兜底。

   为什么还要留镜像：后端连不上时如果直接显示空列表，用户会以为简历全丢了 ——
   那比报一条错误吓人得多。但镜像【必须跟着服务端走】（每次变更后同步），
   否则会出现「在服务端删光了 → 刷新 → 本地镜像又把它导回去」。
   迁移判断正是靠「服务端空 + 本地非空」这个组合，镜像一旦失真就会重复导入。 */
const readLocalResumes = () => {
  try {
    const raw = getUserItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) || [] : []
  } catch {
    return []
  }
}

const mirrorLocal = () => {
  try {
    setUserItem(STORAGE_KEY, JSON.stringify(savedResumes.value))
  } catch {
    /* 隐私模式下写不进去，不影响主流程 */
  }
}

const loadSavedResumes = async () => {
  const local = readLocalResumes()
  try {
    const { data } = await fetchResumesAPI()
    let list = data.resumes || []
    // 服务端一份都没有、本地却有 → 说明是改造后第一次打开，把本地搬上去。
    // 后端 bulk 是「按 id 去重后追加」，重复调用安全，所以刷新页面多调几次也无妨。
    if (list.length === 0 && local.length > 0) {
      const { data: res } = await importResumesAPI(local)
      if (res.imported > 0) {
        ElMessage.success(`已把本地的 ${res.imported} 份简历同步到服务器`)
        const { data: again } = await fetchResumesAPI()
        list = again.resumes || []
      }
    }
    savedResumes.value = list
    mirrorLocal()
  } catch {
    savedResumes.value = local
    ElMessage.warning('服务器暂时不可用，当前展示本地缓存，改动不会保存')
  }
}

/* 统一的写入口，新建与修改都走它。
   为什么用服务端返回的对象覆盖本地那条：新建时 id 由后端分配（前端不生成），
   字段清洗与 savedAt 也以服务端为准；两边不一致会让「再改一次」变成新增一条。 */
const persistResume = async (resume) => {
  const { data } = await saveResumeAPI(resume)
  const saved = data.resume
  const idx = savedResumes.value.findIndex((r) => r.id === saved.id)
  if (idx >= 0) savedResumes.value[idx] = saved
  else savedResumes.value.unshift(saved)
  mirrorLocal()
  return saved
}

const loadUploadedFiles = () => {
  try {
    const raw = getUserItem(UPLOAD_KEY)
    if (raw) {
      const list = JSON.parse(raw)
      uploadedFiles.value = list.map((f) => ({
        id: f.id || generateId(),
        isFile: true,
        name: f.name || '',
        title: f.title || '',
        size: f.size || 0,
        status: f.status || 'success',
        aiAnalyzed: !!f.aiAnalyzed,
        aiResultText: f.aiResultText || '',
        aiSectionsData: f.aiSectionsData || [],
        aiScoresData: f.aiScoresData || null
      }))
    }
  } catch {
    uploadedFiles.value = []
  }
}

const saveUploadedFiles = () => {
  setUserItem(UPLOAD_KEY, JSON.stringify(uploadedFiles.value))
}

onMounted(() => {
  loadSavedResumes()
  loadUploadedFiles()
  loadModelConfig()
})

const handleBrowse = () => {
  fileInput.value?.click()
}

const handleFileChange = (e) => {
  const files = e.target.files
  if (files.length > 0) {
    addFiles(Array.from(files))
  }
  e.target.value = ''
}

const handleDrop = (e) => {
  isDragOver.value = false
  const files = e.dataTransfer.files
  if (files.length > 0) {
    addFiles(Array.from(files))
  }
}

const addFiles = (files) => {
  const targets = Array.from(files).map((file) => ({
    id: generateId(),
    isFile: true,
    name: file.name,
    title: '',
    size: file.size,
    status: 'success',
    aiAnalyzed: false
  }))
  namingQueue.value = namingQueue.value.concat(targets)
  if (!namingDialogVisible.value) {
    startFileNaming()
  }
}

const startFileNaming = () => {
  const file = namingQueue.value.shift()
  if (!file) return
  namingType.value = 'file'
  namingPending.value = file
  namingInput.value = file.name || ''
  namingDialogVisible.value = true
}

const openManualNaming = (resumeData) => {
  namingType.value = 'manual'
  namingPending.value = resumeData
  namingInput.value = resumeData.name || ''
  namingDialogVisible.value = true
}

const confirmNaming = async () => {
  const name = namingInput.value.trim()
  if (!name) {
    ElMessage.warning('请输入简历名称')
    return
  }
  if (namingType.value === 'file') {
    const file = namingPending.value
    file.title = name
    uploadedFiles.value.push(file)
    saveUploadedFiles()
    ElMessage.success('文件已上传')
  } else if (namingType.value === 'manual') {
    const data = namingPending.value
    data.title = name
    // id 交给后端分配 —— 前端 generateId() 的格式和后端不同，
    // 两边各生成一次就会出现「同一条简历有两个 id」。
    try {
      await persistResume({ ...data, savedAt: Date.now() })
      ElMessage.success('简历已保存，可在左侧记录中下载 Word 文件')
      resetForm()
    } catch (e) {
      ElMessage.error('保存失败：' + (e.response?.data?.detail || e.message))
    }
  }
  namingDialogVisible.value = false
  namingPending.value = null
  if (namingType.value === 'file' && namingQueue.value.length) {
    startFileNaming()
  }
}

const cancelNaming = () => {
  if (namingType.value === 'file' && namingPending.value) {
    const file = namingPending.value
    file.title = file.title || file.name
    uploadedFiles.value.push(file)
    saveUploadedFiles()
  }
  namingDialogVisible.value = false
  namingPending.value = null
  if (namingType.value === 'file' && namingQueue.value.length) {
    startFileNaming()
  }
}

const removeFile = (index) => {
  uploadedFiles.value.splice(index, 1)
  saveUploadedFiles()
}

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const triggerPhotoSelect = () => {
  photoInput.value?.click()
}

const handlePhotoChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    form.photo = reader.result
    ElMessage.success('证件照已上传')
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

const addCustomModule = () => {
  form.customModules.push({ id: generateId(), title: '', content: '' })
}

const removeCustomModule = (index) => {
  form.customModules.splice(index, 1)
}

const handleSubmit = () => {
  if (!form.name && !form.phone) {
    ElMessage.warning('请至少填写姓名或手机号码')
    return
  }

  const resumeData = {
    name: form.name,
    gender: form.gender,
    age: form.age,
    phone: form.phone,
    photo: form.photo,
    school: form.school,
    resume: form.resume,
    schoolExperience: form.schoolExperience,
    workExperience: form.workExperience,
    projectExperience: form.projectExperience,
    skillProficiency: form.skillProficiency,
    jobIntention: form.jobIntention,
    customModules: JSON.parse(JSON.stringify(form.customModules))
  }

  // 新建：先命名，命名弹窗确认后由 confirmNaming 落到服务端。
  // 修改不再走这里 —— 改造前会在上方判断 editingResumeId 决定是「原地更新」还是「新建」，
  // 现在修改由「修改简历」弹窗独立完成，这条路径只剩新建一种。
  openManualNaming(resumeData)
}

const resetForm = () => {
  form.name = ''
  form.gender = ''
  form.age = ''
  form.phone = ''
  form.photo = ''
  form.school = ''
  form.resume = ''
  form.schoolExperience = ''
  form.workExperience = ''
  form.projectExperience = ''
  form.skillProficiency = ''
  form.jobIntention = ''
  form.customModules = []
}

/* ===== 修改简历（弹窗） =====
   改造前「编辑」做的事是：把数据灌进下方那个整宽表单 → 切到「手动录入」标签 →
   提示「已载入简历，修改后点击保存修改即可」，等于让你自己在页面里找路。
   而记录列表在页面顶部、表单在中部，来回滚动很别扭。
   现在改成弹窗，字段与新建表单完全一致（13 项），且【不碰】下方表单的状态，
   关掉弹窗后你已经填了一半的新简历还在。 */
const openEditDialog = (resume) => {
  editTarget.value = resume
  Object.keys(editForm).forEach((k) => {
    const v = resume[k]
    editForm[k] = Array.isArray(v) ? JSON.parse(JSON.stringify(v)) : v ?? ''
  })
  editDialogVisible.value = true
}

const addEditCustomModule = () => {
  editForm.customModules.push({ id: generateId(), title: '', content: '' })
}

const removeEditCustomModule = (index) => {
  editForm.customModules.splice(index, 1)
}

const triggerEditPhotoSelect = () => {
  editPhotoInput.value?.click()
}

const handleEditPhotoChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    editForm.photo = reader.result
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

const submitEditDialog = async () => {
  if (!editForm.name.trim()) {
    ElMessage.warning('姓名不能为空')
    return
  }
  editSaving.value = true
  try {
    await persistResume({
      // 先用原记录铺底：title / savedAt 等 13 项之外的字段靠它保住，
      // 否则后端是「整条替换」，提交时没带上的字段会被清空。
      ...editTarget.value,
      ...editForm,
      id: editTarget.value.id,
      // 简历内容改了，旧的分析结果就过期了 —— 原「编辑」也是这么处理的
      aiAnalyzed: false,
      aiResultText: '',
      aiSectionsData: [],
      aiScoresData: null
    })
    ElMessage.success('简历已更新')
    editDialogVisible.value = false
    expandedId.value = null
  } catch (e) {
    ElMessage.error('保存失败：' + (e.response?.data?.detail || e.message))
  } finally {
    editSaving.value = false
  }
}

/* ===== AI 修改简历 =====
   目前是【占位】：入口、参数、结果展示、采纳落库这条链路都已接好，
   唯独「真正去调模型」那一步没做 —— 等 API 就位后只需替换 startAiEdit 里标注的位置。

   与「智能分析」的区别：分析是【只读】的，产出一份评估文本挂在记录上；
   这个的产出要【写回简历正文】，所以多了一道「先展示、点采纳才覆盖」的手续，
   避免 AI 一返回就直接盖掉用户自己写的内容、还找不回来。 */
const openAiEditDialog = (resume) => {
  aiEditTarget.value = resume
  aiEditRequirement.value = ''
  aiEditResult.value = ''
  aiEditDialogVisible.value = true
}

const startAiEdit = async () => {
  if (!aiEditTarget.value) return
  if (!aiEditRequirement.value.trim()) {
    ElMessage.warning('请先说明想让 AI 怎么改')
    return
  }
  aiEditLoading.value = true
  try {
    // ===== 接入 API 的位置 =====
    // 请求体大致需要：简历全文（aiEditTarget.value）+ 用户要求（aiEditRequirement.value）。
    // 拿到返回后把「修改后的内容」赋给 aiEditResult.value 即可，
    // 下面的展示与采纳逻辑不用改。
    //
    // 两点提醒：
    //   1) 模型调用通常要几十秒，必须把 aiEditLoading 放在 finally 里复位，
    //      否则中途失败按钮会一直转，用户只能刷新页面；
    //   2) 若考虑用流式输出，这里要改成边收边追加到 aiEditResult，
    //      直接赋值会让用户盯着空白等完整结果。
    ElMessage.info('AI 修改功能开发中，接口接入后即可使用')
  } finally {
    aiEditLoading.value = false
  }
}

const applyAiEdit = async () => {
  if (!aiEditResult.value.trim()) {
    ElMessage.warning('还没有可采纳的内容')
    return
  }
  aiEditApplying.value = true
  try {
    await persistResume({
      ...aiEditTarget.value,
      // 占位约定：结果整体写进「个人简介」。
      // 接入 API 后若返回的是结构化字段，这里应改成「按字段合并」而不是整段覆盖。
      resume: aiEditResult.value,
      // 正文变了，旧的分析就过期了（与手动修改保持一致）
      aiAnalyzed: false,
      aiResultText: '',
      aiSectionsData: [],
      aiScoresData: null
    })
    ElMessage.success('已采纳 AI 修改')
    aiEditDialogVisible.value = false
    expandedId.value = null
  } catch (e) {
    ElMessage.error('保存失败：' + (e.response?.data?.detail || e.message))
  } finally {
    aiEditApplying.value = false
  }
}

const generateWordHtml = (resume) => {
  const photoHtml = resume.photo
    ? `<img src="${resume.photo}" style="width:90px;height:120px;object-fit:cover;" />`
    : ''
  const customHtml = (resume.customModules || [])
    .filter((m) => m.title || m.content)
    .map((m) => `<h3>${m.title || '自定义模块'}</h3><p>${m.content || ''}</p>`)
    .join('')

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>简历</title></head>
<body style="font-family:宋体,SimSun;font-size:14px;line-height:1.8;color:#333;">
  <h1 style="text-align:center;">个人简历</h1>
  <div style="overflow:hidden;">
    <div style="float:left;">
      <p><strong>姓名：</strong>${resume.name || ''}</p>
      <p><strong>性别：</strong>${resume.gender || ''}　<strong>年龄：</strong>${resume.age || ''}</p>
      <p><strong>手机：</strong>${resume.phone || ''}</p>
    </div>
    <div style="float:right;">${photoHtml}</div>
  </div>
  <h3>毕业学校</h3><p>${resume.school || ''}</p>
  <h3>个人简介</h3><p>${resume.resume || ''}</p>
  <h3>在校经历</h3><p>${resume.schoolExperience || ''}</p>
  <h3>工作经历</h3><p>${resume.workExperience || ''}</p>
  <h3>项目经历</h3><p>${resume.projectExperience || ''}</p>
  <h3>技能熟练度</h3><p>${resume.skillProficiency || ''}</p>
  <h3>求职意向</h3><p>${resume.jobIntention || ''}</p>
  ${customHtml}
</body></html>`
}

const downloadWord = (resume) => {
  const html = generateWordHtml(resume)
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${resume.name || '简历'}_${resume.id}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('Word 文件已生成并下载')
}

const openAiAnalysis = (resume) => {
  aiTargetResume.value = resume
  if (resume?.aiAnalyzed && resume.aiResultText) {
    aiResult.value = resume.aiResultText
    aiSections.value = resume.aiSectionsData || []
    aiScores.value = resume.aiScoresData || null
  } else {
    aiResult.value = ''
    aiSections.value = []
    aiScores.value = null
  }
  aiDialogVisible.value = true
}

const openModelConfig = () => {
  modelDialogVisible.value = true
}

const loadModelConfig = () => {
  try {
    const raw = getUserItem(MODEL_KEY)
    if (raw) {
      Object.assign(modelForm, JSON.parse(raw))
    }
  } catch {
    /* 忽略解析错误，使用默认配置 */
  }
}

const saveModelConfig = () => {
  if (!modelForm.provider) {
    ElMessage.warning('请选择模型服务商')
    return
  }
  if (!modelForm.apiKey) {
    ElMessage.warning('请填写 API 密钥')
    return
  }
  setUserItem(MODEL_KEY, JSON.stringify({
    provider: modelForm.provider,
    model: modelForm.model,
    endpoint: modelForm.endpoint,
    apiKey: modelForm.apiKey
  }))
  modelDialogVisible.value = false
  ElMessage.success('模型配置已保存')
}

const onProviderChange = (label) => {
  const p = aiProviders.find((x) => x.label === label)
  if (p) {
    modelForm.endpoint = p.endpoint
    modelForm.model = p.model
  }
}

const buildResumeText = (resume) => {
  if (resume?.isFile) {
    return `上传的简历文件：${resume.title || resume.name || '未命名'}\n（说明：文件内容未存储在浏览器中，分析基于文件名）`
  }
  const lines = [
    `姓名：${resume.name || ''}`,
    `性别：${resume.gender || ''}`,
    `年龄：${resume.age || ''}`,
    `手机：${resume.phone || ''}`,
    `毕业学校：${resume.school || ''}`,
    `个人简介：${resume.resume || ''}`,
    `在校经历：${resume.schoolExperience || ''}`,
    `工作经历：${resume.workExperience || ''}`,
    `项目经历：${resume.projectExperience || ''}`,
    `技能熟练度：${resume.skillProficiency || ''}`,
    `求职意向：${resume.jobIntention || ''}`
  ]
  if (resume.customModules && resume.customModules.length) {
    resume.customModules.forEach((m) => {
      if (m.title || m.content) lines.push(`${m.title || '自定义模块'}：${m.content || ''}`)
    })
  }
  return lines.join('\n')
}

const AI_SYSTEM_PROMPT = `你是资深 HR 与职业规划师。请严格按以下格式对简历做专业分析，直接输出分析内容，禁止输出任何开头语、客套话或确认语（例如"好的""收到您的请求"等一律不要出现）。

【简历优势分析】
- 列出 2-3 条核心优势

【核心不足】
- 列出 2-3 条核心不足

【岗位匹配度分析】
- 简要说明与目标岗位的匹配程度

【改进建议】
- 给出 2-3 条可操作建议

评分：优势 XX，不足 XX，岗位匹配 XX（XX 为 0-100 的整数）

要求：全篇控制在 20-30 行以内，每个模块只挑重点输出。`

const parseAiResult = (text) => {
  const sections = []
  let current = null
  const lines = (text || '').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    const m = trimmed.match(/^【(.+?)】$/)
    if (m) {
      if (current) sections.push(current)
      current = { title: m[1].trim(), content: [] }
    } else if (/^评分[:：]/.test(trimmed)) {
      continue
    } else if (current) {
      current.content.push(line)
    }
  }
  if (current) sections.push(current)
  return sections.map((s) => ({ title: s.title, content: s.content.join('\n').trim() }))
}

const parseAiScores = (text) => {
  const line = (text || '').split('\n').find((l) => /^评分[:：]/.test(l.trim()))
  if (!line) return null
  const pick = (label) => {
    const m = line.match(new RegExp(label + '\\s*(\\d{1,3})'))
    return m ? parseInt(m[1], 10) : 0
  }
  return { 优势: pick('优势'), 不足: pick('不足'), 岗位匹配: pick('岗位匹配') }
}

const AI_SCORES_KEY = 'ai_analysis_records'
const saveAiScores = (id, name, scores) => {
  try {
    const raw = getUserItem(AI_SCORES_KEY)
    const list = raw ? JSON.parse(raw) : []
    list.push({ id, name, scores, time: Date.now() })
    setUserItem(AI_SCORES_KEY, JSON.stringify(list.slice(-50)))
  } catch {
    /* 忽略存储错误 */
  }
}

const readStreamResponse = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (!response.body || !contentType.includes('text/event-stream')) {
    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let fullText = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || ''
        if (delta) {
          fullText += delta
          aiStreamText.value = fullText
        }
      } catch {
        /* 忽略空行或非 JSON 数据 */
      }
    }
  }
  return fullText
}

const runAiAnalysis = async () => {
  if (!modelForm.apiKey) {
    ElMessage.warning('请先点击"添加模型"设置 API 密钥')
    return
  }
  if (!modelForm.endpoint) {
    ElMessage.warning('请填写接口地址')
    return
  }
  aiLoading.value = true
  aiResult.value = ''
  aiStreamText.value = ''
  aiSections.value = []
  aiScores.value = null
  try {
    const resumeText = buildResumeText(aiTargetResume.value)
    const response = await fetch(modelForm.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelForm.apiKey}`
      },
      body: JSON.stringify({
        model: modelForm.model,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: resumeText }
        ],
        temperature: 0.7,
        stream: true
      })
    })
    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errText}`)
    }
    const raw = await readStreamResponse(response)
    aiResult.value = raw
    aiSections.value = parseAiResult(raw)
    aiScores.value = parseAiScores(raw)
    const target = aiTargetResume.value
    const resumeName = target?.title || target?.name || '未命名'
    if (aiScores.value) {
      saveAiScores(target?.id, resumeName, aiScores.value)
    }
    if (target?.isFile) {
      const idx = uploadedFiles.value.findIndex((f) => f.id === target.id)
      if (idx !== -1) {
        uploadedFiles.value[idx].aiAnalyzed = true
        uploadedFiles.value[idx].aiResultText = raw
        uploadedFiles.value[idx].aiSectionsData = aiSections.value
        uploadedFiles.value[idx].aiScoresData = aiScores.value
      }
      saveUploadedFiles()
    } else if (target?.id) {
      const idx = savedResumes.value.findIndex((r) => r.id === target.id)
      if (idx !== -1) {
        savedResumes.value[idx].aiAnalyzed = true
        savedResumes.value[idx].aiResultText = raw
        savedResumes.value[idx].aiSectionsData = aiSections.value
        savedResumes.value[idx].aiScoresData = aiScores.value
      }
      // 分析结果也挂在简历记录上，同样要落到服务端。
      // 这里【不 await】：分析正文已经拿到并展示了，同步失败只提示一声，
      // 不该因为存不上去就把已经出来的结果吞掉。
      persistResume(savedResumes.value[idx]).catch(() => {
        ElMessage.warning('分析结果未能同步到服务器')
      })
    }
  } catch (err) {
    aiResult.value = `分析失败：${err.message}`
    aiSections.value = []
    aiScores.value = null
  } finally {
    aiLoading.value = false
  }
}

const copyAiResult = async () => {
  try {
    await navigator.clipboard.writeText(aiResult.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.warning('复制失败，请手动选择复制')
  }
}

const toggleExpand = (id) => {
  expandedId.value = expandedId.value === id ? null : id
}

const toggleFileExpand = (index) => {
  fileExpandedIndex.value = fileExpandedIndex.value === index ? null : index
}

const deleteResume = (id) => {
  ElMessageBox.confirm('确定要删除该简历记录吗？', '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteResumeAPI(id)
      savedResumes.value = savedResumes.value.filter((r) => r.id !== id)
      mirrorLocal()
      ElMessage.success('已删除')
    } catch (e) {
      ElMessage.error('删除失败：' + (e.response?.data?.detail || e.message))
    }
  }).catch(() => {})
}

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatDate = (timestamp) => {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}
</script>

<style scoped>
.resume-page {
  width: 100%;
  max-width: 1240px;
}

.page-header {
  margin-bottom: 28px;
}

.page-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 600;
  letter-spacing: -0.374px;
  color: var(--ink);
}

.page-subtitle {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--ink-muted-48);
}

/* ===== 两栏布局 ===== */
.resume-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.saved-section {
  flex: 0 0 320px;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  padding-right: 4px;
}

@media (max-width: 1180px) {
  .resume-layout {
    flex-direction: column;
  }
  .saved-section {
    flex: none;
    width: 100%;
    max-height: 320px;
  }
}

.upload-section {
  flex: 1;
  min-width: 0;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
}

.section-heading-text {
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
}

.section-count {
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  background: var(--canvas-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.saved-list {
  display: flex;
  flex-direction: column;
}

.resume-card {
  border-radius: var(--rad-block);
  padding: 0;
  background: var(--inset-glass);
  box-shadow: inset 0 1px 0 var(--inset-sheen);
  border: var(--card-border);
  margin-bottom: 12px;
  cursor: pointer;
  transition: var(--slide-trans);
  overflow: hidden;
}

.resume-card:hover {
  border-color: var(--hairline-strong);
}

.resume-card.is-expanded {
  border-color: var(--primary);
}

.resume-card-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
}

.resume-card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.resume-card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}

.resume-card-detail {
  font-size: 13px;
  color: var(--ink-muted-48);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume-card-date {
  font-size: 11px;
  color: var(--ink-muted-48);
}

.resume-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.expand-arrow {
  color: var(--ink-muted-48);
  font-size: 14px;
  transition: transform var(--dur-base) var(--ease-out);
}

.expand-arrow.rotated {
  transform: rotate(180deg);
  color: var(--primary);
}

.small-arrow {
  font-size: 12px;
  flex-shrink: 0;
}

.resume-card-detail-panel {
  padding: 0 18px 16px;
  border-top: 1px solid var(--hairline);
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: slideDown 0.25s ease;
}

@keyframes slideDown {
  from { opacity: 0; }
  to { opacity: 1; }
}

.detail-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.detail-label {
  font-size: 12px;
  font-weight: 600;
  min-width: 62px;
  flex-shrink: 0;
  padding-top: 1px;
  color: var(--ink-muted-48);
}

.detail-value {
  font-size: 13px;
  color: var(--ink-muted-80);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-value-strong {
  font-weight: 600;
  color: var(--ink);
}

.detail-basic {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 4px;
}

.detail-photo {
  width: 70px;
  height: 90px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--hairline);
  flex-shrink: 0;
}

.detail-basic-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  padding: 48px 0;
  color: var(--ink-muted-48);
  font-size: 14px;
}

.uploaded-files-sub {
  margin-top: 20px;
}

.sub-heading {
  margin-bottom: 10px;
}

.uploaded-file-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--rad-block);
  background: var(--inset-glass);
  box-shadow: inset 0 1px 0 var(--inset-sheen);
  border: var(--card-border);
  margin-bottom: 10px;
  transition: var(--slide-trans);
}

.uploaded-file-card:hover {
  border-color: var(--hairline-strong);
}

.uploaded-file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.local-file-badge {
  width: fit-content;
  border-radius: 9999px;
  color: var(--primary);
  background: var(--page-accent-wash);
  border-color: var(--page-accent-wash-strong);
  font-weight: 600;
}

.content-card {
  border-radius: var(--rad-block);
  padding: 24px;
  background: var(--canvas);
  border: var(--card-border);
}

.resume-tabs {
  margin-top: 4px;
}

.resume-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 400;
  color: var(--ink-muted-48);
}

.resume-tabs :deep(.el-tabs__item.is-active) {
  font-weight: 600;
  color: var(--primary);
}

.resume-tabs :deep(.el-tabs__active-bar) {
  height: 2px;
  border-radius: 2px;
  background: var(--primary);
}

.resume-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: var(--hairline);
}

/* ===== 拖拽上传区 ===== */
.upload-zone {
  border: 1px dashed var(--hairline-strong);
  border-radius: var(--rad-block);
  padding: 24px 20px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out);
  background: var(--canvas-parchment);
}

.upload-zone.is-dragover {
  border-color: var(--primary);
  background: var(--page-accent-wash);
}

.upload-icon-ring {
  width: 72px;
  height: 72px;
  margin: 0 auto 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  background: var(--page-accent-wash);
}

.upload-text {
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 8px;
}

.upload-hint {
  font-size: 13px;
  color: var(--ink-muted-48);
  margin: 0;
}

.format-badges {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin: 18px 0 22px;
}

.format-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-muted-80);
  padding: 4px 12px;
  border-radius: 9999px;
  background: var(--canvas-2);
  border: 1px solid var(--hairline);
}

.upload-btn {
  padding: 0 28px;
}

/* 蓝色主按钮工具类（本地覆盖，用于非 primary 的 el-button） */
.action-btn-blue {
  color: var(--accent);
  font-weight: 400;
  border: 1px solid var(--accent);
  background: transparent;
  border-radius: 9999px;
}

.action-btn-blue:hover {
  color: var(--on-primary);
  background: var(--primary);
  border-color: var(--primary);
}

.model-config-btn {
  margin-left: auto;
  color: var(--accent);
  border: 1px solid var(--accent);
  background: transparent;
  border-radius: 9999px;
}

.model-config-btn:hover {
  color: var(--on-primary);
  background: var(--primary);
}

.danger-btn {
  color: var(--danger);
  font-weight: 400;
  border: 1px solid var(--danger-line);
  background: transparent;
  border-radius: 8px;
}

.danger-btn:hover {
  color: var(--on-danger);
  background: var(--danger);
  border-color: var(--danger);
}

/* ===== 已上传文件列表 ===== */
.file-list {
  margin-top: 24px;
}

.file-list-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--canvas-parchment);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color var(--dur-base) var(--ease-out);
}

.file-item:hover {
  border-color: var(--hairline-strong);
}

.file-item.is-expanded {
  border-color: var(--primary);
}

.file-type-tile {
  width: 42px;
  height: 42px;
  border-radius: var(--rad-block);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  background: var(--page-accent-wash);
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}

.file-detail {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  color: var(--ink);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 12px;
  color: var(--ink-muted-48);
}

.file-status-tag {
  flex-shrink: 0;
  color: var(--primary);
  background: var(--page-accent-wash);
  border-color: var(--page-accent-wash-strong);
  border-radius: 9999px;
  font-weight: 600;
}

.file-remove-btn {
  color: var(--ink-muted-48);
  flex-shrink: 0;
}

.file-remove-btn:hover {
  color: var(--danger);
  background: var(--danger-wash);
}

.file-detail-panel {
  padding: 12px 16px;
  background: var(--canvas-parchment);
  border-radius: var(--rad-block);
  margin-bottom: 8px;
  border: 1px solid var(--hairline);
  animation: slideDown 0.25s ease;
}

.file-detail-panel p {
  margin: 4px 0;
  font-size: 13px;
  color: var(--ink-muted-80);
}

.file-note {
  color: var(--ink-muted-48) !important;
  font-size: 12px !important;
  font-style: italic;
}

/* ===== 手动录入表单 ===== */
.manual-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--hairline);
}

.section-title-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  background: var(--page-accent-wash);
}

.section-title-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}

.add-module-btn {
  margin-left: auto;
  color: var(--accent);
  border: 1px solid var(--accent);
  background: transparent;
  border-radius: 9999px;
}

.add-module-btn:hover {
  color: var(--on-primary);
  background: var(--primary);
}

.form-top {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.basic-fields {
  flex: 1;
  min-width: 0;
}

.form-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px 16px;
}

.form-row .el-form-item {
  margin-bottom: 0;
}

.form-row :deep(.el-form-item__content) {
  min-width: 0;
}

.form-row :deep(.el-input),
.form-row :deep(.el-select) {
  width: 100%;
}

.form-row :deep(.el-form-item__label) {
  width: 68px;
  flex-shrink: 0;
  justify-content: flex-end;
}

.manual-form :deep(.el-form-item__label) {
  font-weight: 600;
  font-size: 13px;
  color: var(--ink-muted-80);
  padding-right: 10px;
}

.manual-form :deep(.el-input__wrapper),
.manual-form :deep(.el-textarea__inner),
.manual-form :deep(.el-select__wrapper) {
  border-radius: 8px;
  transition: var(--slide-trans);
}

.photo-upload {
  flex-shrink: 0;
}

.photo-box {
  width: 88px;
  height: 112px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--ink-muted-48);
  cursor: pointer;
  overflow: hidden;
  border: 1px dashed var(--hairline-strong);
  background: var(--canvas-parchment);
  transition: border-color var(--dur-base) var(--ease-out);
}

.photo-box:hover {
  border-color: var(--primary);
}

.photo-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-text {
  font-size: 12px;
  font-weight: 600;
}

.custom-module-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 14px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--canvas-parchment);
}

.custom-module-item .module-title-input {
  width: 200px;
  flex-shrink: 0;
}

.custom-module-item .el-textarea {
  flex: 1;
}

.module-remove-btn {
  color: var(--danger);
  flex-shrink: 0;
}

.module-remove-btn:hover {
  color: var(--on-danger);
  background: var(--danger);
}

.submit-row {
  margin-top: 4px;
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 17px;
}

/* ===== 弹窗 ===== */
.model-dialog :deep(.el-input__wrapper),
.model-dialog :deep(.el-select__wrapper) {
  border-radius: 8px;
}

.model-dialog :deep(.el-select) {
  width: 100%;
}

.model-dialog :deep(.el-form-item__label) {
  font-weight: 600;
  font-size: 13px;
  color: var(--ink-muted-80);
}

.model-save-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
}

.naming-dialog {
  padding: 4px 0;
}

.naming-hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--ink-muted-48);
}

.naming-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.ai-target-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--canvas-parchment);
  border: 1px solid var(--hairline);
  margin-bottom: 16px;
}

.ai-target-label {
  font-size: 13px;
  color: var(--ink-muted-48);
  flex-shrink: 0;
}

.ai-target-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}

.ai-model-tag {
  margin-left: auto;
  border-radius: 9999px;
  color: var(--primary);
  background: var(--page-accent-wash);
  border-color: var(--page-accent-wash-strong);
  font-weight: 600;
}

.ai-run-row {
  margin-bottom: 8px;
}

.ai-streaming {
  margin-top: 12px;
  min-height: 120px;
  max-height: 320px;
  overflow-y: auto;
  padding: 16px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--canvas-parchment);
}

.ai-streaming-text {
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-muted-80);
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-streaming-cursor {
  display: inline-block;
  width: 8px;
  height: 16px;
  margin-left: 2px;
  vertical-align: -2px;
  background: var(--primary);
  border-radius: 2px;
  animation: ai-blink 0.9s step-end infinite;
}

@keyframes ai-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.ai-result {
  margin-top: 12px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--canvas-parchment);
  overflow: hidden;
}

.ai-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--page-accent-wash);
  border-bottom: 1px solid var(--hairline);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.ai-result-header :deep(.el-button) {
  color: var(--primary);
  font-weight: 600;
}

.ai-result-body {
  padding: 16px;
  max-height: 320px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-muted-80);
  white-space: pre-wrap;
  word-break: break-word;
  background: transparent;
}

.ai-section {
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
}

.ai-section:last-child {
  margin-bottom: 0;
}

.ai-section-title {
  padding: 9px 14px;
  background: var(--page-accent-wash);
  border-bottom: 1px solid var(--page-accent-wash);
}

.ai-section-title span {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
}

.ai-section-content {
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-muted-80);
  white-space: pre-wrap;
  word-break: break-word;
  background: transparent;
}

/* =====================================================================
   重排：拍平进工作台三列网格，卡片接管毛玻璃底
   ===================================================================== */
.resume-flat {
  display: contents;
}

/* 三块卡片：统一垂直节奏，取消旧的两栏约束 */
.saved-section,
.uploaded-section,
.upload-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: none;
  max-height: none;
  overflow: visible;
  padding-right: 0;
  min-width: 0;
}

/* 眉题下方交给 gap 控制间距 */
.saved-section .section-heading,
.uploaded-section .section-heading,
.upload-section .section-heading {
  margin-bottom: 0;
}

/* 整宽卡内的字段改双列，压缩纵向长度 */
.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 22px;
}
.field-grid .el-form-item {
  margin-bottom: 14px;
  min-width: 0;
}

/* 卡内小块改用次级底色，避免与毛玻璃卡叠两层描边 */
.saved-section .resume-card,
.uploaded-section .uploaded-file-card {
  background: var(--canvas-2);
}

/* Tab 与表单撑满卡宽 */
.upload-section .resume-tabs,
.upload-section .manual-form,
.upload-section .upload-zone {
  width: 100%;
}

@media (max-width: 1100px) {
  .field-grid,
  .form-row {
    grid-template-columns: minmax(0, 1fr);
  }
  .form-top {
    flex-direction: column;
  }
}

/* ===== 修改简历弹窗 =====
   只加弹窗专属的几条；输入框、证件照、自定义模块的样式复用下方大表单那套
   （.photo-box / .custom-module-item / .add-module-btn 等），不重写一遍 ——
   写两套的结果必然是哪天改了一处、另一处忘掉。 */
.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
/* 长文本字段占满整行 —— 塞进半栏就只剩十几个字符的可视宽度 */
.edit-grid .edit-span-2 {
  grid-column: span 2;
}
.edit-photo {
  margin-bottom: 2px;
}
.edit-modules {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
@media (max-width: 760px) {
  .edit-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .edit-grid .edit-span-2 {
    grid-column: span 1;
  }
}

/* ===== AI 修改简历弹窗 ===== */
.ai-edit-target {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--hairline);
}
.ai-edit-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.ai-edit-sub {
  font-size: 12.5px;
  color: var(--ink-muted-48);
}
.ai-edit-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ai-edit-hint {
  font-size: 12px;
  color: var(--ink-muted-48);
}
.ai-edit-result {
  margin-top: 16px;
}
.ai-edit-result-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 8px;
}
</style>
