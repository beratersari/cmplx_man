'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useLoginMutation } from '../../store/apiSlice';
import { useAuth } from '../../hooks/useAuth';
import Button from '../atoms/Button';
import FormField from '../molecules/FormField';
import Alert from '../atoms/Alert';
import { useState } from 'react';
import { useTranslation } from '../../locales';

const loginSchema = (t: any) => z.object({
  username: z
    .string()
    .min(1, t('dashboard.login.form.usernameRequired') || 'Username is required')
    .min(3, t('dashboard.login.form.usernameMinLength') || 'Username must be at least 3 characters')
    .max(50, t('dashboard.login.form.usernameMaxLength') || 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, t('dashboard.login.form.usernameRegex') || 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z
    .string()
    .min(1, t('dashboard.login.form.passwordRequired') || 'Password is required')
    .min(8, t('dashboard.login.form.passwordMinLength') || 'Password must be at least 8 characters'),
});

type LoginFormData = {
  username: string;
  password: string;
};

const LoginForm = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const { login: setAuth } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema(t)),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setApiError(null);
      const result = await login(data).unwrap();
      setAuth(result.access_token);
      // Store username for header display
      if (typeof window !== 'undefined') {
        localStorage.setItem('username', data.username);
      }
      router.push('/dashboard');
    } catch (error: any) {
      setApiError(error?.data?.detail || t('dashboard.login.form.errorOccurred') || 'An error occurred during login. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {apiError && (
        <Alert variant="error" title={t('dashboard.login.failed')}>
          {apiError}
        </Alert>
      )}

      <FormField
        label={t('dashboard.login.username')}
        type="text"
        placeholder={t('dashboard.login.usernamePlaceholder')}
        error={errors.username?.message}
        required
        {...register('username')}
      />

      <FormField
        label={t('dashboard.login.password')}
        type="password"
        placeholder={t('dashboard.login.passwordPlaceholder')}
        error={errors.password?.message}
        required
        {...register('password')}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        isLoading={isLoading}
      >
        {t('dashboard.login.signIn')}
      </Button>
    </form>
  );
};

export default LoginForm;
