<script setup lang="ts">
defineProps<{
  sectionTitle: string
}>()

const emit = defineEmits<{
  (event: 'update', orderNo: string, dropSection: string): void,
  (event: 'addNewOrder', targetSection: string): void
}>()

function onDrop(event: DragEvent, dropSection: string) {
  const orderNo = event.dataTransfer?.getData('orderNo')
  emit('update', orderNo!, dropSection)
  isDragginOn.value = false
}

const isDragginOn = ref(false)

function ondragEnter() {
  isDragginOn.value = true
}

function ondragLeave() {
  isDragginOn.value = false
}

</script>

<template>
  <div class="border-t p-2" :class="{ 'bg-blue-500': isDragginOn }"
    @drop="onDrop($event, sectionTitle)"
    @dragenter.prevent
    @dragover.prevent="ondragEnter"
    @dragleave.prevent="ondragLeave"
  >
    <div class="flex justify-between">
      <h1>{{ sectionTitle }}</h1>
      <button
        class="btn btn-neutral btn-xs"
        onclick="my_modal_2.showModal()"
        @click="emit('addNewOrder', sectionTitle)"
      >+</button>
    </div>
    <slot/>
  </div>

</template>