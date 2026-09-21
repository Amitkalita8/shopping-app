import { useEffect, useMemo, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID, loginWithGoogle, loginWithPassword, registerAccount } from '../authApi';
import UserAvatar from './UserAvatar';

const loginFields = [
  { id: 'login-identity', name: 'identity', label: 'Email or Mobile', type: 'text', autoComplete: 'username' },
  { id: 'login-password', name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
];

const registrationFields = [
  { id: 'register-full-name', name: 'fullName', label: 'Full Name', type: 'text', autoComplete: 'name' },
  { id: 'register-mobile', name: 'mobile', label: 'Mobile', type: 'tel', autoComplete: 'tel' },
  { id: 'register-email', name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { id: 'register-address', name: 'address', label: 'Delivery Address', type: 'text', autoComplete: 'street-address' },
  { id: 'register-state', name: 'state', label: 'State', type: 'text', autoComplete: 'address-level1' },
  { id: 'register-city', name: 'city', label: 'City', type: 'text', autoComplete: 'address-level2' },
  { id: 'register-pincode', name: 'pincode', label: 'PinCode', type: 'text', autoComplete: 'postal-code' },
  { id: 'register-password', name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', minLength: 8 },
  { id: 'register-gst', name: 'gst', label: 'Optional (GST Number)', type: 'text', autoComplete: 'off', optional: true },
];

const authTypeLabels = {
  normal: 'email and password',
  google: 'Google',
  both: 'email and password or Google',
};

let googleScriptPromise = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        googleScriptPromise = null;
        reject(new Error('Google sign-in could not be loaded.'));
      };
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

function AuthModal({ isOpen, onClose, user, onAuthenticated, onLogout }) {
  const [activeTab, setActiveTab] = useState('login');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleButtonRef = useRef(null);
  const googleCredentialHandlerRef = useRef(null);

  const formFields = useMemo(
    () => (activeTab === 'login' ? loginFields : registrationFields),
    [activeTab]
  );

  const completeAuthentication = ({ token, user: signedInUser }) => {
    onAuthenticated(signedInUser, token);
    setErrorMessage('');
    onClose();
  };

  googleCredentialHandlerRef.current = async ({ credential }) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      completeAuthentication(await loginWithGoogle(credential));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen || user || !GOOGLE_CLIENT_ID) {
      return undefined;
    }

    let isCancelled = false;

    loadGoogleScript()
      .then(() => {
        if (isCancelled || !googleButtonRef.current) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => googleCredentialHandlerRef.current(response),
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: Math.min(400, googleButtonRef.current.offsetWidth || 400),
        });
      })
      .catch((error) => {
        if (!isCancelled) {
          setErrorMessage(error.message);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, user, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrorMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const session =
        activeTab === 'login'
          ? await loginWithPassword(values.identity, values.password)
          : await registerAccount(values);

      form.reset();
      completeAuthentication(session);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    window.google?.accounts?.id?.disableAutoSelect();
    onLogout();
    onClose();
  };

  const title = user ? 'Your account' : activeTab === 'login' ? 'Login' : 'Registration';

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
              <h2 id="auth-modal-title">{title}</h2>
            </div>

            <button aria-label="Close login dialog" className="auth-modal__close" onClick={onClose} type="button">
              x
            </button>
          </div>

          {user ? (
            <div className="auth-session">
              <UserAvatar user={user} />
              <p className="auth-session__name">{user.fullName}</p>
              <p className="auth-session__meta">{user.email}</p>
              <p className="auth-session__meta">Signed in with {authTypeLabels[user.authType] ?? 'your account'}.</p>
              <button className="auth-form__submit" onClick={handleLogout} type="button">
                Log out
              </button>
            </div>
          ) : (
            <>
              <div className="auth-modal__tabs" role="tablist" aria-label="Account forms">
                <button
                  aria-selected={activeTab === 'login'}
                  className={activeTab === 'login' ? 'is-active' : ''}
                  onClick={() => handleTabChange('login')}
                  role="tab"
                  type="button"
                >
                  Login
                </button>
                <button
                  aria-selected={activeTab === 'register'}
                  className={activeTab === 'register' ? 'is-active' : ''}
                  onClick={() => handleTabChange('register')}
                  role="tab"
                  type="button"
                >
                  Register
                </button>
              </div>

              {GOOGLE_CLIENT_ID ? (
                <>
                  <div className="auth-google" ref={googleButtonRef} />
                  <p className="auth-divider">
                    <span>or use email</span>
                  </p>
                </>
              ) : null}

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
                        minLength={field.minLength}
                        name={field.name}
                        required={!field.optional}
                        type={field.type}
                      />
                    </label>
                  ))}
                </div>

                {errorMessage ? (
                  <p className="auth-form__error" role="alert">
                    {errorMessage}
                  </p>
                ) : null}

                <button className="auth-form__submit" disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Please wait...' : activeTab === 'login' ? 'Continue' : 'Create account'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default AuthModal;
