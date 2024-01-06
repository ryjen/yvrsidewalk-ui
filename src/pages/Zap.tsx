import ResponsiveAppBar from "../components/ResponsiveAppBar";
import { useState } from "react";

const styles = {
  form: {
    padding: "5rem",
  },
};

const Zap = () => {
  const [state, setState] = useState("");

  const zapper = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const target = e.target as typeof e.target & {
      amount: { value: number };
      memo: { value: string };
    };
    const payload = {
      amount: target.amount.value,
      memo: target.memo.value,
    };
    try {
      const response = await fetch("https://localhost:4000/zap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setState(data.payment_hash);
    } catch (error) {
      console.error("Error creating LNBits invoice:", error);
    }
  };
  return (
    <>
      <ResponsiveAppBar />

      <div style={styles.form}>
        <form onSubmit={zapper}>
          <label htmlFor="amount">Amount:</label>
          <input id="amount" name="amount" type="number" required />
          <label htmlFor="memo">Memo:</label>
          <input id="memo" name="memo" type="text" required />
          <button type="submit">Zap</button>
        </form>

        <p>{state}</p>
      </div>
    </>
  );
};

export default Zap;
