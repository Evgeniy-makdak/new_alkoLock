import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

import { Button, ButtonsType } from '@shared/ui/button';

import { dashboardStore } from '../model/dashboardStore';
import type { ReportDashboard } from '../types';
import { DashboardDeleteDialog } from './DashboardDeleteDialog';
import { DashboardEditor } from './DashboardEditor';

import styles from './Dashboard.module.scss';

export function ReportsDashboardsPanel() {
  const { t } = useTranslation();
  const items = dashboardStore((s) => s.items);
  const loading = dashboardStore((s) => s.loading);
  const error = dashboardStore((s) => s.error);
  const editorOpen = dashboardStore((s) => s.editorOpen);
  const selectedId = dashboardStore((s) => s.selectedId);
  const loadList = dashboardStore((s) => s.loadList);
  const openEditEditor = dashboardStore((s) => s.openEditEditor);
  const closeEditor = dashboardStore((s) => s.closeEditor);
  const createDashboard = dashboardStore((s) => s.createDashboard);
  const deleteDashboard = dashboardStore((s) => s.deleteDashboard);
  const selectedDashboard = dashboardStore((s) => s.selectedDashboard);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [dashboardToDelete, setDashboardToDelete] = useState<ReportDashboard | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const editing = useMemo(() => {
    if (!editorOpen) return null;
    return selectedDashboard();
  }, [editorOpen, selectedId, items, selectedDashboard]);

  if (editing) {
    return (
      <DashboardEditor
        key={editing.id}
        dashboard={editing}
        onBack={() => {
          closeEditor();
        }}
      />
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <Typography variant="h6" component="h2">
          {t('reports.dashboard.listTitle', 'Дашборды')}
        </Typography>
        <Button
          typeButton={ButtonsType.action}
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            setNewName('');
            setNewDescription('');
            setCreateOpen(true);
          }}>
          {t('reports.dashboard.create', { defaultValue: 'Создать дашборд' })}
        </Button>
      </div>

      {loading ? (
        <BoxCenter>
          <CircularProgress size={32} />
        </BoxCenter>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <Typography>
            {t('reports.dashboard.listEmpty', { defaultValue: 'нет данных' })}
          </Typography>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((item) => (
            <article key={item.id} className={styles.card}>
              <h3 className={styles.cardTitle}>{item.name}</h3>
              <p className={styles.cardMeta}>
                {item.description || t('reports.dashboard.noDescription', 'Без описания')}
              </p>
              <p className={styles.cardMeta}>
                {t('reports.dashboard.gridSize', 'Сетка {{rows}}×{{cols}}')
                  .replace('{{rows}}', String(item.layout.rows))
                  .replace('{{cols}}', String(item.layout.cols))}
                {' · '}
                {t('reports.dashboard.widgetsCount', 'виджетов: {{count}}').replace(
                  '{{count}}',
                  String(item.layout.cells.filter((cell) => cell.widget).length),
                )}
              </p>
              <div className={styles.cardActions}>
                <Button
                  size="small"
                  typeButton={ButtonsType.action}
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => openEditEditor(item.id)}>
                  {t('reports.dashboard.open', { defaultValue: 'Открыть' })}
                </Button>
                <Button
                  size="small"
                  typeButton={ButtonsType.action}
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setDashboardToDelete(item)}>
                  {t('common.delete', { defaultValue: 'Удалить' })}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('reports.dashboard.create', 'Создать дашборд')}</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            size="small"
            margin="dense"
            label={t('reports.dashboard.name', 'Название')}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            margin="dense"
            label={t('reports.dashboard.description', 'Описание')}
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            typeButton={ButtonsType.action}
            disabled={creating || !newName.trim()}
            isLoading={creating}
            onClick={() => {
              setCreating(true);
              void createDashboard(newName, newDescription)
                .then(() => setCreateOpen(false))
                .finally(() => setCreating(false));
            }}>
            {t('common.create', { defaultValue: 'Создать' })}
          </Button>
          <Button typeButton={ButtonsType.action} onClick={() => setCreateOpen(false)}>
            {t('common.cancel', { defaultValue: 'Отмена' })}
          </Button>
        </DialogActions>
      </Dialog>

      <DashboardDeleteDialog
        open={!!dashboardToDelete}
        dashboardName={dashboardToDelete?.name ?? ''}
        isDeleting={deleting}
        onClose={() => {
          if (deleting) return;
          setDashboardToDelete(null);
        }}
        onConfirm={() => {
          if (!dashboardToDelete) return;
          setDeleting(true);
          void deleteDashboard(dashboardToDelete.id)
            .then(() => setDashboardToDelete(null))
            .finally(() => setDeleting(false));
        }}
      />
    </div>
  );
}

function BoxCenter({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>{children}</div>
  );
}
