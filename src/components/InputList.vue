<script setup lang="ts">
import Decimal from 'decimal.js'
import { computed, ComputedRef} from 'vue'

const props = defineProps({
  label: String,
})
const inputs = defineModel<Decimal[]>()

const sum: ComputedRef<Decimal> = computed(() => 
  (inputs.value.length > 0) ? Decimal.sum(...inputs.value) : new Decimal(0)
)

function addInput(value: Decimal | number = 0) {
  inputs.value.push(new Decimal(value))
} 

function updateInput(e: Event, index: number) {
  const e_value = new Decimal((e.target as HTMLInputElement).value)
  const fixed_value = e_value.toDecimalPlaces(4)

  // Only fix if values differ, as attempting to adda decimal place did not work
  if (!inputs.value[index].eq(e_value)) {
    inputs.value[index] = fixed_value
  }
}

function removeInput(index: number) {
  inputs.value.splice(index, 1)
}

defineExpose(sum)
</script>

<template>
  <div>
    <label v-if="props.label">{{ props.label }}</label>
    <div v-for="i in inputs.length">
      <input type="number" min="0" :value="inputs[i-1]" @input="(e) => updateInput(e, i-1)">
      <button @click="removeInput(i-1)">{{ inputs[i-1] }}</button>
    </div>
    <button @click="addInput()">+ ({{ sum }})</button>
  </div>
</template>