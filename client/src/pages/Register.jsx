import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/auth.js';
import { useToast } from '../context/toast.js';
import { registerSchema } from '../utils/validation.js';
import { applyServerErrors } from '../utils/forms.js';
import { FormField } from '../components/ui/FormField.jsx';
import { PasswordInput } from '../components/ui/PasswordInput.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Alert } from '../components/ui/Alert.jsx';

export default function Register() {
  const { register: registerAccount } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit({ name, email, password }) {
    setFormError(null);
    try {
      const user = await registerAccount({ name, email, password });
      toast.success(`Welcome, ${user.name.split(' ')[0]}!`, 'Your account is ready.');
      navigate('/', { replace: true });
    } catch (error) {
      if (error.status === 409) {
        setError('email', { type: 'server', message: error.message });
      } else if (!applyServerErrors(error, setError, ['name', 'email', 'password'])) {
        setFormError(error.message);
      }
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Create your account</h1>
      <p className="mt-2 text-sm text-muted">Start tracking your money in under a minute.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
        {formError && <Alert>{formError}</Alert>}

        <FormField label="Full name" error={errors.name?.message}>
          {(field) => <input {...field} autoComplete="name" placeholder="Your name" {...register('name')} />}
        </FormField>

        <FormField label="Email" error={errors.email?.message}>
          {(field) => (
            <input {...field} type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
          )}
        </FormField>

        <FormField
          label="Password"
          error={errors.password?.message}
          hint="At least 8 characters, with a letter and a number."
        >
          {(field) => <PasswordInput {...field} autoComplete="new-password" {...register('password')} />}
        </FormField>

        <FormField label="Confirm password" error={errors.confirmPassword?.message}>
          {(field) => <PasswordInput {...field} autoComplete="new-password" {...register('confirmPassword')} />}
        </FormField>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
