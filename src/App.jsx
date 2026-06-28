import DJPoolDemo from "./DJPoolDemo";
import { AppSettingsProvider } from "./lib/i18n/AppSettingsContext";

function App() {
  return (
    <AppSettingsProvider>
      <DJPoolDemo />
    </AppSettingsProvider>
  );
}

export default App;