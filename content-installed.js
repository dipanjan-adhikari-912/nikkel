(function() {
  document.documentElement.dataset.nikkelInstalled = 'true'
  document.dispatchEvent(new CustomEvent('nikkel:extension-ready', {
    detail: { version: chrome.runtime.getManifest().version }
  }))
})()
