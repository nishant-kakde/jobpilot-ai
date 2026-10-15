import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, CheckCircle2, AlertTriangle, ExternalLink, ArrowRight,
  RefreshCw, Check, X, FileText, Lock, UserCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { Application } from '../../types';

interface AutofillModalProps {
  application: Application | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AutofillModal: React.FC<AutofillModalProps> = ({
  application,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<number>(1);
  const [prepData, setPrepData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userApproved, setUserApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completionResult, setCompletionResult] = useState<any>(null);

  useEffect(() => {
    if (!application) return;
    const prepare = async () => {
      setLoading(true);
      try {
        const data = await api.prepareAutofill(application.id);
        setPrepData(data);
      } catch (err) {
        console.error('Preparation error', err);
      } finally {
        setLoading(false);
      }
    };
    prepare();
  }, [application]);

  if (!application) return null;

  const handleSimulateFill = async () => {
    setLoading(true);
    try {
      await api.executeAutofill({
        application_id: application.id,
        action: 'fill_form',
        form_data: prepData?.mapped_fields
      });
      setStep(2);
    } catch (err: any) {
      alert(`Autofill error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalApprovalSubmit = async () => {
    if (!userApproved) {
      alert('You must review all fields and check the explicit approval box before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.executeAutofill({
        application_id: application.id,
        action: 'submit_approved',
        form_data: prepData?.mapped_fields
      });
      setCompletionResult(res);
      setStep(3);
      onSuccess();
    } catch (err: any) {
      alert(`Submission recording failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Safety Protocol
              </span>
              <span className="text-xs text-slate-500">Browser-Assisted Workflow</span>
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mt-1">
              {application.job?.title} at {application.job?.company}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Indicator */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className={`p-2 rounded-lg border font-semibold ${step >= 1 ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 border-indigo-300 dark:border-indigo-800' : 'text-slate-400'}`}>
            1. Field Mapping
          </div>
          <div className={`p-2 rounded-lg border font-semibold ${step >= 2 ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 border-indigo-300 dark:border-indigo-800' : 'text-slate-400'}`}>
            2. Review & Consent
          </div>
          <div className={`p-2 rounded-lg border font-semibold ${step === 3 ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border-emerald-300 dark:border-emerald-800' : 'text-slate-400'}`}>
            3. Verified Submission
          </div>
        </div>

        {/* Step 1: Mapping & Field Preview */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 text-xs space-y-2">
              <span className="font-bold text-slate-900 dark:text-white block">Mapped Candidate Telemetry:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-slate-400">Full Name:</span> {prepData?.mapped_fields?.full_name}</div>
                <div><span className="text-slate-400">Email:</span> {prepData?.mapped_fields?.email}</div>
                <div><span className="text-slate-400">Phone:</span> {prepData?.mapped_fields?.phone || 'Not set'}</div>
                <div><span className="text-slate-400">City:</span> {prepData?.mapped_fields?.city}</div>
                <div><span className="text-slate-400">Notice Period:</span> {prepData?.mapped_fields?.notice_period_days} days</div>
                <div><span className="text-slate-400">Experience:</span> {prepData?.mapped_fields?.years_of_experience} years</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Strict compliance: Automated autofill fills permitted fields and will pause for manual CAPTCHA / login.</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSimulateFill}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Populate & Proceed to Review</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Mandatory Review & Consent Gate */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <span>Explicit User Consent Required Prior to Submission</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                JobPilot will NEVER submit an application without your direct authorization. Please verify that all application answers,
                resume versions, and contact details match your expectations.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 text-xs space-y-2">
              <span className="font-bold text-slate-900 dark:text-white">Populated Application Artifacts:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                <li>Tailored Resume: Ready (Single-column ATS format)</li>
                <li>Cover Letter: Personalized for {application.job?.company}</li>
                <li>Screening Answers: Verified against your master profile</li>
              </ul>
            </div>

            {/* Checkbox consent */}
            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/30 cursor-pointer">
              <input
                type="checkbox"
                checked={userApproved}
                onChange={(e) => setUserApproved(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                I have reviewed all application inputs and explicitly authorize recording this verified submission.
              </span>
            </label>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:underline"
              >
                Back to Mapping
              </button>
              <button
                type="button"
                onClick={handleFinalApprovalSubmit}
                disabled={!userApproved || submitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Recording Verification...' : 'Approve & Confirm Submission'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verified Result */}
        {step === 3 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Application Submission Confirmed!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Your application has been verified and recorded in your Application Tracker pipeline under "Applied".
              </p>
            </div>

            <div className="inline-block p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
              Confirmation Code: <span className="font-bold text-indigo-600 dark:text-indigo-400">JP-VERIFIED-{application.id.slice(0, 8).toUpperCase()}</span>
            </div>

            <div>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-sm"
              >
                Done & View Tracker
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
