import STYLES from "./App.module.css";
import KoFi from "./components/KoFi";
import { Metadata } from "./components/Metadata";

function App() {
  return (
    <div className={STYLES.App}>
      <div>Hello world</div>
      <Metadata />
      <KoFi />
    </div>
  );
}

export default App;
