"""Capture the public reference's presentation as local, editable content.

Run with Python 3 and beautifulsoup4. No WordPress code or scripts are executed.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin, urlsplit
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup, Comment
import hashlib
import json
import re
import time
import subprocess
from functools import cache as memoize
import sys

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://yalepitchesandtones.com/'
ROUTES = ['', 'about', 'members', 'rush', 'listen', 'news', 'alumni', 'contact']
cache = {}
failures = []

@memoize
def fetch(url):
    url = url.replace('http://yalepitchesandtones.com', 'https://yalepitchesandtones.com')
    for attempt in range(3):
        try:
            # curl uses the operating system's certificate trust store on macOS.
            return subprocess.check_output(['curl', '--fail', '--silent', '--show-error', '--location', '--max-time', '35', '--user-agent', 'Mozilla/5.0', url], stderr=subprocess.PIPE)
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1)

def asset(url, base=ORIGIN):
    url = urljoin(base, url).replace('http://', 'https://')
    if url.startswith('data:') or url.startswith('#'):
        return url
    if url in cache:
        return cache[url]
    ext = Path(urlsplit(url).path).suffix or '.bin'
    name = hashlib.sha256(url.encode()).hexdigest()[:18] + ext
    local = '/assets/' + name
    cache[url] = local
    dest = ROOT / 'public' / local.lstrip('/')
    try:
        if not dest.exists():
            data = fetch(url)
            if ext == '.css':
                data = localize_css(data.decode(), url).encode()
            dest.write_bytes(data)
        return local
    except Exception as error:
        cache[url] = url
        failures.append({'url': url, 'error': str(error)})
        return url

def localize_css(css, base):
    def replace(match):
        url = match.group(1).strip(' \"\'')
        if url.startswith(('data:', '#')):
            return match.group(0)
        return 'url("' + asset(url, base) + '")'
    return re.sub(r'url\(([^)]+)\)', replace, css)

def capture(route):
    html = fetch(urljoin(ORIGIN, route + '/')).decode()
    soup = BeautifulSoup(html, 'html.parser')
    body = soup.body
    styles = []
    # Preserve the exact cascade, but omit unrelated donation/portfolio plugin CSS.
    for node in soup.head.find_all(['style', 'link']):
        if node.name == 'style':
            if not (node.get('id', '').startswith('givewp-')):
                styles.append(localize_css(node.get_text(), ORIGIN))
        elif node.get('rel') == ['stylesheet']:
            url = node.get('href', '')
            if any(x in url for x in ['give/', 'visual-portfolio', 'givewp-']):
                continue
            try:
                styles.append(localize_css(fetch(url).decode(), url))
            except Exception as error:
                failures.append({'url':url, 'error':str(error)})
    # Footer feed styles follow the page content in the reference.
    for node in body.find_all('link', rel='stylesheet'):
        url = node.get('href', '')
        try:
            styles.append(localize_css(fetch(url).decode(), url))
        except Exception:
            pass
    for node in body.find_all('style'):
        styles.append(localize_css(node.get_text(), ORIGIN))
    for node in body.find_all(['script', 'style', 'link', 'noscript']):
        node.decompose()
    for node in body.find_all(string=lambda text: isinstance(text, Comment)):
        node.extract()
    # Resolve feed placeholders at capture time, so the static export is complete.
    for link in body.select('.sbi_photo, .sby_video_thumbnail'):
        image = link.find('img')
        if image:
            if 'sbi_photo' in link.get('class', []):
                # WordPress keeps durable copies of Instagram thumbnails.
                item = link.find_parent(class_='sbi_item')
                post = item.get('id', '').removeprefix('sbi_')
                src = ORIGIN + 'wp-content/uploads/sb-instagram-feed-images/' + post + 'low.jpg'
                try:
                    fetch(src)
                except Exception:
                    src = link.get('data-full-res')
            else:
                src = link.get('data-full-res')
            if src:
                image['src'] = src
            link['style'] = 'opacity:1;'
    for node in body.find_all(True):
        for key in list(node.attrs):
            if key.lower().startswith('on') or key in ['srcset', 'data-img-src-set', 'data-full-res', 'data-locatornonce']:
                del node.attrs[key]
        for key in ['src', 'poster', 'data-bg']:
            if node.get(key):
                node[key] = asset(node[key])
        if node.get('style'):
            node['style'] = localize_css(node['style'], ORIGIN)
        if node.name == 'a' and node.get('href'):
            href = node['href']
            parsed = urlsplit(href)
            if parsed.hostname in ['yalepitchesandtones.com', 'www.yalepitchesandtones.com']:
                if parsed.path.startswith('/wp-content/'):
                    node['href'] = asset(href)
                elif parsed.path.strip('/') in ROUTES:
                    node['href'] = parsed.path or '/'
            if node.get('target') == '_blank':
                node['rel'] = 'noopener noreferrer'
        if node.name == 'form':
            node['action'] = '#'
        if node.name == 'input' and node.get('type') == 'hidden':
            node.decompose()
    for slider in body.select('.row-slider'):
        for index, slide in enumerate(slider.select('[data-bg]')):
            slide['style'] = 'background-image:url("' + slide['data-bg'] + '");opacity:' + ('1' if index == 0 else '0')
    data = {
        'title': soup.title.get_text(),
        'bodyClass': ' '.join(body.get('class', [])),
        'html': body.decode_contents(),
        'css': '\n'.join(styles),
    }
    (ROOT / 'content' / (route.replace('/', '__') or 'home')).with_suffix('.json').write_text(json.dumps(data, ensure_ascii=False))
    print('Captured', route or 'home', flush=True)

if __name__ == '__main__':
    routes = list(ROUTES)
    if '--linked' in sys.argv:
        for route in ROUTES:
            data = json.loads((ROOT / 'content' / ((route or 'home') + '.json')).read_text())
            for link in BeautifulSoup(data['html'], 'html.parser').select('a[href]'):
                url = urlsplit(link['href'])
                slug = url.path.strip('/')
                if url.hostname == 'yalepitchesandtones.com' and slug and not slug.startswith('wp-') and slug != 'audition':
                    if slug not in routes:
                        routes.append(slug)
        pending = [route for route in routes if route not in ROUTES]
    else:
        pending = routes
    def safe_capture(route):
        try:
            capture(route)
        except Exception as error:
            failures.append({'route': route, 'error': str(error)})
            print('Unavailable:', route, flush=True)
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(safe_capture, pending))
    routes = [route for route in routes if (ROOT / 'content' / ((route.replace('/', '__') or 'home') + '.json')).exists()]
    for route in routes:
        file = ROOT / 'content' / ((route.replace('/', '__') or 'home') + '.json')
        data = json.loads(file.read_text())
        soup = BeautifulSoup(data['html'], 'html.parser')
        for link in soup.select('a[href]'):
            url = urlsplit(link['href'])
            if url.hostname == 'yalepitchesandtones.com':
                if url.path.strip('/') in routes:
                    link['href'] = '/' + url.path.strip('/') + '/' + ('#' + url.fragment if url.fragment else '')
                elif url.path.strip('/') == 'audition':
                    link['href'] = '/rush/'
        data['html'] = str(soup)
        file.write_text(json.dumps(data, ensure_ascii=False))
    (ROOT / 'content' / 'routes.json').write_text(json.dumps(routes))
    (ROOT / 'content' / 'asset-manifest.json').write_text(json.dumps(cache, indent=2))
    (ROOT / 'content' / 'capture-report.json').write_text(json.dumps(failures, indent=2))
    print('Assets:', len(cache), 'Failures:', len(failures))
