import ResponsiveAppBar from "../components/ResponsiveAppBar";
import { useState } from "react";

const Zap = () => {
  const [state, setState] = useState("");

  const zapper = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const target = e.target as typeof e.target & {
      amount: { value: number };
      memo: { value: string };
    };
    console.log(target);
    const { amount, memo } = target;
    try {
      const response = await fetch("https://localhost:4000/zap", {
        method: "POST",
        body: JSON.stringify({ amount, memo }),
      });
      const { payment_hash } = await response.json();
      setState(payment_hash);
    } catch (error) {
      console.error("Error creating LNBits invoice:", error);
    }
  };
  return (
    <>
      <ResponsiveAppBar />

      <form onSubmit={zapper}>
        <label htmlFor="amount">Amount:</label>
        <input id="amount" name="amount" type="number" required />
        <label htmlFor="memo">Memo:</label>
        <input id="memo" name="memo" type="text" required />
        <button type="submit">Zap</button>
      </form>

      <div>{state}</div>
    </>
  );
};

export default Zap;
