"use client";
import ErrorPage from "@/components/common/error";

export default function GlobalError({ error, reset }) {
  return (
    <ErrorPage
      statusCode={500}
      title="Something went wrong"
      message={error?.message || "An unexpected error occurred."}
      showRetry={true}
      onRetry={reset}
    />
  );
}