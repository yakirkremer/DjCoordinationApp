import { useState, useEffect, useCallback, useRef } from "react";
import { loadFeedback, saveFeedback } from "../lib/trackFeedbackStorage";
import { OFFICIAL_CATEGORIES } from "../lib/categories";
import { DEFAULT_PREFERENCES } from "../lib/preferences";

export default function useTrackFeedback(clientId = null) {
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [selectedCategories, setSelectedCategories] = useState(OFFICIAL_CATEGORIES);
  const [categoryRatings, setCategoryRatings] = useState({});
  const [preferences, setPreferences] = useState({ ...DEFAULT_PREFERENCES });
  const [ready, setReady] = useState(!clientId);

  const stateRef = useRef({
    ratings,
    comments,
    selectedCategories,
    categoryRatings,
    preferences,
  });
  stateRef.current = {
    ratings,
    comments,
    selectedCategories,
    categoryRatings,
    preferences,
  };

  const saveTimer = useRef(null);

  const persist = useCallback(
    (patch) => {
      if (!clientId) return;
      const payload = { ...stateRef.current, ...patch };

      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveFeedback(payload, clientId).catch((err) =>
          console.error("Feedback save failed:", err)
        );
      }, 250);
    },
    [clientId]
  );

  useEffect(() => {
    if (!clientId) {
      setRatings({});
      setComments({});
      setSelectedCategories(OFFICIAL_CATEGORIES);
      setCategoryRatings({});
      setPreferences({ ...DEFAULT_PREFERENCES });
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    loadFeedback(OFFICIAL_CATEGORIES, clientId).then((saved) => {
      if (cancelled) return;
      setRatings(saved.ratings);
      setComments(saved.comments);
      setSelectedCategories(saved.selectedCategories);
      setCategoryRatings(saved.categoryRatings);
      setPreferences(saved.preferences);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const rateTrack = useCallback(
    (trackId, rating) => {
      setRatings((prev) => {
        const next = { ...prev, [trackId]: prev[trackId] === rating ? 0 : rating };
        persist({ ratings: next });
        return next;
      });
    },
    [persist]
  );

  const setComment = useCallback(
    (trackId, text) => {
      setComments((prev) => {
        const next = { ...prev };
        if (!text.trim()) {
          delete next[trackId];
        } else {
          next[trackId] = text;
        }
        persist({ comments: next });
        return next;
      });
    },
    [persist]
  );

  const toggleCategory = useCallback(
    (category) => {
      setSelectedCategories((prev) => {
        const next = prev.includes(category)
          ? prev.filter((c) => c !== category)
          : [...prev, category];
        persist({ selectedCategories: next });
        return next;
      });
    },
    [persist]
  );

  const rateCategory = useCallback(
    (category, rating) => {
      setCategoryRatings((prev) => {
        const next = {
          ...prev,
          [category]: prev[category] === rating ? 0 : rating,
        };
        persist({ categoryRatings: next });
        return next;
      });
    },
    [persist]
  );

  const updatePreferences = useCallback(
    (patch) => {
      setPreferences((prev) => {
        const next = { ...prev, ...patch };
        if (patch.phases) {
          next.phases = { ...prev.phases, ...patch.phases };
        }
        if (patch.customAnswers) {
          next.customAnswers = { ...prev.customAnswers, ...patch.customAnswers };
        }
        persist({ preferences: next });
        return next;
      });
    },
    [persist]
  );

  const completeWizard = useCallback(() => {
    setPreferences((prev) => {
      const next = { ...prev, wizardCompleted: true };
      persist({ preferences: next });
      return next;
    });
  }, [persist]);

  const skipWizard = useCallback(() => {
    setPreferences((prev) => {
      const next = { ...prev, wizardCompleted: true };
      persist({ preferences: next });
      return next;
    });
  }, [persist]);

  const reopenWizard = useCallback(() => {
    setPreferences((prev) => {
      const next = { ...prev, wizardCompleted: false };
      persist({ preferences: next });
      return next;
    });
  }, [persist]);

  return {
    ratings,
    comments,
    selectedCategories,
    categoryRatings,
    preferences,
    ready,
    rateTrack,
    setComment,
    toggleCategory,
    rateCategory,
    updatePreferences,
    completeWizard,
    skipWizard,
    reopenWizard,
  };
}
