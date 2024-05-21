<script setup lang="ts">
import Decimal from 'decimal.js'
import { computed, ComputedRef, ref, Ref, watch} from 'vue'

const props = defineProps({
  label: String,
  values: Array<number|Decimal>
})

const emit = defineEmits<{update: [inputs: Decimal[]]}>()

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
  const data = {id: id++, value: new Decimal(value)}
  inputs.value.push(data)
  emitUpdate()
} 

function updateInput(e: Event, stored: input) {
  const e_value = new Decimal((e.target as HTMLInputElement).value)
  const fixed_value = e_value.toDecimalPlaces(4)

  // Only fix if values differ, as attempting to adda decimal place did not work
  if (!stored.value.eq(e_value)) {
    stored.value = fixed_value
    emitUpdate()
  }
}

function removeInput(input: input) {
  inputs.value = inputs.value.filter((i) => i !== input)

}

function emitUpdate(){
  emit("update", inputs.value.map(i => i.value))
}

defineExpose(sum)
</script>

<template>
  <div>
    <label v-if="props.label">{{ props.label }}</label>
    <div v-for="input in inputs" :key="input.id">
      <input type="number" min="0" :value="input.value" @input="(e) => updateInput(e, input)">
      <button @click="removeInput(input)">{{ input.value }}</button>
    </div>
    <button @click="addInput()">+ ({{ sum }})</button>
  </div>
</template>