"use client";

import FailureStatus from "./FailureStatus";
import { useVersionFeedback } from "./RatingsProvider";

export default function VersionFailureNotice({
  gameId,
  modelId,
}: {
  gameId: string;
  modelId: string;
}) {
  const { feedback, loading, storage } = useVersionFeedback(gameId, modelId);
  if (loading || storage?.available === false || !feedback?.failed) return null;

  return (
    <div className="hidden items-center rounded-lg border border-rose-400/20 bg-rose-400/8 px-3 py-1.5 md:flex">
      <FailureStatus feedback={feedback} compact />
    </div>
  );
}
