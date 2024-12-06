<script lang="ts" setup>
import Decimal from "decimal.js"
import { ref } from "vue"
import InputList from "../graphInputs/InputList.vue"

const props = defineProps({
  callback: Function,
  nodeData: Object,
  addNode: Function,
})

const emits = defineEmits({
  close: null,
})

async function addNode() {
  const data = values.value.filter((e) => e.gt(0))
  if (checkbox.value) {
    props.addNode(data, [Decimal.sum(...data)])
  } else {
    props.addNode([Decimal.sum(...data)], data)
  }
  emits("close")
}

const checkbox = ref(true)
const values = ref([new Decimal(0), new Decimal(-1)])
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-crust bg-opacity-75"
  >
    <dialog
      class="modal-content flex flex-col gap-2 rounded-lg bg-overlay0 p-2"
    >
      <span class="flex justify-center gap-2">
        <label> Setting Inputs </label>
        <input type="checkbox" v-model="checkbox" />
      </span>
      <InputList
        :model-value="values"
        v-bind:label="checkbox ? 'Inputs' : 'Outputs'"
      />
      <span class="flex justify-end gap-2">
        <button @click="$emit('close')" class="latte bg-red">Cancel</button>
        <button
          :disabled="values.filter((e) => e.gt(0)).length == 0"
          @click="addNode"
          class="latte bg-green"
        >
          Accept
        </button>
      </span>
    </dialog>
  </div>
</template>
