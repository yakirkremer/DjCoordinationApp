import React, { useState, useEffect, useCallback, useRef } from "react";
import TrackList from "./components/TrackList";
import AdminTable from "./components/AdminTable";
import GlobalPlayer from "./components/GlobalPlayer";
import CategorySelector from "./components/CategorySelector";
import ClientLogin from "./components/ClientLogin";
import ClientManager from "./components/ClientManager";
import AdminTabNav from "./components/AdminTabNav";
import AdminDashboard from "./components/AdminDashboard";
import FormBuilder from "./components/FormBuilder";
import PreferencesWizard from "./components/PreferencesWizard";
import TrackUploadPanel from "./components/TrackUploadPanel";
import DropboxImportPanel from "./components/DropboxImportPanel";
import TrackReloadButton from "./components/TrackReloadButton";
import useTrackFeedback from "./hooks/useTrackFeedback";
import useFormSchema from "./hooks/useFormSchema";
import useClients from "./hooks/useClients";
import useDropboxImport from "./hooks/useDropboxImport";
import { OFFICIAL_CATEGORIES } from "./lib/categories";
import { normalizePreviewCue } from "./lib/previewCue";
import { resolveTrackAudioUrl, verifyLocalTrack, verifyTracks } from "./lib/trackAudioUrl";
import { deleteTrack } from "./lib/api/uploadTrack";
import { countMissingTracks } from "./lib/trackSource";
import useAudioPreload from "./hooks/useAudioPreload";
import { fetchCatalog, saveCatalog } from "./lib/api/dataApi";

export default function DJPoolDemo() {
  const [tracks, setTracks] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [catalogError, setCatalogError] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState("catalog");

  const { clients, activeClient, createClient, deleteClient, login, logout, ready: clientsReady } = useClients();
  const {
    ratings,
    comments,
    selectedCategories,
    categoryRatings,
    preferences,
    ready: feedbackReady,
    rateTrack,
    setComment,
    toggleCategory,
    rateCategory,
    updatePreferences,
    completeWizard,
    skipWizard,
    reopenWizard,
    saveWizardProgress,
  } = useTrackFeedback(activeClient?.id ?? null);

  const formSchemaApi = useFormSchema();
  const { schema: formSchema, ready: formReady } = formSchemaApi;
  const dropboxImport = useDropboxImport();
  const catalogSaveTimer = useRef(null);
  const verifyTrackTimer = useRef({});

  const appReady = clientsReady && formReady && catalogStatus === "ready";
  const coupleReady = !activeClient || feedbackReady;

  const resolveTrackUrl = useCallback((track) => resolveTrackAudioUrl(track), []);

  const canPreload =
    catalogStatus === "ready" && tracks.some((t) => t.isMissing !== true);

  useAudioPreload(tracks, currentTrack?.id ?? null, canPreload);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setCatalogStatus("loading");
      setCatalogError(null);

      try {
        let data;
        try {
          data = await fetchCatalog();
        } catch {
          const res = await fetch("/data/catalog.json");
          if (!res.ok) throw new Error(`Catalog not found (${res.status})`);
          data = await res.json();
        }

        const verifiedTracks = await verifyTracks(
          data.map((track) => {
            const { isMissing, ...rest } = track;
            return normalizePreviewCue(rest);
          })
        );

        if (cancelled) return;
        setTracks(verifiedTracks);
        setCatalogStatus("ready");

        const firstValid = verifiedTracks.find((t) => !t.isMissing);
        if (firstValid) setCurrentTrack(firstValid);
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading music catalog:", err);
        setCatalogError(err.message || "Failed to load catalog");
        setCatalogStatus("error");
      }
    }

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistCatalog = useCallback((nextTracks) => {
    clearTimeout(catalogSaveTimer.current);
    catalogSaveTimer.current = setTimeout(() => {
      const forSave = nextTracks.map(({ audioVersion, isMissing, ...track }) => track);
      saveCatalog(forSave).catch((err) => console.error("Catalog save failed:", err));
    }, 250);
  }, []);

  const handleUpdateTrack = useCallback(
    (id, field, value) => {
      const val =
        field === "startTime" || field === "endTime" || field === "duration"
          ? parseInt(value, 10) || 0
          : value;

      setTracks((prev) => {
        const updated = prev.map((t) => {
          if (t.id !== id) return t;
          return normalizePreviewCue({ ...t, [field]: val });
        });
        persistCatalog(updated);
        return updated;
      });

      setCurrentTrack((prev) => {
        if (prev?.id !== id) return prev;
        return normalizePreviewCue({ ...prev, [field]: val });
      });

      if (field === "filename" || field === "bucket") {
        clearTimeout(verifyTrackTimer.current[id]);
        verifyTrackTimer.current[id] = setTimeout(() => {
          setTracks((prev) => {
            const track = prev.find((t) => t.id === id);
            if (track) {
              verifyLocalTrack(track).then((exists) => {
                const isMissing = !exists;
                setTracks((current) =>
                  current.map((t) => (t.id === id ? { ...t, isMissing } : t))
                );
                setCurrentTrack((current) =>
                  current?.id === id ? { ...current, isMissing } : current
                );
              });
            }
            return prev;
          });
        }, 500);
      }
    },
    [persistCatalog]
  );

  const handleUpdateTrackCue = useCallback(
    (id, { startTime, endTime }) => {
      setTracks((prev) => {
        const updated = prev.map((t) => {
          if (t.id !== id) return t;
          return normalizePreviewCue({ ...t, startTime, endTime });
        });
        persistCatalog(updated);
        return updated;
      });

      setCurrentTrack((prev) => {
        if (prev?.id !== id) return prev;
        return normalizePreviewCue({ ...prev, startTime, endTime });
      });
    },
    [persistCatalog]
  );

  const handleDeleteTrack = async (id) => {
    const track = tracks.find((t) => t.id === id);
    const label = track ? `${track.title} — ${track.artist}` : "שיר זה";
    const confirmed = window.confirm(
      `למחוק את "${label}"?\n\nיימחק מהקטלוג וגם קובץ ה-MP3 מהשרת (אם קיים).`
    );
    if (!confirmed) return;

    try {
      await deleteTrack(id);
      const updated = tracks.filter((t) => t.id !== id);
      setTracks(updated);
      if (currentTrack?.id === id) {
        setCurrentTrack(updated.find((t) => !t.isMissing) || updated[0] || null);
        setIsPlaying(false);
      }
    } catch (err) {
      window.alert(err.message || "מחיקה נכשלה");
    }
  };

  const handleTrackSelect = (track) => {
    const normalized = normalizePreviewCue(track);
    if (currentTrack?.id === normalized.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(normalized);
      setCurrentTime(normalized.startTime);
      setIsPlaying(true);
    }
  };

  const handleAdminPreviewTrack = (track, { play = false } = {}) => {
    const normalized = normalizePreviewCue(track);
    const isSame = currentTrack?.id === normalized.id;

    if (normalized.isMissing) {
      setCurrentTrack(normalized);
      setIsPlaying(false);
      return;
    }

    setCurrentTrack(normalized);
    setCurrentTime(normalized.startTime);
    if (play) {
      setIsPlaying(isSame ? !isPlaying : true);
    } else if (!isSame) {
      setIsPlaying(false);
    }
  };

  const downloadJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tracks, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "catalog.json");
    dlAnchor.click();
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleTrackUploaded = (newTrack) => {
    handleTracksImported([newTrack]);
  };

  const handleTracksImported = (importedTracks) => {
    if (!importedTracks?.length) return;
    const normalized = importedTracks.map((t) => normalizePreviewCue({ ...t, isMissing: false }));
    const updated = [...tracks, ...normalized];
    setTracks(updated);
    setCatalogStatus("ready");
    persistCatalog(updated);
    const first = normalized[0];
    setCurrentTrack(first);
    setCurrentTime(first.startTime ?? 0);
    setIsPlaying(false);
  };

  const handleTrackReloaded = useCallback(
    (reloadedTrack) => {
      const normalized = normalizePreviewCue({
        ...reloadedTrack,
        isMissing: false,
        audioVersion: Date.now(),
      });
      const updated = tracks.map((t) => (t.id === normalized.id ? normalized : t));
      setTracks(updated);
      persistCatalog(updated);
      if (currentTrack?.id === normalized.id) {
        setCurrentTrack(normalized);
        setCurrentTime(normalized.startTime ?? 0);
        setIsPlaying(false);
      }
    },
    [tracks, currentTrack?.id, persistCatalog]
  );

  const handleRefreshTrackFiles = useCallback(async () => {
    const verified = await verifyTracks(tracks);
    const normalized = verified.map((t) => normalizePreviewCue(t));
    setTracks(normalized);
    setCurrentTrack((ct) => {
      if (!ct) return ct;
      const fresh = normalized.find((t) => t.id === ct.id);
      return fresh ? fresh : ct;
    });
  }, [tracks]);

  const handleTrackPlaybackFailed = useCallback((trackId) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, isMissing: true } : t)));
    setCurrentTrack((prev) => (prev?.id === trackId ? { ...prev, isMissing: true } : prev));
    setIsPlaying(false);
  }, []);

  const isCoupleBrowse =
    !isAdmin && activeClient && coupleReady && preferences.wizardCompleted;

  const showPlayer =
    currentTrack && (isAdmin || (activeClient && preferences.wizardCompleted));

  const isAdminCatalog = isAdmin && adminTab === "catalog";
  const showFooterPlayer = showPlayer && !isAdminCatalog;

  const playerProps = {
    currentTrack,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    formatTime,
    onUpdateTrack: handleUpdateTrack,
    onUpdateTrackCue: handleUpdateTrackCue,
    isAdmin,
    resolveTrackUrl,
    embedded: isAdminCatalog,
    onTrackReloaded: handleTrackReloaded,
    onPlaybackFailed: handleTrackPlaybackFailed,
  };

  useEffect(() => {
    if (!isAdminCatalog || catalogStatus !== "ready") return;
    if (currentTrack) return;
    const first = tracks.find((t) => !t.isMissing);
    if (first) {
      setCurrentTrack(normalizePreviewCue(first));
      setCurrentTime(first.startTime ?? 0);
    }
  }, [isAdminCatalog, catalogStatus, tracks, currentTrack]);

  const renderAdminContent = () => {
    if (adminTab === "catalog") {
      return (
        <div className="admin-catalog-layout flex flex-col flex-1 min-h-0 gap-3">
          <div className="shrink-0 flex flex-col gap-3">
            <TrackUploadPanel onUploaded={handleTrackUploaded} />
            <DropboxImportPanel
              dropbox={dropboxImport}
              existingTracks={tracks}
              onImported={handleTracksImported}
            />
          </div>

          <div className="admin-catalog-player shrink-0">
            {currentTrack && !currentTrack.isMissing ? (
              <GlobalPlayer {...playerProps} />
            ) : currentTrack?.isMissing ? (
              <div className="admin-catalog-player-empty panel-luxury p-4 text-center" dir="rtl">
                <p className="font-lcd text-xs text-xdj-muted">PREVIEW EDITOR</p>
                <p className="text-sm font-semibold text-xdj-text mt-2">{currentTrack.title}</p>
                <p className="text-xs text-xdj-muted">{currentTrack.artist}</p>
                <p className="text-xs text-red-400 mt-2 font-medium">קובץ חסר — לא ניתן לנגן עד שתעלה MP3</p>
                <div className="mt-4 flex justify-center">
                  <TrackReloadButton
                    track={currentTrack}
                    onReloaded={handleTrackReloaded}
                    label="טען מחדש"
                  />
                </div>
              </div>
            ) : (
              <div className="admin-catalog-player-empty panel-luxury p-4 text-center" dir="rtl">
                <p className="font-lcd text-xs text-xdj-muted">PREVIEW EDITOR</p>
                {tracks.length === 0 ? (
                  <p className="text-xs text-xdj-cyan mt-2 font-medium">
                    הקטלוג ריק — העלה שיר למעלה או ייבא מ-Dropbox
                  </p>
                ) : countMissingTracks(tracks) > 0 ? (
                  <p className="text-xs text-red-400 mt-2 font-medium">
                    ⚠ {countMissingTracks(tracks)} שירים ללא קובץ בשרת — ראה עמודת &quot;מקור נגינה&quot; בטבלה
                  </p>
                ) : (
                  <p className="text-xs text-xdj-muted mt-1">בחר שיר מהטבלה למטה כדי לנגן ולגרור סמני A / B</p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <AdminTable
              tracks={tracks}
              currentTrack={currentTrack}
              onUpdateTrack={handleUpdateTrack}
              onDeleteTrack={handleDeleteTrack}
              onPreviewTrack={handleAdminPreviewTrack}
              onTrackReloaded={handleTrackReloaded}
              onRefreshTrackFiles={handleRefreshTrackFiles}
            />
          </div>
        </div>
      );
    }
    if (adminTab === "clients") {
      return <ClientManager clients={clients} onCreateClient={createClient} onDeleteClient={deleteClient} />;
    }
    if (adminTab === "form") {
      return <FormBuilder {...formSchemaApi} schema={formSchema} />;
    }
    return <AdminDashboard clients={clients} tracks={tracks} formSchema={formSchema} />;
  };

  return (
    <div className="app-shell min-h-dvh flex flex-col luxury-bg text-xdj-text font-sans overflow-hidden" dir="rtl">
      <div className="app-header-safe shrink-0 p-2 sm:p-6 pb-0">
      <header className="max-w-7xl mx-auto mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-center sm:items-center gap-4 border-b border-xdj-border pb-4 sm:pb-5">
        <div className="flex flex-col items-center sm:items-start gap-2 w-full sm:w-auto">
          <img
            src="/kremer-logo.png"
            alt="KREMER"
            className="h-9 sm:h-11 w-auto max-w-[min(100%,320px)] object-contain"
          />
          <p className="text-xs text-xdj-muted text-center sm:text-right max-w-md">
            {isAdmin
              ? "מערכת ניהול קטלוג ולקוחות"
              : activeClient
                ? `שלום ${activeClient.name} — `
                : "מערכת חכמה לתיאום המוזיקה לחתונה שלכם"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isAdmin && activeClient && preferences.wizardCompleted && (
            <button onClick={reopenWizard} className="btn-luxury px-4 py-2 rounded-sm">
              ערוך העדפות
            </button>
          )}
          {!isAdmin && activeClient && (
            <button onClick={logout} className="btn-luxury px-4 py-2 rounded-sm">
              יציאה
            </button>
          )}
          {isAdmin && (
            <button onClick={downloadJSON} className="btn-luxury-gold px-4 py-2 rounded-sm text-xs">
              EXPORT JSON
            </button>
          )}
          <button
            onClick={() => setIsAdmin(!isAdmin)}
            className={`px-4 py-2 rounded-sm text-xs tracking-wider ${
              isAdmin ? "btn-luxury" : "btn-luxury-primary"
            }`}
          >
            {isAdmin ? "מצב משתמש" : "ADMIN"}
          </button>
        </div>
      </header>
      </div>

      <main
        className={`app-main-safe flex-1 min-h-0 max-w-7xl mx-auto w-full px-2 sm:px-6 pb-2 sm:pb-4 flex flex-col ${
          isCoupleBrowse || isAdmin ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        {catalogStatus === "loading" || !appReady ? (
          <p className="font-lcd text-xs text-xdj-muted text-center py-8">LOADING...</p>
        ) : catalogStatus === "error" ? (
          <p className="font-lcd text-xs text-xdj-orange text-center py-8">{catalogError}</p>
        ) : isAdmin ? (
          <div className="flex flex-col flex-1 min-h-0 gap-2 sm:gap-4">
            <AdminTabNav activeTab={adminTab} onTabChange={setAdminTab} />
            <div className="flex flex-col flex-1 min-h-0">{renderAdminContent()}</div>
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="font-lcd text-xs text-xdj-muted">NO TRACKS IN CATALOG</p>
            <p className="text-xs text-xdj-muted">הקטלוג ריק — פנה למנהל המערכת</p>
          </div>
        ) : !activeClient ? (
          <ClientLogin onLogin={login} />
        ) : !coupleReady ? (
          <p className="font-lcd text-xs text-xdj-muted text-center py-8">LOADING SESSION...</p>
        ) : !preferences.wizardCompleted ? (
          <PreferencesWizard
            key={activeClient.id}
            formSchema={formSchema}
            clientType={activeClient.clientType}
            preferences={preferences}
            selectedCategories={selectedCategories}
            categoryRatings={categoryRatings}
            onUpdatePreferences={updatePreferences}
            onToggleCategory={toggleCategory}
            onRateCategory={rateCategory}
            onComplete={completeWizard}
            onSkip={skipWizard}
            onSaveProgress={saveWizardProgress}
            onSaveAndExit={logout}
          />
        ) : (
          <div className="flex flex-col flex-1 min-h-0 gap-2 sm:gap-4">
            <CategorySelector
              allCategories={OFFICIAL_CATEGORIES}
              selectedCategories={selectedCategories}
              categoryRatings={categoryRatings}
              onToggleCategory={toggleCategory}
              onRateCategory={rateCategory}
            />

            <div className="flex-1 min-h-0">
              <TrackList
                tracks={tracks.filter(
                  (t) => t.isMissing !== true && selectedCategories.includes(t.bucket)
                )}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onTrackSelect={handleTrackSelect}
                onPlayPause={() => currentTrack && handleTrackSelect(currentTrack)}
                formatTime={formatTime}
                ratings={ratings}
                comments={comments}
                onRateTrack={rateTrack}
                onCommentChange={setComment}
              />
            </div>
          </div>
        )}
      </main>

      {showFooterPlayer && (
        <div className="app-player-safe shrink-0">
          <GlobalPlayer {...playerProps} embedded={false} />
        </div>
      )}
    </div>
  );
}
