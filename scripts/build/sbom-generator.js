const fs = require('fs');
const path = require('path');
const { canonicalJson, packageNameFromNodeModulesPath, scanInstalledPackages, sha256File, sha256Hex } = require('./integrity-utils');

function purlName(name) { return name.startsWith('@') ? `%40${name.slice(1)}` : encodeURIComponent(name); }

function generateSbomInventories(repoDir, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const lock = JSON.parse(fs.readFileSync(path.join(repoDir, 'package-lock.json'), 'utf8'));
  const resolved = Object.entries(lock.packages || {}).filter(([packagePath]) => packagePath).map(([packagePath, meta]) => {
    const name = packageNameFromNodeModulesPath(packagePath);
    return { name, version: meta.version, purl: `pkg:npm/${purlName(name)}@${meta.version}`, resolved: meta.resolved || null, integrity: meta.integrity || null, dev: meta.dev === true, peer: meta.peer === true };
  }).sort((left, right) => left.purl.localeCompare(right.purl));
  const installed = scanInstalledPackages(repoDir).map(pkg => ({ ...pkg, purl: `pkg:npm/${purlName(pkg.name)}@${pkg.version}` }));
  const installedNames = new Set(installed.map(pkg => pkg.name));
  const omittedPeers = resolved.filter(pkg => pkg.peer && !installedNames.has(pkg.name));
  const buildInfoDir = path.join(repoDir, 'artifacts', 'build-info');
  const buildInfoPath = fs.readdirSync(buildInfoDir).filter(file => file.endsWith('.json')).sort()[0];
  if (!buildInfoPath) throw new Error('Build info is required to generate the Solidity import graph');
  const buildInfo = JSON.parse(fs.readFileSync(path.join(buildInfoDir, buildInfoPath), 'utf8'));
  const importGraph = Object.keys(buildInfo.input.sources || {}).sort().map(sourcePath => ({ sourcePath, origin: sourcePath.startsWith('@layerzerolabs/') ? 'LAYERZERO_OFFICIAL' : sourcePath.startsWith('@openzeppelin/') ? 'OPENZEPPELIN_OFFICIAL' : 'PROJECT_LOCAL' }));
  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: { tools: [{ vendor: 'Axodus Governance', name: 'neurons-sbom-generator', version: '1.0.0' }], component: { type: 'library', name: '@axodus/neurons-canonical', version: '0.1.0' } },
    components: installed.map(pkg => ({ type: 'library', name: pkg.name, version: pkg.version, purl: pkg.purl }))
  };
  const outputs = [['sbom.cyclonedx.json', sbom], ['resolved-inventory.json', resolved], ['installed-inventory.json', installed], ['omitted-peers-inventory.json', omittedPeers], ['solidity-import-graph.json', importGraph]];
  const result = { installedPackageCount: installed.length, resolvedPackageCount: resolved.length, omittedPeersCount: omittedPeers.length, importGraphCount: importGraph.length };
  for (const [file, content] of outputs) {
    const outputPath = path.join(outputDir, file);
    fs.writeFileSync(outputPath, `${JSON.stringify(content, null, 2)}\n`);
    result[file] = { path: outputPath, sha256: sha256File(outputPath) };
  }
  result.inventory_fingerprint = sha256Hex(canonicalJson({ installed, resolved, omittedPeers, importGraph }));
  return result;
}

if (require.main === module) {
  try { console.log(JSON.stringify({ status: 'SUCCESS', details: generateSbomInventories(path.resolve(__dirname, '../..'), path.resolve(__dirname, '../../artifacts/build-manifest')) }, null, 2)); }
  catch (error) { console.error(JSON.stringify({ status: 'FAILED', error: error.message }, null, 2)); process.exit(1); }
}

module.exports = { generateSbomInventories };
