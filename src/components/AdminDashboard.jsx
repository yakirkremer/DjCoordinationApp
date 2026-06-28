import React, { useState, useEffect } from "react";
import { OFFICIAL_CATEGORIES } from "../lib/categories";
import { loadFeedback } from "../lib/trackFeedbackStorage";
import { getCategoryBreakdown, getLikedTracks, getTracksByCategoryRating } from "../lib/feedbackAnalytics";
import { getClientTypeLabel } from "../lib/clientTypes";
import CategoryBreakdown from "./CategoryBreakdown";
import CategoryTrackChoices from "./CategoryTrackChoices";
import FiveStarList from "./FiveStarList";
import ClientPreferencesSummary from "./ClientPreferencesSummary";
import ClientReportExport from "./ClientReportExport";

export default function AdminDashboard({ clients, tracks, formSchema }) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? "");
  const [feedback, setFeedback] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    if (clients.length && !clients.find((c) => c.id === selectedClientId)) {
      setSelectedClientId(clients[0]?.id ?? "");
    }
  }, [clients, selectedClientId]);

  const client = clients.find((c) => c.id === selectedClientId);

  useEffect(() => {
    if (!client) {
      setFeedback(null);
      return;
    }

    let cancelled = false;
    setLoadingFeedback(true);

    loadFeedback(OFFICIAL_CATEGORIES, client.id).then((data) => {
      if (!cancelled) {
        setFeedback(data);
        setLoadingFeedback(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [client?.id]);

  const breakdown = getCategoryBreakdown(
    OFFICIAL_CATEGORIES,
    feedback?.selectedCategories ?? [],
    feedback?.categoryRatings ?? {}
  );
  const likedTracks = getLikedTracks(
    tracks,
    feedback?.ratings ?? {},
    feedback?.comments ?? {}
  );
  const categoryTrackGroups = getTracksByCategoryRating(
    tracks,
    feedback?.ratings ?? {},
    feedback?.comments ?? {},
    feedback?.selectedCategories ?? []
  );

  if (clients.length === 0) {
    return (
      <section className="bg-gray-900 rounded-xl p-8 shadow-xl border border-gray-800 text-center" dir="rtl">
        <p className="text-gray-500 text-sm">צרו לקוח בלשונית "לקוחות" כדי לצפות בתובנות.</p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm text-gray-400 shrink-0">בחר לקוח:</label>
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 outline-none focus:border-purple-500"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({getClientTypeLabel(c.clientType)})
            </option>
          ))}
        </select>
      </div>

      {client && (
        <p className="text-sm text-gray-500">
          מציג תובנות עבור <span className="text-purple-400 font-bold">{client.name}</span>
        </p>
      )}

      <ClientReportExport
        client={client}
        feedback={feedback}
        tracks={tracks}
        formSchema={formSchema}
        disabled={loadingFeedback || !feedback}
      />

      {loadingFeedback ? (
        <p className="text-sm text-gray-500">טוען נתוני לקוח...</p>
      ) : (
        <>
          <ClientPreferencesSummary
            preferences={feedback?.preferences}
            formSchema={formSchema}
            clientType={client?.clientType}
          />
          <CategoryBreakdown breakdown={breakdown} />
          <CategoryTrackChoices
            groups={categoryTrackGroups}
            categoryRatings={feedback?.categoryRatings ?? {}}
          />
          <FiveStarList tracks={likedTracks} />
        </>
      )}
    </div>
  );
}
