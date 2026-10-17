// Mock for node-sword-interface — replaces the native C++ SWORD binding
// in test environments so tests can run without compiled binaries or
// actual Bible module data files present.
export default class NodeSwordInterface {
  getLocalModules() {
    return [];
  }

  getAllLocalModules() {
    return [];
  }

  enableMarkup() {}

  disableMarkup() {}

  getBookText(_module, _book) {
    return [];
  }

  getChapterText(_module, _book, _chapter) {
    return [];
  }

  getVerseText(_module, _ref) {
    return '';
  }

  getBibleText(_module) {
    return [];
  }

  searchBible(_module, _term, _type) {
    return [];
  }

  getModuleDescription(_module) {
    return 'Mock Module';
  }

  isModuleInUserDir(_module) {
    return false;
  }

  getStrongsEntry(_key) {
    // The real SWORD binding throws for unknown keys rather than returning null.
    throw new Error(`Strong's entry not found: ${_key}`);
  }

  getDictModuleKeys(_module) {
    return [];
  }

  getDictModuleEntry(_module, _key) {
    return '';
  }

  installModule(_source, _module, cb) {
    if (typeof cb === 'function') cb();
  }

  uninstallModule(_module) {}

  reloadLocalModules() {}

  getSwordVersion() {
    return '1.9.0';
  }

  getRepoNames() {
    return [];
  }

  getModuleList(_repo, _type) {
    return [];
  }
}
