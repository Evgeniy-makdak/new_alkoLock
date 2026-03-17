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
  const quillRef = useRef<ReactQuill>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const backdropNodeRef = useRef<HTMLDivElement>(null);

  const isEditing = template && template.id;

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

  useEffect(() => {
    if (template) {
      setName(template.name ?? '');
      setContent(template.content ?? '');
      setTemplateType(template.templateType.type ?? '');
    } else {
      setName('');
      setContent('');
      setTemplateType('');
    }
  }, [template, templateTypes]);

  const handleSave = () => {
    if (!name?.trim() || !content?.trim() || !templateType?.trim()) {
      alert('Заполните все поля!');
      return;
    }

    const selectedTemplateType = templateTypes.find((t) => t.type === templateType);
    if (!selectedTemplateType) {
      alert('Выбран неверный тип шаблона!');
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

  const toolbarTranslations: Record<string, string | Record<string, string>> = {
    bold: 'Жирный',
    italic: 'Курсив',
    underline: 'Подчёркнутый',
    strike: 'Зачёркнутый',
    blockquote: 'Цитата',
    'code-block': 'Блок кода',
    direction: 'Направление текста',
    color: 'Цвет текста',
    background: 'Цвет фона',
    font: 'Шрифт',
    align: 'Выравнивание',
    link: 'Вставить ссылку',
    image: 'Вставить изображение',
    clean: 'Очистить форматирование',
  };

  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const toolbar = editor.getModule('toolbar');

      if (toolbar) {
        toolbar.container.querySelectorAll('button, span').forEach((button: HTMLElement) => {
          const format = button.classList[0]?.replace(
            'ql-',
            '',
          ) as keyof typeof toolbarTranslations;

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Backdrop
      ref={backdropNodeRef}
      open={true}
      sx={{ zIndex: 1300, color: '#fff' }}
      TransitionProps={{ nodeRef: backdropNodeRef }}>
      <Box
        ref={formRef}
        onClick={(e) => e.stopPropagation()}
        sx={{
          p: 1,
          width: '50%',
          maxWidth: 'none',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: 3,
        }}>
        {/* Заголовок формы */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
          }}>
          <Typography
            fontWeight={600}
            variant="h6"
            sx={{
              color: 'black !important',
            }}>
            {isEditing ? t('modals.editTemplate') : t('modals.addTemplate')}
          </Typography>
          <Tooltip title="Закрыть окно">
            <IconButton
              edge="end"
              onClick={onClose}
              aria-label="close"
              sx={{
                color: (theme) => theme.palette.grey[500],
                '&:hover': {
                  backgroundColor: 'transparent',
                  color: (theme) => theme.palette.grey[700],
                },
              }}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <TextField
          label={t('form.templateName')}
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleClearName} edge="end">
                  <Tooltip title="Очистить">
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
          margin="normal"
          select
          value={templateType}
          onChange={(e) => setTemplateType(e.target.value)}>
          {templateTypes.map((type) => (
            <MenuItem key={type.id} value={type.type}>
              {t(TEMPLATE_TYPES_LABEL_MAP[type.name] ?? `templateTypes.${type.type}`, {
                defaultValue: type.name,
              })}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Tooltip title="Назад">
            <IconButton onClick={handleUndo}>
              <UndoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Вперёд">
            <IconButton onClick={handleRedo}>
              <RedoIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <ReactQuill
          ref={quillRef}
          value={content}
          onChange={setContent}
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
          style={{
            height: '300px',
            minHeight: '200px',
            width: '100%',
            color: 'black',
          }}
        />

        <Box sx={{ mt: 7, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Tooltip title={isEditing ? 'Сохранить изменения' : 'Добавить шаблон'}>
            <Button
              variant="outlined"
              onClick={handleSave}
              sx={{
                '&&': {
                  background: 'transparent !important',
                  border: '1px solid grey !important',
                  color: 'black !important',
                  minWidth: '100px !important',
                },
                '&:hover': {
                  background: 'rgba(0, 0, 0, 0.04) !important',
                  border: '1px solid grey !important',
                },
              }}>
              {isEditing ? t('common.save') : t('common.add')}
            </Button>
          </Tooltip>
          <Tooltip title="Отменить">
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                '&&': {
                  background: 'transparent !important',
                  border: '1px solid grey !important',
                  color: 'black !important',
                  minWidth: '100px !important',
                },
                '&:hover': {
                  background: 'rgba(0, 0, 0, 0.04) !important',
                  border: '1px solid grey !important',
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
