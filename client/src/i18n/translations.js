export const translations = {
  ru: {
    common: {
      appName: 'Time Tracker',
      notAuthorized: 'Недостаточно прав',
      actions: {
        save: 'Сохранить',
        apply: 'Применить',
        retry: 'Повторить',
        revert: 'Вернуть',
        cancel: 'Отмена',
        close: 'Закрыть',
      },
    },
    nav: {
      home: 'Главная',
      collapseSidebar: 'Свернуть навигацию',
      expandSidebar: 'Развернуть навигацию',
      projects: 'Проекты',
      clients: 'Клиенты',
      users: 'Пользователи',
      profile: 'Профиль',
      settings: 'Настройки',
      logout: 'Выйти',
    },
    notifications: {
      title: 'Уведомления',
      readAll: 'Прочитать все',
      empty: 'Уведомлений пока нет',
      projectManagerAssigned: 'Вы назначены руководителем проекта «{{project}}»',
      projectManagerRemoved: 'Вы больше не руководите проектом «{{project}}»',
      projectPayrollWarning: 'Проект «{{project}}» достиг {{threshold}}% лимита ФОТ',
      projectPayrollLimitReached: 'Проект «{{project}}» достиг или превысил лимит ФОТ',
      projectBudgetChangeRequested: 'Получен запрос на бюджет проекта «{{project}}»',
      projectBudgetChangeApproved: 'Запрос бюджета проекта «{{project}}» одобрен',
      projectBudgetChangeRejected: 'Запрос бюджета проекта «{{project}}» отклонён',
      projectBudgetRequestTransferred: 'Вам передан активный запрос бюджета проекта «{{project}}»',
      unknown: 'Новое уведомление по проекту «{{project}}»',
    },
    auth: {
      sessionExpired: 'Сессия истекла. Войдите снова.',
      invalidSession: 'Недействительная сессия. Войдите снова.',
      signIn: {
        title: 'Добро пожаловать в TimeTracker',
        subtitle: 'Введите email, чтобы получить magic link для входа без пароля.',
        emailPlaceholder: 'Введите ваш email',
        send: 'Отправить',
        resendIn: 'Повтор через {{seconds}} с',
        success: 'Проверьте почту: ссылка для входа уже отправлена.',
        localTesting: 'Быстрый вход для локальной разработки:',
        openMagicLink: 'Открыть magic link',
        emailHint: 'Ссылка для входа будет отправлена на ваш email.',
        noEmail: 'Письмо не пришло?',
        contactAdmin: 'Связаться с администратором платформы',
        sendFailed: 'Не удалось отправить magic link.',
        resendFailed: 'Не удалось повторно отправить magic link.',
      },
      magicLink: {
        loggingIn: 'Выполняется вход...',
        invalidOrExpired: 'Ссылка недействительна или устарела.',
        goToSignIn: 'Перейти ко входу',
      },
      invitation: {
        invalidOrExpired: 'Приглашение недействительно или устарело.',
        failed: 'Не удалось завершить регистрацию.',
        title: 'Принять приглашение',
        welcome: 'Добро пожаловать в TimeTracker!',
        description1: 'Сервис помогает учитывать и управлять рабочим временем по проектам.',
        description2: 'Пароль не нужен: вход будет происходить по magic link, отправленному на зарегистрированный email.',
        description3: 'Ничего не нужно запоминать: просто откройте ссылку и продолжайте работу.',
        description4: 'Проверьте имя и фамилию и завершите регистрацию, чтобы начать.',
        emailHint: 'Вход в систему будет происходить по magic link, который приходит на email.',
        success: 'Регистрация завершена. Выполняется перенаправление...',
        submitting: 'Регистрация...',
        submit: 'Завершить регистрацию',
      },
    },
    setup: {
      title: 'Первоначальная настройка',
      introTitle: 'Добро пожаловать в TimeTracker!',
      introBody: 'TimeTracker помогает команде учитывать часы и контролировать работу по проектам. Чтобы начать, укажите данные администратора и настройте email для отправки magic link. Перед завершением можно проверить SMTP.',
      localDevTip: 'Подсказка для локальной разработки: можно оставить SMTP пустым и завершить настройку.',
      adminSection: 'Администратор',
      smtpSection: 'Настройки SMTP',
      secure: 'Использовать SSL/TLS (защищённое соединение)',
      sendTestEmail: 'Отправить тестовое письмо',
      sending: 'Отправка...',
      completeSetup: 'Завершить настройку',
      settingUp: 'Настройка...',
      completeSuccess: 'Настройка завершена. Переход к странице входа...',
      failed: 'Не удалось завершить настройку.',
      testSuccess: 'Тестовое письмо успешно отправлено.',
      testFailed: 'Не удалось отправить тестовое письмо.',
    },
    fields: {
      name: 'Имя',
      surname: 'Фамилия',
      email: 'Email',
      host: 'Хост',
      port: 'Порт',
      user: 'Пользователь',
      password: 'Пароль',
      fromEmail: 'Email отправителя',
    },
    autologin: {
      badgeTitle: 'Автовход',
      progress: '{{completed}}/{{required}} дней заполнено',
      dialogTitle: 'Обновление автовхода',
      dialogIntro: 'Теперь можно сохранить вход на следующую рабочую неделю без запроса нового magic link.',
      howItWorks: 'Как это работает',
      rule1: 'Заполняйте по 8 часов за каждый рабочий день с понедельника по пятницу.',
      rule2: 'Если все 5 рабочих дней заполнены, вход автоматически сохраняется на следующую неделю.',
      rule3: 'Прогресс всегда виден в новом виджете автовхода в верхней панели.',
      currentProgress: 'Текущий прогресс',
      currentProgressValue: 'На этой неделе заполнено {{completed}} из {{required}} рабочих дней.',
      doNotShowAgain: 'Больше не показывать',
      gotIt: 'Понятно',
      qualified: 'Все 5 рабочих дней заполнены. Вход сохранён на следующую неделю.',
      remaining: 'Чтобы сохранить вход на следующую неделю, заполните ещё {{remaining}} дн.',
    },
    users: {
      title: 'Пользователи', active: 'Активные', deleted: 'Удалённые', user: 'Пользователь', admin: 'Администратор', surname: 'Фамилия', name: 'Имя', email: 'Email', role: 'Роль', status: 'Статус', actions: 'Действия', add: 'Добавить', addUser: 'Добавить пользователя', editUser: 'Редактировать', deleteUser: 'Удалить пользователя', sendInvitation: 'Отправить приглашение', resendInvitation: 'Повторно отправить приглашение', invitationSent: 'Приглашение успешно отправлено!', invitationResent: 'Приглашение успешно отправлено повторно!', sendTo: 'Отправить приглашение для {{email}}? Пользователь получит письмо для входа.', resendTo: 'Повторно отправить приглашение для {{email}}?', invited: 'Приглашён', deleting: 'Удаление...', sending: 'Отправка...', resending: 'Повторная отправка...', confirmDelete: 'Вы уверены, что хотите удалить пользователя "{{name}}"?', deleteHoursQuestion: 'Что сделать с часами, которые уже занёс этот пользователь?', keepHours: 'Сохранить часы (удалить только пользователя)', deleteHours: 'Удалить пользователя и все его часы',
      validation: { nameRequired: 'Имя обязательно', surnameRequired: 'Фамилия обязательна', emailRequired: 'Email обязателен', allRequired: 'Все поля обязательны', emailInvalid: 'Введите корректный email' },
      errors: { fetch: 'Не удалось загрузить пользователей. Попробуйте ещё раз.', update: 'Не удалось обновить пользователя. Попробуйте ещё раз.', delete: 'Не удалось удалить пользователя и/или его часы.', sendInvitation: 'Не удалось отправить приглашение.', resendInvitation: 'Не удалось повторно отправить приглашение.' },
    },
    projects: {
      title: 'Проекты', active: 'Активные', closed: 'Закрытые', external: 'Внешние', internal: 'Внутренние', addProject: 'Добавить проект', editProject: 'Редактировать проект', deleteProject: 'Удалить проект', viewTimeEntries: 'Показать часы', timeEntriesFor: 'Часы по проекту {{name}}', noTimeEntries: 'Для этого проекта записи времени не найдены', client: 'Клиент', projectName: 'Название проекта', projectCode: 'Код проекта (необязательно)', description: 'Описание', code: 'Код', noCode: 'Нет', noClient: 'Без клиента', dateWeekday: 'Дата / день недели', submissionDateTime: 'Дата и время отправки', hours: 'Часы', user: 'Пользователь', activeStatus: 'Активен', closedStatus: 'Закрыт', expand: 'Развернуть', collapse: 'Свернуть', confirmDelete: 'Вы уверены, что хотите удалить проект "{{name}}" и все его записи времени?',
      analytics: {
        title: 'Аналитика проекта',
        subtitle: '{{client}} · {{code}}',
        noSubtitle: 'История часов и динамика команды',
        selectedPeriod: 'Выбранный период',
        participants: 'Участники',
        totalHours: 'Всего часов',
        averagePerDay: 'Среднее в день',
        lastActivity: 'Последняя активность',
        totalSeries: 'Итого',
        topMembersDefault: 'На графике видны итого и топ-5 участников по часам. Остальных можно включить слева.',
        allMembersVisible: 'На графике видны все участники проекта.',
        showAllMembers: 'Показать всех',
        hideAllMembers: 'Скрыть всех',
        topMembers: 'Топ-5',
        showAllLabel: 'Показать всех участников',
        hiddenMembers: 'Скрыто: {{count}}',
        chart: 'График часов',
        members: 'Участники проекта',
        noData: 'За выбранный период по проекту нет данных.',
        modes: { daily: 'По дням', cumulative: 'Нарастающим итогом' },
        ranges: { week: 'Неделя', month: 'Месяц', quarter: 'Квартал', year: 'Год', all: 'Все время' },
        tooltip: { date: 'Дата', total: 'Итого' },
        errors: { fetch: 'Не удалось загрузить аналитику проекта. Попробуйте ещё раз.' }
      },
      filters: {
        mine: 'Мои проекты',
        managed: 'Я руководитель',
        all: 'Все проекты',
        projects: 'Проекты',
        status: 'Статус',
        categories: 'Категории',
        categoriesTooltip: 'Фильтровать проекты по категориям',
        categoriesTitle: 'Категории проектов',
        clearCategories: 'Очистить категории',
        emptyMine: 'Нет активных проектов, где вы руководитель или учитывали время. Выберите «Все проекты», чтобы увидеть остальные проекты.',
        emptyManaged: 'Нет активных проектов, где вы назначены руководителем.',
        empty: 'Нет проектов, соответствующих выбранным фильтрам.',
        tooltips: {
          mine: 'Проекты, которыми вы руководите или где учитывали время',
          managed: 'Проекты, где вы назначены руководителем',
          all: 'Все проекты доступного каталога',
          active: 'Показывать проекты с активным статусом',
          closed: 'Показывать закрытые проекты',
          external_delivery: 'Коммерческая работа для внешнего заказчика',
          internal_project: 'Внутренние инициативы и изменения компании',
          operations: 'Регулярная внутренняя работа и сопровождение',
          people_development: 'Обучение, наставничество и обмен опытом',
          time_off: 'Отпуска, праздники, больничные и отгулы',
          unclassified: 'Старые проекты, требующие классификации',
        },
      },
      manager: {
        label: 'Руководитель проекта',
        unassigned: 'Не назначен',
        emailFailed: 'Руководитель изменён, но письмо отправить не удалось. Уведомление внутри приложения сохранено.',
        errors: {
          fetchCandidates: 'Не удалось загрузить список возможных руководителей.',
          createdWithoutManager: 'Проект создан, но руководителя назначить не удалось.',
          updatedWithoutManager: 'Данные проекта сохранены, но руководителя изменить не удалось.',
        },
      },
      saved: 'Проект сохранён',
      inline: { saving: 'Сохраняется…', saved: 'Сохранено' },
      dialog: {
        newTitle: 'Новый проект', newSubtitle: 'Заполните основные данные и при необходимости настройте бюджет', create: 'Создать проект',
        tabs: { project: 'О проекте', budget: 'Бюджет и трудоёмкость', budgetSettings: 'Параметры бюджета' },
        projectDataTitle: 'О проекте',
        saveProject: 'Сохранить проект', saveBudget: 'Сохранить бюджет',
        unsavedTitle: 'Есть несохранённые изменения', unsavedMessage: 'Сохранить изменения перед продолжением?', unsavedBudgetTitle: 'Параметры бюджета не сохранены', unsavedBudgetMessage: 'Закрыть без сохранения изменений бюджета?',
        saveAndContinue: 'Сохранить и продолжить', discard: 'Сбросить изменения', stay: 'Остаться',
        closeWithoutSaving: 'Закрыть без сохранения', discardBudget: 'Сбросить изменения бюджета',
      },
      budget: {
        modeDescriptions: {
          none: 'Финансовые ограничения для проекта не устанавливаются.',
          contract: 'Лимит рассчитывается из суммы договора и управленческого резерва.',
          manual: 'Общий лимит проекта задаётся напрямую.',
        },
        allocationTitle: 'Распределение лимита', allocationHint: 'Определите долю общего лимита, доступную для оплаты труда.',
        emptyTitle: 'Бюджет проекта не установлен', emptyHint: 'Проект работает без финансового лимита.',
        exceeded: 'Превышение ФОТ', payrollUsage: 'Использование лимита ФОТ', thresholdMarker: 'Порог предупреждения: {{threshold}}%',
        parametersTitle: 'Параметры бюджета', proposedBudget: 'Предлагаемый бюджет', requestReviewTitle: 'Запрос на пересмотр бюджета',
        requestChangeTitle: 'Запросить пересмотр бюджета', requestFirstTitle: 'Запросить первый бюджет', decisionTitle: 'Решение по запросу',
        historyTitle: 'История бюджета', historyEmpty: 'История пока пуста', unknownAuthor: 'Неизвестный автор',
        statuses: { pending: 'Ожидает решения', approved: 'Одобрен', rejected: 'Отклонён', active: 'Действующая версия' },
        comparison: { metric: 'Показатель', current: 'Текущий бюджет', proposed: 'Предложение', totalLimit: 'Общий лимит', payrollLimit: 'Лимит ФОТ', warningThreshold: 'Порог предупреждения' },
        validation: {
          required: 'Выберите режим бюджета', amount: 'Введите неотрицательную сумму с точностью до копеек', percent: 'Введите значение от 0 до 100%',
          threshold: 'Порог должен быть больше 0% и меньше 100%', payrollAboveTotal: 'Лимит ФОТ не может превышать общий лимит',
          reasonRequired: 'Обоснование обязательно', fixErrors: 'Исправьте ошибки в параметрах бюджета.',
        },
        title: 'Бюджет', open: 'Бюджет', mode: 'Режим бюджета',
        modes: { none: 'Без лимита', contract: 'По договору', manual: 'Ручной лимит' },
        contractAmount: 'Сумма договора без НДС, ₽', reservePercent: 'Управленческий резерв, %', reserveRub: 'Резерв в рублях',
        totalLimit: 'Общий лимит проекта', payrollMode: 'Как задать лимит ФОТ', byPercent: 'Процентом', byAmount: 'Суммой',
        payrollPercent: 'Лимит ФОТ, %', payrollLimit: 'Лимит ФОТ', nonPayroll: 'Бюджет вне ФОТ', warningThreshold: 'Порог предупреждения ФОТ, %', note: 'Примечание',
        laborCost: 'Накопленная стоимость труда', remaining: 'Остаток ФОТ', missingRates: 'Не рассчитано записей без ставки: {{count}}',
        chart: {
          title: 'Динамика стоимости ФОТ', subtitle: 'Фактическая накопленная стоимость за всю историю проекта', usedLabel: 'использовано лимита ФОТ', incomplete: 'Расчёт неполный', incompleteHint: 'В расчёт включены только записи времени, для которых на дату работы найдена действующая ставка. Добавьте или скорректируйте исторические ставки пользователей — показатели пересчитаются автоматически.', missingRatesHint: 'Эти записи времени пока не участвуют в стоимости ФОТ, потому что на дату работы не найдена ставка пользователя. Назначьте исторические ставки, чтобы завершить расчёт.', legendButton: 'Обозначения графика',
          emptyTitle: 'Пока нет данных для графика', emptyHint: 'Кривая появится после добавления записей времени с действующими ставками.',
          ariaLabel: 'График накопленной стоимости ФОТ: {{value}}, использовано {{percent}} процента лимита.',
          legend: { actual: 'Накопленная стоимость ФОТ', warning: 'Порог предупреждения', payrollLimit: 'Лимит ФОТ', totalLimit: 'Общий лимит проекта', contractAmount: 'Сумма договора', reserve: 'Управленческий резерв' },
          tooltip: { daily: 'Стоимость за день', cumulative: 'Накоплено', used: 'Использовано ФОТ' },
        },
        overview: {
          title: 'Бюджет проекта', subtitle: 'Лимиты и фактическая стоимость труда', configure: 'Настроить бюджет', changeSettings: 'Изменить параметры', showProposal: 'Показать предложение', showRequest: 'Показать запрос', backToOverview: 'Вернуться к обзору', contract: 'Договор', accumulatedPayroll: 'Накопленный ФОТ', accumulatedPayrollHint: 'Накопленная стоимость труда по историческим ставкам',
          previewTitle: 'Финансовая информация появится после создания проекта', previewHint: 'После настройки бюджета и регистрации часов здесь появятся показатели и динамика стоимости ФОТ.',
          noBudgetTitle: 'Бюджет проекта пока не настроен',
        },
        version: 'Версия {{version}}', pendingRequest: 'Ожидает решения запрос от: {{author}}', reason: 'Обоснование', reviewComment: 'Комментарий к решению',
        save: 'Сохранить бюджет', saveParameters: 'Сохранить параметры', saved: 'Бюджет сохранён', request: 'Отправить запрос', requestSent: 'Запрос отправлен', reviewSaved: 'Решение сохранено',
        approve: 'Одобрить', approveWithChanges: 'Одобрить с изменениями', reject: 'Отклонить',
        errors: { fetch: 'Не удалось загрузить бюджет.', save: 'Не удалось сохранить бюджет.', request: 'Не удалось отправить запрос.', review: 'Не удалось сохранить решение.', createdWithoutBudget: 'Проект создан, но бюджет сохранить не удалось. Откройте проект и повторите сохранение бюджета.' },
      },
      validation: { nameRequired: 'Название проекта обязательно', clientRequired: 'Выберите клиента', categoryRequired: 'Выберите категорию проекта', duplicateName: 'Проект с таким названием уже существует.', duplicateCode: 'Проект с таким кодом уже существует.' },
      errors: { fetch: 'Не удалось загрузить проекты. Попробуйте ещё раз.', fetchClients: 'Не удалось загрузить клиентов. Попробуйте ещё раз.', fetchTimeEntries: 'Не удалось загрузить записи времени. Попробуйте ещё раз.', create: 'Не удалось создать проект. Попробуйте ещё раз.', update: 'Не удалось обновить проект. Попробуйте ещё раз.', delete: 'Не удалось удалить проект и его записи времени.', updateStatus: 'Не удалось обновить статус проекта.' },
    },
    clients: {
      title: 'Клиенты', internal: 'Внутренние', external: 'Внешние', name: 'Название', clientName: 'Название клиента', itn: 'ИНН', type: 'Тип', projects: 'Проекты', actions: 'Действия', add: 'Добавить', edit: 'Редактировать', delete: 'Удалить', activeCount: 'Активные: {{count}}', totalCount: 'Всего: {{count}}', deleteTitle: 'Удалить клиента', confirmDelete: 'Вы уверены, что хотите удалить клиента "{{name}}" и все его проекты и записи времени?',
      validation: { nameRequired: 'Название клиента обязательно', duplicateName: 'Клиент с таким названием уже существует.', duplicateItn: 'Клиент с таким ИНН уже существует.' },
      errors: { fetch: 'Не удалось загрузить клиентов. Попробуйте ещё раз.', fetchProjects: 'Не удалось загрузить проекты.', create: 'Не удалось создать клиента. Попробуйте ещё раз.', createDuplicate: 'Клиент с таким названием или ИНН уже существует.', update: 'Не удалось обновить клиента. Попробуйте ещё раз.', delete: 'Не удалось удалить клиента и его данные.' },
    },
    timeEntries: {
      payrollLimitWarning: 'Лимит ФОТ проекта достигнут или превышен. Записи времени сохранены.',
      title: '\u0423\u0447\u0451\u0442 \u0432\u0440\u0435\u043c\u0435\u043d\u0438', user: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c', project: '\u041f\u0440\u043e\u0435\u043a\u0442', total: '\u0418\u0442\u043e\u0433\u043e', actions: '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f', addProject: '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0440\u043e\u0435\u043a\u0442', submitWeek: '\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043d\u0435\u0434\u0435\u043b\u044e', earlierWeeks: '\u0420\u0430\u043d\u043d\u0438\u0435 \u043d\u0435\u0434\u0435\u043b\u0438', editTitle: '\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c \u0432\u0440\u0435\u043c\u0435\u043d\u0438', deleteTitle: '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u0438 \u0432\u0440\u0435\u043c\u0435\u043d\u0438', deleteConfirm: '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0432\u0441\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 \u0432\u0440\u0435\u043c\u0435\u043d\u0438 \u043f\u043e \u043f\u0440\u043e\u0435\u043a\u0442\u0443 {{project}} \u0437\u0430 {{date}}?', deletedTag: '\u0443\u0434\u0430\u043b\u0451\u043d', selectProject: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u043e\u0435\u043a\u0442', selectUser: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f', weekdays: { mon: '\u041f\u043d', tue: '\u0412\u0442', wed: '\u0421\u0440', thu: '\u0427\u0442', fri: '\u041f\u0442', sat: '\u0421\u0431', sun: '\u0412\u0441' },
      validation: { projectRequired: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u043e\u0435\u043a\u0442', userRequired: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f', dateRequired: '\u0414\u0430\u0442\u0430 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u0430', hoursRequired: '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0447\u0430\u0441\u044b', selectUserBeforeSubmit: '\u041f\u0435\u0440\u0435\u0434 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u043e\u0439 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.', addOneProject: '\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u0438\u043d \u043f\u0440\u043e\u0435\u043a\u0442.', projectForEachRow: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u043e\u0435\u043a\u0442 \u0432 \u043a\u0430\u0436\u0434\u043e\u0439 \u0441\u0442\u0440\u043e\u043a\u0435.', noDuplicateProjects: '\u0414\u0443\u0431\u043b\u0438\u0440\u0443\u044e\u0449\u0438\u0435\u0441\u044f \u043f\u0440\u043e\u0435\u043a\u0442\u044b \u0432 \u043e\u0434\u043d\u043e\u0439 \u043d\u0435\u0434\u0435\u043b\u0435 \u043d\u0435 \u0434\u043e\u043f\u0443\u0441\u043a\u0430\u044e\u0442\u0441\u044f.', nonZeroWeek: '\u041d\u0435\u043b\u044c\u0437\u044f \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043f\u0440\u043e\u0435\u043a\u0442, \u0432 \u043a\u043e\u0442\u043e\u0440\u043e\u043c \u0432\u043e \u0432\u0441\u0435 \u0434\u043d\u0438 0 \u0447\u0430\u0441\u043e\u0432.', invalidHours: '\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u043e\u0435 \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0447\u0430\u0441\u043e\u0432 \u0434\u043b\u044f {{day}} (\u0434\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u043e 0-24).' },
      errors: { fetchEntries: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u0438 \u0432\u0440\u0435\u043c\u0435\u043d\u0438. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.', fetchProjects: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u0440\u043e\u0435\u043a\u0442\u044b. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.', fetchUsers: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.', create: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c \u0432\u0440\u0435\u043c\u0435\u043d\u0438. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.', refreshWeeklyProjects: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043d\u0435\u0434\u0435\u043b\u044c\u043d\u044b\u0435 \u043f\u0440\u043e\u0435\u043a\u0442\u044b.', submit: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u0438 \u0432\u0440\u0435\u043c\u0435\u043d\u0438.', update: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c.', updateSomeDays: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043d\u0435\u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0434\u043d\u0438: {{days}}', deleteEntries: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u0438 \u0432\u0440\u0435\u043c\u0435\u043d\u0438. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.', deleteProjectEntries: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0447\u0430\u0441\u044b \u043f\u043e \u043f\u0440\u043e\u0435\u043a\u0442\u0443. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.' }
    },
    smtp: {
      title: 'Настройки SMTP', host: 'SMTP Host', port: 'SMTP Port', username: 'Имя пользователя', password: 'Пароль', passwordPlaceholder: 'Пароль сохранен', passwordHint: 'Оставьте пустым, чтобы не менять текущий пароль.', fromAddress: 'Адрес отправителя', useSecure: 'Использовать SSL/TLS (безопасно)', testEmailTo: 'Кому отправить тест', testConnection: 'Проверить соединение', settingsSaved: 'Настройки сохранены.', saveFailed: 'Не удалось сохранить настройки.', testSent: 'Тестовое письмо успешно отправлено.', testFailed: 'Не удалось отправить тестовое письмо.',
    },
    dashboard: {
      quarterLabel: '\u041a\u0432 {{quarter}} {{year}}',
      hoursSuffix: '{{value}} ч'
    },
  },
  en: {
    common: { appName: 'Time Tracker', notAuthorized: 'Not authorized', actions: { save: 'Save', apply: 'Apply', retry: 'Retry', revert: 'Revert', cancel: 'Cancel', close: 'Close', delete: 'Delete' } },
    nav: { home: 'Home', collapseSidebar: 'Collapse navigation', expandSidebar: 'Expand navigation', projects: 'Projects', clients: 'Clients', users: 'Users', profile: 'Profile', settings: 'Settings', logout: 'Logout' },
    notifications: { title: 'Notifications', readAll: 'Mark all as read', empty: 'No notifications yet', projectManagerAssigned: 'You are now managing “{{project}}”', projectManagerRemoved: 'You are no longer managing “{{project}}”', projectPayrollWarning: '“{{project}}” reached {{threshold}}% of its payroll limit', projectPayrollLimitReached: '“{{project}}” reached or exceeded its payroll limit', projectBudgetChangeRequested: 'A budget request was submitted for “{{project}}”', projectBudgetChangeApproved: 'The budget request for “{{project}}” was approved', projectBudgetChangeRejected: 'The budget request for “{{project}}” was rejected', projectBudgetRequestTransferred: 'An active budget request for “{{project}}” was transferred to you', unknown: 'New project notification for “{{project}}”' },
    auth: {
      sessionExpired: 'Session expired. Please sign in again.', invalidSession: 'Invalid session. Please sign in again.',
      signIn: { title: 'Welcome to TimeTracker', subtitle: 'Enter your email to receive a magic link for passwordless login.', emailPlaceholder: 'Enter your email', send: 'Send', resendIn: 'Resend in {{seconds}}s', success: 'Check your email for a login link!', localTesting: 'Local testing shortcut:', openMagicLink: 'Open magic link', emailHint: 'A login link will be sent to your email address.', noEmail: 'Didn\'t get the email?', contactAdmin: 'Contact the platform administrator', sendFailed: 'Failed to send magic link.', resendFailed: 'Failed to resend magic link.' },
      magicLink: { loggingIn: 'Logging you in...', invalidOrExpired: 'Invalid or expired link.', goToSignIn: 'Go to Sign In' },
      invitation: { invalidOrExpired: 'Invalid or expired invitation.', failed: 'Failed to complete registration.', title: 'Accept Invitation', welcome: 'Welcome to TimeTracker!', description1: 'This service helps you log and manage your time across projects with ease.', description2: 'No passwords required - you\'ll access your account through a magic link sent to your registered email.', description3: 'No need to remember new passwords - just click and go!', description4: 'Please verify that your name is correct and complete your registration to get started.', emailHint: 'You\'ll log in passwordlessly via a magic link sent to your email.', success: 'Registration complete! Redirecting...', submitting: 'Registering...', submit: 'Complete Registration' },
    },
    setup: { title: 'Initial Setup', introTitle: 'Welcome to TimeTracker!', introBody: 'TimeTracker helps your team log hours and stay on top of project work. To get started, enter your admin details and set up email so we can send magic login links. You can test your email settings before finishing.', localDevTip: 'Local development tip: you can leave SMTP blank and finish setup.', adminSection: 'Admin User', smtpSection: 'SMTP Settings', secure: 'Use SSL/TLS (secure connection)', sendTestEmail: 'Send Test Email', sending: 'Sending...', completeSetup: 'Complete Setup', settingUp: 'Setting up...', completeSuccess: 'Setup complete! Redirecting to sign in...', failed: 'Setup failed.', testSuccess: 'Test email sent successfully!', testFailed: 'Failed to send test email.' },
    fields: { name: 'Name', surname: 'Surname', email: 'Email', host: 'Host', port: 'Port', user: 'User', password: 'Password', fromEmail: 'From Email' },
    autologin: { badgeTitle: 'Autologin', progress: '{{completed}}/{{required}} days completed', dialogTitle: 'New autologin update', dialogIntro: 'You can now keep your login for the next workweek without requesting a new magic link.', howItWorks: 'How it works', rule1: 'Log 8 hours for each workday from Monday to Friday.', rule2: 'If all 5 workdays are complete, your login is automatically saved for next week.', rule3: 'You can track the progress anytime in the new autologin widget in the top navigation bar.', currentProgress: 'Your current progress', currentProgressValue: '{{completed}}/{{required}} workdays completed this week.', doNotShowAgain: 'Do not show this again', gotIt: 'Got it', qualified: 'All 5 workdays are complete. Your login is saved for next week.', remaining: 'Complete {{remaining}} more day(s) to save your login for next week.' },
    users: { title: 'Users', active: 'Active', deleted: 'Deleted', user: 'User', admin: 'Admin', surname: 'Surname', name: 'Name', email: 'Email', role: 'Role', status: 'Status', actions: 'Actions', add: 'Add', addUser: 'Add User', editUser: 'Edit', deleteUser: 'Delete User', sendInvitation: 'Send Invitation', resendInvitation: 'Resend Invitation', invitationSent: 'Invitation sent successfully!', invitationResent: 'Invitation resent successfully!', sendTo: 'Send invitation to {{email}}? The user will receive an email to join.', resendTo: 'Resend invitation to {{email}}?', invited: 'Invited', deleting: 'Deleting...', sending: 'Sending...', resending: 'Resending...', confirmDelete: 'Are you sure you want to delete the user "{{name}}"?', deleteHoursQuestion: 'What should happen to this user\'s logged hours?', keepHours: 'Keep logged hours (delete user only)', deleteHours: 'Delete user and all logged hours', validation: { nameRequired: 'Name is required', surnameRequired: 'Surname is required', emailRequired: 'Email is required', allRequired: 'All fields are required', emailInvalid: 'Please enter a valid email address' }, rates: { action: 'Rates', title: 'Rates: {{name}}', rate: 'Rate, RUB/h', effectiveFrom: 'Effective from', effectiveTo: 'Effective to', createdBy: 'Created by', createdAt: 'Created at', current: 'current', add: 'Add', saving: 'Saving...', empty: 'No rates have been set yet', saved: 'Rate saved', validation: { rate: 'Enter a non-negative whole-ruble rate', effectiveFrom: 'Choose an effective date' }, errors: { fetch: 'Failed to fetch rates.', save: 'Failed to save rate.', overlap: 'Rate periods cannot overlap.' } }, errors: { fetch: 'Failed to fetch users. Please try again.', update: 'Failed to update user. Please try again.', delete: 'Failed to delete user and/or their time entries.', sendInvitation: 'Failed to send invitation.', resendInvitation: 'Failed to resend invitation.' } },
    projects: { budget: { title: 'Budget', open: 'Budget', mode: 'Budget mode', modes: { none: 'No limit', contract: 'Contract', manual: 'Manual limit' }, contractAmount: 'Contract amount excl. VAT, RUB', reservePercent: 'Management reserve, %', reserveRub: 'Reserve amount', totalLimit: 'Project total limit', payrollMode: 'Payroll limit input', byPercent: 'Percent', byAmount: 'Amount', payrollPercent: 'Payroll limit, %', payrollLimit: 'Payroll limit', nonPayroll: 'Non-payroll budget', warningThreshold: 'Payroll warning threshold, %', note: 'Note', laborCost: 'Cumulative labor cost', remaining: 'Payroll remaining', missingRates: 'Entries without a rate: {{count}}', chart: { title: 'Payroll cost trend', subtitle: 'Actual cumulative cost across the full project history', usedLabel: 'of payroll limit used', incomplete: 'Incomplete calculation', emptyTitle: 'No chart data yet', emptyHint: 'The curve will appear after time entries with applicable rates are added.', ariaLabel: 'Cumulative payroll cost chart: {{value}}, {{percent}} percent of the limit used.', legend: { actual: 'Cumulative payroll cost', warning: 'Warning threshold', payrollLimit: 'Payroll limit', totalLimit: 'Project total limit', contractAmount: 'Contract amount', reserve: 'Management reserve' }, tooltip: { daily: 'Cost for the day', cumulative: 'Cumulative', used: 'Payroll used' } }, version: 'Version {{version}}', pendingRequest: 'Pending request by: {{author}}', reason: 'Reason', reviewComment: 'Review comment', save: 'Save budget', saved: 'Budget saved', request: 'Submit request', requestSent: 'Request submitted', reviewSaved: 'Decision saved', approve: 'Approve', approveWithChanges: 'Approve with changes', reject: 'Reject', errors: { fetch: 'Failed to load budget.', save: 'Failed to save budget.', request: 'Failed to submit request.', review: 'Failed to save decision.', createdWithoutBudget: 'The project was created, but its budget could not be saved. Open the project and retry.' } }, title: 'Projects', active: 'Active', closed: 'Closed', external: 'External', internal: 'Internal', addProject: 'Add Project', editProject: 'Edit Project', deleteProject: 'Delete Project', viewTimeEntries: 'View Time Entries', timeEntriesFor: 'Time Entries for {{name}}', noTimeEntries: 'No time entries found for this project', client: 'Client', projectName: 'Project Name', projectCode: 'Project Code (optional)', description: 'Description', code: 'Code', noCode: 'N/A', noClient: 'No Client', dateWeekday: 'Date / Weekday', submissionDateTime: 'Submission Date/Time', hours: 'Hours', user: 'User', activeStatus: 'Active', closedStatus: 'Closed', expand: 'Expand', collapse: 'Collapse', confirmDelete: 'Are you sure you want to delete the project "{{name}}" and all its time entries?', filters: { mine: 'My Projects', managed: 'I Manage', all: 'All Projects', projects: 'Projects', status: 'Status', categories: 'Categories', categoriesTooltip: 'Filter projects by category', categoriesTitle: 'Project categories', clearCategories: 'Clear categories', emptyMine: 'There are no active projects that you manage or have logged time against. Select “All Projects” to see the remaining projects.', emptyManaged: 'There are no active projects where you are the assigned manager.', empty: 'No projects match the selected filters.', tooltips: { mine: 'Projects that you manage or have logged time against', managed: 'Projects where you are the assigned manager', all: 'All projects in the available catalog', active: 'Show projects with active status', closed: 'Show projects with closed status', external_delivery: 'Commercial work for an external customer', internal_project: 'Internal company initiatives and changes', operations: 'Regular internal work and operational support', people_development: 'Training, mentoring, and knowledge sharing', time_off: 'Vacations, holidays, sick leave, and time off', unclassified: 'Older projects that still require classification' } }, manager: { label: 'Project manager', unassigned: 'Not assigned', emailFailed: 'The manager was changed, but the email could not be sent. The in-app notification was saved.', errors: { fetchCandidates: 'Failed to load possible project managers.', createdWithoutManager: 'The project was created, but its manager could not be assigned.', updatedWithoutManager: 'The project was saved, but its manager could not be changed.' } }, analytics: { title: 'Project Analytics', subtitle: '{{client}} · {{code}}', noSubtitle: 'Project hours and team activity', selectedPeriod: 'Selected Period', participants: 'Participants', totalHours: 'Total Hours', averagePerDay: 'Average per Day', lastActivity: 'Last Activity', totalSeries: 'Total', topMembersDefault: 'The chart starts with total and the top 5 members by hours. You can enable the rest on the left.', allMembersVisible: 'All project members are visible on the chart.', showAllMembers: 'Show All', hideAllMembers: 'Hide All', topMembers: 'Top 5', showAllLabel: 'Show all project members', hiddenMembers: 'Hidden: {{count}}', chart: 'Hours Chart', members: 'Project Members', noData: 'No data for this project in the selected period.', modes: { daily: 'By Day', cumulative: 'Cumulative' }, ranges: { week: 'Week', month: 'Month', quarter: 'Quarter', year: 'Year', all: 'All Time' }, tooltip: { date: 'Date', total: 'Total' }, errors: { fetch: 'Failed to fetch project analytics. Please try again.' } }, validation: { nameRequired: 'Project name is required', clientRequired: 'Please select a client', duplicateName: 'A project with this name already exists.', duplicateCode: 'A project with this code already exists.' }, errors: { fetch: 'Failed to fetch projects. Please try again.', fetchClients: 'Failed to fetch clients. Please try again.', fetchTimeEntries: 'Failed to fetch time entries. Please try again.', create: 'Failed to create project. Please try again.', update: 'Failed to update project. Please try again.', delete: 'Failed to delete project and its time entries.', updateStatus: 'Failed to update project status.' } },
    timeEntries: { payrollLimitWarning: 'The project payroll limit has been reached or exceeded. Time entries were saved.' },
    clients: { title: 'Clients', internal: 'Internal', external: 'External', name: 'Name', clientName: 'Client Name', itn: 'ITN', type: 'Type', projects: 'Projects', actions: 'Actions', add: 'Add', edit: 'Edit', delete: 'Delete', activeCount: 'Active: {{count}}', totalCount: 'Total: {{count}}', deleteTitle: 'Delete Client', confirmDelete: 'Are you sure you want to delete the client "{{name}}" and all its projects and time entries?', validation: { nameRequired: 'Client name is required', duplicateName: 'A client with this name already exists.', duplicateItn: 'A client with this ITN already exists.' }, errors: { fetch: 'Failed to fetch clients. Please try again.', fetchProjects: 'Failed to fetch projects.', create: 'Failed to create client. Please try again.', createDuplicate: 'A client with this name or ITN already exists.', update: 'Failed to update client. Please try again.', delete: 'Failed to delete client and its data.' } },
    dashboard: {
      quarterLabel: 'Q{{quarter}} {{year}}',
      hoursSuffix: '{{value}}h'
    },
    smtp: { title: 'SMTP Settings', host: 'SMTP Host', port: 'SMTP Port', username: 'Username', password: 'Password', passwordPlaceholder: 'Password saved', passwordHint: 'Leave blank to keep the current password.', fromAddress: 'From Address', useSecure: 'Use SSL/TLS (secure)', testEmailTo: 'Test Email To', testConnection: 'Test Connection', settingsSaved: 'Settings saved.', saveFailed: 'Failed to save settings.', testSent: 'Test email sent successfully.', testFailed: 'Failed to send test email.' },
  },
};

translations.en.projects.saved = 'Project saved';
translations.en.projects.dialog = {
  newTitle: 'New project',
  newSubtitle: 'Add the project details and configure a budget if needed',
  create: 'Create project',
  tabs: { project: 'About project', budget: 'Budget and effort', budgetSettings: 'Budget parameters' },
  projectDataTitle: 'About project',
  saveProject: 'Save project',
  saveBudget: 'Save budget',
  unsavedTitle: 'You have unsaved changes',
  unsavedMessage: 'Save your changes before continuing?',
  unsavedBudgetTitle: 'Budget parameters are not saved',
  unsavedBudgetMessage: 'Close without saving the budget changes?',
  saveAndContinue: 'Save and continue',
  discard: 'Discard changes',
  stay: 'Stay',
  closeWithoutSaving: 'Close without saving',
  discardBudget: 'Discard budget changes',
};

Object.assign(translations.en.projects.budget, {
  modeDescriptions: {
    none: 'No financial restriction is set for this project.',
    contract: 'The limit is calculated from the contract amount and management reserve.',
    manual: 'Enter the project total limit directly.',
  },
  allocationTitle: 'Limit allocation',
  allocationHint: 'Define the share of the project limit available for payroll.',
  emptyTitle: 'No project budget',
  emptyHint: 'This project currently has no financial limit.',
  exceeded: 'Payroll exceeded',
  payrollUsage: 'Payroll limit usage',
  thresholdMarker: 'Warning threshold: {{threshold}}%',
  overview: {
    title: 'Project budget', subtitle: 'Limits and actual labor cost', configure: 'Configure budget', changeSettings: 'Change parameters', showProposal: 'Show proposal', showRequest: 'Show request', backToOverview: 'Back to overview', contract: 'Contract', accumulatedPayroll: 'Accumulated payroll', accumulatedPayrollHint: 'Cumulative labor cost calculated using historical rates',
    previewTitle: 'Financial information will appear after the project is created', previewHint: 'After the budget is configured and time is logged, project metrics and payroll cost trends will appear here.',
    noBudgetTitle: 'The project budget has not been configured yet',
  },
  parametersTitle: 'Budget parameters',
  proposedBudget: 'Proposed budget',
  requestReviewTitle: 'Budget review request',
  requestChangeTitle: 'Request a budget review',
  requestFirstTitle: 'Request the first budget',
  decisionTitle: 'Request decision',
  historyTitle: 'Budget history',
  historyEmpty: 'No budget history yet',
  unknownAuthor: 'Unknown author',
  statuses: { pending: 'Pending decision', approved: 'Approved', rejected: 'Rejected', active: 'Active version' },
  comparison: { metric: 'Metric', current: 'Current budget', proposed: 'Proposal', totalLimit: 'Project total limit', payrollLimit: 'Payroll limit', warningThreshold: 'Warning threshold' },
  validation: {
    required: 'Select a budget mode',
    amount: 'Enter a non-negative amount with no more than two decimals',
    percent: 'Enter a value from 0 to 100%',
    threshold: 'The threshold must be greater than 0% and less than 100%',
    payrollAboveTotal: 'The payroll limit cannot exceed the project total limit',
    reasonRequired: 'A reason is required',
    fixErrors: 'Correct the errors in the budget parameters.',
  },
});

translations.en.projects.budget.chart.legendButton = 'Chart legend';
translations.en.projects.validation.categoryRequired = 'Please select a project category';
translations.en.projects.budget.saveParameters = 'Save parameters';
translations.en.projects.inline = { saving: 'Saving…', saved: 'Saved' };
translations.en.projects.budget.chart.incompleteHint = 'Only time entries with an applicable rate on the work date are included. Add or correct historical user rates and the metrics will recalculate automatically.';
translations.en.projects.budget.chart.missingRatesHint = 'These time entries are not yet included in payroll cost because no user rate applies on the work date. Add historical rates to complete the calculation.';
translations.ru.projects.budget.overview.preview = '\u041f\u0440\u0435\u0434\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440';
translations.ru.projects.budget.overview.proposal = '\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435';
translations.en.projects.budget.overview.preview = 'Preview';
translations.en.projects.budget.overview.proposal = 'Proposal';
translations.ru.projects.budget.chart.ariaLabelNoLimit = '\u0413\u0440\u0430\u0444\u0438\u043a \u043d\u0430\u043a\u043e\u043f\u043b\u0435\u043d\u043d\u043e\u0439 \u0441\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u0438 \u0424\u041e\u0422 \u0431\u0435\u0437 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u043e\u0433\u043e \u043b\u0438\u043c\u0438\u0442\u0430: {{value}}.';
translations.en.projects.budget.chart.ariaLabelNoLimit = 'Cumulative payroll cost chart without a configured limit: {{value}}.';
translations.ru.projects.budget.validation.nonPayrollAboveTotal = '\u0411\u044e\u0434\u0436\u0435\u0442 \u0432\u043d\u0435 \u0424\u041e\u0422 \u043d\u0435 \u043c\u043e\u0436\u0435\u0442 \u043f\u0440\u0435\u0432\u044b\u0448\u0430\u0442\u044c \u043e\u0431\u0449\u0438\u0439 \u043b\u0438\u043c\u0438\u0442 \u043f\u0440\u043e\u0435\u043a\u0442\u0430';
translations.en.projects.budget.validation.nonPayrollAboveTotal = 'The non-payroll budget cannot exceed the project total limit';

Object.assign(translations.ru.projects.budget, {
  compactParametersTitle: '\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b',
  basisTitle: '\u041e\u0441\u043d\u043e\u0432\u0430 \u0431\u044e\u0434\u0436\u0435\u0442\u0430',
  calculationLabel: '\u0420\u0430\u0441\u0447\u0451\u0442',
  reserveShort: '\u0420\u0435\u0437\u0435\u0440\u0432',
  calculatedValue: '\u0420\u0430\u0441\u0447\u0451\u0442\u043d\u043e\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435',
  controlTitle: '\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c',
  controlHint: '\u041f\u0440\u0438 \u0434\u043e\u0441\u0442\u0438\u0436\u0435\u043d\u0438\u0438 \u044d\u0442\u043e\u0439 \u0434\u043e\u043b\u0438 \u043b\u0438\u043c\u0438\u0442\u0430 \u0424\u041e\u0422 \u0431\u0443\u0434\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e \u043f\u0440\u0435\u0434\u0443\u043f\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u0435.',
  versionNoteTitle: '\u041f\u0440\u0438\u043c\u0435\u0447\u0430\u043d\u0438\u0435 \u043a \u0432\u0435\u0440\u0441\u0438\u0438',
  versionNotePlaceholder: '\u041e\u043f\u0438\u0448\u0438\u0442\u0435, \u0447\u0442\u043e \u0438 \u043f\u043e\u0447\u0435\u043c\u0443 \u0438\u0437\u043c\u0435\u043d\u0438\u043b\u043e\u0441\u044c \u0432 \u044d\u0442\u043e\u0439 \u0432\u0435\u0440\u0441\u0438\u0438',
  editProposal: '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f',
});
Object.assign(translations.ru.projects.budget.comparison, {
  mode: '\u0420\u0435\u0436\u0438\u043c \u0431\u044e\u0434\u0436\u0435\u0442\u0430',
  contract: '\u0414\u043e\u0433\u043e\u0432\u043e\u0440',
  reserve: '\u0420\u0435\u0437\u0435\u0440\u0432',
});
Object.assign(translations.ru.projects.budget.overview, {
  hasErrors: '\u0415\u0441\u0442\u044c \u043e\u0448\u0438\u0431\u043a\u0438',
  approvedValue: '\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e: {{value}}',
});

Object.assign(translations.en.projects.budget, {
  compactParametersTitle: 'Parameters',
  basisTitle: 'Budget basis',
  calculationLabel: 'Calculation',
  reserveShort: 'Reserve',
  calculatedValue: 'Calculated value',
  controlTitle: 'Control',
  controlHint: 'A warning will be sent when this share of the payroll limit is reached.',
  versionNoteTitle: 'Version note',
  versionNotePlaceholder: 'Describe what changed in this version and why',
  editProposal: 'Edit proposal',
});
Object.assign(translations.en.projects.budget.comparison, {
  mode: 'Budget mode',
  contract: 'Contract',
  reserve: 'Reserve',
});
Object.assign(translations.en.projects.budget.overview, {
  hasErrors: 'Has errors',
  approvedValue: 'Approved: {{value}}',
});

Object.assign(translations.ru.projects.budget, {
  fixedAmountSource: '\u0417\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d \u0441\u0443\u043c\u043c\u043e\u0439',
  percentSource: '\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u044b\u0432\u0430\u0435\u0442\u0441\u044f \u043a\u0430\u043a \u043f\u0440\u043e\u0446\u0435\u043d\u0442',
  exactValue: '\u0422\u043e\u0447\u043d\u043e\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435',
  recommendedValue: '\u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u0435\u043c\u043e\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435',
  editPercentHint: '\u041d\u0430\u0436\u043c\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0432\u0432\u0435\u0441\u0442\u0438 \u0442\u043e\u0447\u043d\u044b\u0439 \u043f\u0440\u043e\u0446\u0435\u043d\u0442',
  editAmountHint: '\u041d\u0430\u0436\u043c\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043b\u0438\u043c\u0438\u0442 \u0424\u041e\u0422 \u0441\u0443\u043c\u043c\u043e\u0439',
  editContractAmountHint: '\u041d\u0430\u0436\u043c\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0441\u0443\u043c\u043c\u0443 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430',
  editTotalLimitHint: '\u041d\u0430\u0436\u043c\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u043e\u0431\u0449\u0438\u0439 \u043b\u0438\u043c\u0438\u0442 \u043f\u0440\u043e\u0435\u043a\u0442\u0430',
  editReserveAmountHint: '\u041d\u0430\u0436\u043c\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0437\u0430\u0434\u0430\u0442\u044c \u0440\u0435\u0437\u0435\u0440\u0432 \u0441\u0443\u043c\u043c\u043e\u0439',
  editDerivedTotalHint: '\u041d\u0430\u0436\u043c\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0437\u0430\u0434\u0430\u0442\u044c \u043e\u0431\u0449\u0438\u0439 \u043b\u0438\u043c\u0438\u0442 \u0438 \u043f\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0442\u044c \u0440\u0435\u0437\u0435\u0440\u0432',
  editNonPayrollHint: '\u041d\u0430\u0436\u043c\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0437\u0430\u0434\u0430\u0442\u044c \u0431\u044e\u0434\u0436\u0435\u0442 \u0432\u043d\u0435 \u0424\u041e\u0422 \u0441\u0443\u043c\u043c\u043e\u0439',
  percentShort: '\u041f\u0440\u043e\u0446\u0435\u043d\u0442',
  fixedAmountShort: '\u0424\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u0430\u044f \u0441\u0443\u043c\u043c\u0430',
  reserveBalanceAria: '\u0420\u0435\u0437\u0435\u0440\u0432 {{reserve}}, \u043e\u0431\u0449\u0438\u0439 \u043b\u0438\u043c\u0438\u0442 {{total}}',
  payrollBalanceAria: '\u041b\u0438\u043c\u0438\u0442 \u0424\u041e\u0422 {{payroll}}, \u0431\u044e\u0434\u0436\u0435\u0442 \u0432\u043d\u0435 \u0424\u041e\u0422 {{nonPayroll}}',
});

Object.assign(translations.en.projects.budget, {
  fixedAmountSource: 'Fixed as an amount',
  percentSource: 'Calculated as a percentage',
  exactValue: 'Exact value',
  recommendedValue: 'Recommended value',
  editPercentHint: 'Click to enter an exact percentage',
  editAmountHint: 'Click to fix the payroll limit as an amount',
  editContractAmountHint: 'Click to edit the contract amount',
  editTotalLimitHint: 'Click to edit the project total limit',
  editReserveAmountHint: 'Click to set the reserve as an amount',
  editDerivedTotalHint: 'Click to set the total limit and recalculate the reserve',
  editNonPayrollHint: 'Click to set the non-payroll budget as an amount',
  percentShort: 'Percentage',
  fixedAmountShort: 'Fixed amount',
  reserveBalanceAria: 'Reserve {{reserve}}, project total limit {{total}}',
  payrollBalanceAria: 'Payroll limit {{payroll}}, non-payroll budget {{nonPayroll}}',
});

Object.assign(translations.ru.notifications, {
  projectBudgetChangeUpdated: 'Запрос бюджета проекта «{{project}}» обновлён, редакция {{revision}}',
});
Object.assign(translations.en.notifications, {
  projectBudgetChangeUpdated: 'The budget request for “{{project}}” was updated to revision {{revision}}',
});

Object.assign(translations.ru.projects.dialog, {
  openProject: 'Открыть проект «{{name}}»',
});
Object.assign(translations.en.projects.dialog, {
  openProject: 'Open project “{{name}}”',
});
Object.assign(translations.ru.projects.filters, {
  requiresDecision: 'Требуют решения',
});
Object.assign(translations.en.projects.filters, {
  requiresDecision: 'Requires decision',
});
translations.ru.projects.filters.tooltips.requiresDecision = 'Проекты с ожидающими решения запросами на изменение бюджета';
translations.en.projects.filters.tooltips.requiresDecision = 'Projects with pending budget change requests';

Object.assign(translations.ru.projects.budget, {
  financialRestrictedTitle: 'Финансовые данные недоступны',
  financialRestrictedHint: 'Финансовые данные проекта доступны только администратору и текущему руководителю проекта.',
  changeReason: 'Обоснование изменений',
  decisionReason: 'Обоснование решения',
  requestResultTitle: 'Результат рассмотрения запроса',
  editRequest: 'Изменить запрос',
  updateRequest: 'Сохранить изменения запроса',
  revision: 'Редакция {{revision}}',
  changeNumber: 'Изменение №{{number}}',
  requestRevisions: 'Редакции запроса',
  pendingApprovalIndicator: 'Ожидается одобрение бюджета',
  reasonNotSpecified: 'Причина не указана',
  payrollModes: {
    percent: 'Процент от общего лимита',
    fixed_amount: 'Фиксированная сумма',
  },
  sources: {
    admin_direct: 'Изменено администратором',
    budget_request: 'По запросу руководителя',
  },
  events: {
    budget_removed: 'Бюджет снят',
  },
});
translations.ru.projects.budget.errors.stale = 'Запрос был изменён или уже рассмотрен. Загружена последняя редакция — проверьте её повторно.';
Object.assign(translations.en.projects.budget, {
  financialRestrictedTitle: 'Financial data is unavailable',
  financialRestrictedHint: 'Project financial data is available only to administrators and the current project manager.',
  changeReason: 'Reason for changes',
  decisionReason: 'Decision rationale',
  requestResultTitle: 'Budget request result',
  editRequest: 'Edit request',
  updateRequest: 'Save request changes',
  revision: 'Revision {{revision}}',
  changeNumber: 'Change #{{number}}',
  requestRevisions: 'Request revisions',
  pendingApprovalIndicator: 'Budget approval is pending',
  reasonNotSpecified: 'Reason not specified',
  payrollModes: {
    percent: 'Percentage of total limit',
    fixed_amount: 'Fixed amount',
  },
  sources: {
    admin_direct: 'Changed by administrator',
    budget_request: 'Project manager request',
  },
  events: {
    budget_removed: 'Budget removed',
  },
});
Object.assign(translations.ru.projects.budget.comparison, {
  reservePercent: 'Резерв, %',
  reserveRub: 'Резерв, ₽',
  payrollMode: 'Способ расчёта ФОТ',
  payrollPercent: 'Лимит ФОТ, %',
  nonPayroll: 'Бюджет вне ФОТ',
  requested: 'Предложение',
  final: 'Итог',
});
Object.assign(translations.en.projects.budget.comparison, {
  reservePercent: 'Reserve, %',
  reserveRub: 'Reserve, RUB',
  payrollMode: 'Payroll calculation',
  payrollPercent: 'Payroll limit, %',
  nonPayroll: 'Non-payroll budget',
  requested: 'Proposal',
  final: 'Final budget',
});
translations.en.projects.budget.errors.stale = 'The request was changed or already reviewed. The latest revision has been loaded; please review it again.';

translations.ru.notifications.projectBudgetChangeUpdated = '\u0417\u0430\u043f\u0440\u043e\u0441 \u043d\u0430 \u0432\u0435\u0440\u0441\u0438\u044e {{version}} \u0431\u044e\u0434\u0436\u0435\u0442\u0430 \u043f\u0440\u043e\u0435\u043a\u0442\u0430 \u00ab{{project}}\u00bb \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d';
translations.en.notifications.projectBudgetChangeUpdated = 'The request for budget version {{version}} of \u201c{{project}}\u201d was updated';
translations.ru.projects.budget.requestRevisions = '\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0435 \u043f\u0440\u0430\u0432\u043a\u0438 \u0437\u0430\u043f\u0440\u043e\u0441\u0430';
translations.en.projects.budget.requestRevisions = 'Previous request edits';

Object.assign(translations.ru.projects, {
  noDescription: '\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e',
  moreActions: '\u0414\u0440\u0443\u0433\u0438\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f',
});
Object.assign(translations.en.projects, {
  noDescription: 'No description',
  moreActions: 'More actions',
  closeProject: 'Close project',
  activateProject: 'Activate project',
});
Object.assign(translations.ru.projects, {
  closeProject: '\u0417\u0430\u043a\u0440\u044b\u0442\u044c \u043f\u0440\u043e\u0435\u043a\u0442',
  activateProject: '\u0410\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u0440\u043e\u0435\u043a\u0442',
});

Object.assign(translations.ru.projects.budget, {
  acknowledgeResult: '\u041e\u0437\u043d\u0430\u043a\u043e\u043c\u0438\u043b\u0441\u044f',
  resultAcknowledgementHint: '\u041f\u043e\u0441\u043b\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f \u0432\u044b \u0441\u043c\u043e\u0436\u0435\u0442\u0435 \u0441\u043d\u043e\u0432\u0430 \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b \u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043d\u043e\u0432\u044b\u0439 \u0437\u0430\u043f\u0440\u043e\u0441.',
});
translations.ru.projects.budget.errors.acknowledge = '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u043a\u0430\u043a \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043d\u043e\u0435.';
Object.assign(translations.en.projects.budget, {
  acknowledgeResult: 'Reviewed',
  resultAcknowledgementHint: 'After confirming, you can edit the parameters again and submit a new request.',
});
translations.en.projects.budget.errors.acknowledge = 'Failed to mark the decision as read.';

translations.ru.projects.hoursOverview = {
  title: '\u0427\u0430\u0441\u044b \u043f\u0440\u043e\u0435\u043a\u0442\u0430',
  modeHours: '\u0427\u0430\u0441\u044b',
  viewSelector: '\u0420\u0435\u0436\u0438\u043c \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430 \u043f\u0440\u043e\u0435\u043a\u0442\u0430',
  chartTitle: '\u0414\u0438\u043d\u0430\u043c\u0438\u043a\u0430 \u0447\u0430\u0441\u043e\u0432',
  legend: '\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0438 \u0433\u0440\u0430\u0444\u0438\u043a\u0430',
  emptyTitle: '\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u043e \u0447\u0430\u0441\u0430\u0445',
  emptyHint: '\u0413\u0440\u0430\u0444\u0438\u043a \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u0447\u0430\u0441\u043e\u0432 \u043f\u043e \u043f\u0440\u043e\u0435\u043a\u0442\u0443.',
  ariaLabel: '\u0413\u0440\u0430\u0444\u0438\u043a \u0447\u0430\u0441\u043e\u0432 \u043f\u0440\u043e\u0435\u043a\u0442\u0430: {{hours}}, \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u043e\u0432: {{participants}}.',
  unsavedSwitchMessage: '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u043e\u0432 \u0431\u044e\u0434\u0436\u0435\u0442\u0430 \u043d\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b. \u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0438\u0445 \u0438 \u043f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u0447\u0430\u0441\u0430\u043c?',
  discardAndSwitch: '\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0438 \u043f\u0435\u0440\u0435\u0439\u0442\u0438',
};
translations.en.projects.hoursOverview = {
  title: 'Project hours',
  modeHours: 'Hours',
  viewSelector: 'Project view mode',
  chartTitle: 'Hours trend',
  legend: 'Chart members',
  emptyTitle: 'No hours data yet',
  emptyHint: 'The chart will appear after hours are logged against the project.',
  ariaLabel: 'Project hours chart: {{hours}}, participants: {{participants}}.',
  unsavedSwitchMessage: 'Budget parameter changes have not been saved. Discard them and switch to hours?',
  discardAndSwitch: 'Discard and switch',
};

// Keep the two catalogs structurally identical. These assignments also make
// recently added screens use the same translation source as the rest of the UI.
translations.ru.common.actions.delete = 'Удалить';

Object.assign(translations.ru.timeEntries, {
  addEntry: '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c',
  startTime: 'Время начала',
  startTimeRequired: 'Укажите время начала',
  endTime: 'Время окончания',
  endTimeRequired: 'Укажите время окончания',
  weekHoursSummary: '{{logged}}/{{required}} часов за выбранную неделю',
});

Object.assign(translations.en.timeEntries, {
  title: 'Time entries',
  user: 'User',
  project: 'Project',
  total: 'Total',
  actions: 'Actions',
  addProject: 'Add project',
  addEntry: 'Add entry',
  submitWeek: 'Submit week',
  earlierWeeks: 'Earlier weeks',
  editTitle: 'Edit time entry',
  deleteTitle: 'Delete time entries',
  deleteConfirm: 'Delete all time entries for {{project}} on {{date}}?',
  deletedTag: 'deleted',
  selectProject: 'Select a project',
  selectUser: 'Select a user',
  startTime: 'Start time',
  startTimeRequired: 'Start time is required',
  endTime: 'End time',
  endTimeRequired: 'End time is required',
  weekHoursSummary: '{{logged}}/{{required}} hours in the selected week',
  weekdays: {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
  },
  validation: {
    projectRequired: 'Select a project',
    userRequired: 'Select a user',
    dateRequired: 'Date is required',
    hoursRequired: 'Enter hours',
    selectUserBeforeSubmit: 'Select a user before submitting.',
    addOneProject: 'Add at least one project.',
    projectForEachRow: 'Select a project in every row.',
    noDuplicateProjects: 'A project cannot appear more than once in the same week.',
    nonZeroWeek: 'A project with zero hours on every day cannot be submitted.',
    invalidHours: 'Invalid number of hours for {{day}} (allowed range: 0–24).',
  },
  errors: {
    fetchEntries: 'Failed to load time entries. Please try again.',
    fetchProjects: 'Failed to load projects. Please try again.',
    fetchUsers: 'Failed to load users. Please try again.',
    create: 'Failed to create the time entry. Please try again.',
    refreshWeeklyProjects: 'Failed to refresh weekly projects.',
    submit: 'Failed to submit time entries.',
    update: 'Failed to update the time entry.',
    updateSomeDays: 'Failed to update some days: {{days}}',
    deleteEntries: 'Failed to delete time entries. Please try again.',
    deleteProjectEntries: 'Failed to delete the project hours. Please try again.',
  },
});

translations.ru.users.rates = {
  action: 'Ставки',
  title: 'Ставки: {{name}}',
  rate: 'Ставка, ₽/ч',
  effectiveFrom: 'Действует с',
  effectiveTo: 'Действует до',
  createdBy: 'Создал',
  createdAt: 'Создано',
  current: 'действующая',
  add: 'Добавить',
  edit: 'Редактировать',
  saving: 'Сохранение...',
  save: 'Сохранить',
  cancel: 'Отмена',
  empty: 'Ставки пока не установлены',
  saved: 'Ставка сохранена',
  updated: 'Ставка обновлена',
  validation: {
    rate: 'Введите неотрицательную ставку в целых рублях',
    effectiveFrom: 'Выберите дату начала действия',
  },
  errors: {
    fetch: 'Не удалось загрузить ставки.',
    save: 'Не удалось сохранить ставку.',
    overlap: 'Периоды действия ставок не могут пересекаться.',
  },
};
Object.assign(translations.en.users.rates, {
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  updated: 'Rate updated',
});

translations.ru.profile = {
  title: 'Профиль',
  name: 'Имя',
  surname: 'Фамилия',
  email: 'Электронная почта',
  phone: 'Телефон',
  department: 'Подразделение',
  jobTitle: 'Должность',
  avatarAlt: 'Аватар пользователя',
  uploadAvatar: 'Загрузить аватар',
  saveChanges: 'Сохранить изменения',
  saving: 'Сохранение...',
  updated: 'Профиль обновлён',
  errors: {
    load: 'Не удалось загрузить профиль.',
    update: 'Не удалось обновить профиль.',
    upload: 'Не удалось загрузить аватар.',
  },
};
translations.en.profile = {
  title: 'Profile',
  name: 'Name',
  surname: 'Surname',
  email: 'Email',
  phone: 'Phone',
  department: 'Department',
  jobTitle: 'Job title',
  avatarAlt: 'User avatar',
  uploadAvatar: 'Upload avatar',
  saveChanges: 'Save changes',
  saving: 'Saving...',
  updated: 'Profile updated',
  errors: {
    load: 'Failed to load the profile.',
    update: 'Failed to update the profile.',
    upload: 'Failed to upload the avatar.',
  },
};

Object.assign(translations.ru.projects, {
  category: 'Категория',
  catalogCount: 'Проектов в каталоге: {{count}}',
});
Object.assign(translations.en.projects, {
  category: 'Category',
  catalogCount: 'Projects in catalog: {{count}}',
});
Object.assign(translations.ru.projects.filters, {
  unclassified: 'Требуют классификации',
  reset: 'Сбросить',
  shortCategories: {
    external_delivery: 'Внешние',
    internal_project: 'Внутренние',
    operations: 'Операционка',
    people_development: 'Развитие',
    time_off: 'Отсутствия',
    unclassified: 'Без категории',
  },
});
Object.assign(translations.en.projects.filters, {
  unclassified: 'Needs classification',
  reset: 'Reset',
  shortCategories: {
    external_delivery: 'External',
    internal_project: 'Internal',
    operations: 'Operations',
    people_development: 'Development',
    time_off: 'Time off',
    unclassified: 'Unclassified',
  },
});

Object.assign(translations.ru.projects.analytics, {
  allMembersShown: 'Показаны все участники',
  membersSummary: '{{total}} + {{top}}',
  accumulatedSummary: 'Накоплено: {{hours}}',
  periodSummary: 'За период: {{hours}}',
  actions: {
    showAll: 'Все',
    hideAll: 'Скрыть',
  },
});
Object.assign(translations.en.projects.analytics, {
  allMembersShown: 'All members visible',
  membersSummary: '{{total}} + {{top}}',
  accumulatedSummary: 'Accumulated: {{hours}}',
  periodSummary: 'In period: {{hours}}',
  actions: {
    showAll: 'All',
    hideAll: 'Hide',
  },
});
Object.assign(translations.ru.projects.analytics.tooltip, {
  cumulativeSuffix: '(нарастающим итогом)',
  dailySuffix: '(за день)',
});
Object.assign(translations.en.projects.analytics.tooltip, {
  cumulativeSuffix: '(cumulative)',
  dailySuffix: '(daily)',
});

translations.ru.updates = {
  projectBudget: {
    title: 'Ставки и бюджет проекта',
    intro: 'Логирование часов теперь учитывает почасовые ставки и лимиты проекта.',
    whatChanged: 'Что изменилось',
    rateAccounting: 'Часы оцениваются по ставке, действующей на дату записи, и сравниваются с лимитом ФОТ.',
    financialAccess: 'Администратор видит сводный бюджет всех проектов, руководитель — своего проекта.',
    privacy: 'Показываются только агрегированные данные без персональных ставок и затрат участников.',
    openFromCard: 'Аналитика открывается кликом по карточке проекта на странице «Проекты».',
    previewTitle: 'Обновлённая карточка проекта',
    previewAlt: 'Карточка проекта со сводными показателями бюджета и графиком накопленной стоимости ФОТ',
  },
};
translations.en.updates = {
  projectBudget: {
    title: 'Project rates and budget',
    intro: 'Logged hours now take hourly rates and project limits into account.',
    whatChanged: 'What changed',
    rateAccounting: 'Hours are valued at the rate effective on the entry date and compared with the payroll limit.',
    financialAccess: 'Administrators see budget summaries for all projects; managers see their own projects.',
    privacy: 'Only aggregated data are shown, without personal rates or individual participant costs.',
    openFromCard: 'Open analytics by clicking a project card on the Projects page.',
    previewTitle: 'Updated project card',
    previewAlt: 'Project card with aggregated budget metrics and a cumulative payroll cost chart',
  },
};
