import { useEffect, useState } from 'react';
import { Assignment, DEFAULT_CTA, reportExperiment, resolveAssignment } from './experiment';

/** The CTA label, experiment-aware. Shows the default until (and unless) a live experiment assigns a variant. */
export function useCta(reportImpression = false) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  useEffect(() => {
    let alive = true;
    void resolveAssignment().then((a) => {
      if (!alive || !a) return;
      setAssignment(a);
      if (reportImpression) reportExperiment('impression', a);
    });
    return () => { alive = false; };
  }, [reportImpression]);
  return { label: assignment?.label ?? DEFAULT_CTA, onClick: () => assignment && reportExperiment('click', assignment) };
}
