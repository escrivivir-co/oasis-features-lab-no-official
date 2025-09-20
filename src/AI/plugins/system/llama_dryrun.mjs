// Simple dry-run initializer to verify node-llama-cpp binaries without building
import { getLlama, getLlamaGpuTypes, getModuleVersion } from 'node-llama-cpp';

function log(title, value) {
  const pad = 12;
  console.log(`${title.padEnd(pad)}:`, value);
}

async function runDryRun(title, llamaOptions) {
  process.stdout.write(`\n➤ ${title} ... `);
  try {
    // dryRun implies build: "never" and skipDownload: true internally
    await getLlama({
      logLevel: 'warn',
      usePrebuiltBinaries: true,
      progressLogs: false,
      ...llamaOptions,
      build: 'never',
      dryRun: true,
    });
    console.log('OK');
    return true;
  } catch (e) {
    console.log('FAIL');
    console.error('   →', e?.message || e);
    return false;
  }
}

async function main() {
  console.log('Node Llama CPP - Dry Run Diagnostic');
  console.log('='.repeat(48));

  try {
    const version = await getModuleVersion?.();
    if (version) log('module', `node-llama-cpp v${version}`);
  } catch {}

  try {
    const gpuTypes = await getLlamaGpuTypes();
    log('gpu types', Array.isArray(gpuTypes) && gpuTypes.length ? gpuTypes.join(', ') : 'none');
  } catch (e) {
    log('gpu types', `error: ${e?.message || e}`);
  }

  const results = [];
  // GPU auto (CUDA/Vulkan as available)
  results.push(await runDryRun('GPU auto', { gpu: 'auto', vramPadding: 256 }));
  // Force CPU
  results.push(await runDryRun('CPU only', { gpu: false }));
  // Optional: explicit CUDA when available
  try {
    const types = await getLlamaGpuTypes();
    if (Array.isArray(types) && types.includes('cuda')) {
      results.push(await runDryRun('GPU cuda', { gpu: 'cuda' }));
    }
  } catch {}

  const ok = results.every(Boolean);
  console.log('\nSummary:', ok ? '✅ All dry-run checks passed' : '❌ Some dry-run checks failed');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error('Unexpected error:', e?.message || e);
  process.exit(1);
});
