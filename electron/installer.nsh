; Custom NSIS hooks for Алкозамок-М СМАРТ installer (electron-builder include file).

; electron-builder подставляет package.name (alcolocks-operator-desktop), если executableName не ASCII.
!undef APP_FILENAME
!define APP_FILENAME "Алкозамок-М СМАРТ"

; Явные тексты MUI: при кириллическом PRODUCT_NAME стандартные $(^Name) на финальной странице могут быть пустыми.
!define MUI_FINISHPAGE_TITLE "Завершение установки"
!define MUI_FINISHPAGE_TEXT "Программа «Алкозамок-М СМАРТ» успешно установлена на ваш компьютер.$\r$\n$\r$\nНажмите «Готово», чтобы завершить мастер установки."
!define MUI_FINISHPAGE_RUN_TEXT "Запустить Алкозамок-М СМАРТ"
!define MUI_BUTTONTEXT_FINISH "Готово"
!define MUI_BUTTONTEXT_INSTALL "Установить"
!define MUI_BUTTONTEXT_NEXT "Далее >"
!define MUI_BUTTONTEXT_BACK "< Назад"
!define MUI_BUTTONTEXT_CANCEL "Отмена"

; LangString из assistedMessages.yml уже подключены в sharedHeader — переопределяем после !insertmacro addLangs.
!macro customHeader
  !pragma warning push
  !pragma warning disable 6030
  LangString selectUserMode 1049 "Установить приложение для:"
  LangString forAll 1049 "Для всех пользователей"
  LangString onlyForMe 1049 "Для текущего пользователя"
  !pragma warning pop
!macroend
