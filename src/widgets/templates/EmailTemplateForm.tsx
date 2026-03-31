/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

/* eslint-disable no-console */
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import {
  Backdrop,
  Box,
  Button,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { TemplatesApi } from '@shared/api/baseQuerys';
import { TEMPLATE_TYPES_LABEL_MAP } from '@shared/lib/templateTypesLabelMap';

import { EmailTemplate } from './EmailTemplatesPage';

interface EmailTemplateFormProps {
  template: EmailTemplate | null;
  onSave: (
    template: Partial<EmailTemplate> | Omit<EmailTemplate, 'id' | 'createdBy' | 'createdAt'>,
  ) => void;
  onClose: () => void;
}

export const EmailTemplateForm: React.FC<EmailTemplateFormProps> = ({
  template,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [templateType, setTemplateType] = useState('');
  const [templateTypes, setTemplateTypes] = useState<{ id: number; type: string; name: string }[]>(
    [],
  );
  const [baseline, setBaseline] = useState({ name: '', content: '', templateType: '' });
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    templateType: '',
    content: '',
  });
  const quillRef = useRef<ReactQuill>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const backdropNodeRef = useRef<HTMLDivElement>(null);

  /** id > 0 — реальное редактирование; id 0/null — «Добавить» (в таблице передаётся заглушка с id: 0). */
  const isEditing = Boolean(template?.id);

  useEffect(() => {
    const fetchTemplateTypes = async () => {
      try {
        const response = await TemplatesApi.getTemplateTypes();
        const data = response.data;
        if (Array.isArray(data)) {
          setTemplateTypes(data);
        } else {
          console.error('Неверный формат данных', data);
          setTemplateTypes([]);
        }
      } catch (error) {
        console.error('Ошибка при загрузке типов шаблонов:', error);
      }
    };

    fetchTemplateTypes();
  }, []);

  /** Пустой Quill и эквиваленты для сравнения и валидации. */
  const normalizeRichText = (html: string) => {
    const raw = (html ?? '').trim();
    if (!raw) return '';
    const compact = raw.replace(/\s+/g, ' ').trim();
    if (
      compact === '' ||
      compact === '<p></p>' ||
      compact === '<p><br></p>' ||
      compact === '<br>' ||
      compact === '<p><br /></p>'
    ) {
      return '';
    }
    return html ?? '';
  };

  const templateSyncKey = template == null ? 'new' : String(template.id);
  useEffect(() => {
    if (template) {
      const n = template.name ?? '';
      const c = template.content ?? '';
      const tt = template.templateType.type ?? '';
      setName(n);
      setContent(c);
      setTemplateType(tt);
      setBaseline({ name: n, content: c, templateType: tt });
      setFieldErrors({ name: '', templateType: '', content: '' });
    } else {
      setName('');
      setContent('');
      setTemplateType('');
      setBaseline({ name: '', content: '', templateType: '' });
      setFieldErrors({ name: '', templateType: '', content: '' });
    }
    // Не зависеть от templateTypes: иначе при приходе типов с API эффект сбрасывает уже введённый текст (режим «Добавить»).
    // Примитивы шаблона вместо объекта template — иначе лишние сбросы при новой ссылке на тот же шаблон.
  }, [templateSyncKey, template?.name, template?.content, template?.templateType?.type]);

  const normName = (s: string) => (s ?? '').trim();
  const normContent = (html: string) => normalizeRichText(html);
  const isFormDirty =
    normName(name) !== normName(baseline.name) ||
    normContent(content) !== normContent(baseline.content) ||
    (templateType ?? '').trim() !== (baseline.templateType ?? '').trim();

  /** Как в других модалках: активна при любых несохранённых правках; обязательные поля — через подсказки под полями. */
  const saveDisabled = !isFormDirty;

  const handleSave = () => {
    const req = t('validation.required');
    const next = { name: '', templateType: '', content: '' };
    if (!normName(name)) next.name = req;
    if (!(templateType ?? '').trim()) next.templateType = req;
    if (!normContent(content)) next.content = req;

    const selectedTemplateType = templateTypes.find((t) => t.type === templateType);
    if ((templateType ?? '').trim() && !selectedTemplateType) {
      next.templateType = t('validation.notValidData');
    }

    if (next.name || next.templateType || next.content) {
      setFieldErrors(next);
      return;
    }

    const processedContent = content.replace(/&lt;%/g, '<%').replace(/%&gt;/g, '%>');

    const newTemplate = {
      name,
      content: processedContent,
      templateType: { id: selectedTemplateType.id },
    };

    if (isEditing) {
      //@ts-expect-error: временное решение
      onSave({ id: template.id, ...newTemplate });
    } else {
      //@ts-expect-error: временное решение
      onSave(newTemplate);
    }

    onClose();
  };

  const handleUndo = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const history = editor.getModule('history');
      if (history) {
        history.undo();
      }
    }
  };

  const handleRedo = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const history = editor.getModule('history');
      if (history) {
        history.redo();
      }
    }
  };

  const handleClearName = () => {
    setName('');
  };

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ direction: 'rtl' }],
      [{ color: [] as any }, { background: [] as any }],
      [{ font: [] as any }],
      [{ align: [] as any }],
      ['link', 'image'],
      ['clean'],
    ],
    history: {
      delay: 500,
      maxStack: 100,
      userOnly: true,
    },
  };

  useEffect(() => {
    if (!quillRef.current) return;
    const toolbarTranslations: Record<string, string | Record<string, string>> = {
      bold: t('editorToolbar.bold'),
      italic: t('editorToolbar.italic'),
      underline: t('editorToolbar.underline'),
      strike: t('editorToolbar.strike'),
      blockquote: t('editorToolbar.blockquote'),
      'code-block': t('editorToolbar.codeBlock'),
      direction: t('editorToolbar.direction'),
      color: t('editorToolbar.color'),
      background: t('editorToolbar.background'),
      font: t('editorToolbar.font'),
      align: t('editorToolbar.align'),
      link: t('editorToolbar.link'),
      image: t('editorToolbar.image'),
      clean: t('editorToolbar.clean'),
    };
    const editor = quillRef.current.getEditor();
    const toolbar = editor.getModule('toolbar');

    if (toolbar) {
      toolbar.container.querySelectorAll('button, span').forEach((button: HTMLElement) => {
        const format = button.classList[0]?.replace('ql-', '') as keyof typeof toolbarTranslations;

        if (format in toolbarTranslations) {
          const translation = toolbarTranslations[format];

          if (typeof translation === 'string') {
            button.setAttribute('title', translation);
          } else if (typeof translation === 'object' && button.dataset.value) {
            const subTranslation = translation[button.dataset.value];
            if (subTranslation) {
              button.setAttribute('title', subTranslation);
            }
          }
        }
      });
    }
  }, [t]);

  return (
    <Backdrop
      ref={backdropNodeRef}
      open={true}
      TransitionProps={{ nodeRef: backdropNodeRef }}
      sx={{
        zIndex: 1300,
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(0, 0, 0, 0.5)',
      }}>
      <Box
        ref={formRef}
        onClick={(e) => e.stopPropagation()}
        sx={{
          p: 3.5,
          width: '100%',
          maxWidth: 720,
          minWidth: { xs: 280, sm: 550 },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderRadius: '16px',
          boxShadow: 3,
          maxHeight: '99vh',
          overflow: 'auto',
        }}>
        {/* Заголовок формы */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
          }}>
          <Typography fontWeight={600} variant="h6" color="text.primary">
            {isEditing ? t('modals.editTemplate') : t('modals.addTemplate')}
          </Typography>
          <Tooltip title={t('common.closeWindow')}>
            <IconButton
              edge="end"
              onClick={onClose}
              aria-label="close"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  color: 'text.primary',
                },
              }}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <TextField
          label={t('form.templateName')}
          fullWidth
          margin="dense"
          value={name}
          error={Boolean(fieldErrors.name)}
          helperText={fieldErrors.name}
          onChange={(e) => {
            setFieldErrors((prev) => ({ ...prev, name: '' }));
            setName(e.target.value);
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleClearName} edge="end">
                  <Tooltip title={t('datePicker.clear')}>
                    <ClearIcon />
                  </Tooltip>
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label={t('tables.templateType')}
          fullWidth
          margin="dense"
          select
          value={templateType}
          error={Boolean(fieldErrors.templateType)}
          helperText={fieldErrors.templateType}
          onChange={(e) => {
            setFieldErrors((prev) => ({ ...prev, templateType: '' }));
            setTemplateType(e.target.value);
          }}>
          {templateTypes.map((type) => (
            <MenuItem key={type.id} value={type.type}>
              {t(TEMPLATE_TYPES_LABEL_MAP[type.name] ?? `templateTypes.${type.type}`, {
                defaultValue: type.name,
              })}
            </MenuItem>
          ))}
        </TextField>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 0.5,
            mt: 0.5,
            '& .MuiIconButton-root': { color: 'text.secondary' },
          }}>
          <Tooltip title={t('tooltips.richTextUndo')}>
            <IconButton onClick={handleUndo}>
              <UndoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('tooltips.richTextRedo')}>
            <IconButton onClick={handleRedo}>
              <RedoIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <FormControl
          fullWidth
          error={Boolean(fieldErrors.content)}
          sx={{
            mb: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            '& .quill': {
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: 'auto !important',
            },
            '& .ql-toolbar.ql-snow': {
              borderColor: 'divider',
              bgcolor: 'background.default',
              flexShrink: 0,
            },
            '& .ql-container.ql-snow': {
              borderColor: 'divider',
              bgcolor: 'background.default',
              flex: '1 1 auto',
              minHeight: 200,
              height: 'auto !important',
              fontSize: '1rem',
            },
            '& .ql-editor': {
              color: 'text.primary',
              minHeight: 196,
            },
            '& .ql-editor.ql-blank::before': {
              color: 'text.disabled',
            },
            '& .ql-stroke': {
              stroke: (theme) => theme.palette.text.primary,
            },
            '& .ql-fill': {
              fill: (theme) => theme.palette.text.primary,
            },
            '& .ql-picker': {
              color: 'text.primary',
            },
            '& .ql-picker-options': {
              bgcolor: 'background.paper',
              borderColor: 'divider',
            },
            '& .ql-picker-label': {
              borderColor: 'divider',
            },
            '& .ql-snow .ql-picker.ql-expanded .ql-picker-label': {
              borderColor: 'divider',
            },
            '& .ql-snow.ql-toolbar button:hover .ql-stroke': {
              stroke: (theme) => theme.palette.primary.main,
            },
            '& .ql-snow.ql-toolbar button:hover .ql-fill': {
              fill: (theme) => theme.palette.primary.main,
            },
          }}>
          <ReactQuill
            ref={quillRef}
            value={content}
            onChange={(v) => {
              setFieldErrors((prev) => ({ ...prev, content: '' }));
              setContent(v);
            }}
            theme="snow"
            modules={modules}
            formats={[
              'font',
              'size',
              'list',
              'bold',
              'italic',
              'underline',
              'strike',
              'blockquote',
              'code-block',
              'script',
              'indent',
              'direction',
              'color',
              'background',
              'align',
              'link',
              'image',
            ]}
          />
          {fieldErrors.content ? <FormHelperText>{fieldErrors.content}</FormHelperText> : null}
        </FormControl>

        <Box
          sx={{
            mt: 3,
            mb: 0.5,
            pt: 2,
            pb: 0.5,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 2,
            flexShrink: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}>
          <Tooltip title={isEditing ? t('form.saveChanges') : t('modals.addTemplate')}>
            <span>
              <Button
                variant="outlined"
                onClick={handleSave}
                disabled={saveDisabled}
                sx={{
                  minWidth: 100,
                  borderColor: 'divider',
                  color: 'text.primary',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: 'text.secondary',
                    backgroundColor: 'action.hover',
                  },
                }}>
                {isEditing ? t('common.save') : t('common.add')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('common.cancel')}>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                minWidth: 100,
                borderColor: 'divider',
                color: 'text.primary',
                '&:hover': {
                  borderColor: 'text.secondary',
                  backgroundColor: 'action.hover',
                },
              }}>
              {t('common.cancel')}
            </Button>
          </Tooltip>
        </Box>
      </Box>
    </Backdrop>
  );
};
