import React from 'react';
import {
  HeartPulse,
  Phone,
  AlertTriangle,
  UserCheck,
  Shield,
  Stethoscope,
} from 'lucide-react';
import { MedicalIdInfo } from './ProfileTypes';

export interface MedicalIdCardProps {
  medicalId?: MedicalIdInfo;
  bloodTypeDirect?: string;
  allergiesDirect?: string;
}

export const MedicalIdCard: React.FC<MedicalIdCardProps> = ({
  medicalId,
  bloodTypeDirect,
  allergiesDirect,
}) => {
  const data = medicalId || {};
  const bloodType = data.blood_type || bloodTypeDirect;
  const allergies = data.allergies || allergiesDirect;
  const emergencyName = data.emergency_contact?.name || data.emergency_contact_name;
  const emergencyPhone = data.emergency_contact?.phone || data.emergency_contact_phone;
  const physician = data.primary_physician;
  const familyHistory = data.family_history;
  const chronicConditions = data.chronic_conditions;

  const hasAnyData = Boolean(
    bloodType ||
    allergies ||
    emergencyName ||
    emergencyPhone ||
    physician ||
    familyHistory ||
    chronicConditions
  );

  return (
    <div
      className="p-5 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between"
      role="region"
      aria-label="Ficha Médica e Segurança"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-radius-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <HeartPulse className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Ficha Médica & Segurança
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-radius-sm">
                  Medical ID
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Informações clínicas essenciais para prontuário e emergências.
              </p>
            </div>
          </div>
          <Shield className="h-4 w-4 text-slate-400" aria-hidden="true" />
        </div>

        {!hasAnyData ? (
          <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
            Nenhuma informação médica registrada ainda. Clique em <strong>Editar Perfil</strong> para adicionar tipo sanguíneo, alergias e contatos de emergência.
          </div>
        ) : (
          <div className="space-y-3.5 text-xs">
            {/* Linha 1: Tipo Sanguíneo e Alergias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Tipo Sanguíneo & Fator Rh
                </span>
                {bloodType ? (
                  <span className="inline-flex items-center text-sm font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-radius-md border border-rose-500/20">
                    {bloodType}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Não informado</span>
                )}
              </div>

              <div className="p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Alergias & Intolerâncias
                </span>
                {allergies ? (
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                    <span>{allergies}</span>
                  </span>
                ) : (
                  <span className="text-slate-600 dark:text-slate-400">Nenhuma registrada</span>
                )}
              </div>
            </div>

            {/* Linha 2: Contato de Emergência (ICE) */}
            {(emergencyName || emergencyPhone) && (
              <div className="p-3 rounded-radius-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 block">
                    Contato de Emergência (ICE)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {emergencyName || 'Contato Principal'}
                  </span>
                </div>
                {emergencyPhone && (
                  <a
                    href={`tel:${emergencyPhone.replace(/[^\d+]/g, '')}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-radius-md bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{emergencyPhone}</span>
                  </a>
                )}
              </div>
            )}

            {/* Linha 3: Histórico Familiar e Médico Responsável */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                  Histórico Familiar:
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {familyHistory || 'Sem histórico de risco registrado'}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block flex items-center gap-1">
                  <Stethoscope className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                  Médico de Referência:
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {physician || 'Não informado'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
        <UserCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
        <span>Armazenamento local-first estritamente confidencial em longevidade.db</span>
      </div>
    </div>
  );
};
