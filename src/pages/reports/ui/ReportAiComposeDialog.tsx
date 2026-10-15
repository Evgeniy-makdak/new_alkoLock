import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { executeReportQuery } from '@pages/reports/api/reportsApi';
import {
  composeReportFromNaturalLanguage,
  refineReportDraft,
} from '@pages/reports/api/reportAiComposeApi';
import { applyReportAiComposeDraftToStore } from '@pages/reports/lib/reportAiApplyDraft';
import { buildReportAiDraftSummaryText } from '@pages/reports/lib/reportAiDraftSummary';
import { REPORT_AI_GOLDEN_PHRASES } from '@pages/reports/lib/reportAiGoldenPhrases';
import { useReportAiSettings } from '@pages/reports/model/reportAiSettings';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { reportsStore } from '@pages/reports/model/reportsStore';
import { CHART_REPORT_PAGE_SIZE } from '@pages/reports/types/chartSpec';
import { normalizeReportViewMode } from '@pages/reports/types/reportApiTypes';
import { Button } from '@shared/ui/button';
import { Popup } from '@shared/ui/popup';

import composeStyles from './ReportComposeModal.module.scss';

import type { ReportAiComposeDraft } from '@pages/reports/types/reportAiComposeTypes';

type ReportAiComposeDialogProps = {
  open: boolean;
  onClose: () => void;
  onReportFormed?: () => void;
  onOpenEditor?: () => void;
};

type AiPhase = 'intent' | 'summary' | 'refine';

type RefineMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

function msg(role: RefineMessage['role'], text: string): RefineMessage {
  return {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
  };
}

export function ReportAiComposeDialog({
  open,
  onClose,
  onReportFormed,
  onOpenEditor,
}: ReportAiComposeDialogProps) {
  const { t } = useTranslation();
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const settings = useReportAiSettings();

  const [userText, setUserText] = useState('');
  const [phase, setPhase] = useState<AiPhase>('intent');
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'gemini' | 'openrouter' | 'local_fallback' | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [draft, setDraft] = useState<ReportAiComposeDraft | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [refineMessages, setRefineMessages] = useState<RefineMessage[]>([]);
  const [refineInput, setRefineInput] = useState('');
  const [refineLoading, setRefineLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUserText('');
    setPhase('intent');
    setLoading(false);
    setRunning(false);
    setError(null);
    setSource(null);
    setWarnings([]);
    setDraft(null);
    setShowSettings(false);
    setRefineMessages([]);
    setRefineInput('');
    setRefineLoading(false);
  }, [open]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [refineMessages.length, refineLoading, loading]);

  const startCompose = useCallback(async () => {
    if (!userText.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { response, validated } = await composeReportFromNaturalLanguage(userText);
      setSource(response.source);
      setWarnings(validated.warnings);
      setDraft(validated.draft);
      setPhase('summary');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reports.aiComposeError'));
    } finally {
      setLoading(false);
    }
  }, [userText, loading, t]);

  const sendRefine = useCallback(async () => {
    const text = refineInput.trim();
    if (!text || !draft || refineLoading) return;
    setRefineLoading(true);
    setError(null);
    setRefineMessages((prev) => [...prev, msg('user', text)]);
    setRefineInput('');
    try {
      const { response, validated } = await refineReportDraft(text, draft);
      setSource(response.source);
      setWarnings(validated.warnings);
      setDraft(validated.draft);
      setRefineMessages((prev) => [
        ...prev,
        msg('assistant', buildReportAiDraftSummaryText(validated.draft)),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reports.aiComposeError'));
    } finally {
      setRefineLoading(false);
    }
  }, [refineInput, draft, refineLoading, t]);

  const handleFormReport = useCallback(async () => {
    if (!draft || running) return;
    setRunning(true);
    setError(null);
    try {
      const { entityName, body } = await applyReportAiComposeDraftToStore(draft);
      const viewMode = normalizeReportViewMode(reportsStore.getState().viewMode);
      const fetchSize =
        viewMode === 'chart'
          ? CHART_REPORT_PAGE_SIZE
          : reportGenerationStore.getState().pagination.pageSize;

      reportGenerationStore.getState().start();
      reportGenerationStore.getState().setPagination({ page: 0 });

      const result = await executeReportQuery(entityName, body, {
        page: 0,
        size: fetchSize,
        sort: draft.sort ?? [],
      });
      reportGenerationStore.getState().completeSuccess(result);
      onReportFormed?.();
      onClose();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        reportGenerationStore.getState().finishCancelled();
        return;
      }
      const message = e instanceof Error ? e.message : t('reports.aiComposeRunError');
      reportGenerationStore.getState().completeError(message);
      setError(message);
    } finally {
      setRunning(false);
    }
  }, [draft, running, onClose, onReportFormed, t]);

  const handleOpenEditor = useCallback(async () => {
    if (!draft || running) return;
    setRunning(true);
    setError(null);
    try {
      await applyReportAiComposeDraftToStore(draft);
      onOpenEditor?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reports.aiComposeError'));
    } finally {
      setRunning(false);
    }
  }, [draft, running, onClose, onOpenEditor, t]);

  const summaryText = draft ? buildReportAiDraftSummaryText(draft) : '';

  const sourceLabel =
    source === 'gemini'
      ? t('reports.aiComposeSourceGemini')
      : source === 'openrouter'
        ? t('reports.aiComposeSourceOpenRouter')
        : t('reports.aiComposeSourceLocal');

  return (
    <Popup
      isOpen={open}
      headerTitle={t('reports.aiComposeTitle')}
      toggleModal={onClose}
      onCloseModal={onClose}
      closeonClickSpace={false}
      body={
        <Box className={composeStyles.aiWizardBody}>
          {phase === 'intent' ? (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                {t('reports.aiComposeHint')}
              </Typography>

              <TextField
                label={t('reports.aiComposeInputLabel')}
                placeholder={t('reports.aiComposeInputPlaceholder')}
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                disabled={loading || running}
              />

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {REPORT_AI_GOLDEN_PHRASES.slice(0, 4).map((phrase) => (
                  <Chip
                    key={phrase.id}
                    size="small"
                    variant="outlined"
                    icon={<AutoAwesomeOutlinedIcon />}
                    label={phrase.text.length > 56 ? `${phrase.text.slice(0, 56)}…` : phrase.text}
                    onClick={() => setUserText(phrase.text)}
                    disabled={loading || running}
                  />
                ))}
              </Box>

              <Box>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<SettingsOutlinedIcon />}
                  onClick={() => setShowSettings((v) => !v)}
                  disabled={loading || running}>
                  {t('reports.aiComposeSettings')}
                </Button>
              </Box>

              {showSettings ? (
                <Stack spacing={1.5} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2">{t('reports.aiComposeSettingsTitle')}</Typography>
                  <TextField
                    label="Gemini API key (AI Studio)"
                    value={settings.geminiApiKey}
                    onChange={(e) => settings.setGeminiApiKey(e.target.value)}
                    type="password"
                    size="small"
                    fullWidth
                    helperText={t('reports.aiComposeGeminiKeyHint')}
                  />
                  <TextField
                    label="OpenRouter API key"
                    value={settings.openRouterApiKey}
                    onChange={(e) => settings.setOpenRouterApiKey(e.target.value)}
                    type="password"
                    size="small"
                    fullWidth
                    helperText={t('reports.aiComposeOpenRouterKeyHint')}
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel>{t('reports.aiComposeProviderLabel')}</InputLabel>
                    <Select
                      value={settings.preferredProvider}
                      label={t('reports.aiComposeProviderLabel')}
                      onChange={(e) =>
                        settings.setPreferredProvider(
                          e.target.value as 'auto' | 'gemini' | 'openrouter',
                        )
                      }>
                      <MenuItem value="auto">{t('reports.aiComposeProviderAuto')}</MenuItem>
                      <MenuItem value="gemini">Gemini</MenuItem>
                      <MenuItem value="openrouter">OpenRouter</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              ) : null}

              {error ? <Alert severity="error">{error}</Alert> : null}
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : null}
            </Stack>
          ) : null}

          {phase === 'summary' && draft ? (
            <Stack spacing={1.5}>
              <Alert severity={source === 'local_fallback' ? 'info' : 'success'} sx={{ py: 0.5 }}>
                {sourceLabel}
              </Alert>

              <Typography variant="subtitle2">{t('reports.aiComposeSummaryTitle')}</Typography>
              <Box
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                }}>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{ m: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {summaryText}
                </Typography>
              </Box>

              {warnings.length ? (
                <Alert severity="warning">
                  <Stack spacing={0.5}>
                    {warnings.map((w) => (
                      <Typography key={w} variant="body2">
                        • {w}
                      </Typography>
                    ))}
                  </Stack>
                </Alert>
              ) : null}

              {error ? <Alert severity="error">{error}</Alert> : null}
            </Stack>
          ) : null}

          {phase === 'refine' && draft ? (
            <Stack spacing={1} className={composeStyles.aiWizardChat}>
              <Alert severity={source === 'local_fallback' ? 'info' : 'success'} sx={{ py: 0.5 }}>
                {sourceLabel}
              </Alert>

              <Box className={composeStyles.aiWizardMessages}>
                {refineMessages.map((m) => (
                  <Box
                    key={m.id}
                    className={
                      m.role === 'user'
                        ? composeStyles.aiWizardBubbleUser
                        : composeStyles.aiWizardBubbleAssistant
                    }>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.25 }}>
                      {m.role === 'user'
                        ? t('reports.aiComposeYou')
                        : t('reports.aiComposeAssistant')}
                    </Typography>
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{
                        m: 0,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                        wordBreak: 'break-word',
                      }}>
                      {m.text}
                    </Typography>
                  </Box>
                ))}
                <div ref={chatEndRef} />
              </Box>

              <TextField
                label={t('reports.aiComposeRefineLabel')}
                placeholder={t('reports.aiComposeRefinePlaceholder')}
                value={refineInput}
                onChange={(e) => setRefineInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendRefine();
                  }
                }}
                multiline
                minRows={2}
                fullWidth
                disabled={refineLoading || running}
              />
              {refineLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : null}
              {error ? <Alert severity="error">{error}</Alert> : null}
            </Stack>
          ) : null}
        </Box>
      }
      buttons={
        phase === 'intent'
          ? [
              <Button
                key="start"
                disabled={!userText.trim() || loading || running}
                onClick={() => void startCompose()}>
                {t('reports.aiComposeStartDialog')}
              </Button>,
              <Button key="cancel" onClick={onClose}>
                {t('common.cancel')}
              </Button>,
            ]
          : [
              <Button
                key="run"
                disabled={!draft || running}
                onClick={() => void handleFormReport()}>
                {t('reports.aiComposeRun')}
              </Button>,
              <Button
                key="edit"
                disabled={!draft || running}
                onClick={() => void handleOpenEditor()}>
                {t('reports.aiComposeOpenEditor')}
              </Button>,
              <Button
                key="refine"
                disabled={!draft || running}
                onClick={() => {
                  setPhase('refine');
                  setError(null);
                }}>
                {t('reports.aiComposeRefine')}
              </Button>,
              <Button
                key="back"
                disabled={running}
                onClick={() => {
                  setPhase('intent');
                  setError(null);
                }}>
                {t('reports.aiComposeBack')}
              </Button>,
              <Button key="cancel" onClick={onClose}>
                {t('common.cancel')}
              </Button>,
            ]
      }
    />
  );
}
