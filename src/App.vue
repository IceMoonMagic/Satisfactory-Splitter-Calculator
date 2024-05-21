<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import MachineCount from './components/MachineCount.vue'
import InputList from './components/InputList.vue';
import { ref } from 'vue';
import Decimal from 'decimal.js';

function default_array() {return [1, 2, 3].map(e => new Decimal(e))}

const foo = ref<Decimal[]>(default_array())
</script>

<template>
  <MachineCount />
  <InputList label="Hello World" v-model="foo"/>
  <p>{{ foo }} {{ foo.length>0 ? Decimal.sum(...foo) : "" }}</p>
  <button @click="foo = default_array()" />
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <!-- <HelloWorld msg="Vite + Vue" /> -->
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
