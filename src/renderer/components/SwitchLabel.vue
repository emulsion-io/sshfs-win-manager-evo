<template>
  <label class="switch-label">
    {{label}}
    <input class="switch-input" type="checkbox" v-model="_value">
    <span class="switch-ui"></span>
  </label>
</template>

<script>
export default {
  name: 'SwitchLabel',

  props: {
    label: {
      type: String,
      required: true,
      default: ''
    },
    modelValue: {
      type: Boolean,
      required: false,
      default: false
    }
  },

  computed: {
    _value: {
      get () {
        return this.modelValue
      },

      set (value) {
        this.$emit('update:modelValue', value)
      }
    }
  }
}
</script>

<style lang="less" scoped>
.switch-label {
  display: block;
  margin-top: 5px;

  .switch-input {
    display: none;
  }

  .switch-ui {
    float: right;
    clear: both;
    position: relative;
    width: 50px;
    height: 22px;
    margin-top: -2px;
    border-radius: 50px;
    background: rgba(255, 255, 255, 0.1);
    transition: background 150ms;

    &::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: contrast(@main-color);
      transition: transform 150ms;
    }
  }

  .switch-input:checked + .switch-ui {
    background: @primary-color;

    &::after {
      transform: translateX(28px);
    }
  }
}
</style>
