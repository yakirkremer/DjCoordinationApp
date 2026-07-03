import DJPoolDemo from "./DJPoolDemo";
import ErrorBoundary from "./components/ErrorBoundary";
import { AppSettingsProvider, useI18n } from "./lib/i18n/AppSettingsContext";

function AppShell() {
  const { t } = useI18n();

  return (
    <ErrorBoundary
      label="root"
      title={t("errors.boundaryTitle")}
      message={t("errors.boundaryBody")}
      retryLabel={t("errors.boundaryAction")}
      refreshLabel={t("errors.boundaryRefresh")}
    >
      <DJPoolDemo />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <AppSettingsProvider>
      <AppShell />
    </AppSettingsProvider>
  );
}

export default App;