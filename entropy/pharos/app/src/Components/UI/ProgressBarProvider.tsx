'use client';

import { AppProgressProvider  as ProgressBar } from '@bprogress/next';

export default function ProgressBarProvider() {
  return (
    <ProgressBar
      height="4px"
      color="#f97028"
      options={{
        showSpinner: false,
      }}
    />
  );
}
