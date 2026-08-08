import { FormEvent, useState } from 'react';

interface CustomerFormValues {
  customer_name: string;
  customer_phone: string;
}

interface CustomerFormProps {
  onSubmit: (values: CustomerFormValues) => void;
  submitting: boolean;
  disabled?: boolean;
  initialName?: string;
}

export function CustomerForm({
  onSubmit,
  submitting,
  disabled,
  initialName = '',
}: CustomerFormProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    if (!name.trim() || !phone.trim()) return;
    onSubmit({ customer_name: name.trim(), customer_phone: phone.trim() });
  }

  return (
    <form className="card customer-form" onSubmit={handleSubmit} aria-label="Customer details">
      <h3>Your details</h3>
      <label className="field">
        <span>Full name</span>
        <input
          name="customer_name"
          type="text"
          autoComplete="name"
          maxLength={100}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-required="true"
        />
      </label>
      <label className="field">
        <span>Phone</span>
        <input
          name="customer_phone"
          type="tel"
          autoComplete="tel"
          minLength={4}
          maxLength={30}
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-required="true"
        />
      </label>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting || disabled || !name.trim() || !phone.trim()}
      >
        {submitting ? 'Holding seats…' : 'Hold these seats'}
      </button>
    </form>
  );
}