<script setup lang="ts">
const jiraUrl = 'https://jira.nefer.com.tw/browse/'

const props = defineProps<{
  order: Order
}>()

const emit = defineEmits<{
  (event: 'edit', newContent: {
    oldOrderNo: string,
    orderNo: string,
    title: string,
    done: boolean,
  }): void,
  (event: 'toggleDone', orderNo: string): void,
  (event: 'mark', orderNo: string): void
}>()

const inputField = ref<HTMLInputElement | null>(null)
const dragItem = ref<HTMLDivElement | null>(null)
const editing = ref(false)
const currentText = ref(`${props.order.orderNo} ${props.order.title}`)

function startEditing() {
  editing.value = true

  nextTick(() => {
    inputField.value?.focus()
  })
}

function endEditing() {
  currentText.value = currentText.value.trim()

  const regex = /^(CS-\d{5}|GMS-\d{4})\s*(.*)$/
  const match = currentText.value.match(regex)

  if (!match) {
    alert('格式不符')
    editing.value = false
    currentText.value = `${props.order.orderNo} ${props.order.title}`
    return
  }

  const csPart = match[1]
  const restPart = match[2]
  const handled = [csPart, restPart]

  editing.value = false
  currentText.value = `${csPart} ${restPart}`
  emit('edit', {
    oldOrderNo: props.order.orderNo,
    orderNo: handled[0],
    title: handled[1],
    done: props.order.done,
  })
}

function startDrag(event: DragEvent, order: Order): void {
  event.dataTransfer!.dropEffect = 'move'
  event.dataTransfer!.effectAllowed = 'move'
  event.dataTransfer!.setData('orderNo', order.orderNo)
}

function toggleDone(orderNo: string) {
  emit('toggleDone', orderNo)
}

function toggleMark(orderNo: string) {
  emit('mark', orderNo)
}

</script>

<template>
  <div class="px-4 mb-0.5 draggable
    transition-transform transform hover:-translate-y-1 hover:scale-105
    duration-300 ease-in-out
    cursor-grab"
    :class="{ 'bg-warning': order.marked }"
    ref="dragItem"
    :draggable="!editing"
    @dragstart="startDrag($event, order)" 
    @dblclick="startEditing"
    tabindex="0"
  >
    <!-- show -->
    <div v-if="!editing" class="flex items-center" :class="{ 'line-through text-gray-600': order.done }">
      <a class="link link-primary"
        :href="jiraUrl + order.orderNo"
        target="_blank"
      >
        {{ order.orderNo }}
      </a>
      <p class="pl-2" >{{ order.title }}</p>
      <div class="ml-auto">
        <button class="btn btn-info btn-xs" @dblclick.stop @click="toggleDone(order.orderNo)">{{ order.done ? '取消删除线' : '删除线' }}</button>
        <button class="btn btn-info btn-xs" @dblclick.stop @click="toggleMark(order.orderNo)">{{ order.marked ? '取消标记' : '标记' }}</button>
      </div>
    </div>

    <!-- edit -->
    <div v-else class="form-control" >
      <input ref="inputField" v-model="currentText"
        class="input input-alt" placeholder="Type something intelligent" type="text"
        @blur="endEditing" 
        @keyup.enter="endEditing" 
        @keyup.esc="endEditing"
      >
      <span class="input-border input-border-alt"></span>
    </div>

  </div>
</template>