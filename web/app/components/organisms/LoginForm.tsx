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

const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginForm = () => {
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const { login: setAuth } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
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
      setApiError(error?.data?.detail || 'An error occurred during login. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {apiError && (
        <Alert variant="error" title="Login Failed">
          {apiError}
        </Alert>
      )}

      <FormField
        label="Username"
        type="text"
        placeholder="Enter your username"
        error={errors.username?.message}
        required
        {...register('username')}
      />

      <FormField
        label="Password"
        type="password"
        placeholder="Enter your password"
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
        Sign In
      </Button>
    </form>
  );
};

export default LoginForm;
