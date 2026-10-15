import { configLoader } from '../../../config/configLoader';

import { fetchReportEntityMetadata } from './reportsApi';
import { fetchBranchOfficesForReport, flattenBranchOffices } from '../lib/branchOfficeReportOptions';
import { fetchEventTypesForReport } from '../lib/eventsForFrontReportOptions';
import { fetchBranchVehiclesForReport } from '../lib/fetchBranchVehiclesForReport';
import { fetchReportDomainEntityRecords } from '../lib/fetchReportDomainEntityRecords';
import { fetchUsersForReportFilter } from '../lib/fetchUsersForReportFilter';
import { buildLocalReportAiComposeDraft } from '../lib/reportAiLocalFallback';
import {
  buildReportAiPromptContext,
  buildReportAiRefineSystemPrompt,
  buildReportAiRefineUserPrompt,
  buildReportAiSystemPrompt,
  buildReportAiUserPrompt,
} from '../lib/reportAiPromptContext';
import {
  parseReportAiModelJson,
  validateAndResolveReportAiDraft,
} from '../lib/reportAiValidateDraft';
import { getReportAiSettings } from '../model/reportAiSettings';
import { reportsStore } from '../model/reportsStore';

import type {
  ReportAiComposeDraft,
  ReportAiComposeResponse,
  ReportAiPromptContext,
  ReportAiValidatedCompose,
} from '../types/reportAiComposeTypes';
import type { ReportEntityMetadata } from '../types/reportApiTypes';

const DEFAULT_AI_COMPOSE_URL = '/api/reports-ai/compose';

/** URL AI-прокси: из config.json (reportsAiUrl) или относительный (dev/Electron). */
function resolveAiComposeUrl(): string {
  try {
    const configured = configLoader.getConfig()?.reportsAiUrl?.trim();
    if (configured) return configured;
  } catch {
    /* config ещё не загружен — используем относительный */
  }
  return DEFAULT_AI_COMPOSE_URL;
}

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

  // Каталоги для резолва якорных фраз в реальные значения.
  const eventTypes: Array<{ id: number | string; label: string; event?: string }> = [];
  try {
    const types = await fetchEventTypesForReport('');
    for (const item of types.slice(0, 200)) {
      if (item.label == null || item.label === '') continue;
      eventTypes.push({
        id: item.id ?? String(item.label),
        label: String(item.label),
        ...(typeof item.event === 'string' && item.event.trim() ? { event: item.event } : {}),
      });
    }
  } catch {
    /* каталог событий недоступен — модель опирается на metadata */
  }

  const vehicleMakes: string[] = [];
  const vehicleModels: string[] = [];
  try {
    const cars = await fetchBranchVehiclesForReport();
    const makes = new Set<string>();
    const models = new Set<string>();
    for (const car of cars) {
      const make = (car as unknown as { manufacturer?: unknown })?.manufacturer;
      const model = (car as unknown as { model?: unknown })?.model;
      if (make != null && String(make).trim() !== '') makes.add(String(make).trim());
      if (model != null && String(model).trim() !== '') models.add(String(model).trim());
    }
    vehicleMakes.push(...Array.from(makes).slice(0, 200));
    vehicleModels.push(...Array.from(models).slice(0, 200));
  } catch {
    /* справочник ТС недоступен */
  }

  const users: Array<{ id: number | string; name: string }> = [];
  try {
    const list = await fetchUsersForReportFilter({ pageSize: 50 });
    for (const u of list) {
      if (u.id == null) continue;
      const name =
        (u.fullName ?? '').trim() ||
        [u.surname, u.firstName, u.middleName].filter(Boolean).join(' ').trim();
      if (!name) continue;
      users.push({ id: u.id, name });
    }
  } catch {
    /* справочник пользователей недоступен */
  }

  const devices: Array<{ id: number | string; serialNumber: string; name?: string }> = [];
  try {
    const records = await fetchReportDomainEntityRecords({
      entityName: 'MonitoringDevice',
      limit: 50,
    });
    for (const raw of records) {
      const r = raw as { id?: unknown; serialNumber?: unknown; name?: unknown };
      if (r.id == null || r.serialNumber == null) continue;
      const id = typeof r.id === 'number' || typeof r.id === 'string' ? r.id : String(r.id);
      devices.push({
        id,
        serialNumber: String(r.serialNumber),
        ...(r.name != null && String(r.name).trim() ? { name: String(r.name) } : {}),
      });
    }
  } catch {
    /* справочник устройств недоступен */
  }

  return buildReportAiPromptContext({
    entities,
    metadataByEntity,
    catalogs: {
      branches,
      ...(eventTypes.length ? { eventTypes } : {}),
      ...(vehicleMakes.length ? { vehicleMakes } : {}),
      ...(vehicleModels.length ? { vehicleModels } : {}),
      ...(users.length ? { users } : {}),
      ...(devices.length ? { devices } : {}),
    },
    locale: 'ru',
  });
}

async function callAiProxy(
  userText: string,
  context: ReportAiPromptContext,
  options?: { mode?: 'compose' | 'refine'; currentDraft?: unknown },
): Promise<{ draft: unknown; rawModelText?: string; provider?: string } | null> {
  const settings = getReportAiSettings();
  const mode = options?.mode ?? 'compose';
  const systemPrompt =
    mode === 'refine' ? buildReportAiRefineSystemPrompt() : buildReportAiSystemPrompt();
  const userPrompt =
    mode === 'refine'
      ? buildReportAiRefineUserPrompt(userText, context, options?.currentDraft)
      : buildReportAiUserPrompt(userText, context);
  try {
    const res = await fetch(resolveAiComposeUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        context,
        userText,
        geminiApiKey: settings.geminiApiKey,
        openRouterApiKey: settings.openRouterApiKey,
        preferredProvider: settings.preferredProvider,
      }),
    });
    if (!res.ok) {
      // Нет/битый ключ, proxy или провайдеры недоступны → локальный wizard на клиенте.
      // 401/403: ключ есть, но провайдер его отклонил (частый кейс после копирования src без .env).
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
      provider?: string;
    };
    if (data.draft) {
      return { draft: data.draft, rawModelText: data.rawModelText, provider: data.provider };
    }
    if (data.text) {
      return { draft: parseReportAiModelJson(data.text), rawModelText: data.text, provider: data.provider };
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

  const ai = await callAiProxy(text, context);
  if (ai?.draft) {
    draftRaw = ai.draft;
    source = ai.provider === 'openrouter' ? 'openrouter' : 'gemini';
    rawModelText = ai.rawModelText;
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

/**
 * Уточнение уже собранного черновика (LLM-диалог).
 * При недоступности модели возвращает исходный черновик без изменений.
 */
export async function refineReportDraft(
  userText: string,
  currentDraft: ReportAiComposeDraft,
): Promise<ComposeReportFromNaturalLanguageResult> {
  const text = userText.trim();
  if (!text) throw new Error('Введите уточнение');

  const context = await buildClientReportAiPromptContext(currentDraft.entityName);

  let draftRaw: unknown = currentDraft;
  let source: ReportAiComposeResponse['source'] = 'local_fallback';
  let rawModelText: string | undefined;

  const ai = await callAiProxy(text, context, { mode: 'refine', currentDraft });
  if (ai?.draft) {
    draftRaw = ai.draft;
    source = ai.provider === 'openrouter' ? 'openrouter' : 'gemini';
    rawModelText = ai.rawModelText;
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
