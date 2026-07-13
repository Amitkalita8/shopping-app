import { useMemo, useState } from 'react';

const loginFields = [
  { id: 'login-identity', label: 'Email or Mobile', type: 'text', autoComplete: 'username' },
  { id: 'login-password', label: 'Password', type: 'password', autoComplete: 'current-password' },
];

const registrationFields = [
  { id: 'register-full-name', label: 'Full Name', type: 'text', autoComplete: 'name' },
  { id: 'register-mobile', label: 'Mobile', type: 'tel', autoComplete: 'tel' },
  { id: 'register-email', label: 'Email', type: 'email', autoComplete: 'email' },
  { id: 'register-address', label: 'Delivery Address', type: 'text', autoComplete: 'street-address' },
  { id: 'register-state', label: 'State', type: 'text', autoComplete: 'address-level1' },
  { id: 'register-city', label: 'City', type: 'text', autoComplete: 'address-level2' },
  { id: 'register-pincode', label: 'PinCode', type: 'text', autoComplete: 'postal-code' },
  { id: 'register-password', label: 'Password', type: 'password', autoComplete: 'new-password' },
  { id: 'register-gst', label: 'Optional (GST Number)', type: 'text', autoComplete: 'off', optional: true },
];

function AuthModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('login');

  const formFields = useMemo(
    () => (activeTab === 'login' ? loginFields : registrationFields),
    [activeTab]
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    onClose();
  };

  return (
    <>
      <button
        aria-label="Close login dialog"
        className={`overlay-backdrop overlay-backdrop--modal ${isOpen ? 'is-visible' : ''}`}
        onClick={onClose}
        type="button"
      />

      <section
        aria-hidden={!isOpen}
        aria-labelledby="auth-modal-title"
        className={`auth-modal ${isOpen ? 'is-open' : ''}`}
        role="dialog"
      >
        <div className="auth-modal__panel">
          <div className="auth-modal__header">
            <div>
              <p className="auth-modal__eyebrow">Account</p>
              <h2 id="auth-modal-title">{activeTab === 'login' ? 'Login' : 'Registration'}</h2>
            </div>

            <button aria-label="Close login dialog" className="auth-modal__close" onClick={onClose} type="button">
              x
            </button>
          </div>

          <div className="auth-modal__tabs" role="tablist" aria-label="Account forms">
            <button
              aria-selected={activeTab === 'login'}
              className={activeTab === 'login' ? 'is-active' : ''}
              onClick={() => setActiveTab('login')}
              role="tab"
              type="button"
            >
              Login
            </button>
            <button
              aria-selected={activeTab === 'register'}
              className={activeTab === 'register' ? 'is-active' : ''}
              onClick={() => setActiveTab('register')}
              role="tab"
              type="button"
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className={activeTab === 'register' ? 'auth-form__grid' : 'auth-form__stack'}>
              {formFields.map((field) => (
                <label
                  className={field.id === 'register-address' ? 'auth-field auth-field--full' : 'auth-field'}
                  htmlFor={field.id}
                  key={field.id}
                >
                  <span>
                    {field.label}
                    {field.optional ? <em>Optional</em> : null}
                  </span>
                  <input
                    autoComplete={field.autoComplete}
                    id={field.id}
                    required={!field.optional}
                    type={field.type}
                  />
                </label>
              ))}
            </div>

            <button className="auth-form__submit" type="submit">
              {activeTab === 'login' ? 'Continue' : 'Create account'}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

export default AuthModal;
