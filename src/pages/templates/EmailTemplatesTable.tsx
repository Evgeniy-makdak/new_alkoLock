/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';

import { useMediaQuery } from '@mui/material';

import { EmailTemplate } from '../templates/types';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { EmailTemplateForm } from './EmailTemplateForm';
import { EmailTemplateView } from './EmailTemplateView';
import EmailTemplatesSearch from './EmailTemplatesSearch';
import { TemplatesDesktopTable } from './TemplatesDesktopTable';
import { TemplatesMobileTable } from './TemplatesMobileTable';

interface EmailTemplatesTableProps {
  templates: EmailTemplate[];
  sortField: keyof EmailTemplate | null;
  sortOrder: 'ASC' | 'DESC' | null;
  onRequestSort: (property: keyof EmailTemplate) => void;
  onToggleStatus: (id: number) => void;
  onDelete: (template: EmailTemplate) => void;
  onCreate: (template: Omit<EmailTemplate, 'id' | 'createdBy' | 'createdAt'>) => void;
  onEditSave: (template: Partial<EmailTemplate>) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const EmailTemplatesTable: React.FC<EmailTemplatesTableProps> = ({
  templates,
  sortField,
  sortOrder,
  onRequestSort,
  onToggleStatus,
  onDelete,
  onCreate,
  onEditSave,
  searchQuery,
  onSearchChange,
}) => {
  const [hoveredColumn, setHoveredColumn] = useState<keyof EmailTemplate | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

  const isMobile = useMediaQuery('(max-width:768px)');
  const shouldBlockNavigation = isEditing || isAdding || isDeleting;

  const handleTooltipOpen = (key: string) => setActiveTooltip(key);
  const handleTooltipClose = () => setActiveTooltip(null);

  const handleSortClick = (field: keyof EmailTemplate) => {
    onRequestSort(field);
  };

  const openView = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setSelectedRowId(template.id);
    setIsViewing(true);
    setIsEditing(false);
    setIsAdding(false);
    setIsDeleting(false);
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setIsViewing(false);
    setIsEditing(false);
    setSelectedRowId(null);
    setSelectedTemplate({
      id: 0,
      name: '',
      content: '',
      actual: false,
      createdBy: { id: 0, firstName: '', surname: '' },
      createdAt: '',
      templateType: { id: 0, type: '', name: '' },
      lastModifiedAt: '',
    });
  };

  const handleEditClick = (template: EmailTemplate) => {
    setIsEditing(true);
    setIsViewing(false);
    setIsAdding(false);
    setSelectedRowId(null);
    setSelectedTemplate(template);
  };

  const handleDeleteClick = (template: EmailTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
    setIsDeleting(true);
  };

  const handleConfirmDelete = () => {
    if (templateToDelete) {
      onDelete(templateToDelete);
    }
    setDeleteDialogOpen(false);
    setIsDeleting(false);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setIsDeleting(false);
  };

  const handleCloseModal = () => {
    setIsViewing(false);
    setIsEditing(false);
    setIsAdding(false);
    setActiveTooltip(null);
    setIsDeleting(false);

    setTimeout(() => {
      if (tableContainerRef.current && !isMobile) {
        tableContainerRef.current.focus();
      }
    }, 0);
  };

  const handleSaveTemplate = (updatedTemplate: EmailTemplate) => {
    if (isAdding) {
      const { ...newTemplate } = updatedTemplate;
      onCreate(newTemplate);
    } else if (isEditing) {
      onEditSave(updatedTemplate);
    }
    handleCloseModal();
  };

  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldBlockNavigation && ['ArrowDown', 'ArrowUp', 'Escape'].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (!templates.length) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();

        const currentId = selectedRowId;
        const currentIndex =
          currentId !== null ? templates.findIndex((t) => t.id === currentId) : -1;

        let newIndex = 0;
        if (currentIndex >= 0) {
          newIndex =
            event.key === 'ArrowDown'
              ? Math.min(currentIndex + 1, templates.length - 1)
              : Math.max(currentIndex - 1, 0);
        } else {
          newIndex = event.key === 'ArrowDown' ? 0 : templates.length - 1;
        }

        const newTemplate = templates[newIndex];
        if (newTemplate) {
          openView(newTemplate);
          document.querySelector(`#template-row-${newTemplate.id}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }

      if (event.key === 'Enter' && selectedRowId !== null && !isViewing) {
        const template = templates.find((t) => t.id === selectedRowId);
        if (template) openView(template);
      }

      if (event.key === 'Escape' && isViewing && !shouldBlockNavigation) {
        handleCloseModal();
        setSelectedRowId(null);
        setSelectedTemplate(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [templates, selectedRowId, shouldBlockNavigation, isViewing, isMobile]);

  useEffect(() => {
    if (tableContainerRef.current && !shouldBlockNavigation && !isViewing && !isMobile) {
      tableContainerRef.current.focus();
    }
  }, [shouldBlockNavigation, isViewing, isMobile]);

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '92vh' }}>
        <EmailTemplatesSearch
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onAddClick={handleAddClick}
        />

        <TemplatesMobileTable
          templates={templates}
          onToggleStatus={onToggleStatus}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          selectedRowId={selectedRowId}
        />

        {(isViewing || isEditing || isAdding) && selectedTemplate && (
          <>
            {isViewing && (
              <EmailTemplateView template={selectedTemplate} onClose={handleCloseModal} />
            )}
            {(isEditing || isAdding) && (
              <EmailTemplateForm
                template={selectedTemplate}
                onSave={handleSaveTemplate}
                onClose={handleCloseModal}
              />
            )}
          </>
        )}

        {deleteDialogOpen && templateToDelete && (
          <DeleteConfirmationDialog
            open={deleteDialogOpen}
            template={templateToDelete}
            onClose={handleCancelDelete}
            onConfirm={handleConfirmDelete}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '92vh' }}>
      <EmailTemplatesSearch
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onAddClick={handleAddClick}
      />

      <TemplatesDesktopTable
        templates={templates}
        loading={false}
        sortField={sortField}
        sortOrder={sortOrder}
        selectedRowId={selectedRowId}
        activeTooltip={activeTooltip}
        hoveredColumn={hoveredColumn}
        onRequestSort={handleSortClick}
        onToggleStatus={onToggleStatus}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
        onAddClick={handleAddClick}
        onViewClick={openView}
        onMouseEnterColumn={setHoveredColumn}
        onMouseLeaveColumn={() => setHoveredColumn(null)}
        onTooltipOpen={handleTooltipOpen}
        onTooltipClose={handleTooltipClose}
      />

      {isViewing && selectedTemplate && (
        <EmailTemplateView template={selectedTemplate} onClose={handleCloseModal} />
      )}

      {(isEditing || isAdding) && selectedTemplate && (
        <EmailTemplateForm
          template={selectedTemplate}
          onSave={handleSaveTemplate}
          onClose={handleCloseModal}
        />
      )}

      {deleteDialogOpen && templateToDelete && (
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          template={templateToDelete}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};

export default EmailTemplatesTable;
