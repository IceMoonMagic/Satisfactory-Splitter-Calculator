<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import MachineCount from './components/MachineCount.vue'
import InputList from './components/InputList.vue'
import GraphView from './components/GraphView.vue'
import { ref } from 'vue';
import Decimal from 'decimal.js';
import { ConveyorNode } from './ConveyorNode';

function default_array() {return [1, 2, 3].map(e => new Decimal(e))}
function generic_graph() {
  const roots = [new ConveyorNode(new Decimal(5))]
  roots[0].link_to(new ConveyorNode(), new Decimal(5))
  return roots
}

const foo = ref<Decimal[]>(default_array())
</script>

<template>
  <MachineCount />
  <InputList label="Hello World" v-model="foo"/>
  <p>{{ foo }} {{ foo.length>0 ? Decimal.sum(...foo) : "" }}</p>
  <button @click="foo = default_array()" />
  <GraphView :graph="generic_graph()"/>
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
