import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/auth.js';
import { loginSchema } from '../utils/validation.js';
import { applyServerErrors } from '../utils/forms.js';
import { FormField } from '../components/ui/FormField.jsx';
import { PasswordInput } from '../components/ui/PasswordInput.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Alert } from '../components/ui/Alert.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await login(values);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (error) {
      if (!applyServerErrors(error, setError, ['email', 'password'])) setFormError(error.message);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Sign in to continue to your SpendFlow dashboard.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
        {formError && <Alert>{formError}</Alert>}

        <FormField label="Email" error={errors.email?.message}>
          {(field) => (
            <input {...field} type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
          )}
        </FormField>

        <FormField label="Password" error={errors.password?.message}>
          {(field) => <PasswordInput {...field} autoComplete="current-password" {...register('password')} />}
        </FormField>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        New to SpendFlow?{' '}
        <Link to="/register" className="font-semibold text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
