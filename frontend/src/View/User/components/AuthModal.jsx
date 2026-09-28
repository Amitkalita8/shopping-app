import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from '../addressApi';
import {
  GOOGLE_CLIENT_ID,
  deleteAccount,
  getStoredToken,
  loginWithGoogle,
  loginWithPassword,
  registerAccount,
  updateProfile,
} from '../authApi';
import AddressForm from './AddressForm';
import AddressList from './AddressList';
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

function AuthModal({ isOpen, onClose, user, onAuthenticated, onLogout, onNavigate, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState('login');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleButtonRef = useRef(null);
  const googleCredentialHandlerRef = useRef(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [addresses, setAddresses] = useState([]);
  const [isAddressesLoading, setIsAddressesLoading] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  // The account tools (profile, addresses, delete) reset whenever the modal is closed or a
  // different account signs in, so reopening it never shows a stale in-progress edit.
  useEffect(() => {
    setIsEditingProfile(false);
    setProfileError('');
    setIsAddingAddress(false);
    setEditingAddress(null);
    setAddressError('');
    setIsConfirmingDelete(false);
    setDeletePassword('');
    setDeleteError('');
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (!isOpen || !user) {
      return;
    }

    let isCancelled = false;
    setIsAddressesLoading(true);

    fetchAddresses(getStoredToken())
      .then(({ items }) => {
        if (!isCancelled) setAddresses(items);
      })
      .catch((error) => {
        if (!isCancelled) setAddressError(error.message);
      })
      .finally(() => {
        if (!isCancelled) setIsAddressesLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, user]);

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

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));

    setProfileError('');
    setIsSavingProfile(true);

    try {
      const { user: updated } = await updateProfile(getStoredToken(), values);
      onProfileUpdated(updated);
      setIsEditingProfile(false);
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddressSubmit = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));

    setAddressError('');
    setIsSavingAddress(true);

    try {
      if (editingAddress) {
        const saved = await updateAddress(getStoredToken(), editingAddress.id, values);
        setAddresses((current) => current.map((address) => (address.id === saved.id ? saved : address)));
      } else {
        const saved = await createAddress(getStoredToken(), values);
        setAddresses((current) => [...current, saved]);
      }

      setEditingAddress(null);
      setIsAddingAddress(false);
    } catch (error) {
      setAddressError(error.message);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    setAddressError('');

    try {
      await deleteAddress(getStoredToken(), addressId);
      setAddresses((current) => current.filter((address) => address.id !== addressId));
    } catch (error) {
      setAddressError(error.message);
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    setAddressError('');

    try {
      await setDefaultAddress(getStoredToken(), addressId);
      setAddresses((current) => current.map((address) => ({ ...address, isDefault: address.id === addressId })));
    } catch (error) {
      setAddressError(error.message);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setIsDeletingAccount(true);

    try {
      await deleteAccount(getStoredToken(), deletePassword);
      onLogout();
      onClose();
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setIsDeletingAccount(false);
    }
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
        className={`auth-modal ${isOpen ? 'is-open' : ''} ${user ? 'auth-modal--account' : ''}`}
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

              <button
                className="account-orders-link"
                onClick={() => {
                  onNavigate('/orders');
                  onClose();
                }}
                type="button"
              >
                My Orders
              </button>

              <section className="account-section">
                <div className="account-section__header">
                  <h3>Profile</h3>
                  {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} type="button">
                      Edit
                    </button>
                  ) : null}
                </div>

                {isEditingProfile ? (
                  <form className="auth-form" onSubmit={handleProfileSubmit}>
                    <div className="auth-form__stack">
                      <label className="auth-field" htmlFor="profile-full-name">
                        <span>Full Name</span>
                        <input defaultValue={user.fullName} id="profile-full-name" name="fullName" required type="text" />
                      </label>
                      <label className="auth-field" htmlFor="profile-gst">
                        <span>
                          GST Number<em>Optional</em>
                        </span>
                        <input defaultValue={user.gst} id="profile-gst" name="gst" maxLength={15} type="text" />
                      </label>
                    </div>

                    {profileError ? (
                      <p className="auth-form__error" role="alert">
                        {profileError}
                      </p>
                    ) : null}

                    <div className="auth-form__actions">
                      <button className="auth-form__submit" disabled={isSavingProfile} type="submit">
                        {isSavingProfile ? 'Saving...' : 'Save changes'}
                      </button>
                      <button className="is-link" onClick={() => setIsEditingProfile(false)} type="button">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="auth-session__meta">GST number: {user.gst || 'Not added'}</p>
                )}
              </section>

              <section className="account-section">
                <div className="account-section__header">
                  <h3>Addresses</h3>
                </div>

                {addressError ? (
                  <p className="auth-form__error" role="alert">
                    {addressError}
                  </p>
                ) : null}

                {isAddressesLoading ? (
                  <p className="auth-session__meta">Loading addresses...</p>
                ) : (
                  <AddressList
                    addresses={addresses}
                    onDelete={handleDeleteAddress}
                    onEdit={(address) => {
                      setEditingAddress(address);
                      setIsAddingAddress(false);
                    }}
                    onSetDefault={handleSetDefaultAddress}
                  />
                )}

                {isAddingAddress || editingAddress ? (
                  <AddressForm
                    defaultValues={editingAddress}
                    idPrefix="account-address"
                    isSubmitting={isSavingAddress}
                    onCancel={() => {
                      setIsAddingAddress(false);
                      setEditingAddress(null);
                    }}
                    onSubmit={handleAddressSubmit}
                    submitLabel={editingAddress ? 'Save changes' : 'Add address'}
                  />
                ) : (
                  <button className="is-link" onClick={() => setIsAddingAddress(true)} type="button">
                    + Add a new address
                  </button>
                )}
              </section>

              <button className="auth-form__submit" onClick={handleLogout} type="button">
                Log out
              </button>

              <section className="account-section account-section--danger">
                {!isConfirmingDelete ? (
                  <button className="account-danger__trigger" onClick={() => setIsConfirmingDelete(true)} type="button">
                    Delete my account
                  </button>
                ) : (
                  <div className="account-danger">
                    <p>
                      This permanently deletes your account, saved addresses, cart and wishlist. Past orders are kept
                      for records but no longer linked to you. This cannot be undone.
                    </p>

                    {user.authType !== 'google' ? (
                      <label className="auth-field" htmlFor="delete-password">
                        <span>Confirm your password</span>
                        <input
                          id="delete-password"
                          onChange={(event) => setDeletePassword(event.target.value)}
                          type="password"
                          value={deletePassword}
                        />
                      </label>
                    ) : null}

                    {deleteError ? (
                      <p className="auth-form__error" role="alert">
                        {deleteError}
                      </p>
                    ) : null}

                    <div className="auth-form__actions">
                      <button
                        className="account-danger__confirm"
                        disabled={isDeletingAccount}
                        onClick={handleDeleteAccount}
                        type="button"
                      >
                        {isDeletingAccount ? 'Deleting...' : 'Yes, delete my account'}
                      </button>
                      <button
                        className="is-link"
                        onClick={() => {
                          setIsConfirmingDelete(false);
                          setDeletePassword('');
                          setDeleteError('');
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </section>
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
