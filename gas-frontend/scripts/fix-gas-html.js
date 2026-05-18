/**
 * Post-build script: loại bỏ type="module" và crossorigin khỏi HTML
 * để tương thích với Google Apps Script runtime
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, '..', 'dist', 'index.html');

let html = readFileSync(htmlPath, 'utf-8');

// Loại bỏ type="module" - GAS không hỗ trợ ES modules
html = html.replace(/ type="module"/g, '');

// Loại bỏ crossorigin - không cần trong GAS
html = html.replace(/ crossorigin/g, '');

writeFileSync(htmlPath, html, 'utf-8');
console.log('✅ Fixed HTML for GAS compatibility (removed type="module" and crossorigin)');
