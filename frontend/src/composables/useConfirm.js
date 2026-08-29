import { reactive } from 'vue'

const defaultState = {
  isOpen: false,
  title: '确认操作',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  type: 'warning',
  resolve: null,
}

const state = reactive({ ...defaultState })

export function useConfirm() {
  const confirm = (options = {}) => {
    if (typeof options === 'string') {
      options = { message: options }
    }
    return new Promise(resolve => {
      Object.assign(state, defaultState, options, {
        isOpen: true,
        resolve,
      })
    })
  }

  const settle = (result) => {
    if (state.resolve) {
      state.resolve(result)
      state.resolve = null
    }
    state.isOpen = false
  }

  const handleConfirm = () => settle(true)
  const handleCancel = () => settle(false)

  return {
    confirmState: state,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
