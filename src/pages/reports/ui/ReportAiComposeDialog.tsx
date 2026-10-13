import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { executeReportQuery } from '@pages/reports/api/reportsApi';
import { composeReportFromNaturalLanguage } from '@pages/reports/api/reportAiComposeApi';
import { applyReportAiComposeDraftToStore } from '@pages/reports/lib/reportAiApplyDraft';
import { REPORT_AI_GOLDEN_PHRASES } from '@pages/reports/lib/reportAiGoldenPhrases';
import {
  advanceReportAiWizard,
  buildWizardColumnCatalog,
  createReportAiWizardSession,
  getWizardQuickReplies,
  wizardSessionToDraft,
  type ReportAiWizardSession,
} from '@pages/reports/lib/reportAiWizard';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { reportsStore } from '@pages/reports/model/reportsStore';
import { CHART_REPORT_PAGE_SIZE } from '@pages/reports/types/chartSpec';
import { normalizeReportViewMode } from '@pages/reports/types/reportApiTypes';
import { Button } from '@shared/ui/button';
import { Popup } from '@shared/ui/popup';

import composeStyles from './ReportComposeModal.module.scss';

type ReportAiComposeDialogProps = {
  open: boolean;
  onClose: () => void;
  onReportFormed?: () => void;
  onOpenEditor?: () => void;
};

export function ReportAiComposeDialog({
  open,
  onClose,
  onReportFormed,
  onOpenEditor,
}: ReportAiComposeDialogProps) {
  const { t } = useTranslation();
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [userText, setUserText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'gemini' | 'local_fallback' | null>(null);
  const [running, setRunning] = useState(false);
  const [session, setSession] = useState<ReportAiWizardSession | null>(null);
  const [phase, setPhase] = useState<'intent' | 'wizard'>('intent');

  useEffect(() => {
    if (!open) return;
    setUserText('');
    setReplyText('');
    setLoading(false);
    setError(null);
    setSource(null);
    setRunning(false);
    setSession(null);
    setPhase('intent');
  }, [open]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [session?.messages.length, loading]);

  const startWizardFromIntent = useCallback(async () => {
    if (!userText.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { response, validated } = await composeReportFromNaturalLanguage(userText);
      setSource(response.source);

      const entityName = validated.draft.entityName;
      await reportsStore.getState().loadMetadataForEntity(entityName);
      const meta = reportsStore.getState().metadata;
      if (!meta) throw new Error(t('reports.aiComposeError'));
      await reportsStore.getState().loadAllReferenceEntityMetadataForReport(meta);

      const state = reportsStore.getState();
      const catalog = buildWizardColumnCatalog({
        metadata: meta,
        entities: state.entities,
        outputRows: state.outputRows,
        tableMetadataByRowId: state.reportTableFieldsMetadataByRowId,
        referenceEntityMetadataByName: state.referenceEntityMetadataByName,
        t,
      });

      const introNote =
        response.source === 'gemini'
          ? t('reports.aiComposeSourceGemini')
          : t('reports.aiComposeSourceLocal');

      const next = createReportAiWizardSession({
        draft: validated.draft,
        catalog,
        introNote,
      });
      setSession(next);
      setPhase('wizard');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reports.aiComposeError'));
    } finally {
      setLoading(false);
    }
  }, [userText, loading, t]);

  const sendWizardReply = useCallback(
    (text: string) => {
      if (!session || !text.trim()) return;
      setSession(advanceReportAiWizard(session, text));
      setReplyText('');
    },
    [session],
  );

  const handleWizardSubmit = useCallback(() => {
    if (!replyText.trim()) return;
    sendWizardReply(replyText);
  }, [replyText, sendWizardReply]);

  const finalDraft = session?.done ? wizardSessionToDraft(session) : null;

  const handleFormReport = useCallback(async () => {
    if (!finalDraft || !session || running) return;
    setRunning(true);
    setError(null);
    try {
      const { entityName, body } = await applyReportAiComposeDraftToStore(finalDraft, {
        labelByPath: session.labelByPath,
      });
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
        sort: finalDraft.sort ?? [],
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
  }, [finalDraft, session, running, onClose, onReportFormed, t]);

  const handleOpenEditor = useCallback(async () => {
    if (!finalDraft || !session || running) return;
    setRunning(true);
    setError(null);
    try {
      await applyReportAiComposeDraftToStore(finalDraft, {
        labelByPath: session.labelByPath,
      });
      onOpenEditor?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reports.aiComposeError'));
    } finally {
      setRunning(false);
    }
  }, [finalDraft, session, running, onClose, onOpenEditor, t]);

  const quickReplies = session ? getWizardQuickReplies(session) : [];
  const wizardActive = phase === 'wizard' && session;

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

              {error ? <Alert severity="error">{error}</Alert> : null}
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : null}
            </Stack>
          ) : null}

          {wizardActive ? (
            <Stack spacing={1} className={composeStyles.aiWizardChat}>
              {source ? (
                <Alert severity={source === 'gemini' ? 'success' : 'info'} sx={{ py: 0.5 }}>
                  {source === 'gemini'
                    ? t('reports.aiComposeSourceGemini')
                    : t('reports.aiComposeSourceLocal')}
                </Alert>
              ) : null}

              <Box className={composeStyles.aiWizardMessages}>
                {session.messages.map((m) => (
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

              {!session.done ? (
                <>
                  {quickReplies.length ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {quickReplies.map((q) => (
                        <Chip
                          key={q}
                          size="small"
                          label={q}
                          onClick={() => sendWizardReply(q)}
                          disabled={running}
                        />
                      ))}
                    </Box>
                  ) : null}
                  <TextField
                    label={t('reports.aiComposeReplyLabel')}
                    placeholder={t('reports.aiComposeReplyPlaceholder')}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleWizardSubmit();
                      }
                    }}
                    multiline
                    minRows={2}
                    fullWidth
                    disabled={running}
                  />
                </>
              ) : (
                <Alert severity="success">{t('reports.aiComposeWizardReady')}</Alert>
              )}

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
                onClick={() => void startWizardFromIntent()}>
                {t('reports.aiComposeStartDialog')}
              </Button>,
              <Button key="cancel" onClick={onClose}>
                {t('common.cancel')}
              </Button>,
            ]
          : [
              <Button
                key="send"
                disabled={!replyText.trim() || running || Boolean(session?.done)}
                onClick={handleWizardSubmit}>
                {t('reports.aiComposeSendReply')}
              </Button>,
              <Button
                key="run"
                disabled={!finalDraft || running}
                onClick={() => void handleFormReport()}>
                {t('reports.aiComposeRun')}
              </Button>,
              <Button
                key="edit"
                disabled={!finalDraft || running}
                onClick={() => void handleOpenEditor()}>
                {t('reports.aiComposeOpenEditor')}
              </Button>,
              <Button key="cancel" onClick={onClose}>
                {t('common.cancel')}
              </Button>,
            ]
      }
    />
  );
}
