"use client";

import dynamic from "next/dynamic";

export const LazyImportValueChart = dynamic(
  () => import("./import-value-chart").then(module => module.ImportValueChart),
  {
    ssr: false,
    loading: () => <div role="status" aria-label="Loading import chart" className="skeleton h-56 w-full sm:h-64" />,
  },
);
