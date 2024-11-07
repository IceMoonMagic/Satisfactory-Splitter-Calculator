<script lang="ts" setup>
import { PlusIcon, TrashIcon } from "@heroicons/vue/16/solid"
import Decimal from "decimal.js"
import { computed } from "vue"

const props = defineProps({
  decimal_places: Number || undefined,
  label: String,
})
const inputs = defineModel<Decimal[]>()

interface SimplifiedRow {
  index: number
  input: Decimal
  repeat: number
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
  if (repeat <= 0) {
    removeInput(row)
    return
  }

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
    if (
      simplified.length != 0 &&
      simplified[simplified.length - 1].input.eq(input)
    ) {
      simplified[simplified.length - 1].repeat += 1
    } else {
      simplified.push({
        index: index,
        input: input,
        repeat: 1,
      })
    }
  }
  return simplified.filter((e) => e.input.gt(-1))
})
</script>

<template>
  <div class="w-full rounded-lg p-2 outline outline-1 outline-lavender">
    <label v-if="props.label">{{ props.label }}</label>
    <div class="flex">
      <label class="w-full px-2">Items per Minute</label>
      <label>&nbsp;</label>
      <label class="w-2/5 px-2">Times</label>
      <label class="px-2">Delete</label>
    </div>
    <div class="mb-2 flex" v-for="row in simplifiedInputs">
      <input
        :value="row.input"
        @input="(e) => updateInput(e, row)"
        class="w-full"
        min="0"
        type="number"
      />
      <span class="pt-4">x</span>
      <input
        :value="row.repeat"
        @input="(e) => updateRepeat(e, row)"
        class="w-2/5"
        min="1"
        type="number"
      />
      <button @click="removeInput(row)" class="colored bg-red">
        <TrashIcon class="colored size-5" />
      </button>
    </div>
    <button
      @click="addInput()"
      class="colored flex w-full justify-center bg-green"
    >
      <PlusIcon class="colored size-5" />
    </button>
  </div>
</template>
