import { addressFormFields } from '../addressFields';

// Reused everywhere an address is added or edited: the account modal and checkout.
function AddressForm({ defaultValues, idPrefix, isSubmitting, onCancel, onSubmit, submitLabel = 'Save address' }) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="auth-form__grid">
        {addressFormFields.map((field) => (
          <label
            className={field.full ? 'auth-field auth-field--full' : 'auth-field'}
            htmlFor={`${idPrefix}-${field.name}`}
            key={field.name}
          >
            <span>{field.label}</span>
            <input
              autoComplete={field.autoComplete}
              defaultValue={defaultValues?.[field.name] ?? ''}
              id={`${idPrefix}-${field.name}`}
              minLength={field.minLength}
              name={field.name}
              required
              type={field.type}
            />
          </label>
        ))}
      </div>

      <div className="auth-form__actions">
        <button className="auth-form__submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
        {onCancel ? (
          <button className="is-link" onClick={onCancel} type="button">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default AddressForm;
