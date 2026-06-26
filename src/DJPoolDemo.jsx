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
import DropboxPanel from "./components/DropboxPanel";
import useTrackFeedback from "./hooks/useTrackFeedback";
import useFormSchema from "./hooks/useFormSchema";
import useClients from "./hooks/useClients";
import useDropbox from "./hooks/useDropbox";
import { OFFICIAL_CATEGORIES } from "./lib/categories";
import { normalizePreviewCue } from "./lib/previewCue";
import { resolveTrackAudioUrl, verifyLocalTrack } from "./lib/trackAudioUrl";
import { loadDropboxState, loadDropboxCatalog } from "./lib/dropbox/storage";
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
  } = useTrackFeedback(activeClient?.id ?? null);

  const formSchemaApi = useFormSchema();
  const { schema: formSchema, ready: formReady } = formSchemaApi;
  const dropbox = useDropbox();
  const { musicSource, client: dropboxClient } = dropbox;
  const catalogSaveTimer = useRef(null);

  const appReady = clientsReady && formReady && catalogStatus === "ready";
  const coupleReady = !activeClient || feedbackReady;

  const resolveTrackUrl = useCallback(
    (track) =>
      resolveTrackAudioUrl(track, {
        musicSource,
        dropboxClient,
      }),
    [musicSource, dropboxClient]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setCatalogStatus("loading");
      setCatalogError(null);

      const dropboxState = loadDropboxState();
      const useDropboxSource = dropboxState.musicSource === "dropbox";
      const cachedCatalog = useDropboxSource ? loadDropboxCatalog() : null;

      if (cachedCatalog?.length) {
        if (cancelled) return;
        const verifiedTracks = cachedCatalog.map((track) =>
          normalizePreviewCue({ ...track, isMissing: !track.dropboxPath })
        );
        setTracks(verifiedTracks);
        setCatalogStatus("ready");
        const firstValid = verifiedTracks.find((t) => !t.isMissing);
        if (firstValid) setCurrentTrack(firstValid);
        return;
      }

      try {
        let data;
        try {
          data = await fetchCatalog();
        } catch {
          const res = await fetch("/data/catalog.json");
          if (!res.ok) throw new Error(`Catalog not found (${res.status})`);
          data = await res.json();
        }

        const verifiedTracks = useDropboxSource
          ? data.map((track) =>
              track.dropboxPath
                ? normalizePreviewCue({ ...track, isMissing: false, source: "dropbox" })
                : normalizePreviewCue({ ...track, isMissing: true })
            )
          : await Promise.all(
              data.map(async (track) => {
                const exists = await verifyLocalTrack(track);
                return normalizePreviewCue({
                  ...track,
                  isMissing: !exists,
                });
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
      saveCatalog(nextTracks).catch((err) => console.error("Catalog save failed:", err));
    }, 400);
  }, []);

  const handleUpdateTrack = (id, field, value) => {
    const val =
      field === "startTime" || field === "endTime" || field === "duration"
        ? parseInt(value) || 0
        : value;
    const updated = tracks.map((t) => {
      if (t.id !== id) return t;
      return normalizePreviewCue({ ...t, [field]: val });
    });
    setTracks(updated);
    persistCatalog(updated);

    if (currentTrack?.id === id) {
      setCurrentTrack(normalizePreviewCue({ ...currentTrack, [field]: val }));
    }
  };

  const handleDeleteTrack = (id) => {
    const updated = tracks.filter((t) => t.id !== id);
    setTracks(updated);
    persistCatalog(updated);
    if (currentTrack?.id === id) {
      setCurrentTrack(updated[0] || null);
      setIsPlaying(false);
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

  const handleDropboxSync = (syncedTracks) => {
    if (syncedTracks.length === 0) return;
    setTracks(syncedTracks);
    setCatalogStatus("ready");
    persistCatalog(syncedTracks);
    const firstValid = syncedTracks.find((t) => !t.isMissing);
    if (firstValid) setCurrentTrack(firstValid);
  };

  const renderAdminContent = () => {
    if (adminTab === "catalog") {
      return (
        <>
          <DropboxPanel
            dropbox={dropbox}
            existingTracks={tracks}
            trackCount={tracks.length}
            onSync={handleDropboxSync}
          />
          <AdminTable tracks={tracks} onUpdateTrack={handleUpdateTrack} onDeleteTrack={handleDeleteTrack} />
        </>
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

  const showPlayer =
    currentTrack && (isAdmin || (activeClient && preferences.wizardCompleted));

  return (
    <div className="h-screen flex flex-col luxury-bg text-xdj-text font-sans overflow-hidden" dir="rtl">
      <div className="shrink-0 p-4 sm:p-6 pb-0">
      <header className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-center sm:items-center gap-4 border-b border-xdj-border pb-5">
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

      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-4 max-w-7xl mx-auto w-full">
        {catalogStatus === "loading" || !appReady ? (
          <p className="font-lcd text-xs text-xdj-muted text-center py-8">LOADING...</p>
        ) : catalogStatus === "error" ? (
          <p className="font-lcd text-xs text-xdj-orange text-center py-8">{catalogError}</p>
        ) : tracks.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="font-lcd text-xs text-xdj-muted">NO TRACKS IN CATALOG</p>
            {isAdmin ? (
              <p className="text-xs text-xdj-muted">
                Sync from Dropbox or add MP3s to <code>public/music</code> and run <code>scan_music.py</code>
              </p>
            ) : null}
          </div>
        ) : isAdmin ? (
          <>
            <AdminTabNav activeTab={adminTab} onTabChange={setAdminTab} />
            {renderAdminContent()}
          </>
        ) : !activeClient ? (
          <ClientLogin onLogin={login} />
        ) : !coupleReady ? (
          <p className="font-lcd text-xs text-xdj-muted text-center py-8">LOADING SESSION...</p>
        ) : !preferences.wizardCompleted ? (
          <PreferencesWizard
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
          />
        ) : (
          <>
            <CategorySelector
              allCategories={OFFICIAL_CATEGORIES}
              selectedCategories={selectedCategories}
              categoryRatings={categoryRatings}
              onToggleCategory={toggleCategory}
              onRateCategory={rateCategory}
            />

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
          </>
        )}
      </main>

      {showPlayer && (
        <GlobalPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          formatTime={formatTime}
          onUpdateTrack={handleUpdateTrack}
          isAdmin={isAdmin}
          resolveTrackUrl={resolveTrackUrl}
        />
      )}
    </div>
  );
}
