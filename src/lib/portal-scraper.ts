import { propertyGuruScraper, type PropertyGuruListing } from './propertyguru-scraper';
import { ninetyNineCoScraper } from './ninetynineco-scraper';

export type PortalListing = PropertyGuruListing;

export function detectPortal(url: string): 'propertyguru' | '99co' | 'unknown' {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes('propertyguru')) return 'propertyguru';
    if (host.includes('99.co')) return '99co';
    return 'unknown';
  } catch {
    const s = (url || '').toLowerCase();
    if (s.includes('propertyguru')) return 'propertyguru';
    if (s.includes('99.co')) return '99co';
    return 'unknown';
  }
}

export async function scrapePortalProperty(url: string): Promise<PortalListing | null> {
  const portal = detectPortal(url);
  if (portal === '99co') return ninetyNineCoScraper.scrapeProperty(url);
  // Default to PropertyGuru for now
  return propertyGuruScraper.scrapeProperty(url);
}




