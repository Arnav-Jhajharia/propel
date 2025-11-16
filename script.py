# save as crawl_site.py
# pip install aiohttp aiodns beautifulsoup4 yarl
import asyncio
import aiohttp
from aiohttp import ClientTimeout
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urldefrag, urlparse
import time
import urllib.robotparser

# Configuration
START_URL = "https://psacodesprint.com/"   # example start
MAX_PAGES = 500                  # safety cap
CONCURRENT_REQUESTS = 8
REQUEST_TIMEOUT = 15
DELAY_BETWEEN_REQUESTS = 0.5     # seconds per request (politeness)

# Helpers
def same_domain(u1, u2):
    return urlparse(u1).netloc == urlparse(u2).netloc

def normalize_link(base, href):
    if not href:
        return None
    href = href.strip()
    # ignore javascript/action links and anchors
    if href.startswith("javascript:") or href.startswith("mailto:") or href.startswith("tel:") or href.startswith("#"):
        return None
    joined = urljoin(base, href)
    # remove fragment (#...) and trailing index-like noise
    joined, _ = urldefrag(joined)
    # optionally, strip ?query if you want
    return joined

async def fetch(session, url):
    try:
        async with session.get(url, timeout=ClientTimeout(total=REQUEST_TIMEOUT)) as resp:
            # only accept HTML
            ctype = resp.headers.get("Content-Type", "")
            if "text/html" not in ctype:
                return None, None
            text = await resp.text(errors="ignore")
            return resp.status, text
    except Exception as e:
        # print(f"fetch error {url}: {e}")
        return None, None

async def crawl(start_url):
    parsed_start = urlparse(start_url)
    base_domain = parsed_start.netloc
    scheme = parsed_start.scheme or "https"

    # robots.txt check
    robots = urllib.robotparser.RobotFileParser()
    robots.set_url(f"{scheme}://{base_domain}/robots.txt")
    try:
        robots.read()
    except Exception:
        # could not read robots; proceed cautiously
        pass

    to_visit = asyncio.Queue()
    await to_visit.put(start_url)
    visited = set()
    results = {}  # url -> status

    sem = asyncio.Semaphore(CONCURRENT_REQUESTS)

    async with aiohttp.ClientSession(headers={"User-Agent": "SimpleCrawler/1.0"}) as session:
        async def worker():
            while not to_visit.empty() and len(visited) < MAX_PAGES:
                url = await to_visit.get()
                if url in visited:
                    to_visit.task_done()
                    continue
                # robots.txt disallow?
                if robots.can_fetch("*", url) is False:
                    # skip if disallowed explicitly
                    visited.add(url)
                    results[url] = "DISALLOWED_BY_ROBOTS"
                    to_visit.task_done()
                    continue

                if not same_domain(start_url, url):
                    visited.add(url)
                    results[url] = "OUT_OF_DOMAIN"
                    to_visit.task_done()
                    continue

                async with sem:
                    status, text = await fetch(session, url)
                    # politeness delay
                    await asyncio.sleep(DELAY_BETWEEN_REQUESTS)

                visited.add(url)
                results[url] = status if status is not None else "ERROR"

                if text and len(visited) < MAX_PAGES:
                    # parse links
                    soup = BeautifulSoup(text, "html.parser")
                    for a in soup.find_all("a", href=True):
                        href = normalize_link(url, a.get("href"))
                        if not href:
                            continue
                        if same_domain(start_url, href) and href not in visited:
                            await to_visit.put(href)

                to_visit.task_done()

        # spawn workers
        workers = [asyncio.create_task(worker()) for _ in range(CONCURRENT_REQUESTS)]
        # wait until queue is exhausted or safety cap reached
        await to_visit.join()
        # cancel workers
        for w in workers:
            w.cancel()
        # gather to suppress warnings
        await asyncio.gather(*workers, return_exceptions=True)

    return results

if __name__ == "__main__":
    start = START_URL
    t0 = time.time()
    res = asyncio.run(crawl(start))
    t1 = time.time()
    print(f"Crawled {len(res)} pages in {t1-t0:.1f}s\nSample results:")
    # print a few entries
    for i, (u, status) in enumerate(res.items()):
        print(i+1, status, u)
        if i >= 49: break
