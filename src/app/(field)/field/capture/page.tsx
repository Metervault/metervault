"use client";

import { Suspense } from "react";
import { AppLoading } from "@/components/brand/app-loading";
import { CaptureWizard } from "@/components/field/capture-wizard";

export default function Page() {
  return (
    <Suspense fallback={<AppLoading label="Opening this job" />}>
      <CaptureWizard />
    </Suspense>
  );
}
