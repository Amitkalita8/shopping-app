// A saved address, with the actions the account modal and checkout each need. Pass only the
// callbacks a given screen supports (checkout's selector has none of these; the account modal has
// all three).
function AddressList({ addresses, onDelete, onEdit, onSetDefault }) {
  return (
    <div className="address-list">
      {addresses.map((address) => (
        <div className={`address-list__item ${address.isDefault ? 'is-default' : ''}`} key={address.id}>
          <div className="address-list__details">
            <p>
              <strong>{address.fullName}</strong> · {address.mobile}
              {address.isDefault ? <span className="address-list__badge">Default</span> : null}
            </p>
            <p>
              {address.addressLine1}, {address.city}, {address.state} - {address.pincode}
            </p>
          </div>

          {onEdit || onDelete || onSetDefault ? (
            <div className="address-list__actions">
              {onSetDefault && !address.isDefault ? (
                <button onClick={() => onSetDefault(address.id)} type="button">
                  Set default
                </button>
              ) : null}
              {onEdit ? (
                <button onClick={() => onEdit(address)} type="button">
                  Edit
                </button>
              ) : null}
              {onDelete ? (
                <button className="is-link" onClick={() => onDelete(address.id)} type="button">
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default AddressList;
