<script lang="ts" setup>
import { Fraction } from "fraction.js"
import { computed, ref, watch } from "vue"
import ToggleButton from "./ToggleButton.vue"

// Input Values
const input_clock_per = ref(100)
const input_clock_dec = ref(1)
const input_machines = ref(1)
const auto_machines = ref(true)

// Compute Result
const result = computed(() => {
  const desired_clock_per = new Fraction(input_clock_per.value)
  let result_machines = -1
  // "Base Case": Clock Per < 0.1
  for (
    let count = input_machines.value;
    desired_clock_per.div(count).gte(0.1);
    count++
  ) {
    // Take first result with no more than four decimal places (Satisfactory Precision)
    if (
      desired_clock_per.div(count).round(4).mul(count).equals(desired_clock_per)
    ) {
      result_machines = count
      break
    }
  }
  if (result_machines === -1) {
    return { clock: "-1", machines: "-1" }
  }

  const result_clock_per = new Fraction(desired_clock_per).div(result_machines)
  return {
    clock_dec: result_clock_per.div(100),
    clock_per: result_clock_per,
    machines: result_machines,
  }
})

function auto_set_machines() {
  if (auto_machines.value) {
    input_machines.value = Math.ceil(input_clock_dec.value)
  }
}

// Enforce decimal places and sync values
watch(input_clock_dec, (updated) => {
  if (!updated) {
    return
  }
  const fixed_updated = new Fraction(updated).round(6)
  input_clock_dec.value = fixed_updated.valueOf()
  input_clock_per.value = fixed_updated.mul(100).valueOf()
  auto_set_machines()
})
watch(input_clock_per, (updated) => {
  if (!updated) {
    return
  }
  const fixed_updated = new Fraction(updated).round(4)
  input_clock_per.value = fixed_updated.valueOf()
  input_clock_dec.value = fixed_updated.div(100).valueOf()
  auto_set_machines()
})
watch(auto_machines, auto_set_machines)
</script>
<template>
  <div
    class="w-full space-y-2 rounded-lg p-2 outline outline-1 outline-lavender"
  >
    <div class="flex flex-wrap sm:flex-nowrap">
      <div class="w-full">
        <label> Clock Speed (as decimal) </label>
        <input
          class="w-full rounded-lg p-2"
          min="0"
          type="number"
          v-model="input_clock_dec"
        />
      </div>
      <div class="w-full">
        <label> Clock Speed (as percentage) </label>
        <input
          class="w-full rounded-lg p-2"
          min="0"
          type="number"
          v-model="input_clock_per"
        />
      </div>
    </div>
    <div>
      <div class="flex flex-wrap justify-center">
        <label> Minimum Machines </label>
        <div class="flex w-full">
          <input
            :disabled="auto_machines"
            class="w-full"
            min="1"
            type="number"
            v-model="input_machines"
          />
          <div class="group relative">
            <ToggleButton
              title="Set Min Machines to Decimal Clock Speed rounded up."
              v-model="auto_machines"
            >
              Auto
            </ToggleButton>
          </div>
        </div>
      </div>
    </div>
    <p>
      <code>{{ result.machines }}</code>
      machine{{ result.machines !== 1 ? "s" : "" }} at
      <code>{{ result.clock_dec }}</code>
      (<code>{{ result.clock_per }}%</code>) clock speed.
    </p>
  </div>
</template>
