import { fetchReportEntityMetadata } from './reportsApi';
import { fetchBranchOfficesForReport, flattenBranchOffices } from '../lib/branchOfficeReportOptions';
import { buildLocalReportAiComposeDraft } from '../lib/reportAiLocalFallback';
import {
  buildReportAiPromptContext,
  buildReportAiSystemPrompt,
  buildReportAiUserPrompt,
} from '../lib/reportAiPromptContext';
import {
  parseReportAiModelJson,
  validateAndResolveReportAiDraft,
} from '../lib/reportAiValidateDraft';
import { reportsStore } from '../model/reportsStore';

import type {
  ReportAiComposeDraft,
  ReportAiComposeResponse,
  ReportAiPromptContext,
  ReportAiValidatedCompose,
} from '../types/reportAiComposeTypes';
import type { ReportEntityMetadata } from '../types/reportApiTypes';

const AI_COMPOSE_URL = '/api/reports-ai/compose';

async function ensureMetadataMap(
  entityNames: string[],
): Promise<Record<string, ReportEntityMetadata | null>> {
  const map: Record<string, ReportEntityMetadata | null> = {
    ...reportsStore.getState().referenceEntityMetadataByName,
  };
  const root = reportsStore.getState().metadata;
  if (root?.entityName) {
    map[root.entityName] = root;
  }

  for (const name of entityNames) {
    if (map[name]) continue;
    try {
      map[name] = await fetchReportEntityMetadata(name);
      await reportsStore.getState().loadReferenceEntityMetadata(name);
    } catch {
      map[name] = null;
    }
  }
  return map;
}

export async function buildClientReportAiPromptContext(
  preferredEntityName?: string | null,
): Promise<ReportAiPromptContext> {
  const entities = reportsStore.getState().entities;
  const names = Array.from(
    new Set([
      ...(preferredEntityName ? [preferredEntityName] : []),
      'DeviceEvent',
      'User',
      'Vehicle',
      'MonitoringDevice',
      'AutoServiceHistory',
      ...entities.map((e) => e.entityName),
    ]),
  ).filter(Boolean);

  const metadataByEntity = await ensureMetadataMap(names);

  let branches: Array<{ id: number | string; name: string }> = [];
  try {
    const nodes = flattenBranchOffices(await fetchBranchOfficesForReport());
    branches = nodes
      .filter((n) => n.id != null && n.name)
      .slice(0, 80)
      .map((n) => ({ id: n.id as number | string, name: String(n.name) }));
  } catch {
    branches = [];
  }

  return buildReportAiPromptContext({
    entities,
    metadataByEntity,
    catalogs: { branches },
    locale: 'ru',
  });
}

async function callGeminiProxy(
  userText: string,
  context: ReportAiPromptContext,
): Promise<{ draft: unknown; rawModelText?: string } | null> {
  try {
    const res = await fetch(AI_COMPOSE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: buildReportAiSystemPrompt(),
        userPrompt: buildReportAiUserPrompt(userText, context),
        context,
        userText,
      }),
    });
    if (!res.ok) {
      // Нет/битый ключ, proxy или Gemini недоступны → локальный wizard на клиенте.
      // 401/403: ключ есть, но Google его отклонил (частый кейс после копирования src без .env).
      if (
        res.status === 401 ||
        res.status === 403 ||
        res.status === 501 ||
        res.status === 503 ||
        res.status >= 500
      ) {
        return null;
      }
      const errText = await res.text().catch(() => '');
      throw new Error(errText || `AI proxy error ${res.status}`);
    }
    const data = (await res.json()) as {
      draft?: unknown;
      text?: string;
      rawModelText?: string;
    };
    if (data.draft) return { draft: data.draft, rawModelText: data.rawModelText };
    if (data.text) {
      return { draft: parseReportAiModelJson(data.text), rawModelText: data.text };
    }
    return null;
  } catch (e) {
    if (e instanceof TypeError) {
      // network / proxy missing
      return null;
    }
    throw e;
  }
}

export type ComposeReportFromNaturalLanguageResult = {
  response: ReportAiComposeResponse;
  validated: ReportAiValidatedCompose;
};

/**
 * NL → draft (Gemini proxy или local fallback) → validate/resolve.
 */
export async function composeReportFromNaturalLanguage(
  userText: string,
): Promise<ComposeReportFromNaturalLanguageResult> {
  const text = userText.trim();
  if (!text) throw new Error('Введите описание отчёта');

  const context = await buildClientReportAiPromptContext(
    reportsStore.getState().selectedEntityName,
  );

  let draftRaw: unknown;
  let source: ReportAiComposeResponse['source'] = 'local_fallback';
  let rawModelText: string | undefined;

  const gemini = await callGeminiProxy(text, context);
  if (gemini?.draft) {
    draftRaw = gemini.draft;
    source = 'gemini';
    rawModelText = gemini.rawModelText;
  } else {
    draftRaw = buildLocalReportAiComposeDraft(text, context);
    source = 'local_fallback';
  }

  const entityName = String((draftRaw as ReportAiComposeDraft)?.entityName ?? '').trim();
  if (entityName) {
    await reportsStore.getState().loadMetadataForEntity(entityName);
    const meta = reportsStore.getState().metadata;
    if (meta) {
      await reportsStore.getState().loadAllReferenceEntityMetadataForReport(meta);
    }
  }

  const validated = await validateAndResolveReportAiDraft({
    rawDraft: draftRaw,
    rootMetadata: reportsStore.getState().metadata,
    nestedMetadataByName: reportsStore.getState().referenceEntityMetadataByName,
  });

  return {
    response: {
      draft: validated.draft,
      rawModelText,
      source,
    },
    validated,
  };
}
