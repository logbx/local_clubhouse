import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

interface RegisterFormData {
  name: string;
  email: string;
  phone?: string;
  roles: string[];
}

const ROLES = [
  { id: 'club_founder', label: 'Club Founder' },
  { id: 'member', label: 'Member' },
  { id: 'sponsor', label: 'Sponsor' },
  { id: 'creator', label: 'Creator' },
];

export default function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    phone: '',
    roles: [],
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterFormData & { password: string }) =>
      axios.post('http://localhost:3000/auth/register', data),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || formData.roles.length === 0) {
      return;
    }

    try {
      await registerMutation.mutateAsync({
        ...formData,
        password: 'temporary-password', // In a real app, add password field to form
      });
      // Handle successful registration (e.g., redirect to login)
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId],
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Create Account
          </h1>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input"
                placeholder="Personal or Business name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input"
                placeholder="Email Address"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="input"
                placeholder="Ex. +1 408 234 6594"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
              <p className="mt-1 text-sm text-gray-500">
                Be the first to connect with new opportunities
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                I Am or Interested in Becoming a: <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 space-y-2">
                {ROLES.map(role => (
                  <label key={role.id} className="inline-flex items-center mr-6">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-primary-600 rounded border-gray-300"
                      checked={formData.roles.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                    />
                    <span className="ml-2 text-gray-700">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Creating Account...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 