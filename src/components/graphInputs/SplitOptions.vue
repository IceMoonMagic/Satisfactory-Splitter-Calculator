<script lang="ts" setup>
import { InformationCircleIcon } from "@heroicons/vue/16/solid"
import { Fraction } from "fraction.js"
import { computed, ref, watch } from "vue"
import { max } from "../../math.ts"
import ToggleButton from "../ToggleButton.vue"

const belt_speeds = [60, 120, 270, 480, 780, 1200]

/** Takes "Mk.N" and returns belt speed for said Mk. */
function get_belt_speed(mk: string) {
  return new Fraction(belt_speeds[Number(mk.split(".")[1]) - 1])
}

const props = defineProps({
  inputs: Array<Fraction[]>,
})
/** The minimum require belt speed to make all sources and targets viable */
const belt_min = computed(() =>
  props.inputs.reduce(
    (prev, curr) => max(prev, ...(curr ?? [0])),
    new Fraction(0),
  ),
)
/** The selected belt option */
const belt_name = ref("Off")
/** The selected / configured belt speed */
const belt_limit = defineModel<Fraction>("belt_limit", undefined)

/** Updates belt_limit when selecting a different belt_name*/
watch(belt_name, (updated) => {
  switch (updated) {
    case "Off":
      belt_limit.value = undefined
      break
    case "Custom":
      belt_limit.value = max(belt_limit.value ?? 0, belt_min.value)
      break
    case "Auto":
      belt_limit.value = belt_min.value
      break
    default:
      if (updated.startsWith("Mk.")) {
        belt_limit.value = get_belt_speed(updated)
      } else {
        throw new Error(`Missing Belt Name Case: ${updated}`)
      }
  }
})

/** Updates belt_limit if a sources / targets gets too big */
watch(belt_min, (updated, old) => {
  if (updated.equals(old)) {
    // it seems that updating the model triggers the watch for the props
    // which would cause an infinite loop if the watch then updates the model
    return
  }

  switch (belt_name.value) {
    case "Off":
      break
    case "Custom":
      belt_limit.value = max(belt_limit.value, updated)
      break
    case "Auto":
      belt_limit.value = updated
      break
    default:
      if (updated.gt(get_belt_speed(belt_name.value))) {
        // Find smallest viable Mk or set custom
        const mk = belt_speeds.reduce((mk, speed, i) => {
          if (mk != null) {
            return mk
          } else if (updated.lte(speed)) {
            return i + 1
          } else {
            return null
          }
        }, null)
        belt_name.value = mk !== null ? `Mk.${mk}` : "Auto"
      }
      break
  }
})

/** Ensures custom belt input is at least belt_min*/
function valid_custom(_e: Event) {
  if (belt_name.value === "Custom" && belt_min.value.gt(belt_limit.value)) {
    belt_limit.value = belt_min.value
  }
}

/** The selected belt option */
const merge_name = ref("Deepest")
/** The selected / configured belt speed */
const merge_level = defineModel<number>("merge_level", undefined)

/** Updates merge_level when selecting a different merge_name*/
watch(merge_name, (updated) => {
  switch (updated) {
    case "Shallowest":
      merge_level.value = 0
      break
    case "Deepest":
      merge_level.value = undefined
      break
    case "Custom":
      merge_level.value = Math.max(merge_level.value ?? 0, 0)
      break
  }
})

const smaller_first = defineModel<boolean>("smaller_first", undefined)
</script>

<template>
  <div class="flex flex-wrap items-center justify-center gap-2 sm:flex-nowrap">
    <!--  To center "ignoring" the info circle  -->
    <InformationCircleIcon class="inline size-4 text-transparent" />
    <div>
      <label class="rounded-l-lg bg-surface0 p-2" for="select_graph">
        Max Items / Min
      </label>
      <select
        class="rounded-none border-x border-lavender hover:z-10"
        name="select_graph"
        v-model="belt_name"
      >
        <option>Off</option>
        <option
          :disabled="belt_min.gt(speed)"
          v-for="(speed, index) in belt_speeds"
        >
          Mk.{{ index + 1 }}
        </option>
        <option>Auto</option>
        <option>Custom</option>
      </select>
      <input
        :disabled="belt_name !== 'Custom'"
        :min="belt_min.valueOf()"
        @change="valid_custom"
        class="w-24 rounded-l-none"
        type="number"
        v-model="belt_limit"
      />
    </div>
    <div>
      <label class="rounded-l-lg bg-surface0 p-2" for="merge_level">
        Deepest Merge Level
      </label>
      <select
        class="rounded-none border-x border-lavender hover:z-10"
        name="merge_level"
        v-model="merge_name"
      >
        <option>Shallowest</option>
        <option>Deepest</option>
        <option>Custom</option>
      </select>
      <input
        :disabled="merge_name !== 'Custom'"
        :min="0"
        @change="valid_custom"
        class="w-24 rounded-l-none"
        type="number"
        v-model="merge_level"
      />
    </div>
    <ToggleButton v-model="smaller_first"> Split Smaller First </ToggleButton>
    <a
      href="https://github.com/IceMoonMagic/Satisfactory-Splitter-Calculator?tab=readme-ov-file#extra-options"
      target="_blank"
      title="More Information"
    >
      <InformationCircleIcon class="inline size-4 text-text" />
    </a>
  </div>
</template>

<!--<style scoped>-->
<!--.flex {-->
<!--  @apply gap-0;-->
<!--}-->
<!--</style>-->
