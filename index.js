const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

function resolveConfigPath(arg) {
  if (!arg) return null;
  if (fs.existsSync(arg)) return arg;
  if (fs.existsSync(`${arg}.json`)) return `${arg}.json`;
  const inConfigsFolder = path.join('configs', arg.endsWith('.json') ? arg : `${arg}.json`);
  if (fs.existsSync(inConfigsFolder)) return inConfigsFolder;
  return null;
}

async function main() {
  const configArg = process.argv[2];

  if (!configArg || configArg === '-h' || configArg === '--help') {
    console.log(`
Использование:
  node index.js <имя_конфига>

Примеры:
  node index.js chemistry_7
  node index.js physics_7
        `);
    return;
  }

  const configPath = resolveConfigPath(configArg);
  if (!configPath) {
    console.error(`❌ Ошибка: конфиг "${configArg}" не найден в папке configs/`);
    return;
  }

  console.log(`\n📄 Загружен конфиг: ${configPath}`);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const { input, output, sections, offset = 0 } = config;

  if (!input || !fs.existsSync(input)) {
    console.error(`❌ Ошибка: исходный PDF файл не найден по пути -> ${input}`);
    return;
  }

  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    console.error(`❌ Ошибка: список sections пуст в ${configPath}`);
    return;
  }

  const outputDir = output || path.join('output', path.basename(configPath, '.json'));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`📖 Читаем файл: ${input}`);
  const pdfBytes = fs.readFileSync(input);
  const srcDoc = await PDFDocument.load(pdfBytes);
  const totalPages = srcDoc.getPageCount();

  console.log(`📊 Всего страниц в PDF: ${totalPages}`);
  console.log(`⚙ Смещение страниц (offset): +${offset}`);
  console.log(`📁 Папка назначения: ${path.resolve(outputDir)}\n`);

  for (const item of sections) {
    const { name, start: bookStart, end: bookEnd } = item;

    // Реальные страницы в PDF с учетом смещения
    const pdfStart = bookStart + offset;
    const pdfEnd = bookEnd + offset;

    if (pdfStart < 1 || pdfEnd > totalPages || pdfStart > pdfEnd) {
      console.warn(`⚠ Пропуск "${name}": некорректные страницы (книга: ${bookStart}–${bookEnd}, PDF: ${pdfStart}–${pdfEnd})`);
      continue;
    }

    const newDoc = await PDFDocument.create();
    const pageIndices = [];
    for (let p = pdfStart - 1; p < pdfEnd; p++) {
      pageIndices.push(p);
    }

    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach(p => newDoc.addPage(p));

    const cleanName = name.replace(/[/\\?%*:|"<>]/g, '_');
    const outputPath = path.join(outputDir, `${cleanName}.pdf`);

    const newPdfBytes = await newDoc.save();
    fs.writeFileSync(outputPath, newPdfBytes);

    console.log(`✔ [OK] ${cleanName}.pdf (в книге: стр. ${bookStart}–${bookEnd} | в PDF: стр. ${pdfStart}–${pdfEnd})`);
  }

  console.log(`\n🎉 Готово! Все файлы сохранены в папку: ${path.resolve(outputDir)}`);
}

main().catch(err => {
  console.error('❌ Критическая ошибка:', err);
});