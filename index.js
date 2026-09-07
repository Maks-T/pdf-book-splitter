const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

function resolveConfigPath(arg) {
  if (!arg) return null;

  // 1. Прямой путь (например, ./configs/physics_7.json)
  if (fs.existsSync(arg)) return arg;

  // 2. Имя без .json (например, configs/physics_7)
  if (fs.existsSync(`${arg}.json`)) return `${arg}.json`;

  // 3. Просто имя из папки configs (например, physics_7)
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
  node index.js physics_7
  node index.js configs/physics_7.json
        `);

    if (fs.existsSync('configs')) {
      const available = fs.readdirSync('configs').filter(f => f.endsWith('.json'));
      if (available.length > 0) {
        console.log('Доступные конфиги в папке configs/:');
        available.forEach(c => console.log(`  - ${c.replace('.json', '')}`));
      }
    }
    return;
  }

  const configPath = resolveConfigPath(configArg);

  if (!configPath) {
    console.error(`❌ Ошибка: конфиг "${configArg}" не найден в папке configs/`);
    return;
  }

  console.log(`\n Загружен конфиг: ${configPath}`);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const { input, output, sections } = config;

  if (!input || !fs.existsSync(input)) {
    console.error(`❌ Ошибка: исходный PDF файл не найден по пути -> ${input}`);
    return;
  }

  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    console.error(`❌ Ошибка: список параграфов (sections) пуст в ${configPath}`);
    return;
  }

  const outputDir = output || path.join('output', path.basename(configPath, '.json'));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(` Читаем файл: ${input}`);
  const pdfBytes = fs.readFileSync(input);
  const srcDoc = await PDFDocument.load(pdfBytes);
  const totalPages = srcDoc.getPageCount();

  console.log(` Всего страниц в книге: ${totalPages}`);
  console.log(` Папка назначения: ${path.resolve(outputDir)}\n`);

  for (const item of sections) {
    const { name, start, end } = item;

    if (!start || !end || start < 1 || end > totalPages || start > end) {
      console.warn(`⚠ Пропуск "${name}": некорректный диапазон страниц (${start}–${end})`);
      continue;
    }

    const newDoc = await PDFDocument.create();
    const pageIndices = [];
    for (let p = start - 1; p < end; p++) {
      pageIndices.push(p);
    }

    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach(p => newDoc.addPage(p));

    const cleanName = name.replace(/[/\\?%*:|"<>]/g, '_');
    const outputPath = path.join(outputDir, `${cleanName}.pdf`);

    const newPdfBytes = await newDoc.save();
    fs.writeFileSync(outputPath, newPdfBytes);

    console.log(`✔ [OK] ${cleanName}.pdf (стр. PDF ${start}–${end})`);
  }

  console.log(`\n🎉 Все параграфы успешно сохранены в папку: ${path.resolve(outputDir)}`);
}

main().catch(err => {
  console.error('❌ Критическая ошибка:', err);
});