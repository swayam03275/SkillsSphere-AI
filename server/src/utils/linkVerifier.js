import axios from "axios";
import dns from "dns/promises";
import ipaddr from "ipaddr.js";

// Function to check if an IP is private/local
const isPrivateIP = (ip) => {
  try {
    const parsedIp = ipaddr.parse(ip);
    const range = parsedIp.range();
    return [
      "unspecified", "broadcast", "multicast", "linkLocal", 
      "loopback", "private", "reserved"
    ].includes(range);
  } catch (err) {
    return false; // Invalid IP format
  }
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
    const hostname = parsedUrl.hostname;

    // Check if hostname is directly an IP and private
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) && isPrivateIP(hostname)) {
      return { url, isValid: false, status: 403, error: "Access to private IP is forbidden" };
    }

    // Resolve DNS to prevent SSRF via DNS rebinding / internal routing
    try {
      const { address } = await dns.lookup(hostname);
      if (isPrivateIP(address)) {
        return { url, isValid: false, status: 403, error: "Access to private IP is forbidden" };
      }
    } catch (dnsError) {
      // If DNS resolution fails, block the request if it looks suspicious, 
      // otherwise we could just let Axios fail naturally.
      if (hostname === "localhost" || hostname.includes("127.0.0.1") || hostname.includes("169.254.169.254")) {
         return { url, isValid: false, status: 403, error: "Access to private IP is forbidden" };
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
