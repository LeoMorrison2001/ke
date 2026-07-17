<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

type DialogType = 'add' | 'edit' | 'delete'
type UserGender = 'male' | 'female'

interface UserRecord {
  id: number
  name: string
  gender: UserGender
  birthDate: string
  preferredName: string
  isActive: boolean
}

interface UserInput {
  name: string
  gender: UserGender
  birthDate: string
  preferredName: string
}

const router = useRouter()
const users = ref<UserRecord[]>([])
const dialogType = ref<DialogType>()
const editingUser = ref<UserRecord>()
const deletingUser = ref<UserRecord>()
const isWorking = ref(false)
const errorMessage = ref('')
const form = reactive<UserInput>({
  name: '',
  preferredName: '',
  gender: 'male',
  birthDate: ''
})

const dialogTitle = computed(() => {
  if (dialogType.value === 'add') return '添加用户'
  if (dialogType.value === 'edit') return '编辑用户'
  return '删除用户'
})

const loadUsers = async (): Promise<void> => {
  users.value = await window.api.user.list()
}

const openAddDialog = (): void => {
  errorMessage.value = ''
  dialogType.value = 'add'
}

const openEditDialog = (user: UserRecord): void => {
  errorMessage.value = ''
  editingUser.value = user
  Object.assign(form, {
    name: user.name,
    preferredName: user.preferredName,
    gender: user.gender,
    birthDate: user.birthDate
  })
  dialogType.value = 'edit'
}

const openDeleteDialog = (user: UserRecord): void => {
  errorMessage.value = ''
  deletingUser.value = user
  dialogType.value = 'delete'
}

const closeDialog = (force = false): void => {
  if (isWorking.value && !force) return
  dialogType.value = undefined
  editingUser.value = undefined
  deletingUser.value = undefined
  errorMessage.value = ''
}

const dismissDialog = (): void => closeDialog()

const enterOnboarding = async (): Promise<void> => {
  await router.push({ name: 'onboarding', query: { mode: 'add-user' } })
}

const saveUser = async (): Promise<void> => {
  if (!editingUser.value || isWorking.value) return
  isWorking.value = true
  errorMessage.value = ''
  try {
    await window.api.user.update(editingUser.value.id, {
      name: form.name,
      preferredName: form.preferredName,
      gender: form.gender,
      birthDate: form.birthDate
    })
    await loadUsers()
    closeDialog(true)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败，请稍后重试。'
  } finally {
    isWorking.value = false
  }
}

const switchUser = async (user: UserRecord): Promise<void> => {
  if (user.isActive || isWorking.value) return
  isWorking.value = true
  errorMessage.value = ''
  try {
    await window.api.user.switch(user.id)
    await loadUsers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '切换用户失败，请稍后重试。'
  } finally {
    isWorking.value = false
  }
}

const deleteUser = async (): Promise<void> => {
  if (!deletingUser.value || isWorking.value) return
  isWorking.value = true
  errorMessage.value = ''
  try {
    await window.api.user.delete(deletingUser.value.id)
    await loadUsers()
    closeDialog(true)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除用户失败，请稍后重试。'
  } finally {
    isWorking.value = false
  }
}

onMounted(() => {
  void loadUsers()
})
</script>

<template>
  <div class="user-information">
    <header class="user-information__toolbar">
      <button class="primary-button" type="button" @click="openAddDialog">添加用户</button>
    </header>

    <p v-if="errorMessage" class="page-error">{{ errorMessage }}</p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>姓名</th>
            <th>称呼</th>
            <th>性别</th>
            <th>出生日期</th>
            <th>状态</th>
            <th class="actions-column">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.name }}</td>
            <td>{{ user.preferredName }}</td>
            <td>{{ user.gender === 'male' ? '男' : '女' }}</td>
            <td>{{ user.birthDate }}</td>
            <td>
              <span :class="['status', { active: user.isActive }]">
                {{ user.isActive ? '当前使用中' : '未启用' }}
              </span>
            </td>
            <td class="row-actions">
              <button type="button" @click="openEditDialog(user)">编辑</button>
              <button :disabled="user.isActive" type="button" @click="openDeleteDialog(user)">
                删除
              </button>
              <button :disabled="user.isActive" type="button" @click="switchUser(user)">
                {{ user.isActive ? '当前用户' : '切换' }}
              </button>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td class="empty-cell" colspan="6">暂无用户</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialogType" class="dialog-backdrop" @click.self="dismissDialog">
      <section class="dialog" :aria-label="dialogTitle" role="dialog" aria-modal="true">
        <h2>{{ dialogTitle }}</h2>

        <template v-if="dialogType === 'add'">
          <p>将会进入引导页面，完成信息填写后创建新用户，并自动切换到该用户。</p>
          <div class="dialog-actions">
            <button class="outline-button" type="button" @click="dismissDialog">取消</button>
            <button class="primary-button" type="button" @click="enterOnboarding">进入引导</button>
          </div>
        </template>

        <form v-else-if="dialogType === 'edit'" @submit.prevent="saveUser">
          <label>
            姓名
            <input v-model="form.name" maxlength="40" required />
          </label>
          <label>
            称呼
            <input v-model="form.preferredName" maxlength="40" required />
          </label>
          <label>
            性别
            <select v-model="form.gender">
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
          </label>
          <label>
            出生日期
            <input v-model="form.birthDate" required type="date" />
          </label>
          <p v-if="errorMessage" class="dialog-error">{{ errorMessage }}</p>
          <div class="dialog-actions">
            <button class="outline-button" type="button" @click="dismissDialog">取消</button>
            <button :disabled="isWorking" class="primary-button" type="submit">
              {{ isWorking ? '保存中…' : '保存' }}
            </button>
          </div>
        </form>

        <template v-else>
          <p>
            删除“{{ deletingUser?.name }}”会永久清除其对话、记忆和资料变更记录，此操作不可恢复。
          </p>
          <p v-if="errorMessage" class="dialog-error">{{ errorMessage }}</p>
          <div class="dialog-actions">
            <button class="outline-button" type="button" @click="dismissDialog">取消</button>
            <button :disabled="isWorking" class="danger-button" type="button" @click="deleteUser">
              {{ isWorking ? '删除中…' : '确认删除' }}
            </button>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.user-information {
  width: 100%;
  min-height: 100%;
}

.user-information__toolbar {
  display: flex;
  padding: 18px 20px 12px;
}

.primary-button,
.outline-button,
.danger-button,
.row-actions button {
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  border-radius: 8px;
}

.primary-button,
.outline-button,
.danger-button {
  height: 34px;
  padding: 0 12px;
}

.primary-button {
  color: #fff;
  border: 1px solid #3d8058;
  background: #3d8058;
}

.primary-button:hover {
  background: #34704c;
}

.outline-button {
  color: #4c596c;
  border: 1px solid #dde1e7;
  background: #fff;
}

.outline-button:hover {
  background: #f7f8fa;
}

.danger-button {
  color: #fff;
  border: 1px solid #bf4646;
  background: #bf4646;
}

.page-error {
  margin: 0 20px 12px;
  color: #c44040;
  font-size: 13px;
}

.table-wrap {
  box-sizing: border-box;
  width: 100%;
  padding: 0 20px 20px;
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 760px;
  border-spacing: 0;
  color: #4c596c;
  font-size: 13px;
  border: 1px solid #e3e6ea;
  border-radius: 10px;
}

th,
td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid #edf0f2;
}

th {
  color: #667085;
  font-weight: 600;
  background: #f8f9fa;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.actions-column {
  width: 180px;
}

.status {
  color: #8993a1;
}

.status.active {
  color: #28704a;
  font-weight: 600;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.row-actions button {
  padding: 0;
  color: #4c596c;
  border: 0;
  background: transparent;
}

.row-actions button:hover {
  color: #28704a;
}

.row-actions button:disabled {
  color: #aeb7c3;
  cursor: not-allowed;
}

.empty-cell {
  padding: 30px;
  color: #8993a1;
  text-align: center;
}

.dialog-backdrop {
  position: fixed;
  z-index: 10;
  inset: 0;
  display: grid;
  padding: 20px;
  place-items: center;
  background: rgb(15 23 42 / 35%);
}

.dialog {
  box-sizing: border-box;
  width: min(100%, 400px);
  padding: 22px;
  color: #2c3544;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 16px 40px rgb(15 23 42 / 20%);
}

h2,
p {
  margin: 0;
}

h2 {
  font-size: 16px;
}

.dialog > p {
  margin-top: 10px;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

form {
  display: grid;
  margin-top: 16px;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  color: #4c596c;
  font-size: 13px;
}

input,
select {
  box-sizing: border-box;
  width: 100%;
  height: 36px;
  padding: 0 10px;
  color: #2c3544;
  font: inherit;
  font-size: 13px;
  border: 1px solid #dde1e7;
  border-radius: 8px;
  background: #fff;
}

.dialog-error {
  color: #c44040;
  font-size: 13px;
}

.dialog-actions {
  display: flex;
  margin-top: 20px;
  gap: 10px;
  justify-content: flex-end;
}

:global(html[data-theme='dark']) table {
  color: #d8dee8;
  border-color: #303030;
}

:global(html[data-theme='dark']) th {
  color: #aeb7c3;
  background: #202020;
}

:global(html[data-theme='dark']) th,
:global(html[data-theme='dark']) td {
  border-color: #303030;
}

:global(html[data-theme='dark']) .outline-button,
:global(html[data-theme='dark']) input,
:global(html[data-theme='dark']) select,
:global(html[data-theme='dark']) .dialog {
  color: #d8dee8;
  border-color: #303030;
  background: #181818;
}

:global(html[data-theme='dark']) .dialog > p,
:global(html[data-theme='dark']) label,
:global(html[data-theme='dark']) .row-actions button {
  color: #aeb7c3;
}

:global(html[data-theme='dark']) .outline-button:hover {
  background: #303030;
}
</style>
