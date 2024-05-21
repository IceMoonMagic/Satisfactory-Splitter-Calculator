<script setup lang="ts">
import { Decimal } from 'decimal.js'
import { computed, ref, watch } from 'vue'

// Input Values
const input_clock_per = ref(100)
const input_clock_dec = ref(1)
const input_machines = ref(1)

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

// Enforce decimal places and sync values 
watch(input_clock_dec, (updated) => {
  const fixed_updated = new Decimal(updated).toDecimalPlaces(6)
  input_clock_dec.value = fixed_updated.toNumber()
  input_clock_per.value = fixed_updated.mul(100).toNumber()
})
watch(input_clock_per, (updated) => {
  const fixed_updated = new Decimal(updated).toDecimalPlaces(4)
  input_clock_per.value = fixed_updated.toNumber()
  input_clock_dec.value = fixed_updated.div(100).toNumber()
})

</script>
<template>
  <div>
    <div>
      <div>
        <label>Clock Speed (as decimal)</label>
        <input v-model="input_clock_dec" min="0" id="machines dec" step="1" type="number">
      </div>
      <div >
        <label>Clock Speed (as percentage)</label>
        <input v-model="input_clock_per" min="0" id="machines per" type="number">
      </div>
    </div>
    <div>
      <div>
        <label>Minimum Machines</label>
        <input v-model="input_machines" min="1" type="number">
      </div>
    </div>
    <p>
      <code id="machines count">{{ result.machines }}</code> machines at 
      <code id="machines out dec">{{ result.clock_dec }}</code>
      (<code id="machines out per">{{ result.clock_per }}%</code>) clock speed.
    </p>
  </div>
</template>