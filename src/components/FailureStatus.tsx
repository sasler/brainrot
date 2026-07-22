import {
  FAILURE_CATEGORY_LABELS,
  leadingFailureCategories,
  type VersionFeedback,
} from "@/lib/ratings-feedback";

interface FailureStatusProps {
  feedback: VersionFeedback;
  compact?: boolean;
}

export default function FailureStatus({
  feedback,
  compact = false,
}: FailureStatusProps) {
  if (feedback.failCount === 0) return null;
  const categories = leadingFailureCategories(feedback);

  return (
    <div
      className={`font-mono ${
        feedback.failed ? "text-rose-200/90" : "text-rose-300/60"
      }`}
      data-failure-status={feedback.failed ? "failed" : "reported"}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {feedback.failed && (
          <span className="rounded-full border border-rose-400/35 bg-rose-400/10 px-2 py-0.5 text-[9px] font-semibold tracking-[0.14em]">
            COMMUNITY FAILED
          </span>
        )}
        <span className={compact ? "text-[9px]" : "text-[10px]"}>
          {feedback.failCount} of {feedback.totalVerdicts} reported failure
          {feedback.failCount === 1 ? "" : "s"}
        </span>
      </div>
      {!compact && categories.length > 0 && (
        <div className="mt-1 text-[9px] tracking-wide text-rose-200/55">
          {categories
            .map(
              ({ category, count }) =>
                `${FAILURE_CATEGORY_LABELS[category]} (${count})`,
            )
            .join(" · ")}
        </div>
      )}
    </div>
  );
}
