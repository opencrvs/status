// pg's connection-string parser now enforces full certificate verification
// for sslmode=require|prefer|verify-ca (previously an alias for "encrypt but
// don't verify"), and that setting takes precedence over an explicit `ssl`
// option passed alongside `connectionString`. Supabase's connection strings
// carry a self-signed-looking chain that fails that verification, so we strip
// `sslmode` here and let the caller's explicit `ssl` option (e.g.
// `{ rejectUnauthorized: false }`) take effect instead.
export function withoutSslMode(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete("sslmode");
  return parsed.toString();
}
