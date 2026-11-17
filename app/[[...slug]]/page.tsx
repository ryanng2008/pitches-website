import fs from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';
import parse from 'html-react-parser';
import SiteBehavior from '@/components/SiteBehavior';
import routes from '@/content/routes.json';

type PageProps = { params: Promise<{ slug?: string[] }> };

async function getPage(slug: string) {
  if (!routes.includes(slug)) notFound();
  return JSON.parse(await fs.readFile(path.join(process.cwd(), 'content', `${slug.replaceAll('/', '__') || 'home'}.json`), 'utf8')) as {
    title: string; bodyClass: string; html: string; css: string;
  };
}

export function generateStaticParams() {
  return routes.map(slug => ({ slug: slug ? slug.split('/') : [] }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: (await getPage(slug?.join('/') || '')).title };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPage(slug?.join('/') || '');
  return <>
    <style dangerouslySetInnerHTML={{ __html: page.css }} />
    <style>{`/* Static replacements for the reference's WordPress runtime. */
      .themify_builder .wow { visibility: visible; }
      .sbi_photo img, .sby_video_thumbnail img { opacity: 1 !important; }
      .sbi_item, .sby_item { display: inline-block !important; opacity: 1 !important; }
      .row-slider { display: block !important; overflow: hidden; z-index: 0; }
      .row-slider-slides { visibility: visible !important; height: 100%; }
      .row-slider-slides > span { position: absolute; inset: 0; background-position: center; background-size: cover; opacity: 0; transition: opacity 1s ease; }
      .row-slider-slides > span:first-child { opacity: 1; }
      .row-slider-dot, .row-slider-nav { display: none; }
      .module_row > .row_inner { position: relative; z-index: 2; }
      .module_row > .builder_row_cover { z-index: 1; pointer-events: none; }
      #sbi_images .sbi_photo { display: block; aspect-ratio: 1; height: auto !important; }
      #sbi_images .sbi_photo img { display: block !important; width: 100%; height: 100%; object-fit: cover; }
      .sby_video_thumbnail img { display: block; width: 100%; }
      .sby_player_wrap { position: relative; aspect-ratio: 16 / 9; }
      .sby_player_wrap iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .module-timeline.tf_hidden { visibility: visible; }
      .module.tf_lazy, .track.tf_lazy, .tf_audio_lazy { visibility: visible; opacity: 1; }
      .module.tf_lazy::after, .module.tf_lazy::before, .track.tf_lazy::after, .track.tf_lazy::before, .tf_audio_lazy::after, .tf_audio_lazy::before { display: none; }
      .tf_audio_lazy audio { display: block; height: 40px; visibility: visible; width: 100%; }
      .accordion-icon svg, .accordion-active-icon svg { display: none; }
      .accordion-icon::after { content: '⌃'; }
      .accordion-active-icon::after { content: '⌄'; }
      @media (prefers-reduced-motion: reduce) { .row-slider-slides > span { transition: none; } }
    `}</style>
    {parse(page.html)}
    <SiteBehavior bodyClass={page.bodyClass} />
  </>;
}
