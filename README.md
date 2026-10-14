# Actionkeeper

A time tracking application to help users monitor and manage their activities efficiently.

## Features

- Create and manage projects
- Log time entries for projects
- View time entries in a table format
- Modern and responsive UI

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Environment Variables

- `PORT`: (optional) The port your server will listen on. Defaults to 3001 if not set.
- `DB_PATH`: (optional) Path to the SQLite database file. Defaults to `./data/time_tracker.db` if not set.
- `APP_BASE_URL`: (optional) The base URL for links in emails. Defaults to `http://localhost:3000`.
- `APP_DOMAIN`: Public domain used by Caddy for the production site. Defaults to `actionlog.ru` in the bundled Caddy config if not set.
- `ACME_EMAIL`: Email used by the reverse proxy (Caddy) to request TLS certificates from Let's Encrypt.
- SMTP settings (can be provided via environment variables for initial/bootstrap configuration):
  - `SMTP_HOST`: SMTP server hostname
  - `SMTP_PORT`: SMTP server port (e.g. 587)
  - `SMTP_USER`: SMTP username
  - `SMTP_PASS`: SMTP password
  - `SMTP_FROM`: From email address
  - `SMTP_SECURE`: Set to `true` for SSL/TLS, `false` otherwise

### Example .env file

```env
PORT=3001
DB_PATH=./data/time_tracker.db
APP_BASE_URL=https://actionlog.ru
APP_DOMAIN=actionlog.ru
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASS=your_password
SMTP_FROM=your@email.com
SMTP_SECURE=false
ACME_EMAIL=admin@example.com
```

Copy `.env.example` to `.env` for local development or a fresh server install, then replace the placeholder values with your own.

## SMTP Settings

- SMTP can be bootstrapped from `.env` via `SMTP_*` variables.
- Admin changes from the in-app SMTP settings page are saved to `data/smtp_settings.json`, which has priority over `.env` and survives Docker restarts through the `./data` volume.
- Do not commit real credentials to version control. `data/` and `.env` are deployment-local and ignored by git.

## Local Development Setup

1. Clone the repository and install backend dependencies:
   ```sh
   npm install
   ```
2. Install frontend dependencies:
   ```sh
   cd client
   npm install
   cd ..
   ```
3. Create a local `.env` file from the example:
   ```sh
   cp .env.example .env
   # Edit .env with your local or server-specific values
   ```
4. Set environment variables as needed (see above). For local development, keep:
   ```env
   PORT=3001
   DB_PATH=./data/time_tracker.db
   APP_BASE_URL=http://localhost:3000
   APP_DOMAIN=localhost
   NODE_ENV=development
   ```

## Running the Application Locally

Start the backend server from the repository root:
   ```bash
   npm start
   ```

It listens on `http://localhost:3001`.

In a new terminal, start the frontend development server:
   ```bash
   cd client
   npm start
   ```

Open `http://localhost:3000` in your browser. The React development server proxies API requests to `http://localhost:3001` via `client/package.json`.

In development, use port `3000` for all browser navigation. Non-API requests sent to the backend on port `3001` are redirected to `APP_BASE_URL`, and local magic links use that same frontend URL. This prevents the backend from serving a stale production build from `client/build` during local development.

Note: `npm run dev` starts the backend through `nodemon`. If `nodemon` fails on Windows with `spawn EPERM`, use `npm start` for the backend during local development.

## Project Structure

- `server.js` - Backend server with Express and SQLite
- `client/` - React frontend application
  - `src/components/` - Reusable React components
  - `src/pages/` - Main application pages
- `emailTemplates/` - Handlebars templates for emails

## API Endpoints

- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create a new project
- `GET /api/time-entries` - Get all time entries
- `POST /api/time-entries` - Create a new time entry

## License

This project is currently unlicensed. You may add a license of your choice.

## Running with Docker Compose

1. **Prerequisites:**
   - Docker and Docker Compose installed
   - Create and configure your local `.env` file in the project root from `.env.example` (see Environment Variables section above)
   - Point your domain's DNS A/AAAA records to the server running the stack (e.g. `actionlog.ru -> 185.244.218.82`).
   - Set `APP_DOMAIN` to the host name that should answer HTTPS traffic for this specific deployment.

2. **Start the stack:**
   ```sh
   docker compose pull
   docker compose up -d --remove-orphans
   ```

3. **Access the app:**
   - Application (served via Caddy; if another service already uses 443, configure its fallback to forward SNI for your `APP_DOMAIN` to this stack): open `https://<your-app-domain>`
   - API requests are automatically proxied by Caddy under the `/api` path.

4. **Database Persistence:**
   - The SQLite database file is stored in the `./data` directory on your host for persistence.

5. **Stopping the app:**
   ```sh
   docker compose down
   ```

6. **Rebuilding after code changes:**
   ```sh
   docker compose pull
   docker compose up -d --remove-orphans
   ```

## Installing Another Production Copy

1. Point the new domain to the new server before requesting certificates.
2. Run `./install.sh` on the target server.
3. Enter the new public URL when prompted; the installer will:
   - save the full URL to `APP_BASE_URL`
   - extract the host name into `APP_DOMAIN`
   - write both values into `.env`
4. Start the stack with Docker Compose.

For the existing production server, keep:

```env
APP_BASE_URL=https://actionlog.ru
APP_DOMAIN=actionlog.ru
```

This keeps the currently deployed instance behavior unchanged while allowing new servers to use a different domain from the same repository.

## Deployment Safety

- `.env` and `data/smtp_settings.json` are deployment-local files and should not be committed to git.
- The production deploy workflow preserves `.env`; runtime SMTP settings remain in the persistent `data/` directory.
- Before starting the new backend image, the GitHub Actions deploy workflow creates a SQLite online backup named `time_tracker.predeploy.<UTC timestamp>.db` in the persistent database directory. It retains the backup and checks the backend endpoint after startup.
- For a new server, run `./install.sh` to generate `.env`; later SMTP changes can be made from the admin settings page.



## Departments and project visibility

Administrators manage the department directory at `/departments` and assign each employee one department. Creating or inviting an employee requires an explicit department selection. The system department “Без подразделения” remains selectable and cannot be renamed.

Administrators and the assigned project manager choose one or more departments for a project. Employees see their department's projects and projects they manage in the catalog; managing a project does not grant permission to log new time against it. The time-entry picker uses the selected employee's department. Administrators retain the ability to correct any employee's entries.

After an employee transfers or project access changes, their saved time remains visible and editable, including deletion. Empty days and new records require current project access. Company analytics, client records and settings retain their existing access rules.

- `GET /api/departments`: department directory for authenticated users.
- `POST /api/departments`, `PATCH /api/departments/:id`: administrator-only create/edit with `{ name, short_name, manager_user_id }`; both names are required on creation and the manager is nullable.
- `DELETE /api/departments/:id`: administrator-only transactional removal, reassignment of employees and cleanup of project access.
- User creation, invitations and administrator updates use numeric `department_id`.
- Project creation and authorized updates accept a nonempty numeric `departmentIds` array; responses include `departments`.
- `GET /api/projects?purpose=time-entry&user_id=<id>`: projects available for that employee. Only administrators may select another employee.
- Session status includes current `user` data. Authorization reads current database membership and role, rather than stale JWT claims.

### Deploying the department migration

Before starting the updated server against an existing database, stop the application and make a backup of the SQLite file specified by `DB_PATH`. Keep the backup until deployment verification is complete. The server runs `departments_v1` transactionally once: it assigns every existing user (including invited/deleted users) and every existing project to “Без подразделения”. Subsequent starts preserve all assignments. New departments receive project access only when an administrator or manager explicitly selects them.

Validate deployment by assigning two test employees to different departments, opening one shared project to both, and confirming each time-entry picker and historical corrections. If restoring a backup is necessary, stop the application before restoring the database and the previous application version together.

### Управление подразделениями

Администратор открывает «Подразделения» в меню по нажатию на своё имя.
Полное и краткое наименования обязательны и уникальны без учёта регистра и пробелов по краям (до 120 символов).
Руководитель выбирается из действующих пользователей, назначение необязательно и не добавляет прав.
При удалении подразделения сотрудники, включая приглашённых и удалённых, переходят в «Без подразделения».
Связи с проектами удаляются; только проекты без других подразделений назначаются «Без подразделения». История времени сохраняется.
Системное подразделение нельзя редактировать или удалять. Миграция `departments_v2` сохраняет существующие назначения.

Карточки проектов показывают краткие наименования подразделений; полные названия доступны в подсказках.
«Без подразделения» выбирается отдельно от обычных подразделений. Миграция `project_departments_exclusive_unassigned` снимает системное назначение с проектов, у которых уже есть обычные подразделения.

В секции «О проекте» поле «Подразделение» поддерживает множественный выбор с чекбоксами.
Чипы имеют стабильный цвет по ID подразделения; системное подразделение отображается серым.
Изменения существующего проекта сохраняются одним запросом при закрытии списка. При ошибке черновик остаётся доступным для повтора или отмены; пустой выбор не сохраняется.

### Ответственное подразделение и права руководителей

Миграция `project_governance_v1` добавляет ответственное подразделение и автора проекта. Старым проектам с единственным подразделением назначается оно; при нескольких требуется выбор администратором. Автор старых проектов не восстанавливается предположениями.
Администраторы и действующие руководители подразделений могут создавать проекты и задавать первоначальный бюджет. Ответственное подразделение обязательно, руководитель проекта необязателен. При создании проекта кандидаты доступны из всех подразделений: только действующие, не приглашённые и не удалённые сотрудники. Смена руководителя существующего проекта доступна только администратору.
Текущий руководитель ответственного подразделения рассматривает запросы бюджета, включая собственные. Прямое изменение действующего бюджета и административные действия остаются доступными администраторам.
Передать ответственность может администратор или создатель, пока он руководит хотя бы одним подразделением. Передача открывает доступ новому подразделению и переключает полномочия рассмотрения незавершённых запросов без изменения руководителя проекта и бюджета.
«Без подразделения» несовместимо с обычными назначениями. При передаче в системное подразделение, в том числе при удалении ответственного подразделения, обычные назначения снимаются; утверждение выполняет администратор.
Создание принимает `responsibleDepartmentId`, `managerUserId`, `budget`, `budgetReason` в `POST /api/projects`. Кандидаты доступны через `GET /api/projects/creation-options`; передача — `POST /api/projects/:id/transfer-responsibility` с `departmentId`; история — `GET /api/projects/:id/responsibility-history`.
Перед запуском обновлённого сервера сделайте резервную копию базы. Уведомления отправляются после коммита; отказ доставки не отменяет создание или передачу.

Миграция `project_responsibility_notifications_v1` расширяет типы уведомлений о передаче ответственности, сохраняя существующие уведомления и индексы.

### История подразделений и часы по дате работы

Миграция `department_history_v1` сохраняет текущие назначения с даты миграции, а существующие часы относит к системному подразделению с отметкой неизвестной прежней принадлежности. Часы, проекты и описания сохраняются; старые переводы восстанавливаются администратором вручную.
История переводов доступна на странице пользователей. Изменение требует даты начала и подтверждения периода и количества пересчитываемых записей. Будущие назначения применяются по дате Europe/Moscow; исходное назначение не удаляется.
Подразделения архивируются вместо удаления: исторические назначения и часы остаются, текущие и будущие назначения архивируемого подразделения заменяются системным. Доступность и ответственность проектов обрабатываются по существующим правилам.
Меню сотрудников на главной и в аналитике учитывают историческую принадлежность. Руководители работают только с днями и записями управляемых подразделений; нормы недели делятся по дням принадлежности. Административные и финансовые права не расширяются.
Варианты выбора: `GET /api/user-selection` с `purpose`, `startDate`, `endDate`. Доступ по дням: `GET /api/time-entry-permissions` с `user_id`, `startDate`, `endDate`. История и предварительный пересчёт: `/api/admin/users/:userId/department-history` и `/preview`. Аналитика принимает `departmentId`; временные записи фильтруются по сохранённой принадлежности, а новые записи проверяют доступ проекта на дату работы.

Статус подразделения меняется администратором через `PATCH /api/departments/:id` с `status: active` или `status: archived`. Изменение на архивный выполняет существующую обработку сотрудников и проектов одной транзакцией вместе с редактированием полей. Восстановление снимает архивный статус и возвращает подразделение в рабочие списки, не восстанавливая автоматически прежние назначения сотрудников или связи проектов. Архивные подразделения можно редактировать; системное подразделение защищено от изменения.

Для руководителя без административной роли «Аналитика» начинает работу с первым активным управляемым подразделением в порядке меню, в режиме всех сотрудников. Выбор определяется актуальным каталогом; до его загрузки показывается индикатор, при ошибке доступен повтор. Администраторы и обычные сотрудники сохраняют общий командный обзор. Ручной выбор не сбрасывается при обновлении каталога, периода или языка.
Новые сценарии используют RU/EN-каталоги интерфейса, отдельные коды ошибок `department_history.*` и локализованное форматирование отображаемых дат и чисел. Даты API остаются в ISO; даты переводов определяются по Europe/Moscow. Язык интерфейса берётся из `localStorage.locale`, язык писем — из настроек получателя.
