import axios from "axios";
import dns from "dns";
import { URL } from "url";

const isPrivateIP = (ip) => {
  // IPv4 Private, Loopback, Link-Local ranges
  const parts = ip.split(".");
  if (parts.length === 4) {
    if (parts[0] === "10" || parts[0] === "127" || parts[0] === "0") return true;
    if (parts[0] === "172" && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === "192" && parts[1] === "168") return true;
    if (parts[0] === "169" && parts[1] === "254") return true; // Cloud Metadata
  }

  // IPv6 Private & Loopback
  if (ip === "::1") return true;
  if (ip.match(/^(f[cd][0-9a-f]{2}|fe80):/i)) return true;

  return false;
};

/**
 * Verifies if a URL is active and reachable.
 * @param {string} url - The URL to verify
 * @returns {Promise<{url: string, isValid: boolean, status: number|null}>}
 */
export const verifyLink = async (url) => {
  if (!url) return { url, isValid: false, status: null };

  try {
    const parsedUrl = new URL(url);

    // SSRF Protection: Resolve the hostname and block private/internal IPs
    const addresses = await dns.promises.resolve(parsedUrl.hostname).catch(() => []);
    
    // If we resolved it, check if any IP is private
    if (addresses.length > 0) {
      const hasPrivateIP = addresses.some(isPrivateIP);
      if (hasPrivateIP) {
        return { url, isValid: false, status: null, error: "Access to internal network is forbidden" };
      }
    } else {
      // If we couldn't resolve the hostname (could be an IP passed directly)
      // We check if the hostname itself is a private IP string
      if (isPrivateIP(parsedUrl.hostname)) {
        return { url, isValid: false, status: null, error: "Access to internal network is forbidden" };
      }
    }

    const response = await axios.get(url, {
      timeout: 5000,
      maxRedirects: 0, // SSRF Mitigation: Prevent attacker from returning a 302 redirect to a private IP
      validateStatus: (status) => status >= 200 && status < 400, // Treat redirects (3xx) as a valid reachable link
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      method: "GET", 
    });

    return {
      url,
      isValid: response.status >= 200 && response.status < 400,
      status: response.status,
    };
  } catch (error) {
    // Handle cases where the site exists but blocks automated GETs (like LinkedIn)
    // If it's a 403 or 429, we still consider it "potentially valid" if it's a known domain
    const isBotProtected = error.response && [403, 429, 999].includes(error.response.status);
    
    return {
      url,
      isValid: isBotProtected,
      status: error.response?.status || null,
      error: error.message
    };
  }
};

/**
 * Verifies multiple links in parallel.
 * @param {string[]} urls 
 */
export const verifyLinks = async (urls = []) => {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  const results = await Promise.all(uniqueUrls.map(url => verifyLink(url)));
  return results;
};
