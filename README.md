# Алкозамок-М SMART. Frontend

Frontend-приложение информационной системы «Алкозамок-М SMART».

Проект используется в нескольких вариантах поставки:

- web-версия в браузере;
- PWA/мобильная браузерная версия;
- desktop-клиент на Electron для Windows и macOS.

Все варианты используют один и тот же frontend-код. Electron не содержит отдельную копию бизнес-логики: это desktop-оболочка, которая открывает тот же web-сервер и добавляет нативное поведение для окна чата.

## Требования

- Node.js 20.x
- Yarn 1.x
- Для Windows-сборки Electron: Windows
- Для macOS-сборки Electron: macOS

После клонирования проекта установите зависимости:
Замечание: можно использовать вместо yarn npm.

```bash
yarn install
```

## Разработка

Запуск web-приложения в режиме разработки:

```bash
yarn start
```

Обычно приложение будет доступно в браузере по адресу:

```text
http://localhost:3000
```

Запуск Electron в режиме разработки:

```bash
yarn electron:dev
```

Эта команда одновременно запускает dev-сервер React и Electron-оболочку.

На Windows, если PowerShell блокирует выполнение `yarn.ps1`, используйте:

```powershell
yarn.cmd electron:dev
```

## Web/PWA Сборка

Сборка обычной web/PWA-версии:

```bash
yarn build
```

Результат появляется в папке:

```text
build/
```

Папка `build/` не хранится в git. Это артефакт сборки.

### Runtime-Конфиг

В web-сборке используется runtime-файл:

```text
build/config.json
```

Пример:

```json
{
  "apiUrl": "https://{DOMAIN}/",
  "wsUrl": "wss://{DOMAIN}/ws/websocket"
}
```

`apiUrl` и `wsUrl` читаются приложением во время запуска. Это позволяет менять backend/websocket-адрес без пересборки frontend-кода.

Если вместо `{DOMAIN}` указан конкретный адрес, приложение будет использовать его как есть:

```json
{
  "apiUrl": "https://alcolock-test.lsystems.ru/",
  "wsUrl": "wss://alcolock-test.lsystems.ru/ws/websocket"
}
```

## Electron Desktop-Клиент

Electron используется для desktop-версии приложения.

Что даёт Electron:

- отдельное desktop-окно приложения;
- frameless/transparent detached-окно чата;
- отключение системных кнопок у detached-окна чата;
- перемещение detached-чата между мониторами;
- единый desktop-клиент для работы с тем же сервером, что и браузерная версия.

### Первый Запуск

При первом запуске desktop-клиент показывает окно:

```text
Введите адрес сервера
[ https://server-company.ru ]
[ Подключиться ]
```

Пользователь вводит только frontend-адрес сервера, например:

```text
https://alcolock-test.lsystems.ru
```

Electron сохраняет адрес локально в профиле пользователя и дальше открывает приложение автоматически.

`apiUrl` и `wsUrl` отдельно в Electron указывать не нужно. После открытия сайта React-приложение само читает обычный `/config.json` с выбранного сервера.

### Смена Сервера

Если нужно сменить сервер, используйте меню desktop-приложения:

```text
Alcolocks Operator -> Сменить сервер
```

После этого Electron снова покажет окно ввода адреса сервера.

### Значение По Умолчанию

Файл:

```text
electron/app.config.json
```

используется как дефолтный fallback/пример адреса для Electron-сборки.

Пример:

```json
{
  "appUrl": "http://alcolock-test.lsystems.ru/authorization"
}
```

Для обычного пользователя предпочтительный сценарий: ввести адрес сервера при первом запуске.

## Сборка Electron для Windows

Команды выполняются на Windows.

Установить зависимости:

```powershell
yarn install
```

Собрать portable `.exe`:

```powershell
yarn electron:pack:win
```

Собрать installer + portable `.exe`:

```powershell
yarn electron:dist:win
```

Результат появляется в папке:

```text
release/
```

Пример артефакта:

```text
release/Alcolocks Operator-0.1.0-x64.exe
```

Если PowerShell блокирует `yarn`, используйте `yarn.cmd`:

```powershell
yarn.cmd electron:dist:win
```

## Сборка Electron для macOS

Команды выполняются на macOS.

Установить зависимости:

```bash
yarn install
```

Собрать `.dmg`:

```bash
yarn electron:dist:mac
```

Результат появляется в папке:

```text
release/
```

Примеры артефактов:

```text
release/Alcolocks Operator-0.1.0-x64.dmg
release/Alcolocks Operator-0.1.0-arm64.dmg
```

Для внутреннего тестирования `.dmg` можно передать заказчику напрямую. Для промышленной поставки на macOS рекомендуется настроить Apple Developer ID signing и notarization, иначе macOS Gatekeeper может показывать предупреждения или блокировать запуск.

## Что Хранится в Git

В git хранятся исходники и конфигурация:

- `src/`
- `public/`
- `electron/`
- `electron-builder.json`
- `package.json`
- `yarn.lock`

В git не хранятся артефакты сборки:

- `build/`
- `release/`
- `node_modules/`
- `electron/node_modules/`

Если нужно передавать готовые `.exe` или `.dmg`, используйте:

- GitHub Releases;
- CI artifacts;
- внутреннее файловое хранилище;
- сервер загрузок.

Не добавляйте `release/` в git: Electron-артефакты большие, GitHub отклоняет файлы больше 100 MB.

## Актуальные Скрипты

```bash
yarn start              # запуск web-dev сервера
yarn build              # сборка web/PWA версии в build/
yarn electron:dev       # запуск React dev-сервера и Electron
yarn electron:pack:win  # Windows portable exe
yarn electron:dist:win  # Windows installer + portable exe
yarn electron:pack:mac  # macOS dmg, быстрый вариант
yarn electron:dist:mac  # macOS dmg для поставки
yarn lint               # проверка ESLint
yarn lint:fix           # автоисправление ESLint
yarn format             # форматирование
```

## Архитектура

Проект использует подход Feature-Sliced Design.

Основные слои и сегменты:

- `app` - инициализация приложения, глобальные провайдеры, layout;
- `pages` - страницы приложения;
- `widgets` - крупные самостоятельные блоки интерфейса;
- `features` - пользовательские сценарии и действия;
- `entities` - бизнес-сущности;
- `shared` - общие компоненты, API-клиенты, утилиты, конфигурация.

Внутри слайсов могут использоваться сегменты:

- `ui` - компоненты;
- `model` - состояние;
- `api` - запросы и API-адаптеры;
- `lib` - вспомогательная логика;
- `hooks` - React hooks;
- `config` - константы и конфигурация.

## Важные Замечания

- Web, PWA и Electron используют один frontend-код.
- Изменения в `src/` попадают в браузер/PWA после обычного `yarn build` и деплоя на сервер.
- Electron-клиент, который открывает этот сервер, увидит те же изменения без пересборки `.exe/.dmg`.
- Пересобирать Electron нужно только при изменении самой desktop-оболочки: `electron/`, `electron-builder.json`, desktop-меню, native-window поведение, installer-настройки.
- Windows `.exe` не запускается на macOS. Для macOS собирается отдельный `.dmg`.
