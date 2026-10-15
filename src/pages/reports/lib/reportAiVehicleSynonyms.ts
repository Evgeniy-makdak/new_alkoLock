/**
 * Словарь разговорных названий марок ТС → поисковые термины.
 * Нужен для резолва «Жигули», «Москвич» и т.п. в реальные значения
 * manufacturer из справочника ТС (значения могут быть «ВАЗ», «Lada», «Москвич»…).
 * Ключ — нормализованная (lowercase) фраза из запроса, значение — термины для
 * нечёткого сопоставления с каталогом vehicleMakes.
 */
export const REPORT_AI_VEHICLE_MAKE_SYNONYMS: Record<string, string[]> = {
  жигули: ['ваз', 'lada', 'лада', 'vaz', 'жигули'],
  ваз: ['ваз', 'lada', 'лада', 'vaz'],
  лада: ['ваз', 'lada', 'лада', 'vaz'],
  lada: ['ваз', 'lada', 'лада', 'vaz'],
  москвич: ['москвич', 'moskvich', 'азлк'],
  moskvich: ['москвич', 'moskvich', 'азлк'],
  газ: ['газ', 'gaz', 'волга'],
  волга: ['газ', 'gaz', 'волга'],
  уаз: ['уаз', 'uaz'],
  uaz: ['уаз', 'uaz'],
  камаз: ['камаз', 'kamaz'],
  kamaz: ['камаз', 'kamaz'],
  запорожец: ['заз', 'zaz', 'запорожец'],
  заз: ['заз', 'zaz', 'запорожец'],
  zaz: ['заз', 'zaz', 'запорожец'],
  мерседес: ['mercedes', 'мерседес', 'mercedes-benz'],
  mercedes: ['mercedes', 'мерседес', 'mercedes-benz'],
  bmw: ['bmw', 'бмв'],
  бмв: ['bmw', 'бмв'],
  ауди: ['audi', 'ауди'],
  audi: ['audi', 'ауди'],
  тойота: ['toyota', 'тойота'],
  toyota: ['toyota', 'тойота'],
  киа: ['kia', 'киа'],
  kia: ['kia', 'киа'],
  хендай: ['hyundai', 'хендай', 'хундай'],
  хундай: ['hyundai', 'хендай', 'хундай'],
  hyundai: ['hyundai', 'хендай', 'хундай'],
  рено: ['renault', 'рено'],
  renault: ['renault', 'рено'],
  форд: ['ford', 'форд'],
  ford: ['ford', 'форд'],
  фольксваген: ['volkswagen', 'vw', 'фольксваген'],
  volkswagen: ['volkswagen', 'vw', 'фольксваген'],
  vw: ['volkswagen', 'vw', 'фольксваген'],
  шкода: ['skoda', 'шкода'],
  skoda: ['skoda', 'шкода'],
  шевроле: ['chevrolet', 'шевроле'],
  chevrolet: ['chevrolet', 'шевроле'],
  ниссан: ['nissan', 'ниссан'],
  nissan: ['nissan', 'ниссан'],
  митсубиси: ['mitsubishi', 'митсубиси'],
  mitsubishi: ['mitsubishi', 'митсубиси'],
  субару: ['subaru', 'субару'],
  subaru: ['subaru', 'субару'],
  мазда: ['mazda', 'мазда'],
  mazda: ['mazda', 'мазда'],
  лексус: ['lexus', 'лексус'],
  lexus: ['lexus', 'лексус'],
  'ленд ровер': ['land rover', 'ленд ровер'],
  'land rover': ['land rover', 'ленд ровер'],
  порше: ['porsche', 'порше'],
  porsche: ['porsche', 'порше'],
  пежо: ['peugeot', 'пежо'],
  peugeot: ['peugeot', 'пежо'],
  ситроен: ['citroen', 'ситроен'],
  citroen: ['citroen', 'ситроен'],
  опель: ['opel', 'опель'],
  opel: ['opel', 'опель'],
  фиат: ['fiat', 'фиат'],
  fiat: ['fiat', 'фиат'],
  вольво: ['volvo', 'вольво'],
  volvo: ['volvo', 'вольво'],
  скания: ['scania', 'скания'],
  scania: ['scania', 'скания'],
  ман: ['man', 'ман'],
  man: ['man', 'ман'],
  дэу: ['daewoo', 'дэу'],
  daewoo: ['daewoo', 'дэу'],
};

/** Нормализация фразы для поиска по словарю. */
export function normalizeVehicleMakeQuery(query: string): string {
  return (query ?? '')
    .trim()
    .toLowerCase()
    .replace(/[«»"'`]/g, '')
    .replace(/\s+/g, ' ');
}

/** Поисковые термины для фразы (с учётом синонимов). */
export function resolveVehicleMakeSearchTerms(query: string): string[] {
  const key = normalizeVehicleMakeQuery(query);
  if (!key) return [];
  const fromDict = REPORT_AI_VEHICLE_MAKE_SYNONYMS[key];
  if (fromDict?.length) return fromDict;
  return [key];
}

/**
 * Сопоставляет фразу с реальными значениями каталога марок.
 * Возвращает значения каталога, которые совпали (нечётко) с терминами.
 */
export function matchVehicleMakesToQuery(
  query: string,
  catalogMakes: string[],
): string[] {
  const terms = resolveVehicleMakeSearchTerms(query);
  if (!terms.length) return [];

  const norm = (s: string) =>
    String(s ?? '')
      .trim()
      .toLowerCase()
      .replace(/[«»"'`]/g, '')
      .replace(/\s+/g, ' ');

  const matched = new Set<string>();
  for (const make of catalogMakes) {
    const makeNorm = norm(make);
    if (!makeNorm) continue;
    for (const term of terms) {
      const termNorm = norm(term);
      if (!termNorm) continue;
      if (makeNorm === termNorm || makeNorm.includes(termNorm) || termNorm.includes(makeNorm)) {
        matched.add(make);
        break;
      }
    }
  }
  return Array.from(matched);
}
