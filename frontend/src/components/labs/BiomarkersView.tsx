import React from 'react';
import { CardiovascularRatios } from './CardiovascularRatios';
import { DerivedBiomarkersPanel } from './DerivedBiomarkersPanel';
import { isClinicallyEligibleLab, type LabResult } from './labMarkers';

export const BiomarkersView: React.FC<{
  labs: LabResult[];
  labsLoadError?: boolean;
  onRefreshData?: () => void;
}> = ({ labs, labsLoadError = false, onRefreshData }) => {
  const clinicalLabs = labs.filter(isClinicallyEligibleLab);
  const excludedCount = labs.length - clinicalLabs.length;

  return (
    <section className="space-y-4" aria-label="Biomarcadores">
      {labsLoadError ? (
        <p role="status" className="text-sm text-rose-700 dark:text-rose-300">Não foi possível carregar os exames para as razões cardiovasculares.</p>
      ) : (
        <>
          {excludedCount > 0 && (
            <p role="status" className="rounded-radius-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
              {excludedCount} resultado(s) sem origem verificável não entram nos cálculos.
            </p>
          )}
          <CardiovascularRatios clinicalLabs={clinicalLabs} />
        </>
      )}
      <DerivedBiomarkersPanel onRefreshData={onRefreshData} />
    </section>
  );
};
