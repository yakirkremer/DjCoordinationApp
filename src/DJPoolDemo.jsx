import React, { useState, useEffect, useCallback, useRef } from "react";
import TrackList from "./components/TrackList";
import AdminTable from "./components/AdminTable";
import AdminGenreOrganizer from "./components/AdminGenreOrganizer";
import AdminTrackOrderPreview from "./components/AdminTrackOrderPreview";
import GlobalPlayer from "./components/GlobalPlayer";
import CategorySelector from "./components/CategorySelector";
import WelcomePage from "./components/WelcomePage";
import ClientHome from "./components/ClientHome";
import ClientManager from "./components/ClientManager";
import AdminTabNav from "./components/AdminTabNav";
import AdminDashboard from "./components/AdminDashboard";
import FormBuilder from "./components/FormBuilder";
import PreferencesWizard from "./components/PreferencesWizard";
import TrackUploadPanel from "./components/TrackUploadPanel";
import DropboxImportPanel from "./components/DropboxImportPanel";
import TrackReloadButton from "./components/TrackReloadButton";
import LanguageSwitcher from "./components/LanguageSwitcher";
import AppearanceSwitcher from "./components/AppearanceSwitcher";
import AccessibilityToolbar from "./components/AccessibilityToolbar";
import AdminSettings from "./components/AdminSettings";
import AdminFetchArtwork from "./components/AdminFetchArtwork";
import DropsAndGenresGuide from "./components/DropsAndGenresGuide";
import TutorialPage from "./components/TutorialPage";
import useTrackFeedback from "./hooks/useTrackFeedback";
import useFormSchema from "./hooks/useFormSchema";
import useClients from "./hooks/useClients";
import useDropboxImport from "./hooks/useDropboxImport";
import { useGenres } from "./hooks/useGenres";
import { normalizePreviewCue } from "./lib/previewCue";
import { resolveTrackAudioUrl, verifyTracks } from "./lib/trackAudioUrl";
import { deleteTrack } from "./lib/api/uploadTrack";
import { countMissingTracks } from "./lib/trackSource";
import useAudioPreload from "./hooks/useAudioPreload";
import { fetchCatalog, saveCatalog } from "./lib/api/dataApi";
import { useI18n } from "./lib/i18n/AppSettingsContext";
import {
  applyActiveVersion,
  ensureTrackVersions,
  stripTrackForCatalogSave,
} from "./lib/trackVersions";

export default function DJPoolDemo() {
  const { t, dir } = useI18n();
  const [tracks, setTracks] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [catalogError, setCatalogError] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState("catalog");
  const [clientScreen, setClientScreen] = useState("home");
  const [guestView, setGuestView] = useState("welcome");

  const genres = useGenres();

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
  } = useTrackFeedback(activeClient?.id ?? null, genres);

  const formSchemaApi = useFormSchema();
  const { schema: formSchema, ready: formReady } = formSchemaApi;
  const dropboxImport = useDropboxImport();
  const catalogSaveTimer = useRef(null);
  const [activeVersionIds, setActiveVersionIds] = useState({});
  const [lockedVersionIds, setLockedVersionIds] = useState({});

  const resolvePlaybackTrack = useCallback(
    (track, versionId) => {
      if (!track) return null;
      const normalized = ensureTrackVersions(track);
      const verId = versionId ?? activeVersionIds[track.id] ?? normalized.activeVersionId;
      return normalizePreviewCue(applyActiveVersion(normalized, verId));
    },
    [activeVersionIds]
  );

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
          data.map((track) => normalizePreviewCue(ensureTrackVersions(track)))
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
      const forSave = nextTracks.map(stripTrackForCatalogSave);
      saveCatalog(forSave).catch((err) => console.error("Catalog save failed:", err));
    }, 250);
  }, []);

  const patchTrackField = useCallback((track, field, val) => {
    const activeId = track.activeVersionId || track.defaultVersionId;
    if (field === "startTime" || field === "endTime" || field === "duration") {
      const versions = (track.versions || []).map((v) =>
        v.id === activeId ? { ...v, [field]: val } : v
      );
      return normalizePreviewCue(applyActiveVersion({ ...track, versions }, activeId));
    }
    return normalizePreviewCue({ ...track, [field]: val });
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
          return patchTrackField(ensureTrackVersions(t), field, val);
        });
        persistCatalog(updated);
        return updated;
      });

      setCurrentTrack((prev) => {
        if (prev?.id !== id) return prev;
        const base = tracks.find((t) => t.id === id) || prev;
        return patchTrackField(ensureTrackVersions(base), field, val);
      });
    },
    [persistCatalog, patchTrackField, tracks]
  );

  const handleUpdateTrackCue = useCallback(
    (id, { startTime, endTime }) => {
      setTracks((prev) => {
        const updated = prev.map((t) => {
          if (t.id !== id) return t;
          const activeId = t.activeVersionId || t.defaultVersionId;
          const versions = (t.versions || []).map((v) =>
            v.id === activeId ? { ...v, startTime, endTime } : v
          );
          return normalizePreviewCue(applyActiveVersion({ ...t, versions }, activeId));
        });
        persistCatalog(updated);
        return updated;
      });

      setCurrentTrack((prev) => {
        if (prev?.id !== id) return prev;
        const base = tracks.find((t) => t.id === id) || prev;
        const activeId = base.activeVersionId || base.defaultVersionId;
        const versions = (base.versions || []).map((v) =>
          v.id === activeId ? { ...v, startTime, endTime } : v
        );
        return normalizePreviewCue(applyActiveVersion({ ...base, versions }, activeId));
      });
    },
    [persistCatalog, tracks]
  );

  const handleSelectVersion = useCallback(
    (trackId, versionId) => {
      if (lockedVersionIds[trackId]) return;

      setActiveVersionIds((prev) => ({ ...prev, [trackId]: versionId }));

      setTracks((prev) =>
        prev.map((t) => {
          if (t.id !== trackId) return t;
          return applyActiveVersion(ensureTrackVersions(t), versionId);
        })
      );

      setCurrentTrack((prev) => {
        if (prev?.id !== trackId) return prev;
        const next = normalizePreviewCue(
          applyActiveVersion(ensureTrackVersions(prev), versionId)
        );
        return next;
      });

      setCurrentTime((prevTime) => {
        if (currentTrack?.id !== trackId) return prevTime;
        const base = currentTrack;
        const next = normalizePreviewCue(
          applyActiveVersion(ensureTrackVersions(base), versionId)
        );
        return next.startTime ?? 0;
      });

      setIsPlaying((wasPlaying) => (currentTrack?.id === trackId ? true : wasPlaying));
    },
    [currentTrack?.id, lockedVersionIds]
  );

  const handleTrackSelect = useCallback(
    (track, { versionId, lockVersion } = {}) => {
      let base = ensureTrackVersions(track);

      if (versionId) {
        setActiveVersionIds((prev) => ({ ...prev, [track.id]: versionId }));
        base = applyActiveVersion(base, versionId);
        if (lockVersion) {
          setLockedVersionIds((prev) => ({ ...prev, [track.id]: versionId }));
        } else if (lockVersion === false) {
          setLockedVersionIds((prev) => {
            if (!prev[track.id]) return prev;
            const next = { ...prev };
            delete next[track.id];
            return next;
          });
        }
      } else if (lockedVersionIds[track.id]) {
        base = applyActiveVersion(base, lockedVersionIds[track.id]);
      } else {
        base = resolvePlaybackTrack(track);
      }

      const normalized = normalizePreviewCue(base);
      setCurrentTrack((prev) => {
        if (
          prev?.id === normalized.id &&
          prev?.activeVersionId === normalized.activeVersionId
        ) {
          setIsPlaying((playing) => !playing);
          return prev;
        }
        setCurrentTime(normalized.startTime);
        setIsPlaying(true);
        return normalized;
      });
    },
    [lockedVersionIds, resolvePlaybackTrack]
  );

  const handleDeleteTrack = async (id) => {
    const track = tracks.find((t) => t.id === id);
    const label = track ? `${track.title} — ${track.artist}` : t("admin.thisTrack");
    const confirmed = window.confirm(t("admin.deleteConfirm", { label }));
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
      window.alert(err.message || t("admin.deleteFailed"));
    }
  };

  const handleAdminPreviewTrack = (track, { play = false } = {}) => {
    const normalized = resolvePlaybackTrack(track);
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

  const handleArtworkFetched = useCallback(
    async (updatedTracks) => {
      const verified = await verifyTracks(
        updatedTracks.map((track) => normalizePreviewCue(ensureTrackVersions(track)))
      );
      setTracks(verified);
      persistCatalog(verified);
      setCurrentTrack((ct) => {
        if (!ct) return ct;
        const fresh = verified.find((t) => t.id === ct.id);
        return fresh ? normalizePreviewCue(applyActiveVersion(ensureTrackVersions(fresh), ct.activeVersionId)) : ct;
      });
    },
    [persistCatalog]
  );

  const handleGenresChanged = useCallback(async () => {
    const data = await fetchCatalog();
    const verified = await verifyTracks(
      data.map((track) => normalizePreviewCue(ensureTrackVersions(track)))
    );
    setTracks(verified);
    persistCatalog(verified);
  }, [persistCatalog]);

  const handleTrackUploaded = (uploadedTracks) => {
    handleTracksImported(Array.isArray(uploadedTracks) ? uploadedTracks : [uploadedTracks]);
  };

  const handleTracksImported = (importedTracks) => {
    if (!importedTracks?.length) return;
    const normalized = importedTracks.map((t) =>
      normalizePreviewCue({ ...ensureTrackVersions(t), isMissing: false })
    );
    const updated = [...tracks, ...normalized];
    setTracks(updated);
    setCatalogStatus("ready");
    persistCatalog(updated);
    const first = resolvePlaybackTrack(normalized[0]);
    setCurrentTrack(first);
    setCurrentTime(first?.startTime ?? 0);
    setIsPlaying(false);
  };

  const handleTrackReloaded = useCallback(
    (reloadedTrack) => {
      const normalized = normalizePreviewCue({
        ...applyActiveVersion(
          ensureTrackVersions(reloadedTrack),
          activeVersionIds[reloadedTrack.id] || reloadedTrack.activeVersionId
        ),
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
    [tracks, currentTrack?.id, persistCatalog, activeVersionIds]
  );

  const handleTrackSaved = useCallback(
    (savedTrack) => {
      const normalized = normalizePreviewCue({
        ...applyActiveVersion(
          ensureTrackVersions(savedTrack),
          activeVersionIds[savedTrack.id] || savedTrack.activeVersionId
        ),
        audioVersion: Date.now(),
      });
      setTracks((prev) => {
        const updated = prev.map((t) => (t.id === normalized.id ? normalized : t));
        persistCatalog(updated);
        return updated;
      });
      if (currentTrack?.id === normalized.id) {
        setCurrentTrack(normalized);
      }
    },
    [currentTrack?.id, persistCatalog, activeVersionIds]
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
    !isAdmin && activeClient && coupleReady && clientScreen === "browse" && preferences.wizardCompleted;

  const isWizardGenreListen =
    !isAdmin && activeClient && clientScreen === "wizard" && currentTrack;

  const showPlayer =
    currentTrack &&
    (isAdmin ||
      isWizardGenreListen ||
      (activeClient && clientScreen === "browse" && preferences.wizardCompleted));

  const isAdminCatalog = isAdmin && adminTab === "catalog";
  const isAdminEmbeddedPlayer = isAdmin && (adminTab === "catalog" || adminTab === "order");
  const showFooterPlayer = showPlayer && !isAdminEmbeddedPlayer;

  const catalogTrackForPlayer = currentTrack
    ? tracks.find((t) => t.id === currentTrack.id) ?? null
    : null;

  const playerProps = {
    currentTrack,
    catalogTrack: catalogTrackForPlayer,
    activeVersionId: currentTrack?.activeVersionId,
    versionLocked: Boolean(currentTrack?.id && lockedVersionIds[currentTrack.id]),
    onSelectVersion: handleSelectVersion,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    formatTime,
    onUpdateTrack: handleUpdateTrack,
    onUpdateTrackCue: handleUpdateTrackCue,
    isAdmin,
    resolveTrackUrl,
    embedded: isAdminEmbeddedPlayer,
    onTrackReloaded: handleTrackReloaded,
    onPlaybackFailed: handleTrackPlaybackFailed,
  };

  useEffect(() => {
    if (!isAdminCatalog || catalogStatus !== "ready") return;
    if (currentTrack) return;
    const first = tracks.find((t) => !t.isMissing);
    if (first) {
      setCurrentTrack(resolvePlaybackTrack(first));
      setCurrentTime(first.startTime ?? 0);
    }
  }, [isAdminCatalog, catalogStatus, tracks, currentTrack]);

  const handleEnterAdmin = useCallback(() => {
    setIsAdmin(true);
    setClientScreen("home");
  }, []);

  const handleExitAdmin = useCallback(() => {
    setIsAdmin(false);
    setAdminTab("catalog");
  }, []);

  const handleClientLogin = useCallback(
    (code) => {
      const ok = login(code);
      if (ok) {
        setClientScreen("home");
        setIsAdmin(false);
      }
      return ok;
    },
    [login]
  );

  const handleClientLogout = useCallback(() => {
    logout();
    setClientScreen("home");
    setIsAdmin(false);
    setIsPlaying(false);
  }, [logout]);

  const handleWizardComplete = useCallback(() => {
    completeWizard();
    setClientScreen("home");
  }, [completeWizard]);

  const handleWizardSkip = useCallback(() => {
    skipWizard();
    setClientScreen("home");
  }, [skipWizard]);

  const handleStartWizard = useCallback(() => {
    if (preferences.wizardCompleted) {
      reopenWizard();
    }
    setClientScreen("wizard");
  }, [preferences.wizardCompleted, reopenWizard]);

  useEffect(() => {
    if (!appReady || !activeClient) return;
    if (isAdmin) return;
    setClientScreen((screen) => (screen === "browse" || screen === "wizard" ? screen : "home"));
  }, [appReady, activeClient?.id, isAdmin]);

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
            <AdminFetchArtwork tracks={tracks} onTracksUpdated={handleArtworkFetched} />
          </div>

          <div className="admin-catalog-player shrink-0">
            {currentTrack && !currentTrack.isMissing ? (
              <GlobalPlayer {...playerProps} />
            ) : currentTrack?.isMissing ? (
              <div className="admin-catalog-player-empty panel-luxury p-4 text-center" dir={dir}>
                <p className="font-lcd text-xs text-xdj-muted">{t("admin.previewEditor")}</p>
                <p className="text-sm font-semibold text-xdj-text mt-2">{currentTrack.title}</p>
                <p className="text-sm font-bold text-xdj-cyan mt-1">{currentTrack.artist}</p>
                <p className="text-xs text-red-400 mt-2 font-medium">{t("admin.missingFile")}</p>
                <div className="mt-4 flex justify-center">
                  <TrackReloadButton
                    track={currentTrack}
                    onReloaded={handleTrackReloaded}
                    label={t("admin.reload")}
                  />
                </div>
              </div>
            ) : (
              <div className="admin-catalog-player-empty panel-luxury p-4 text-center" dir={dir}>
                <p className="font-lcd text-xs text-xdj-muted">{t("admin.previewEditor")}</p>
                {tracks.length === 0 ? (
                  <p className="text-xs text-xdj-cyan mt-2 font-medium">{t("admin.emptyCatalog")}</p>
                ) : countMissingTracks(tracks) > 0 ? (
                  <p className="text-xs text-red-400 mt-2 font-medium">
                    {t("admin.missingTracks", { count: countMissingTracks(tracks) })}
                  </p>
                ) : (
                  <p className="text-xs text-xdj-muted mt-1">{t("admin.selectTrack")}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <AdminTable
              tracks={tracks}
              currentTrack={currentTrack}
              activeVersionIds={activeVersionIds}
              onSelectVersion={handleSelectVersion}
              onTrackSaved={handleTrackSaved}
              onDeleteTrack={handleDeleteTrack}
              onPreviewTrack={handleAdminPreviewTrack}
              onTrackReloaded={handleTrackReloaded}
              onRefreshTrackFiles={handleRefreshTrackFiles}
            />
          </div>
        </div>
      );
    }
    if (adminTab === "organize") {
      return (
        <div className="flex flex-col flex-1 min-h-0">
          <AdminGenreOrganizer
            tracks={tracks}
            onTrackSaved={handleTrackSaved}
            onPreviewTrack={handleAdminPreviewTrack}
          />
        </div>
      );
    }
    if (adminTab === "order") {
      return (
        <div className="admin-order-layout flex flex-col flex-1 min-h-0 gap-3">
          <div className="admin-catalog-player shrink-0">
            {currentTrack && !currentTrack.isMissing ? (
              <GlobalPlayer {...playerProps} />
            ) : (
              <div className="admin-catalog-player-empty panel-luxury p-4 text-center" dir={dir}>
                <p className="font-lcd text-xs text-xdj-muted">{t("admin.previewEditor")}</p>
                <p className="text-xs text-xdj-muted mt-1">{t("admin.trackOrderSelect")}</p>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <AdminTrackOrderPreview
              tracks={tracks}
              genres={genres}
              currentTrack={currentTrack}
              activeVersionIds={activeVersionIds}
              onSelectVersion={handleSelectVersion}
              isPlaying={isPlaying}
              onTrackSelect={handleTrackSelect}
              formatTime={formatTime}
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
    if (adminTab === "settings") {
      return (
        <AdminSettings
          tracks={tracks}
          onGenresChanged={handleGenresChanged}
        />
      );
    }
    return <AdminDashboard clients={clients} tracks={tracks} formSchema={formSchema} />;
  };

  return (
    <div className="app-shell min-h-dvh flex flex-col luxury-bg text-xdj-text font-sans overflow-hidden" dir={dir}>
      <a href="#main-content" className="skip-to-content">
        {t("a11y.skipToContent")}
      </a>
      <AccessibilityToolbar />
      {(isAdmin || activeClient || guestView === "guide" || guestView === "tutorial") && (
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
              ? t("header.adminSubtitle")
              : activeClient
                ? clientScreen === "browse"
                  ? t("header.browse", { name: activeClient.name })
                  : clientScreen === "wizard"
                    ? t("header.wizard", { name: activeClient.name })
                    : clientScreen === "guide"
                      ? t("header.guide")
                      : clientScreen === "tutorial"
                        ? t("header.tutorial")
                        : t("header.home", { name: activeClient.name })
                : guestView === "guide"
                  ? t("header.guide")
                  : guestView === "tutorial"
                    ? t("header.tutorial")
                    : t("header.guestSubtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-center">
          <AppearanceSwitcher />
          <LanguageSwitcher />
          {!isAdmin && activeClient && clientScreen !== "home" && (
            <button
              onClick={() => setClientScreen("home")}
              className="btn-luxury px-4 py-2 rounded-sm text-xs"
            >
              {t("common.dashboard")}
            </button>
          )}
          {isAdmin && (
            <>
              <button onClick={downloadJSON} className="btn-luxury-gold px-4 py-2 rounded-sm text-xs">
                {t("header.exportJson")}
              </button>
              <button onClick={handleExitAdmin} className="btn-luxury px-4 py-2 rounded-sm text-xs">
                {t("header.exitAdmin")}
              </button>
            </>
          )}
        </div>
      </header>
      </div>
      )}

      <main
        id="main-content"
        tabIndex={-1}
        className={`app-main-safe flex-1 min-h-0 max-w-7xl mx-auto w-full px-2 sm:px-6 pb-2 sm:pb-4 flex flex-col ${
          isCoupleBrowse || isAdmin || (activeClient && (clientScreen === "home" || clientScreen === "guide" || clientScreen === "tutorial")) || guestView === "guide" || guestView === "tutorial"
            ? "overflow-hidden"
            : "overflow-y-auto"
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
        ) : !activeClient ? (
          guestView === "guide" ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <DropsAndGenresGuide onBack={() => setGuestView("welcome")} />
            </div>
          ) : guestView === "tutorial" ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TutorialPage
                onBack={() => setGuestView("welcome")}
                onOpenGuide={() => setGuestView("guide")}
              />
            </div>
          ) : (
            <WelcomePage
              onLogin={handleClientLogin}
              onEnterAdmin={handleEnterAdmin}
              onOpenGuide={() => setGuestView("guide")}
              onOpenTutorial={() => setGuestView("tutorial")}
            />
          )
        ) : !coupleReady ? (
          <p className="font-lcd text-xs text-xdj-muted text-center py-8">LOADING SESSION...</p>
        ) : clientScreen === "home" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ClientHome
              client={activeClient}
              preferences={preferences}
              formSchema={formSchema}
              selectedCategories={selectedCategories}
              categoryRatings={categoryRatings}
              ratings={ratings}
              comments={comments}
              tracks={tracks}
              onStartWizard={handleStartWizard}
              onBrowseMusic={() => setClientScreen("browse")}
              onOpenGuide={() => setClientScreen("guide")}
              onOpenTutorial={() => setClientScreen("tutorial")}
              onLogout={handleClientLogout}
            />
          </div>
        ) : clientScreen === "guide" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DropsAndGenresGuide onBack={() => setClientScreen("home")} />
          </div>
        ) : clientScreen === "tutorial" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <TutorialPage
              onBack={() => setClientScreen("home")}
              onOpenGuide={() => setClientScreen("guide")}
            />
          </div>
        ) : clientScreen === "wizard" ? (
          <PreferencesWizard
            key={activeClient.id}
            formSchema={formSchema}
            clientType={activeClient.clientType}
            preferences={preferences}
            selectedCategories={selectedCategories}
            categoryRatings={categoryRatings}
            tracks={tracks.filter((t) => ensureTrackVersions(t).versions.some((v) => !v.isMissing))}
            onUpdatePreferences={updatePreferences}
            onToggleCategory={toggleCategory}
            onRateCategory={rateCategory}
            onTrackSelect={handleTrackSelect}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            formatTime={formatTime}
            onComplete={handleWizardComplete}
            onSkip={handleWizardSkip}
            onSaveProgress={saveWizardProgress}
            onSaveAndExit={() => setClientScreen("home")}
          />
        ) : tracks.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="font-lcd text-xs text-xdj-muted">{t("browse.noTracks")}</p>
            <p className="text-xs text-xdj-muted">{t("browse.emptyCatalog")}</p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 gap-2 sm:gap-4">
            <CategorySelector
              allCategories={genres}
              selectedCategories={selectedCategories}
              categoryRatings={categoryRatings}
              onToggleCategory={toggleCategory}
              onRateCategory={rateCategory}
            />

            <div className="flex-1 min-h-0">
              <TrackList
                genreTabs={selectedCategories}
                tracks={tracks.filter((t) =>
                  ensureTrackVersions(t).versions.some((v) => !v.isMissing)
                )}
                currentTrack={currentTrack}
                activeVersionIds={activeVersionIds}
                onSelectVersion={handleSelectVersion}
                isPlaying={isPlaying}
                onTrackSelect={handleTrackSelect}
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
