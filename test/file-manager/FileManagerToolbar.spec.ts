import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import FileManagerToolbar from '../../app/components/file-manager/FileManagerToolbar.vue'

const ButtonStub = defineComponent({
  name: 'Button',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    const listeners: Record<string, unknown> = {}
    Object.entries(attrs).forEach(([key, value]) => {
      if (key.startsWith('on')) listeners[key] = value
    })
    return () => h('button', { ...attrs, ...listeners }, slots.default?.())
  },
})

describe('FileManagerToolbar', () => {
  const baseProps = {
    pathParts: ['photos', '2024'],
    isSelectionMode: false,
    hasSelection: true,
    selectedCount: 2,
    isBatchMoving: false,
    isBatchDeleting: false,
    isUploading: false,
  }

  it('emits navigate for home and breadcrumb', async () => {
    const wrapper = mount(FileManagerToolbar, {
      props: baseProps,
      global: { stubs: { Button: ButtonStub } },
    })

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('navigate')).toMatchObject([[-1], [0]])
  })

  it('emits toggle-selection and batch actions', async () => {
    const wrapper = mount(FileManagerToolbar, {
      props: baseProps,
      global: { stubs: { Button: ButtonStub } },
    })

    const toggleBtn = wrapper.findAll('button').find(btn => btn.text().includes('批量操作') || btn.text().includes('取消选择'))
    await toggleBtn?.trigger('click')
    expect(wrapper.emitted('toggle-selection')).toBeTruthy()
  })

  it('emits files-selected when input changes', async () => {
    const wrapper = mount(FileManagerToolbar, {
      props: baseProps,
      global: { stubs: { Button: ButtonStub } },
    })

    const file = new File(['dummy'], 'test.png', { type: 'image/png' })
    const files = {
      0: file,
      length: 1,
      item: (idx: number) => (idx === 0 ? file : null),
    } as unknown as FileList

    const input = wrapper.find('input[type="file"]')
    const el = input.element as HTMLInputElement
    Object.defineProperty(el, 'files', { value: files })
    await input.trigger('change')

    const emitted = wrapper.emitted('files-selected') as FileList[] | undefined
    expect(emitted).toBeTruthy()
    const payload = emitted?.[0]?.[0] as FileList | undefined
    expect(payload).toBeTruthy()
    expect(payload?.item(0)?.name).toBe('test.png')
  })
})
