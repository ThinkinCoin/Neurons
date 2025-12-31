import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

async function exists(path) {
	try {
		await import("node:fs/promises").then((m) => m.stat(path));
		return true;
	} catch {
		return false;
	}
}

async function main() {
	const src = resolve(process.cwd(), "..", "coverage");
	const dest = resolve(process.cwd(), "public", "coverage");

	if (!(await exists(src))) {
		console.warn(
			"[sync-coverage] Pasta ../coverage não encontrada; pulando cópia (ok em builds sem coverage gerado).",
		);
		return;
	}

	await mkdir(resolve(process.cwd(), "public"), { recursive: true });
	await rm(dest, { recursive: true, force: true });
	await mkdir(dest, { recursive: true });
	await cp(src, dest, { recursive: true });

	console.log(`[sync-coverage] Copiado: ${src} -> ${dest}`);
}

main().catch((err) => {
	console.error("[sync-coverage] Falhou:", err);
	process.exitCode = 1;
});
