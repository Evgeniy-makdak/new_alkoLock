import type { AppLanguageCode } from '@shared/config/appLanguages';

import by from '../../../widgets/nav_bar/ui/flags/by.png';
import gb from '../../../widgets/nav_bar/ui/flags/gb.png';
import kg from '../../../widgets/nav_bar/ui/flags/kg.png';
import kz from '../../../widgets/nav_bar/ui/flags/kz.png';
import ru from '../../../widgets/nav_bar/ui/flags/ru.png';
import uz from '../../../widgets/nav_bar/ui/flags/uz.png';

/** PNG из `src/widgets/nav_bar/ui/flags/` — en → gb.png. */
export const APP_LANGUAGE_FLAG_SRC: Record<AppLanguageCode, string> = {
  ru: ru,
  en: gb,
  kk: kz,
  ky: kg,
  be: by,
  uz: uz,
};
