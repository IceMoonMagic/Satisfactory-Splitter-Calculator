<script setup lang="ts">
import Decimal from 'decimal.js'
import { computed, ComputedRef} from 'vue'
import { TrashIcon, PlusIcon } from '@heroicons/vue/16/solid';

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

// defineExpose(sum)
</script>

<template>
  <div class=" space-y-2 outline outline-lavender outline-1 p-2 rounded-lg w-full">
    <label v-if="props.label">{{ props.label }}</label>
    <div v-for="i in inputs.length" class="flex space-x-2">
      <input class="rounded-lg p-2 w-full" type="number" min="0" :value="inputs[i-1]" @input="(e) => updateInput(e, i-1)">
      <button class="latte bg-red text-base" @click="removeInput(i-1)">
        <TrashIcon class=" size-5 latte text-base" />
      </button>
    </div>
    <button class="latte bg-green text-base w-full flex items-center justify-center" @click="addInput()">
      <PlusIcon class=" size-5 latte text-base" />
    </button>
    <code class=" language-html"></code>
  </div>
</template>