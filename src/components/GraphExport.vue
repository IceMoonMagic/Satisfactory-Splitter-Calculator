<script setup lang="ts">
import { ref } from 'vue'
import { InformationCircleIcon } from '@heroicons/vue/16/solid';

const props = defineProps({
  text: String,
  svg: SVGSVGElement,
  link: String,
  mime: String,
  filename: String,
})

const downloader = ref<HTMLAnchorElement>(null)

function download_text() {
  const blob = new Blob([props.text], {type: 'text/vnd.graphviz'})
  downloader.value.href = URL.createObjectURL(blob)
  downloader.value.download = props.filename
  downloader.value.click()
}

function click_link() {
  window.open(props.link, "_blank")
}

</script>

<template>
  <div class="flex gap-2 justify-center">
    <a ref="downloader" hidden/>
    <button @click="download_text" :disabled="text === ''"
      class="latte bg-blue text-base"
    >Download Text
    </button>
    <button @click="" disabled
      class="latte bg-blue text-base line-through"
    >Download SVG
    </button>
    <button @click="" disabled
      class="latte bg-blue text-base line-through"
    >Download PNG
    </button>
    <button @click="click_link()" :disabled="text === ''" 
      class="latte bg-blue text-base"
    >Send to External Editor
    </button>
    <a href="https://github.com/IceMoonMagic/Satisfactory-Splitter-Calculator?tab=readme-ov-file#outputs" target="_blank">
      <InformationCircleIcon class=" size-5 text-text"/>
    </a>
  </div>
</template>