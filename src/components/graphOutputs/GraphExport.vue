<script lang="ts" setup>
import { InformationCircleIcon } from "@heroicons/vue/16/solid"
import { ref } from "vue"

const props = defineProps({
  text: String,
  svg: SVGSVGElement,
  link: String,
  mime: String,
  filename: String,
})

const downloader = ref<HTMLAnchorElement>(null)

function download_text() {
  const blob = new Blob([props.text], { type: "text/vnd.graphviz" })
  downloader.value.href = URL.createObjectURL(blob)
  downloader.value.download = props.filename
  downloader.value.click()
}

function click_link() {
  window.open(props.link, "_blank")
}
</script>

<template>
  <div class="m-2 flex justify-center gap-2">
    <slot></slot>
    <a hidden ref="downloader" />
    <button
      :disabled="text === ''"
      @click="download_text"
      class="colored bg-blue"
    >
      Download Text
    </button>
    <!-- <button @click="" disabled
      class="latte bg-blue text-base line-through"
    >Download SVG
    </button>
    <button @click="" disabled
      class="latte bg-blue text-base line-through"
    >Download PNG
    </button> -->
    <a
      :class="text === '' ? 'pointer-events-none' : ''"
      :href="props.link"
      target="_blank"
    >
      <button :disabled="text === ''" class="colored bg-blue">
        Send to External Editor
      </button>
    </a>
    <a
      href="https://github.com/IceMoonMagic/Satisfactory-Splitter-Calculator?tab=readme-ov-file#outputs"
      target="_blank"
    >
      <InformationCircleIcon class="size-5 text-text" />
    </a>
  </div>
</template>
