import { useEffect, useState } from 'react';
import { createAddress, fetchAddresses } from '../../addressApi';
import { getStoredToken } from '../../authApi';
import AddressForm from '../../components/AddressForm';
import {
  COD_CHARGE,
  PAYMENT_METHOD_COD,
  PAYMENT_METHOD_RAZORPAY,
  createCheckout,
  payWithRazorpay,
} from '../../checkoutApi';
import { useStorefront } from '../../StorefrontData';
import { formatCurrency } from '../../utils';

// Registering with email/password collects an address up front; signing in with Google does not,
// so checkout is where a Google-only shopper first gets asked to add one. Either way, a shopper
// with several saved addresses picks which one this order ships to.
function CheckoutPage({ cartItems, onNavigate, onOrderPlaced, user }) {
  const { settings } = useStorefront();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD_RAZORPAY);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const codCharge = paymentMethod === PAYMENT_METHOD_COD ? COD_CHARGE : 0;
  const total = subtotal + codCharge;
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;

  useEffect(() => {
    if (!user) {
      setIsAddressLoading(false);
      return;
    }

    let isCancelled = false;

    fetchAddresses(getStoredToken())
      .then(({ items }) => {
        if (isCancelled) return;
        setAddresses(items);
        setIsAddingAddress(items.length === 0);
        const preferred = items.find((address) => address.isDefault) ?? items[0];
        setSelectedAddressId(preferred?.id ?? null);
      })
      .catch((error) => {
        if (!isCancelled) setErrorMessage(error.message);
      })
      .finally(() => {
        if (!isCancelled) setIsAddressLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const handleAddressSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));

    setErrorMessage('');
    setIsSavingAddress(true);

    try {
      const saved = await createAddress(getStoredToken(), values);
      setAddresses((current) => [...current, saved]);
      setSelectedAddressId(saved.id);
      setIsAddingAddress(false);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    setErrorMessage('');
    setIsPlacingOrder(true);
    const token = getStoredToken();

    try {
      const response = await createCheckout(token, paymentMethod, selectedAddressId ?? undefined);

      // Cash on delivery, and online payment simulated as an instant success while no gateway is
      // configured yet, both come back with nothing further to do; only a real Razorpay order
      // needs the checkout widget.
      if (!response.razorpayOrderId) {
        onOrderPlaced();
        onNavigate(`/order-confirmation/${response.order.id}`);
        return;
      }

      await payWithRazorpay({
        address: selectedAddress,
        checkoutResponse: response,
        storeName: settings.storeName,
        token,
        onSuccess: (orderId) => {
          onOrderPlaced();
          onNavigate(`/order-confirmation/${orderId}`);
        },
        onFailure: (message) => setErrorMessage(message),
      });
    } catch (error) {
      if (error.code === 'address_required') {
        setIsAddingAddress(true);
      }
      setErrorMessage(error.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <main className="site-shell page-content">
        <div className="cart-empty">
          <p>Your cart is empty.</p>
          <button onClick={() => onNavigate('/')} type="button">
            Continue shopping
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="site-shell page-content">
      <section className="checkout-page">
        <div className="checkout-page__main">
          <p>Checkout</p>
          <h1>Delivery &amp; Payment</h1>

          <section className="checkout-section">
            <h2>Delivery address</h2>

            {isAddressLoading ? (
              <p>Loading your details...</p>
            ) : (
              <>
                {addresses.length > 0 ? (
                  <div className="address-select">
                    {addresses.map((address) => (
                      <label
                        className={`address-select__option ${selectedAddressId === address.id ? 'is-selected' : ''}`}
                        key={address.id}
                      >
                        <input
                          checked={selectedAddressId === address.id}
                          name="deliveryAddress"
                          onChange={() => setSelectedAddressId(address.id)}
                          type="radio"
                          value={address.id}
                        />
                        <span>
                          <strong>
                            {address.fullName} · {address.mobile}
                          </strong>
                          <em>
                            {address.addressLine1}, {address.city}, {address.state} - {address.pincode}
                          </em>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}

                {isAddingAddress ? (
                  <AddressForm
                    idPrefix="checkout-address"
                    isSubmitting={isSavingAddress}
                    onCancel={addresses.length > 0 ? () => setIsAddingAddress(false) : undefined}
                    onSubmit={handleAddressSubmit}
                  />
                ) : (
                  <button className="is-link" onClick={() => setIsAddingAddress(true)} type="button">
                    + Add a new address
                  </button>
                )}
              </>
            )}
          </section>

          <section className="checkout-section">
            <h2>Payment method</h2>

            <fieldset className="checkout-payment">
              <legend className="sr-only">Choose a payment method</legend>

              <label className={`checkout-payment__option ${paymentMethod === PAYMENT_METHOD_RAZORPAY ? 'is-selected' : ''}`}>
                <input
                  checked={paymentMethod === PAYMENT_METHOD_RAZORPAY}
                  name="paymentMethod"
                  onChange={() => setPaymentMethod(PAYMENT_METHOD_RAZORPAY)}
                  type="radio"
                  value={PAYMENT_METHOD_RAZORPAY}
                />
                <span>
                  <strong>Pay Online</strong>
                  <em>Cards, UPI and netbanking</em>
                </span>
              </label>

              <label className={`checkout-payment__option ${paymentMethod === PAYMENT_METHOD_COD ? 'is-selected' : ''}`}>
                <input
                  checked={paymentMethod === PAYMENT_METHOD_COD}
                  name="paymentMethod"
                  onChange={() => setPaymentMethod(PAYMENT_METHOD_COD)}
                  type="radio"
                  value={PAYMENT_METHOD_COD}
                />
                <span>
                  <strong>Cash on Delivery</strong>
                  <em>Rs {COD_CHARGE} handling charge added, payable on delivery</em>
                </span>
              </label>
            </fieldset>
          </section>

          {errorMessage ? (
            <p className="auth-form__error" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <aside className="cart-summary">
          <p>Summary</p>

          <div className="checkout-summary__list">
            {cartItems.map((item) => (
              <div className="checkout-summary__item" key={item.id}>
                <span>
                  {item.title} x {item.quantity}
                </span>
                <strong>{formatCurrency(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>

          <div className="checkout-summary__row">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>

          {codCharge > 0 ? (
            <div className="checkout-summary__row">
              <span>Cash on delivery charge</span>
              <strong>{formatCurrency(codCharge)}</strong>
            </div>
          ) : null}

          <h2>{formatCurrency(total)}</h2>
          <span>Total payable</span>

          <button
            disabled={isPlacingOrder || isAddressLoading || !selectedAddressId}
            onClick={handlePlaceOrder}
            type="button"
          >
            {isPlacingOrder ? 'Placing order...' : 'Place Order'}
          </button>
        </aside>
      </section>
    </main>
  );
}

export default CheckoutPage;
