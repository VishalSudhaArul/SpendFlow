import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/auth.js';
import { useToast } from '../context/toast.js';
import { CURRENCIES, changePasswordSchema, profileSchema } from '../utils/validation.js';
import { applyServerErrors } from '../utils/forms.js';
import { formatDate } from '../utils/format.js';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { PasswordInput } from '../components/ui/PasswordInput.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <ProfileForm />
        <Card>
          <CardHeader title="Account" description="Details of your SpendFlow account." />
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="mt-1 font-medium break-all">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Member since</dt>
              <dd className="mt-1 font-medium">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-border pt-5">
            <Button variant="secondary" onClick={() => setConfirmLogout(true)}>
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </Card>
      </div>
      <PasswordForm />

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        description="You will need to sign in again to see your finances."
        confirmLabel="Sign out"
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}

function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, currency: user.currency },
  });

  async function onSubmit(values) {
    try {
      const updated = await updateProfile(values);
      reset({ name: updated.name, currency: updated.currency });
      toast.success('Profile updated');
    } catch (error) {
      if (!applyServerErrors(error, setError, ['name', 'currency'])) toast.error('Could not update profile', error.message);
    }
  }

  return (
    <Card>
      <CardHeader title="Profile" description="How SpendFlow addresses you and shows amounts." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormField label="Full name" error={errors.name?.message}>
          {(field) => <input {...field} autoComplete="name" {...register('name')} />}
        </FormField>
        <FormField label="Currency" error={errors.currency?.message} hint="Used to display all amounts.">
          {(field) => (
            <select {...field} {...register('currency')}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const { changePassword } = useAuth();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit({ currentPassword, newPassword }) {
    try {
      await changePassword({ currentPassword, newPassword });
      reset();
      toast.success('Password changed', 'Other devices have been signed out.');
    } catch (error) {
      if (!applyServerErrors(error, setError, ['currentPassword', 'newPassword'])) {
        toast.error('Could not change password', error.message);
      }
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader title="Change password" description="Changing it signs you out on every other device." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormField label="Current password" error={errors.currentPassword?.message}>
          {(field) => <PasswordInput {...field} autoComplete="current-password" {...register('currentPassword')} />}
        </FormField>
        <FormField
          label="New password"
          error={errors.newPassword?.message}
          hint="At least 8 characters, with a letter and a number."
        >
          {(field) => <PasswordInput {...field} autoComplete="new-password" {...register('newPassword')} />}
        </FormField>
        <FormField label="Confirm new password" error={errors.confirmPassword?.message}>
          {(field) => <PasswordInput {...field} autoComplete="new-password" {...register('confirmPassword')} />}
        </FormField>
        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}
