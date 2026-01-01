<script setup lang="ts">
  import type { CustomValidateResolveType, FormInstanceFunctions, FormProps } from 'tdesign-vue-next';

  interface Props {
    visible: boolean;
  }
  const props = defineProps<Props>();
  const emit = defineEmits<{
    'update:visible': [boolean];
  }>();

  const router = useRouter();
  const form = reactive({ loginToken: '' });
  const refForm = ref<FormInstanceFunctions>();
  const localVisible = ref(false);

  function onClose() {}

  async function onConfirm() {
    const storeLogin = useStoreLogin();
    try {
      const validateResult = await refForm.value?.validate();
      if (typeof validateResult !== 'boolean') {
        return MessagePlugin.error('Please enter the required fields');
      }

      await storeLogin.login(form.loginToken);
      await getVerify();
      MessagePlugin.success('Login successful');
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      MessagePlugin.error(error.message);
    }
  }

  const { loginTokenLength } = useRuntimeConfig().public;

  function validateLoginToken(value: string): CustomValidateResolveType {
    if (!value) {
      return { message: 'Please enter your login token', result: false, type: 'error' };
    }
    if (value.length < loginTokenLength) {
      return { message: `Please enter at least ${loginTokenLength} characters`, result: false, type: 'error' };
    }
    if (/^\d+$/.test(value)) {
      return { message: 'Login token cannot be pure numbers', result: false, type: 'error' };
    }
    return { message: '', result: true, type: undefined };
  }

  const formRules: FormProps['rules'] = {
    loginToken: [{ validator: validateLoginToken }],
  };

  onMounted(() => {
    localVisible.value = props.visible;
  });

  watch(
    () => props.visible,
    newValue => {
      localVisible.value = newValue;
    },
  );

  watch(localVisible, newValue => {
    emit('update:visible', newValue);
  });
</script>

<template>
  <ClientOnly>
    <t-dialog
      v-model:visible="localVisible"
      placement="center"
      header="Login"
      width="40%"
      :close-on-overlay-click="false"
      :on-confirm="onConfirm"
      cancel-btn="Cancel"
      confirm-btn="Login"
      @close="onClose"
    >
      <t-space v-if="localVisible" direction="vertical" class="w-full">
        <t-form ref="refForm" :rules="formRules" :data="form">
          <t-form-item label="Login token" name="loginToken">
            <t-input
              v-model="form.loginToken"
              placeholder="Please enter your login token"
              type="password"
              :autofocus="true"
              clearable
            />
          </t-form-item>
        </t-form>
      </t-space>
    </t-dialog>
  </ClientOnly>
</template>
