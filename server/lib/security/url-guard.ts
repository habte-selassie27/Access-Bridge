import dns from "node:dns/promises";
import net from "node:net";

/**
 * Guard against server-side request forgery.
 *
 * The import feature fetches a page the reader pastes in, so the server would
 * otherwise be an open proxy into its own network: 169.254.169.254 (cloud
 * metadata), 127.0.0.1 (the sandbox), RFC1918 ranges. Every address the
 * hostname resolves to is checked, not just the hostname text, because
 * "evil.example" is free to point at 127.0.0.1.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier grade NAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const value = ip.toLowerCase();
  if (value === "::1" || value === "::") return true;
  if (value.startsWith("fe80") || value.startsWith("fc") || value.startsWith("fd")) return true;
  // IPv4-mapped addresses (::ffff:127.0.0.1) must be checked as IPv4.
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // not an IP at all -> refuse
}

export interface SafeUrlResult {
  ok: boolean;
  url?: URL;
  reason?: string;
}

/** Parse and check the shape of a URL before any network call happens. */
export function parsePublicUrl(raw: unknown): SafeUrlResult {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, reason: "Enter a link." };
  }
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "That does not look like a link." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https links can be imported." };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "Links with credentials are not accepted." };
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return { ok: false, reason: "That address is not a public website." };
  }
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) {
      return { ok: false, reason: "That address is not a public website." };
    }
  }
  return { ok: true, url };
}

/** Resolve the hostname and make sure every address it points at is public. */
export async function resolvesToPublicAddress(host: string): Promise<boolean> {
  try {
    const addresses = await dns.lookup(host, { all: true });
    if (!addresses.length) return false;
    return addresses.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}
