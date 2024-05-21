<script setup lang="ts">
import Decimal from 'decimal.js'
import { computed, ComputedRef, ref, Ref} from 'vue'

const props = defineProps({
  label: String,
  values: Array<number|Decimal>
})

interface input {
  id: number
  value: Decimal
}

let id = 0
const inputs: Ref<input[]> = ref([])
const sum: ComputedRef<Decimal> = computed(() => 
  (inputs.value.length > 0) ? Decimal.sum(...inputs.value.map(i => i.value)) : new Decimal(0)
)

function addInput(value: Decimal | number = 0) {
  inputs.value.push({id: id++, value: new Decimal(value)})
} 

function removeInput(input: input) {
  inputs.value = inputs.value.filter((i) => i !== input)
}

defineExpose(sum)
</script>

<template>
  <div>
    <label v-if="props.label">{{ props.label }}</label>
    <div v-for="input in inputs" :key="input.id">
      <input type="number" min="0" v-model="input.value">
      <button @click="removeInput(input)">{{ input.value }}</button>
    </div>
    <button @click="addInput()">+ ({{ sum }})</button>
  </div>
</template>