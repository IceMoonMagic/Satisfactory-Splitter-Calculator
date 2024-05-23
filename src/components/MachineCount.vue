<script setup lang="ts">
import { Decimal } from 'decimal.js'
import { computed, ref, watch } from 'vue'

// Input Values
const input_clock_per = ref(100)
const input_clock_dec = ref(1)
const input_machines = ref(1)
const auto_machines = ref(false)

// Compute Result
const result = computed(() => {
  const desired_clock_per = new Decimal(input_clock_per.value)
  let result_machines = -1
  // "Base Case": Clock Per < 0.1
  for (let count = input_machines.value; desired_clock_per.div(count).gte(0.1); count++) {
    // Take first result with no more than four decimal places (Satisfactory Precision)
    if (desired_clock_per.div(count).toDecimalPlaces(4).mul(count).eq(desired_clock_per)){
      result_machines = count
      break
    }
  }
  if (result_machines === -1) {return {clock: '-1', machines: '-1'}}
  
  const result_clock_per = new Decimal(desired_clock_per).div(result_machines)
  return {
    clock_dec: result_clock_per.div(100),
    clock_per: result_clock_per, 
    machines: result_machines
  }
})

function auto_set_machines() {
  if (auto_machines.value) {
    input_machines.value = Math.ceil(input_clock_dec.value)
  }
}

// Enforce decimal places and sync values 
watch(input_clock_dec, (updated) => {
  if (!updated) {return}
  const fixed_updated = new Decimal(updated).toDecimalPlaces(6)
  input_clock_dec.value = fixed_updated.toNumber()
  input_clock_per.value = fixed_updated.mul(100).toNumber()
  auto_set_machines()
})
watch(input_clock_per, (updated) => {
  if (!updated) {return}
  const fixed_updated = new Decimal(updated).toDecimalPlaces(4)
  input_clock_per.value = fixed_updated.toNumber()
  input_clock_dec.value = fixed_updated.div(100).toNumber()
  auto_set_machines()
})
watch(auto_machines, auto_set_machines)

</script>
<template>
  <div class="space-y-2 outline outline-lavender outline-1 p-2 rounded-lg w-full">
    <div class="flex flex-wrap sm:flex-nowrap gap-2">
      <div class="w-full">
        <label>Clock Speed (as decimal)</label>
        <input v-model="input_clock_dec" min="0" type="number" class="rounded-lg p-2 w-full">
      </div>
      <div class="w-full">
        <label>Clock Speed (as percentage)</label>
        <input v-model="input_clock_per" min="0" type="number" class="rounded-lg p-2 w-full">
      </div>
    </div>
    <div>
      <div class="flex flex-wrap">
        <label>Minimum Machines</label>
        <div class="space-x-2 w-full flex">
          <input v-model="input_machines" min="1" type="number" 
          class="rounded-lg p-2 w-full"
          :disabled="auto_machines">
          <div class="relative group" @click="auto_machines = !auto_machines">
            <label>Auto</label>
            <input type="checkbox" v-model="auto_machines">
            <div class="absolute hidden group-hover:inline top-full -right-full 
              p-2 mx-4 my-2 sm:min-w-max rounded-lg bg-overlay0 
              outline outline-1 outline-lavender"
            >Set Min Machines to Decimal Clock Speed rounded up.
            </div>
          </div>
        </div>
      </div>
    </div>
    <p>
      <code class=" bg-surface0 p-1 rounded-lg">{{ result.machines }}</code> 
      machine{{ result.machines !== 1 ? 's' : '' }} at 
      <code class=" bg-surface0 p-1 rounded-lg">{{ result.clock_dec }}</code>
      (<code class=" bg-surface0 p-1 rounded-lg">{{ result.clock_per }}%</code>) clock speed.
    </p>
  </div>
</template>