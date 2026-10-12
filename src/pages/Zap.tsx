import ResponsiveAppBar from "../components/ResponsiveAppBar";
import { FormEvent, useRef, useState } from "react";
import {
  parseMaxSats,
  requestInvoice,
  resolveZapEndpoint,
} from "../common/zap-api";

const styles = {
  form: {
    padding: "5rem",
  },
};

const Zap = () => {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [paymentHash, setPaymentHash] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);

  // CRA exposes only REACT_APP_ variables at build time. Neither the LNbits
  // invoice key nor other server-side credentials are included in the bundle.
  const endpoint = resolveZapEndpoint(
    process.env.REACT_APP_ZAP_API_ORIGIN,
    process.env.NODE_ENV === "development" && window.location.protocol === "http:"
  );
  const maxSats = parseMaxSats(process.env.REACT_APP_MAX_INVOICE_SATS);
  const configured = endpoint !== null && maxSats !== null;

  const zapper = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (endpoint === null || maxSats === null || pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setErrorMessage("");
    setPaymentHash("");
    try {
      setPaymentHash(await requestInvoice(endpoint, amount, memo, maxSats));
    } catch (error) {
      setErrorMessage(error instanceof Error
        ? error.message
        : "Unable to create an invoice. Try again later.");
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <ResponsiveAppBar />
      <div style={styles.form}>
        <h1>Create a Lightning invoice</h1>
        {!configured && (
          <p role="alert">
            Invoice creation is not configured. Contact the site operator.
          </p>
        )}
        <form onSubmit={zapper}>
          <label htmlFor="amount">Amount (satoshis):</label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="1"
            max={maxSats || undefined}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
            disabled={!configured || submitting}
          />
          <label htmlFor="memo">Memo:</label>
          <input
            id="memo"
            name="memo"
            type="text"
            maxLength={200}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            disabled={!configured || submitting}
          />
          <button type="submit" disabled={!configured || submitting}>
            {submitting ? "Creating invoice…" : "Create invoice"}
          </button>
        </form>
        <div role="status" aria-live="polite">
          {paymentHash && <p>Invoice payment hash: {paymentHash}</p>}
          {errorMessage && <p>{errorMessage}</p>}
        </div>
      </div>
    </>
  );
};

export default Zap;
