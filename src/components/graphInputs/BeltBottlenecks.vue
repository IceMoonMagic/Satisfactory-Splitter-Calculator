<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Decimal } from 'decimal.js';
import { InformationCircleIcon } from '@heroicons/vue/16/solid';

const belt_speeds = [60, 120, 270, 480, 780, 1200]
/** Takes "Mk.N" and returns belt speed for said Mk. */
function get_belt_speed(mk: string) { return new Decimal(belt_speeds[Number(mk.split('.')[1]) - 1]) }

const props = defineProps({
  inputs: Array<Decimal[]>
})
/** The minimum require belt speed to make all sources and targets viable */
const belt_min = computed(() => props.inputs.reduce((prev, curr) => Decimal.max(prev, ...curr ?? [0]), new Decimal(0)))
/** The selected belt option */
const belt_name = ref('Off')
/** The selected / configured belt speed */
const belt_limit = defineModel<Decimal>(undefined)

/** Updates belt_limit when selecting a different belt_name*/
watch(belt_name, (updated) => {
  switch (updated) {
    case 'Off':
      belt_limit.value = undefined
      break
    case 'Custom':
      belt_limit.value = Decimal.max(belt_limit.value ?? 0, belt_min.value)
      break
    case 'Auto':
      belt_limit.value = belt_min.value
      break
    default:
      if (updated.startsWith('Mk.')) {
        belt_limit.value = get_belt_speed(updated)
      } else {
        throw new Error(`Missing Belt Name Case: ${updated}`)
      }
  }
})

/** Updates belt_limit if a sources / targets gets too big */
watch(belt_min, (updated, old) => {
  if (updated.eq(old)) {
    // it seems that updating the model triggers the watch for the props
    // which would cause an infinite loop if the watch then updates the model
    return
  }

  switch (belt_name.value) {
    case 'Off':
      break
    case 'Custom':
      belt_limit.value = Decimal.max(belt_limit.value, updated)
      break
    case 'Auto':
      belt_limit.value = updated
      break
    default:
      if (updated.gt(get_belt_speed(belt_name.value))) {
        // Find smallest viable Mk or set custom
        const mk = belt_speeds.reduce((mk, speed, i) => {
          if (mk != null) { return mk }
          else if (updated.lte(speed)) { return i + 1 }
          else { return null }
        }, null)
        belt_name.value = mk !== null ? `Mk.${mk}` : 'Auto'
      }
      break
  }
})
/** Ensures custom belt input is at least belt_min*/
function valid_custom(_e: Event) {
  if (belt_name.value === 'Custom' && belt_min.value.gt(belt_limit.value)) {
    belt_limit.value = belt_min.value
  }
}

</script>

<template>
  <div class="flex gap-2 flex-wrap sm:flex-nowrap">
    <label for="select_graph">Choose bottleneck max belt
      <a href="https://github.com/IceMoonMagic/Satisfactory-Splitter-Calculator?tab=readme-ov-file#loopback-bottlenecking"
        target="_blank">
        <InformationCircleIcon class=" size-5 text-text inline" />
      </a>: </label>
    <select name="select_graph" v-model="belt_name" class="p-2 rounded-lg">
      <option>Off</option>
      <option v-for="speed, index in belt_speeds" :disabled="belt_min.gt(speed)">Mk.{{ index + 1 }}</option>
      <option>Auto</option>
      <option>Custom</option>
    </select>
    <input type="number" class="p-2 rounded-lg" :disabled="belt_name !== 'Custom'" v-model="belt_limit"
      @change="valid_custom" :min="belt_min.toNumber()">
  </div>
</template>