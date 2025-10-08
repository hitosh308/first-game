export class Localization {
  constructor(defaultLang = "en") {
    this.lang = defaultLang;
    this.data = {};
  }

  async load(lang) {
    const response = await fetch(`./src/i18n/${lang}.json`);
    this.data = await response.json();
    this.lang = lang;
  }

  t(key, params = {}) {
    const template = this.data[key] || key;
    return template.replace(/\{(.*?)\}/g, (_, token) => params[token] ?? `{${token}}`);
  }
}
