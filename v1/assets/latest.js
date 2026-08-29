/**
 * Keeps download buttons pointing at the current release.
 *
 * Progressive enhancement on purpose: the HTML ships with a real, working
 * link and a real version number, and this only overwrites them once the API
 * has actually answered. If the request fails, or JavaScript never runs, the
 * page still offers a download that works -- just an older one.
 *
 * Markup contract:
 *   <a href="..." data-latest="voidtune">Download v0.8.17</a>
 *   <span data-latest="voidtune" data-latest-field="version"></span>
 *
 * data-latest        repo key: voidtune | one-click | v-agent
 * data-latest-asset  substring/extension of the wanted asset, e.g. "zip" or
 *                    "msi". Without it the link gets the primary asset (the
 *                    installer), which is what a bare "Download" should be.
 * data-latest-field  which value to write as the element's text:
 *                    version | size | kind | filename
 *                    (omit on an <a> to update only its href)
 * data-latest-tpl    text template for an <a>, e.g. "Download {version}"
 */
(function () {
  'use strict';

  var nodes = document.querySelectorAll('[data-latest]');
  if (!nodes.length || !window.fetch) return;

  // One request per repo, no matter how many elements reference it.
  var repos = {};
  nodes.forEach(function (node) {
    var key = node.getAttribute('data-latest');
    (repos[key] = repos[key] || []).push(node);
  });

  Object.keys(repos).forEach(function (key) {
    fetch('/api/latest?repo=' + encodeURIComponent(key))
      .then(function (response) {
        if (!response.ok) throw new Error('api ' + response.status);
        return response.json();
      })
      .then(function (data) {
        if (!data || !data.version) return;
        repos[key].forEach(function (node) {
          var field = node.getAttribute('data-latest-field');
          var template = node.getAttribute('data-latest-tpl');
          var wanted = node.getAttribute('data-latest-asset');
          var asset = null;

          if (wanted) {
            // A link that names an asset must get that asset or stay exactly
            // as the HTML shipped it. Falling back to the default download
            // here pointed a "portable .zip" link at the installer.
            if (!data.assets) return;
            for (var i = 0; i < data.assets.length; i++) {
              if (data.assets[i].name.toLowerCase().indexOf(wanted.toLowerCase()) !== -1) {
                asset = data.assets[i];
                break;
              }
            }
            if (!asset) return;
          }

          // Per-element values. `data` is shared by every node for this repo,
          // so merging the chosen asset into it would leak that asset into the
          // next element -- which turned the installer button into a second
          // copy of the portable download.
          var values = data;
          if (asset) {
            values = { version: data.version, releases: data.releases };
            values.url = asset.url;
            values.filename = asset.name;
            values.size = asset.size;
            values.kind = asset.kind;
          }

          if (node.tagName === 'A' && values.url) node.setAttribute('href', values.url);

          if (field && values[field]) {
            node.textContent = values[field];
          } else if (template) {
            node.textContent = template.replace(/\{(\w+)\}/g, function (whole, name) {
              return values[name] != null ? values[name] : whole;
            });
          }
          node.setAttribute('data-latest-loaded', '');
        });
      })
      .catch(function () {
        /* Keep whatever the HTML shipped with. */
      });
  });
})();
