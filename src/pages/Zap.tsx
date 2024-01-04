import ResponsiveAppBar from "../components/ResponsiveAppBar";

const Zap = () => (
  <>
    <ResponsiveAppBar />

    <form action="https://localhost:4000/zap">
      <input name="amount" />
      <button type="submit">Zap</button>
    </form>
  </>
);

export default Zap;
