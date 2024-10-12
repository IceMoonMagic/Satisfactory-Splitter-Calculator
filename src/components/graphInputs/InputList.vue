<script setup lang="ts">
import Decimal from 'decimal.js'
import { TrashIcon, PlusIcon } from '@heroicons/vue/16/solid';
import { computed } from 'vue';

const props = defineProps({
  decimal_places: Number || undefined,
  label: String,
})
const inputs = defineModel<Decimal[]>()

interface SimplifiedRow {
  index: number;
  input: Decimal;
  repeat: number;
}

function addInput(value: Decimal | number = 0) {
  inputs.value.push(new Decimal(value))
  inputs.value.push(new Decimal(-1))
}

function updateInput(e: Event, row: SimplifiedRow) {
  if ((e.target as HTMLInputElement).value === "") return
  const e_value = new Decimal((e.target as HTMLInputElement).value)
  const fixed_value = e_value.toDecimalPlaces(props.decimal_places)

  // Only fix if values differ, as attempting to add a decimal place did not work
  if (props.decimal_places === 0 || !row.input.eq(e_value)) {
    for (let index = row.index; index < row.index + row.repeat; index++) {
      inputs.value[index] = fixed_value
    }
  }
}

function updateRepeat(e: Event, row: SimplifiedRow) {
  if ((e.target as HTMLInputElement).value === "") return
  const e_value = Number((e.target as HTMLInputElement).value)
  const repeat = Math.floor(e_value)
  if (repeat <= 0) { removeInput(row); return }

  const repeat_change = repeat - row.repeat
  if (repeat_change > 0) {
    for (let iter = 0; iter < repeat_change; iter++) {
      inputs.value.splice(row.index, 0, row.input)
    }
  } else if (repeat_change < 0) {
    for (let iter = 0; iter > repeat_change; iter--) {
      inputs.value.splice(row.index, 1)
    }
  }
}

function removeInput(row: SimplifiedRow) {
  inputs.value.splice(row.index, row.repeat + 1)
  if (inputs.value.length === 0) {
    addInput()
  }
}

const simplifiedInputs = computed<SimplifiedRow[]>(() => {
  const simplified: SimplifiedRow[] = []
  for (let index = 0; index < inputs.value.length; index++) {
    const input = inputs.value[index]
    if (simplified.length != 0 && simplified[simplified.length - 1].input.eq(input)) {
      simplified[simplified.length - 1].repeat += 1;
    }
    else {
      simplified.push({
        index: index,
        input: input,
        repeat: 1
      })
    }
  }
  return simplified.filter(e => e.input.gt(-1))
})

</script>

<template>
  <div class=" space-y-2 outline outline-lavender outline-1 p-2 rounded-lg w-full">
    <label v-if="props.label">{{ props.label }}</label>
    <div class="flex space-x-2">
      <span class="px-2 w-full">Items per Minute</span>
      <span>&nbsp;</span>
      <span class="px-2 w-2/5">Times</span>
      <span class="px-2">Delete</span>
    </div>
    <div v-for="row in simplifiedInputs" class="flex space-x-2">
      <input class="rounded-lg p-2 w-full" type="number" min="0" :value="row.input" @input="(e) => updateInput(e, row)">
      <span class="pt-4">x</span>
      <input class="rounded-lg p-2 w-2/5" type="number" min="1" :value="row.repeat"
        @input="(e) => updateRepeat(e, row)">
      <button class="latte bg-red text-base" @click="removeInput(row)">
        <TrashIcon class=" size-5 latte text-base" />
      </button>
    </div>
    <button class="latte bg-green text-base w-full flex items-center justify-center" @click="addInput()">
      <PlusIcon class=" size-5 latte text-base" />
    </button>
    <code class=" language-html"></code>
  </div>
</template>