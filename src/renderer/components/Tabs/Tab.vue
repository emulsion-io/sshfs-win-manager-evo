<template>
  <div class="tab" v-show="isActive">
      <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'Tab',

  inject: ['registerTab'],

  props: {
    active: {
      required: false,
      type: Boolean,
      default: false
    },
    label: {
      required: true,
      type: String
    }
  },

  data () {
    return {
      isActive: this.active
    }
  },

  mounted () {
    this.registerTab(this)
  }
}
</script>

<style lang="less" scoped>
.tab {
  padding-top: 15px;
}
</style>
