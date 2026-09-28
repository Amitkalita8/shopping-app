// Shared field list for every address form (registration, checkout, and the account modal), so
// the same labels, order and validation apply everywhere an address is collected.
export const addressFormFields = [
  { name: 'fullName', label: 'Full Name', type: 'text', autoComplete: 'name' },
  { name: 'mobile', label: 'Mobile', type: 'tel', autoComplete: 'tel' },
  { name: 'addressLine1', label: 'Delivery Address', type: 'text', autoComplete: 'street-address', full: true },
  { name: 'state', label: 'State', type: 'text', autoComplete: 'address-level1' },
  { name: 'city', label: 'City', type: 'text', autoComplete: 'address-level2' },
  { name: 'pincode', label: 'PinCode', type: 'text', autoComplete: 'postal-code', minLength: 6 },
];
