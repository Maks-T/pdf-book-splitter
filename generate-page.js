const fs = require('fs');
const path = require('path');

const CONFIGS_DIR = path.join(__dirname, 'configs');
const OUTPUT_DIR = path.join(__dirname, 'output');

// Понятные названия учебников для интерфейса
const BOOK_TITLES = {
  algebra_7: 'Алгебра 7 класс',
  algebra_conspect_7: 'Алгебра 7 класс (Опорные конспекты)',
  bel_lit_7: 'Беларуская літаратура 7 клас',
  biology_7: 'Биология 7 класс',
  chemistry_7: 'Химия 7 класс',
  english_7: 'English 7 (Английский язык)',
  geometry_7: 'Геометрия 7 класс',
  geometry_conspect_7: 'Геометрия 7 класс (Опорные конспекты)',
  history_bel_7: 'История Беларуси 7 класс',
  math_conspect_6: 'Математика 6 класс (Опорные конспекты)',
  physics_7: 'Физика 7 класс',
  rus_7: 'Русский язык 7 класс',
  rus_lit_7_1: 'Русская литература 7 класс (Часть 1)',
  world_history_7: 'Всемирная история 7 класс'
};

// Чтение всех конфигов
const configFiles = fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json'));

const booksData = [];

for (const file of configFiles) {
  const bookId = path.basename(file, '.json');
  const config = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, file), 'utf-8'));

  const sections = (config.sections || []).map(sec => {
    // Очищенное имя файла такое же, как генерирует index.js
    const cleanName = sec.name.replace(/[/\\?%*:|"<>]/g, '_');
    const pdfPath = `output/${bookId}/${cleanName}.pdf`;

    // Человекочитаемое название темы
    let title = sec.name.replace(/_/g, ' ');
    // Убираем префикс вида "01 (03-03) " для красивого отображения названия темы
    title = title.replace(/^\d{2,}\s*\(\d+-\d+\)\s*/, '');

    return {
      rawName: cleanName,
      title: title,
      start: sec.start,
      end: sec.end,
      pdfPath: pdfPath
    };
  });

  booksData.push({
    id: bookId,
    title: BOOK_TITLES[bookId] || bookId.replace(/_/g, ' ').toUpperCase(),
    sectionsCount: sections.length,
    sections: sections
  });
}

// Сортируем книги по названию
booksData.sort((a, b) => a.title.localeCompare(b.title, 'ru'));

// HTML-шаблон
const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Электронная библиотека учебников и параграфов</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
    .custom-scroll::-webkit-scrollbar { width: 6px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col">

  <!-- Шапка -->
  <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
          <i class="fa-solid fa-book-open"></i>
        </div>
        <div>
          <h1 class="text-lg font-bold leading-tight text-slate-900">Учебные материалы по параграфам</h1>
          <p class="text-xs text-slate-500">6–7 классы • Онлайн-просмотр и скачивание</p>
        </div>
      </div>

      <!-- Поиск -->
      <div class="relative flex-1 max-w-md min-w-[240px]">
        <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-sm"></i>
        <input id="searchInput" type="text" placeholder="Поиск темы, параграфа или слова..." 
               class="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all">
      </div>
    </div>
  </header>

  <!-- Основная рабочая область -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full grid grid-cols-1 md:grid-cols-12 gap-6">

    <!-- Левая колонка: Список учебников -->
    <aside class="md:col-span-4 lg:col-span-3">
      <div class="bg-white rounded-xl border border-slate-200 p-3 sticky top-20 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 flex justify-between items-center">
          <span>Учебники</span>
          <span id="booksTotalBadge" class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px]">${booksData.length}</span>
        </div>
        <nav id="bookList" class="space-y-1 max-h-[calc(100vh-160px)] overflow-y-auto custom-scroll pr-1">
          ${booksData.map((b, idx) => `
            <button onclick="selectBook('${b.id}')" id="btn-${b.id}"
                    class="book-nav-btn w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${idx === 0 ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs' : 'text-slate-700 hover:bg-slate-100'}">
              <span class="truncate pr-2">${b.title}</span>
              <span class="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 group-hover:bg-slate-200">${b.sectionsCount}</span>
            </button>
          `).join('')}
        </nav>
      </div>
    </aside>

    <!-- Правая колонка: Параграфы выбранного учебника -->
    <main class="md:col-span-8 lg:col-span-9">
      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm min-h-[500px]">
        <div class="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
          <div>
            <h2 id="currentBookTitle" class="text-xl font-bold text-slate-900">${booksData[0]?.title || ''}</h2>
            <p id="currentBookSubtitle" class="text-xs text-slate-500 mt-0.5">Всего параграфов: ${booksData[0]?.sectionsCount || 0}</p>
          </div>
        </div>

        <!-- Контейнер со списком параграфов -->
        <div id="sectionsContainer" class="space-y-2.5"></div>
      </div>
    </main>
  </div>

  <!-- Модальное окно встроенного просмотра PDF -->
  <div id="viewerModal" class="fixed inset-0 bg-slate-950/70 z-50 hidden flex flex-col p-2 sm:p-4 backdrop-blur-xs">
    <div class="bg-white rounded-xl w-full h-full flex flex-col overflow-hidden shadow-2xl">
      <div class="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <span id="modalTitle" class="text-sm font-medium truncate pr-4">Просмотр PDF</span>
        <div class="flex items-center gap-2">
          <a id="modalDownloadBtn" href="#" download class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md transition-colors flex items-center gap-1.5">
            <i class="fa-solid fa-download"></i> Скачать
          </a>
          <button onclick="closeViewer()" class="w-8 h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      <iframe id="pdfFrame" class="w-full flex-1 border-0" src=""></iframe>
    </div>
  </div>

  <script>
    const BOOKS = ${JSON.stringify(booksData)};
    let activeBookId = BOOKS[0]?.id || '';

    function selectBook(bookId) {
      activeBookId = bookId;
      document.querySelectorAll('.book-nav-btn').forEach(btn => {
        btn.classList.remove('bg-blue-50', 'text-blue-700', 'font-semibold');
        btn.classList.add('text-slate-700');
      });
      const activeBtn = document.getElementById('btn-' + bookId);
      if (activeBtn) {
        activeBtn.classList.add('bg-blue-50', 'text-blue-700', 'font-semibold');
        activeBtn.classList.remove('text-slate-700');
      }

      const book = BOOKS.find(b => b.id === bookId);
      if (book) {
        document.getElementById('currentBookTitle').innerText = book.title;
        document.getElementById('currentBookSubtitle').innerText = 'Всего разделов: ' + book.sectionsCount;
        renderSections(book.sections);
      }
    }

    function renderSections(sections) {
      const container = document.getElementById('sectionsContainer');
      const searchVal = document.getElementById('searchInput').value.trim().toLowerCase();

      const filtered = sections.filter(sec => 
        sec.title.toLowerCase().includes(searchVal) || 
        (sec.start + '-' + sec.end).includes(searchVal)
      );

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="py-12 text-center text-slate-400">
            <i class="fa-regular fa-folder-open text-3xl mb-2"></i>
            <p class="text-sm">Ничего не найдено</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = filtered.map(sec => \`
        <div class="group border border-slate-200 hover:border-blue-300 hover:shadow-xs rounded-lg p-3 sm:p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white">
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <span class="inline-flex items-center text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700 whitespace-nowrap mt-0.5">
              стр. \${sec.start}\${sec.start !== sec.end ? '–' + sec.end : ''}
            </span>
            <span class="text-sm font-medium text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">
              \${sec.title}
            </span>
          </div>

          <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button onclick="openViewer('\${sec.pdfPath}', '\${sec.title.replace(/'/g, "\\\\'")}')"
                    class="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-eye text-xs"></i> Открыть
            </button>
            <a href="\${sec.pdfPath}" download
               class="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5">
              <i class="fa-solid fa-download text-xs"></i> Скачать
            </a>
          </div>
        </div>
      \`).join('');
    }

    // Встроенный просмотрщик
    function openViewer(pdfUrl, title) {
      document.getElementById('modalTitle').innerText = title;
      document.getElementById('modalDownloadBtn').href = pdfUrl;
      document.getElementById('pdfFrame').src = pdfUrl;
      document.getElementById('viewerModal').classList.remove('hidden');
    }

    function closeViewer() {
      document.getElementById('viewerModal').classList.add('hidden');
      document.getElementById('pdfFrame').src = '';
    }

    // Поиск
    document.getElementById('searchInput').addEventListener('input', () => {
      const book = BOOKS.find(b => b.id === activeBookId);
      if (book) renderSections(book.sections);
    });

    // Закрытие модального окна по Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeViewer();
    });

    // Инициализация
    selectBook(activeBookId);
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'index.html'), htmlContent, 'utf-8');
console.log('✅ Успешно сгенерирован файл index.html!');