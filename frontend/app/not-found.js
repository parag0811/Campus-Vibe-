"use client";
import ErrorPage from "@/components/common/error";

export default function NotFound() {
  return (
    <ErrorPage statusCode={404} />
  );
}